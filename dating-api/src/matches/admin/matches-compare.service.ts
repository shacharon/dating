import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProfileJsonPayload } from '../../profiles/profiles.types';
import type { MatchPairRuntimeBundle } from '../../profiles/profiles-prisma.service';
import { ProfilesPrismaService } from '../../profiles/profiles-prisma.service';
import type { ChildrenUnsureProfileRow } from '../children-unsure/children-unsure-profile-row.types';
import type { MatchRecordDto } from '../match.types';
import { AdminPairMatchEvaluator } from './admin-pair-match.evaluator';
import { toCanonicalMatchId } from '../engine/match-id';
import {
  holyGrailMatchDiagnosticsFromDirections,
} from '../compare/match-pair-hg-snapshot';
import { evaluateHolyGrailPairDirections } from '../holy-grail/holy-grail-pair-directions';
import type {
  CompareBodyDto,
  CompareHgDiagnosticResult,
  CompareServiceResult,
} from '../matches.service.types';

@Injectable()
export class MatchesCompareService {
  constructor(
    private readonly profilesPrisma: ProfilesPrismaService,
    private readonly adminPairMatchEvaluator: AdminPairMatchEvaluator,
  ) {}

  /**
   * Holy Grail pair diagnostics from DB HG row slice only: structured JSON + extractionV2 tags + self signal snapshot.
   * Does not call `compareWithStatus`, attach canonical V2 scalars, or run the legacy match engine.
   */
  async compareHgDiagnostic(
    body: CompareBodyDto,
  ): Promise<CompareHgDiagnosticResult> {
    const aId = body.aId?.trim();
    const bId = body.bId?.trim();
    if (!aId || !bId) throw new Error('aId and bId are required');
    if (aId === bId) throw new Error('aId and bId must be different');

    const bundle = await this.profilesPrisma.loadMatchPairRuntimeBundle(
      aId,
      bId,
    );
    if (!bundle) {
      throw new NotFoundException(
        `One or both profiles not found: ${aId}, ${bId}`,
      );
    }
    const { rowA, rowB, profileA, profileB } = bundle;

    const evaluatedAt = new Date().toISOString();
    const matchId = toCanonicalMatchId(aId, bId);
    const name = (p: ProfileJsonPayload) => ({ id: p.id, name: p.name ?? '' });

    const dirs = evaluateHolyGrailPairDirections(
      rowA,
      rowB,
      new Date(evaluatedAt),
    );
    if (!dirs) {
      return {
        ok: false,
        matchId,
        aId,
        bId,
        evaluatedAt,
        reason: 'HG_EVAL_UNAVAILABLE',
        message:
          'HG mapping or evaluation failed (invalid holyGrail structured JSON, mapper validation, or internal error).',
        a: name(profileA),
        b: name(profileB),
      };
    }

    const children_unsure = {
      profile_a_to_profile_b: dirs.aToB.eligibilityFlags.children_unsure,
      profile_b_to_profile_a: dirs.bToA.eligibilityFlags.children_unsure,
    };
    const holyGrail = holyGrailMatchDiagnosticsFromDirections(
      dirs.aToB,
      dirs.bToA,
    );

    return {
      ok: true,
      matchId,
      aId,
      bId,
      evaluatedAt,
      source: 'live_hg_eval_only',
      a: name(profileA),
      b: name(profileB),
      children_unsure,
      holyGrail,
    };
  }

  /**
   * READY match record plus HG profile rows from the same batched read as `compare` (for detail HG without reloading).
   */
  async getReadyMatchDetailContext(matchId: string): Promise<{
    readonly match: MatchRecordDto;
    readonly rowA: ChildrenUnsureProfileRow;
    readonly rowB: ChildrenUnsureProfileRow;
  } | null> {
    const [aId, bId] = matchId.split('__');
    if (!aId || !bId) return null;
    if (toCanonicalMatchId(aId, bId) !== matchId) return null;
    const bundle = await this.profilesPrisma.loadMatchPairRuntimeBundle(
      aId,
      bId,
    );
    if (!bundle) return null;
    const result = await this.runCompareOnLoadedBundle(bundle);
    if (result.status !== 'READY') return null;
    return { match: result.match, rowA: bundle.rowA, rowB: bundle.rowB };
  }

  async compare(body: CompareBodyDto): Promise<CompareServiceResult> {
    const aId = body.aId?.trim();
    const bId = body.bId?.trim();
    if (!aId || !bId) throw new Error('aId and bId are required');
    if (aId === bId) throw new Error('aId and bId must be different');

    const bundle = await this.profilesPrisma.loadMatchPairRuntimeBundle(
      aId,
      bId,
    );
    if (!bundle) {
      throw new NotFoundException(
        `One or both profiles not found: ${aId}, ${bId}`,
      );
    }
    return this.runCompareOnLoadedBundle(bundle);
  }

  private async runCompareOnLoadedBundle(
    bundle: MatchPairRuntimeBundle,
  ): Promise<CompareServiceResult> {
    const profileA = bundle.profileA;
    const profileB = bundle.profileB;
    const aId = profileA.id;
    const bId = profileB.id;

    // Slice 2: stop ProfileExtractionV2 runtime reads.
    // Keep canonical scalar defaults identical to the previous "row missing" behavior.
    const v2Scalars = {
      relationship_clarity_self: 5,
      relationship_clarity_partner: 5,
      relationship_clarity_relationship: 5,
    };

    (profileA as any).canonicalScalarsV2 = v2Scalars;
    (profileB as any).canonicalScalarsV2 = v2Scalars;

    // Canonical scalar source-of-truth for filter/debug layer (no scoring changes here).
    const canonicalClarityA = (profileA as any).canonicalScalarsV2
      .relationship_clarity_self;
    const canonicalClarityB = (profileB as any).canonicalScalarsV2
      .relationship_clarity_self;
    void canonicalClarityA;
    void canonicalClarityB;

    // Gate + baseline score via PairMatchPolicy; HG-first retry stays in evaluator.
    const { result } = this.adminPairMatchEvaluator.evaluateCompare({
      rowA: bundle.rowA,
      rowB: bundle.rowB,
      profileA,
      profileB,
    });

    const matchId = toCanonicalMatchId(aId, bId);
    if ('status' in result && result.status === 'NOT_ANALYZED') {
      return {
        status: 'NOT_ANALYZED',
        matchId,
        match: {
          matchId,
          aId,
          bId,
          a: { id: profileA.id, name: profileA.name },
          b: { id: profileB.id, name: profileB.name },
          status: 'NOT_ANALYZED',
          message: result.message,
          compatibility: null,
          partnerFit: null,
          relationshipFit: null,
          coverage: null,
          friction: null,
          finalScore: null,
        },
      };
    }
    if ('status' in result && result.status === 'INSUFFICIENT_DATA') {
      return {
        status: 'INSUFFICIENT_DATA',
        matchId,
        match: {
          matchId,
          aId,
          bId,
          a: { id: profileA.id, name: profileA.name },
          b: { id: profileB.id, name: profileB.name },
          status: 'INSUFFICIENT_DATA',
          message: result.message,
          compatibility: null,
          partnerFit: null,
          relationshipFit: null,
          coverage: null,
          friction: null,
          finalScore: null,
        },
      };
    }
    const compareResult = result;

    const now = new Date().toISOString();

    const record: MatchRecordDto = {
      matchId,
      aId,
      bId,
      a: { id: profileA.id, name: profileA.name },
      b: { id: profileB.id, name: profileB.name },
      createdAt: now,
      updatedAt: now,
      aToB: compareResult.aToB,
      bToA: compareResult.bToA,
      relationshipStyle: compareResult.relationshipStyle,
      coverage: compareResult.coverage,
      frictionRisk: compareResult.frictionRisk,
      compatibility: compareResult.compatibility,
      valuesAlignment: compareResult.valuesAlignment,
      finalScore: compareResult.finalScore,
      rawScore: compareResult.rawScore,
      friction: compareResult.friction,
      frictionPenalty: compareResult.frictionPenalty,
      coveragePercent: compareResult.coveragePercent,
      scoreCoverageFactor: compareResult.scoreCoverageFactor,
      coverageFactor: compareResult.coverageFactor,
      confidence: compareResult.confidence,
      infoFlags: compareResult.infoFlags,
      alignments: compareResult.alignments,
      tensions: compareResult.tensions,
      tensionMatrix: compareResult.tensionMatrix,
      derived: compareResult.derived,
      dealbreakers: compareResult.dealbreakers,
      balance: compareResult.balance,
      debug: compareResult.debug,
      explainability: compareResult.explainability,
      recommendation: compareResult.recommendation,
    };

    return { status: 'READY', matchId, match: record };
  }
}
