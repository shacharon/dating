import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import { ProfilesPrismaService } from '../profiles/profiles-prisma.service';
import { compareWithStatus } from './match-engine';
import type {
  CompareGuardFailureResultDto,
  CompareResultDto,
} from './match-engine';
import type { MatchListItemDto, MatchRecordDto } from './match.types';
import { buildShortReason } from './match-short-reason';
import { PrismaService } from '../prisma/prisma.service';
import { loadChildrenUnsureProfileRowMap } from './match-detail-children-unsure';
import {
  anyChildrenUnsure,
  applyChildrenUnsurePenalty,
  getDisplayScore,
} from './children-unsure.helpers';
import { toCanonicalMatchId } from './match-id';
import {
  loadMatchPairHgSnapshotMap,
  resolveChildrenUnsureForPair,
  upsertMatchPairHgSnapshots,
} from './match-pair-hg-snapshot';

export type { CompareResultDto } from './match-engine';
export type { MatchListItemDto } from './match.types';

export { CHILDREN_UNSURE_RANKING_PENALTY_RATE } from './children-unsure.product-policy';

export interface ListMatchesOptions {
  readonly hideChildrenUnsure?: boolean;
}

export interface CompareBodyDto {
  aId: string;
  bId: string;
}

export interface CompareGuardMatchDto {
  matchId: string;
  aId: string;
  bId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  status: 'NOT_ANALYZED' | 'INSUFFICIENT_DATA';
  message: string;
  compatibility: null;
  partnerFit: null;
  relationshipFit: null;
  coverage: null;
  friction: null;
  overall: null;
  finalScore: null;
}

/** @deprecated Use CompareGuardMatchDto */
export type CompareNotAnalyzedMatchDto = CompareGuardMatchDto;

export type CompareServiceResult =
  | { status: 'READY'; matchId: string; match: MatchRecordDto }
  | { status: 'NOT_ANALYZED'; matchId: string; match: CompareGuardMatchDto }
  | { status: 'INSUFFICIENT_DATA'; matchId: string; match: CompareGuardMatchDto };


@Injectable()
export class MatchesService {
  constructor(
    private readonly profilesPrisma: ProfilesPrismaService,
    private readonly prisma: PrismaService,
  ) {}

  async compare(body: CompareBodyDto): Promise<CompareServiceResult> {
    const aId = body.aId?.trim();
    const bId = body.bId?.trim();
    if (!aId || !bId) throw new Error('aId and bId are required');
    if (aId === bId) throw new Error('aId and bId must be different');

    const [profileA, profileB] = await Promise.all([
      this.profilesPrisma.getById(aId),
      this.profilesPrisma.getById(bId),
    ]);

    if (!profileA) throw new NotFoundException(`Profile not found: ${aId}`);
    if (!profileB) throw new NotFoundException(`Profile not found: ${bId}`);

    // Attach canonical V2 scalar signals for read-only consumption in the match pipeline.
    // Intentionally not used in scoring yet.
    const [v2A, v2B] = await Promise.all([
      this.prisma.profileExtractionV2.findUnique({
        where: { profileId: profileA.id },
        select: {
          relationship_clarity_self: true,
          relationship_clarity_partner: true,
          relationship_clarity_relationship: true,
        },
      }),
      this.prisma.profileExtractionV2.findUnique({
        where: { profileId: profileB.id },
        select: {
          relationship_clarity_self: true,
          relationship_clarity_partner: true,
          relationship_clarity_relationship: true,
        },
      }),
    ]);

    if (!v2A || !v2B) {
      throw new NotFoundException(
        `Canonical V2 extraction missing for one or both profiles: ${profileA.id}, ${profileB.id}`,
      );
    }

    (profileA as any).canonicalScalarsV2 = {
      relationship_clarity_self: v2A.relationship_clarity_self,
      relationship_clarity_partner: v2A.relationship_clarity_partner,
      relationship_clarity_relationship: v2A.relationship_clarity_relationship,
    };
    (profileB as any).canonicalScalarsV2 = {
      relationship_clarity_self: v2B.relationship_clarity_self,
      relationship_clarity_partner: v2B.relationship_clarity_partner,
      relationship_clarity_relationship: v2B.relationship_clarity_relationship,
    };

    // Canonical scalar source-of-truth for filter/debug layer (no scoring changes here).
    const canonicalClarityA = (profileA as any).canonicalScalarsV2
      .relationship_clarity_self;
    const canonicalClarityB = (profileB as any).canonicalScalarsV2
      .relationship_clarity_self;
    void canonicalClarityA;
    void canonicalClarityB;

    const result: CompareResultDto | CompareGuardFailureResultDto = compareWithStatus(
      profileA as ProfileJsonPayload,
      profileB as ProfileJsonPayload,
    );

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
          overall: null,
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
          overall: null,
          finalScore: null,
        },
      };
    }
    const compareResult = result as CompareResultDto;

    const now = new Date().toISOString();

    const record: MatchRecordDto = {
      matchId,
      aId,
      bId,
      a: { id: profileA.id, name: profileA.name },
      b: { id: profileB.id, name: profileB.name },
      overall: compareResult.finalScore,
      createdAt: now,
      updatedAt: now,
      aToB: compareResult.aToB,
      bToA: compareResult.bToA,
      relationshipStyle: compareResult.relationshipStyle,
      coverage: compareResult.coverage,
      frictionRisk: compareResult.frictionRisk,
      compatibility: compareResult.compatibility,
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

  /**
   * Upserts `match_pair_hg_snapshot` for every computed pair (called after full recompute / rebuild).
   */
  async persistMatchPairHgSnapshots(records: MatchRecordDto[]): Promise<{ written: number; skipped: number }> {
    const profileMap = await loadChildrenUnsureProfileRowMap(this.prisma);
    return upsertMatchPairHgSnapshots(this.prisma, records, profileMap);
  }

  async list(opts?: ListMatchesOptions): Promise<MatchListItemDto[]> {
    const hideChildrenUnsure = opts?.hideChildrenUnsure === true;
    const records = await this.listAllComputed();
    const profileMap = await loadChildrenUnsureProfileRowMap(this.prisma);
    const snapshotMap = await loadMatchPairHgSnapshotMap(
      this.prisma,
      records.map((r) => r.matchId),
    );

    const mapped: MatchListItemDto[] = records.map((r) => {
      const finalScore = r.finalScore ?? r.overall;
      const dealbreakersRaw = r.dealbreakers ?? r.debug?.dealbreakers ?? [];
      const dealbreakers = dealbreakersRaw.map((d) => ({
        code: d.code,
        ...(d.severity != null && { severity: d.severity }),
      }));
      const shortReason = buildShortReason({
        finalScore,
        dealbreakers,
      });
      const scoreMetadata: MatchListItemDto['scoreMetadata'] = {};
      if (r.coveragePercent != null) scoreMetadata.coveragePercent = r.coveragePercent;
      if (r.coverageFactor != null) scoreMetadata.coverageFactor = r.coverageFactor;
      if (r.friction != null) scoreMetadata.friction = r.friction;
      if (r.rawScore != null) scoreMetadata.rawScore = r.rawScore;

      const rowA = profileMap.get(r.aId);
      const rowB = profileMap.get(r.bId);
      const children_unsure = resolveChildrenUnsureForPair({
        snapshot: snapshotMap.get(r.matchId),
        rowA,
        rowB,
      });
      const engineFinalScore = finalScore;
      const rankingScore = applyChildrenUnsurePenalty(
        engineFinalScore,
        anyChildrenUnsure(children_unsure),
      );

      return {
        matchId: r.matchId,
        a: r.a,
        b: r.b,
        overall: r.overall,
        finalScore,
        engineFinalScore,
        rankingScore,
        children_unsure,
        updatedAt: r.updatedAt,
        dealbreakers,
        shortReason,
        ...(r.explainability != null && { explainability: r.explainability }),
        ...(r.recommendation != null && { recommendation: r.recommendation }),
        ...(Object.keys(scoreMetadata).length > 0 && { scoreMetadata }),
      };
    });

    const filtered = hideChildrenUnsure
      ? mapped.filter((row) => !anyChildrenUnsure(row.children_unsure))
      : mapped;

    return filtered.sort((a, b) => getDisplayScore(b) - getDisplayScore(a));
  }

  async listFull(opts: {
    policyVersion: string;
    minCoveragePercent?: number;
  }): Promise<MatchRecordDto[]> {
    const records = await this.listAllComputed();
    return records
      .filter((r) => (r.policyVersion ?? '') === opts.policyVersion)
      .filter((r) =>
        opts.minCoveragePercent != null
          ? (r.coveragePercent ?? 0) >= opts.minCoveragePercent
          : true,
      )
      .sort((a, b) => (b.finalScore ?? b.overall) - (a.finalScore ?? a.overall));
  }

  async getById(matchId: string): Promise<MatchRecordDto | null> {
    const [aId, bId] = matchId.split('__');
    if (!aId || !bId) return null;
    if (toCanonicalMatchId(aId, bId) !== matchId) return null;
    const result = await this.compare({ aId, bId });
    return result.status === 'READY' ? result.match : null;
  }

  async listAllComputed(): Promise<MatchRecordDto[]> {
    const list = await this.profilesPrisma.list();
    const profiles: ProfileJsonPayload[] = [];
    for (const { id } of list) {
      const full = await this.profilesPrisma.getById(id);
      if (full) profiles.push(full);
    }
    const ids = profiles.map((p) => p.id).sort((a, b) => a.localeCompare(b));
    const records: MatchRecordDto[] = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const aId = ids[i];
        const bId = ids[j];
        const profileA = profiles.find((p) => p.id === aId);
        const profileB = profiles.find((p) => p.id === bId);
        if (!profileA || !profileB) continue;
        const result = compareWithStatus(profileA, profileB);
        if (
          'status' in result &&
          (result.status === 'NOT_ANALYZED' || result.status === 'INSUFFICIENT_DATA')
        ) {
          continue;
        }
        const compareResult = result as CompareResultDto;
        const now = new Date().toISOString();
        records.push({
          matchId: toCanonicalMatchId(aId, bId),
          aId,
          bId,
          a: { id: profileA.id, name: profileA.name },
          b: { id: profileB.id, name: profileB.name },
          overall: compareResult.finalScore,
          createdAt: now,
          updatedAt: now,
          aToB: compareResult.aToB,
          bToA: compareResult.bToA,
          relationshipStyle: compareResult.relationshipStyle,
          coverage: compareResult.coverage,
          frictionRisk: compareResult.frictionRisk,
          compatibility: compareResult.compatibility,
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
        });
      }
    }
    return records;
  }
}
