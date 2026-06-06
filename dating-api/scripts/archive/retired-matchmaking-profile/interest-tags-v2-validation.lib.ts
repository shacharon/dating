/**
 * Shared DB-backed checks for interestTags v1+v2: coverage, canonical tags, grounded rank reasons,
 * eligibility invariance when interest tags are stripped from rankingSignals, and rank-stability (tie-break) bounds.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { MatchingCanonicalModel } from '../../../src/canonical/matching-canonical.types';
import type { HolyGrailDirectionalEvaluationResult } from '../../../src/holy-grail-matching/eligibility.evaluator';
import { evaluateHolyGrailDirectional } from '../../../src/holy-grail-matching/eligibility.evaluator';
import { rankHolyGrailCandidatesAfterHardFilter } from '../../../src/holy-grail-matching/holy-grail-candidate-ranking';
import { INTEREST_TAG_SET } from '../../../src/holy-grail-matching/interest-tags-text.extract';
import { mapProfileSourceToMatchingCanonical } from '../../../src/holy-grail-matching/profile-to-canonical.mapper';
import { buildHolyGrailProfileMappingInputFromRankingAwareDbRow } from '../../../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';
import { CHILDREN_UNSURE_PROFILE_ROW_SELECT } from '../../../src/matches/match-detail-children-unsure';
import type { ChildrenUnsureProfileRow } from '../../../src/matches/children-unsure-profile-row.types';

export const INTEREST_TAGS_V2_VALIDATION_THRESHOLDS = {
  minCoveragePct: 70,
  minProfileRows: 20,
  minRankedSurvivors: 5,
  maxTop20ChurnEachWay: 4,
  minKendallTauTop20: 0.72,
  maxPositionMoveTop20Intersection: 8,
} as const;

export type InterestTagsV2ValidationReport = {
  readonly validator: string;
  readonly evaluatedAt: string;
  readonly idPrefixes: readonly string[];
  /** Compared as identical UTF-8 strings of a stable eligibility projection (dims + flags + overall). */
  readonly eligibilityInvariantVsStrippedRankingSignals: 'eligibilityKeyJsonUtf8Identical';
  readonly thresholds: typeof INTEREST_TAGS_V2_VALIDATION_THRESHOLDS;
  readonly profileCount: number;
  readonly coveragePct: number;
  readonly withInterestTagCount: number;
  readonly checks: {
    readonly coverageAtLeastMin: boolean;
    readonly canonicalTagsOnly: boolean;
    readonly eligibilityMatchesStrippedBaseline: boolean;
    readonly groundedRankReasonsSubsetOfIntersection: boolean;
    readonly rankStabilityTop20ChurnBounded: boolean;
    readonly rankStabilityKendallTauBounded: boolean;
    readonly rankStabilityMaxPositionMoveBounded: boolean;
  };
  readonly eligibilityInvariantPairsChecked: number;
  readonly rankStability: {
    readonly searcherId: string;
    /** Order with full interestTags ranking signals. */
    readonly top20WithInterestTags: readonly string[];
    /** Same candidates/searcher with interestTags* removed from rankingSignals (tie-break stripped). */
    readonly top20InterestTagsStripped: readonly string[];
    readonly kendallTauTop20: number | null;
    readonly maxPositionMoveTop20Intersection: number;
    readonly top20Left: number;
    readonly top20Entered: number;
  };
  readonly sampleProfiles: readonly {
    readonly profileId: string;
    readonly interestTagsSelf: readonly string[];
    readonly interestTagsPartner: readonly string[];
  }[];
  readonly interestGroundedSamples: readonly {
    readonly pair: string;
    readonly rankReasonLine: string;
    readonly note: string;
  }[];
};

function stripInterestTagsFromRankingSignals(m: MatchingCanonicalModel): MatchingCanonicalModel {
  const rs = m.rankingSignals;
  if (!rs) return m;
  const next = { ...rs };
  delete (next as { interestTagsSelf?: unknown }).interestTagsSelf;
  delete (next as { interestTagsPartner?: unknown }).interestTagsPartner;
  return { ...m, rankingSignals: next };
}

function allInterestTags(m: MatchingCanonicalModel): string[] {
  const rs = m.rankingSignals;
  if (!rs) return [];
  return [...(rs.interestTagsSelf ?? []), ...(rs.interestTagsPartner ?? [])];
}

function assertCanonicalInterestTags(tags: readonly string[], profileId: string): void {
  for (const t of tags) {
    if (!INTEREST_TAG_SET.has(t)) {
      throw new Error(`Non-canonical interest tag on ${profileId}: ${JSON.stringify(t)}`);
    }
  }
}

function eligibilityKey(r: HolyGrailDirectionalEvaluationResult): string {
  const dims = Object.fromEntries(
    Object.entries(r.dimensions).map(([k, v]) => [k, `${v.status}:${v.reasonCode}`]),
  );
  return JSON.stringify({ overall: r.overallHardEligibility, dims, flags: r.eligibilityFlags });
}

function groundedInterestTagSet(s: MatchingCanonicalModel, c: MatchingCanonicalModel): Set<string> {
  const rs = s.rankingSignals;
  const rc = c.rankingSignals;
  const sSelf = rs?.interestTagsSelf ?? [];
  const sPartner = rs?.interestTagsPartner ?? [];
  const cSelf = rc?.interestTagsSelf ?? [];
  const cPartner = rc?.interestTagsPartner ?? [];
  const inter1 = sPartner.filter((t) => cSelf.includes(t));
  const inter2 = sSelf.filter((t) => cPartner.includes(t));
  return new Set([...inter1, ...inter2]);
}

function parseGroundedInterestTags(note: string): string[] {
  const m = note.match(/^interestTags:grounded\(([^,)]+),O=/);
  if (!m?.[1]) return [];
  return m[1]
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);
}

function kendallTauNormalized(idsA: string[], idsB: string[]): number | null {
  const common = idsA.filter((x) => idsB.includes(x));
  if (common.length < 2) return null;
  const rankB = new Map(common.map((id, i) => [id, idsB.indexOf(id)]));
  let inv = 0;
  for (let i = 0; i < common.length; i++) {
    for (let j = i + 1; j < common.length; j++) {
      const a = common[i]!;
      const b = common[j]!;
      const oa = idsA.indexOf(a) - idsA.indexOf(b);
      const ob = (rankB.get(a) ?? 0) - (rankB.get(b) ?? 0);
      if (Math.sign(oa) !== Math.sign(ob)) inv += 1;
    }
  }
  const n = common.length;
  const maxInv = (n * (n - 1)) / 2;
  return maxInv > 0 ? 1 - inv / maxInv : 1;
}

export async function runInterestTagsV2Validation(args: {
  readonly idPrefixes: readonly string[];
  readonly outputBasename: string;
  readonly validatorLabel: string;
  readonly seedHint: string;
}): Promise<InterestTagsV2ValidationReport> {
  const { idPrefixes, outputBasename, validatorLabel, seedHint } = args;
  const prisma = new PrismaClient();
  const evaluatedAt = new Date();
  const T = INTEREST_TAGS_V2_VALIDATION_THRESHOLDS;

  try {
    const rows = await prisma.matchmakingProfile.findMany({
      where: {
        OR: idPrefixes.map((p) => ({ id: { startsWith: p } })),
      },
      orderBy: { id: 'asc' },
      select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
    });

    if (rows.length < T.minProfileRows) {
      throw new Error(
        `Expected ≥${T.minProfileRows} profiles with id prefix ${idPrefixes.join(' or ')} (got ${rows.length}). ${seedHint}`,
      );
    }

    const canonById = new Map<string, MatchingCanonicalModel>();
    for (const row of rows) {
      const input = buildHolyGrailProfileMappingInputFromRankingAwareDbRow(row as ChildrenUnsureProfileRow);
      const m = mapProfileSourceToMatchingCanonical(input);
      canonById.set(row.id, m);
      const tags = allInterestTags(m);
      assertCanonicalInterestTags(tags, row.id);
    }

    const withTags = [...canonById.values()].filter((m) => allInterestTags(m).length > 0).length;
    const coveragePct = Math.round((1e4 * withTags) / canonById.size) / 100;
    const coverageAtLeastMin = coveragePct >= T.minCoveragePct;
    if (!coverageAtLeastMin) {
      throw new Error(
        `Interest tags coverage ${coveragePct}% < ${T.minCoveragePct}% (with ≥1 tag: ${withTags}/${canonById.size})`,
      );
    }

    const searcherId = rows[0]!.id;
    const searcher = canonById.get(searcherId)!;
    const candidates = rows
      .filter((r) => r.id !== searcherId)
      .map((r) => canonById.get(r.id)!);

    for (const c of candidates) {
      const stc = evaluateHolyGrailDirectional({ searcher, counterparty: c, evaluatedAt });
      const cts = evaluateHolyGrailDirectional({ searcher: c, counterparty: searcher, evaluatedAt });
      const stcB = evaluateHolyGrailDirectional({
        searcher: stripInterestTagsFromRankingSignals(searcher),
        counterparty: stripInterestTagsFromRankingSignals(c),
        evaluatedAt,
      });
      const ctsB = evaluateHolyGrailDirectional({
        searcher: stripInterestTagsFromRankingSignals(c),
        counterparty: stripInterestTagsFromRankingSignals(searcher),
        evaluatedAt,
      });
      if (eligibilityKey(stc) !== eligibilityKey(stcB) || eligibilityKey(cts) !== eligibilityKey(ctsB)) {
        throw new Error(
          `Eligibility mismatch vs interest-stripped baseline for pair ${searcherId} ↔ ${c.profileId}`,
        );
      }
    }

    const rankedFull = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates,
      evaluatedAt,
      includeDebug: true,
    });

    if (rankedFull.rankedCandidates.length < T.minRankedSurvivors) {
      throw new Error(
        `Expected ≥${T.minRankedSurvivors} ranked survivors (got ${rankedFull.rankedCandidates.length}); check HG fixtures / eligibility.`,
      );
    }

    const rankedStrip = rankHolyGrailCandidatesAfterHardFilter({
      searcher: stripInterestTagsFromRankingSignals(searcher),
      candidates: candidates.map(stripInterestTagsFromRankingSignals),
      evaluatedAt,
      includeDebug: true,
    });

    const topFull = rankedFull.rankedCandidates.slice(0, 20).map((r) => r.candidate.profileId);
    const topStrip = rankedStrip.rankedCandidates.slice(0, 20).map((r) => r.candidate.profileId);

    const leftTop20 = topFull.filter((id) => !topStrip.includes(id)).length;
    const enteredTop20 = topStrip.filter((id) => !topFull.includes(id)).length;
    const rankStabilityTop20ChurnBounded =
      leftTop20 <= T.maxTop20ChurnEachWay && enteredTop20 <= T.maxTop20ChurnEachWay;
    if (!rankStabilityTop20ChurnBounded) {
      throw new Error(
        `Top-20 churn too large: left=${leftTop20}, entered=${enteredTop20} (threshold ${T.maxTop20ChurnEachWay} each).`,
      );
    }

    const tau = kendallTauNormalized(topFull, topStrip);
    const rankStabilityKendallTauBounded = tau == null || tau >= T.minKendallTauTop20;
    if (!rankStabilityKendallTauBounded) {
      throw new Error(
        `Top-20 Kendall tau ${tau!.toFixed(4)} < ${T.minKendallTauTop20} (rank instability vs interest strip).`,
      );
    }

    let maxPosMove = 0;
    const posStrip = new Map(topStrip.map((id, i) => [id, i]));
    for (let i = 0; i < topFull.length; i++) {
      const id = topFull[i]!;
      const j = posStrip.get(id);
      if (j !== undefined) maxPosMove = Math.max(maxPosMove, Math.abs(i - j));
    }
    const rankStabilityMaxPositionMoveBounded = maxPosMove <= T.maxPositionMoveTop20Intersection;
    if (!rankStabilityMaxPositionMoveBounded) {
      throw new Error(
        `Max position move within top-20 intersection: ${maxPosMove} > ${T.maxPositionMoveTop20Intersection}`,
      );
    }

    for (const row of rankedFull.rankedCandidates) {
      const itRow = row.rankBreakdown.find((b) => b.signal === 'interestTags');
      if (!itRow) continue;
      const reasonLine = row.rankReasons.find((x) => x.startsWith('interestTags:'));
      if (!reasonLine?.includes('interestTags:grounded(')) {
        throw new Error(
          `Expected rankReasons interest line with interestTags:grounded( for ${row.candidate.profileId}`,
        );
      }
      const g = groundedInterestTagSet(searcher, row.candidate);
      const parsed = parseGroundedInterestTags(itRow.note);
      if (g.size === 0) {
        throw new Error(
          `interestTags breakdown but empty intersection ${searcherId} vs ${row.candidate.profileId}: ${itRow.note}`,
        );
      }
      for (const t of parsed) {
        if (!g.has(t)) {
          throw new Error(
            `Grounded note lists tag not in intersection: ${t} note=${itRow.note} grounded=${[...g].join(';')}`,
          );
        }
      }
    }

    const sampleProfiles = [...canonById.entries()]
      .filter(([, m]) => allInterestTags(m).length > 0)
      .slice(0, 10)
      .map(([id, m]) => {
        const rs = m.rankingSignals;
        return {
          profileId: id,
          interestTagsSelf: rs?.interestTagsSelf ?? [],
          interestTagsPartner: rs?.interestTagsPartner ?? [],
        };
      });

    const groundedSamples: {
      pair: string;
      rankReasonLine: string;
      note: string;
    }[] = [];
    for (const row of rankedFull.rankedCandidates.slice(0, 15)) {
      const line = row.rankReasons.find((x) => x.startsWith('interestTags:'));
      const br = row.rankBreakdown.find((b) => b.signal === 'interestTags');
      if (line && br) {
        groundedSamples.push({
          pair: `${searcherId} vs ${row.candidate.profileId}`,
          rankReasonLine: line,
          note: br.note,
        });
      }
      if (groundedSamples.length >= 5) break;
    }

    const report: InterestTagsV2ValidationReport = {
      validator: validatorLabel,
      evaluatedAt: evaluatedAt.toISOString(),
      idPrefixes: [...idPrefixes],
      eligibilityInvariantVsStrippedRankingSignals: 'eligibilityKeyJsonUtf8Identical',
      thresholds: T,
      profileCount: canonById.size,
      coveragePct,
      withInterestTagCount: withTags,
      checks: {
        coverageAtLeastMin,
        canonicalTagsOnly: true,
        eligibilityMatchesStrippedBaseline: true,
        groundedRankReasonsSubsetOfIntersection: true,
        rankStabilityTop20ChurnBounded,
        rankStabilityKendallTauBounded,
        rankStabilityMaxPositionMoveBounded,
      },
      eligibilityInvariantPairsChecked: candidates.length * 2,
      rankStability: {
        searcherId,
        top20WithInterestTags: topFull,
        top20InterestTagsStripped: topStrip,
        kendallTauTop20: tau,
        maxPositionMoveTop20Intersection: maxPosMove,
        top20Left: leftTop20,
        top20Entered: enteredTop20,
      },
      sampleProfiles,
      interestGroundedSamples: groundedSamples,
    };

    const outputPath = path.join(__dirname, outputBasename);
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
    // eslint-disable-next-line no-console
    console.error(`\nOK — wrote ${outputPath}`);

    return report;
  } finally {
    await prisma.$disconnect();
  }
}
