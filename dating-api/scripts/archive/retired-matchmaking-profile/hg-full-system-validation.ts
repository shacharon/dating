/**
 * Full HG validation: eligibility (same synthetic pool as hg-soft-pass-simulation) + ranking on survivors.
 * Uses production paths: evaluateHolyGrailDirectional, filter/rank via rankHolyGrailCandidatesAfterHardFilter,
 * full ranking-signal includes (self `signalSnapshots` with `HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT`) like PrismaHolyGrailProfileSourceRepository.
 *
 * Run: npx ts-node scripts/hg-full-system-validation.ts
 * Output: scripts/.hg-full-system-validation-output.json
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { mapProfileSourceToMatchingCanonical } from '../../../src/holy-grail-matching/profile-to-canonical.mapper';
import { evaluateHolyGrailDirectional } from '../../../src/holy-grail-matching/eligibility.evaluator';
import { rankHolyGrailCandidatesAfterHardFilter } from '../../../src/holy-grail-matching/holy-grail-candidate-ranking';
import { buildHolyGrailProfileMappingInputFromRankingAwareDbRow } from '../../../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';
import { CHILDREN_UNSURE_PROFILE_ROW_SELECT } from '../../../src/matches/match-detail-children-unsure';

const SYNTHETIC_ID_PREFIX_ALLOWLIST = [
  'synthetic-he-',
  'synthetic-en-',
  'synthetic-hg-gap-',
  'synthetic-ls-v2-',
  'synthetic-pt-v2-',
  'synthetic-personality-v2-',
  'synthetic-it-v2-',
  'synthetic-interest-tags-v2-',
] as const;
const VALIDATION_CANDIDATE_PREFIXES = SYNTHETIC_ID_PREFIX_ALLOWLIST;

const OUTPUT_JSON = path.join(__dirname, '.hg-full-system-validation-output.json');

function tiePct(scores: number[]): number {
  if (scores.length === 0) return 0;
  const m = new Map<number, number>();
  for (const s of scores) m.set(s, (m.get(s) ?? 0) + 1);
  let tied = 0;
  for (const c of m.values()) if (c > 1) tied += c;
  return Math.round((1e4 * tied) / scores.length) / 100;
}

function signalPct(count: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((1e4 * count) / total) / 100;
}

function histogram(scores: number[]): Record<string, number> {
  const bins = {
    '0_10': 0,
    '10_25': 0,
    '25_50': 0,
    '50_75': 0,
    '75_90': 0,
    '90_100': 0,
    '100_plus': 0,
  };
  for (const s of scores) {
    if (s < 10) bins['0_10'] += 1;
    else if (s < 25) bins['10_25'] += 1;
    else if (s < 50) bins['25_50'] += 1;
    else if (s < 75) bins['50_75'] += 1;
    else if (s < 90) bins['75_90'] += 1;
    else if (s <= 100) bins['90_100'] += 1;
    else bins['100_plus'] += 1;
  }
  return bins;
}

function signalRichness(rs: { rankingSignals?: import('../src/canonical/matching-canonical.types').MatchingRankingSignalsSnapshot }): {
  hasDaily: boolean;
  hasAuto: boolean;
  hasConflict: boolean;
  hasPace: boolean;
  hasInterests: boolean;
} {
  const x = rs.rankingSignals;
  if (!x) {
    return {
      hasDaily: false,
      hasAuto: false,
      hasConflict: false,
      hasPace: false,
      hasInterests: false,
    };
  }
  return {
    hasDaily: x.dailyRhythm !== null && x.dailyRhythm.trim() !== '',
    hasAuto: x.autonomyTogetherness !== null && x.autonomyTogetherness.trim() !== '',
    hasConflict: x.conflictStyle !== null && Number.isFinite(x.conflictStyle),
    hasPace: x.lifestylePace !== null && Number.isFinite(x.lifestylePace),
    hasInterests: x.interestsTop.length > 0,
  };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const evaluatedAt = new Date();

  let totalMutualPassPairs = 0;
  let totalCandidatesConsidered = 0;
  let mapFailures = 0;
  const allRankScores: number[] = [];
  /** Ranked rows whose breakdown includes `deterministicSpread` (primary five signals all ~0). */
  let rankedRowsUsingDeterministicSpread = 0;
  const perSearcher: unknown[] = [];

  /** Best case for top-10 demo */
  let bestSearcherId = '';
  let bestSurvivors = 0;
  let bestRanked: ReturnType<typeof rankHolyGrailCandidatesAfterHardFilter>['rankedCandidates'] = [];
  let bestSearcherCanon: import('../src/canonical/matching-canonical.types').MatchingCanonicalModel | null = null;
  const hgSamples: unknown[] = [];

  let profilesSignalChecked = 0;
  let signalCounts = { hasDaily: 0, hasAuto: 0, hasConflict: 0, hasPace: 0, hasInterests: 0, anySignal: 0 };

  try {
    const searchers = await prisma.matchmakingProfile.findMany({
      where: {
        OR: SYNTHETIC_ID_PREFIX_ALLOWLIST.map((prefix) => ({ id: { startsWith: prefix } })),
      },
      orderBy: [{ id: 'asc' }],
      take: 5,
      select: { id: true },
    });

    for (const { id: searcherId } of searchers) {
      const sRow = await prisma.matchmakingProfile.findUnique({
        where: { id: searcherId },
        select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
      });
      if (!sRow) continue;

      let sCanon: import('../src/canonical/matching-canonical.types').MatchingCanonicalModel;
      try {
        const sInput = buildHolyGrailProfileMappingInputFromRankingAwareDbRow(sRow);
        sCanon = mapProfileSourceToMatchingCanonical(sInput);
        profilesSignalChecked += 1;
        const sr = signalRichness(sCanon);
        if (sr.hasDaily) signalCounts.hasDaily += 1;
        if (sr.hasAuto) signalCounts.hasAuto += 1;
        if (sr.hasConflict) signalCounts.hasConflict += 1;
        if (sr.hasPace) signalCounts.hasPace += 1;
        if (sr.hasInterests) signalCounts.hasInterests += 1;
        if (sr.hasDaily || sr.hasAuto || sr.hasConflict || sr.hasPace || sr.hasInterests) signalCounts.anySignal += 1;
      } catch {
        mapFailures += 1;
        continue;
      }

      const candidateRows = await prisma.matchmakingProfile.findMany({
        where: {
          id: { not: searcherId },
          OR: VALIDATION_CANDIDATE_PREFIXES.map((prefix) => ({ id: { startsWith: prefix } })),
        },
        orderBy: [{ id: 'asc' }],
        select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
      });

      const candidates: import('../src/canonical/matching-canonical.types').MatchingCanonicalModel[] = [];
      let mutualPass = 0;

      for (const cRow of candidateRows) {
        totalCandidatesConsidered += 1;
        let cCanon: import('../src/canonical/matching-canonical.types').MatchingCanonicalModel;
        try {
          const cInput = buildHolyGrailProfileMappingInputFromRankingAwareDbRow(cRow);
          cCanon = mapProfileSourceToMatchingCanonical(cInput);
          profilesSignalChecked += 1;
          const cr = signalRichness(cCanon);
          if (cr.hasDaily) signalCounts.hasDaily += 1;
          if (cr.hasAuto) signalCounts.hasAuto += 1;
          if (cr.hasConflict) signalCounts.hasConflict += 1;
          if (cr.hasPace) signalCounts.hasPace += 1;
          if (cr.hasInterests) signalCounts.hasInterests += 1;
          if (cr.hasDaily || cr.hasAuto || cr.hasConflict || cr.hasPace || cr.hasInterests) signalCounts.anySignal += 1;
        } catch {
          mapFailures += 1;
          continue;
        }

        const stc = evaluateHolyGrailDirectional({ searcher: sCanon, counterparty: cCanon, evaluatedAt });
        const cts = evaluateHolyGrailDirectional({ searcher: cCanon, counterparty: sCanon, evaluatedAt });
        const mutual =
          stc.overallHardEligibility === 'PASS' && cts.overallHardEligibility === 'PASS';
        if (mutual) {
          mutualPass += 1;
          totalMutualPassPairs += 1;
          candidates.push(cCanon);
        }
      }

      const ranked = rankHolyGrailCandidatesAfterHardFilter({
        searcher: sCanon,
        candidates,
        evaluatedAt,
        includeDebug: true,
      });

      for (const row of ranked.rankedCandidates) {
        allRankScores.push(row.rankScore);
      }

      if (candidates.length > bestSurvivors) {
        bestSurvivors = candidates.length;
        bestSearcherId = searcherId;
        bestRanked = ranked.rankedCandidates;
        bestSearcherCanon = sCanon;
      }

      perSearcher.push({
        searcherId,
        candidatesConsidered: candidateRows.length,
        mutualPassSurvivors: candidates.length,
        rankedCount: ranked.rankedCandidates.length,
        debug: ranked.debug,
      });
    }

    /** Top-10 order vs lexicographic id order among survivors of best searcher */
    let top10VsIdOrder: Record<string, unknown> = { note: 'no_survivors' };
    if (bestSearcherCanon && bestRanked.length > 0) {
      const survIds = bestRanked.map((r) => r.candidate.profileId).sort((a, b) => a.localeCompare(b));
      const rankIds = bestRanked.map((r) => r.candidate.profileId);
      const n = Math.min(10, rankIds.length);
      const topRank = rankIds.slice(0, n);
      const topLex = survIds.slice(0, n);
      let posDiff = 0;
      for (let i = 0; i < n; i++) {
        if (topRank[i] !== topLex[i]) posDiff += 1;
      }
      const setRank = new Set(topRank);
      const setLex = new Set(topLex);
      let onlyInRank = 0;
      for (const x of setRank) if (!setLex.has(x)) onlyInRank += 1;

      top10VsIdOrder = {
        searcherId: bestSearcherId,
        survivorCount: bestRanked.length,
        top10ByRank: topRank,
        top10ByLexicographicId: topLex,
        positionMismatchesVsLexTop10: posDiff,
        setDifferenceCountTop10: onlyInRank,
      };

      for (let i = 0; i < Math.min(10, bestRanked.length); i++) {
        const row = bestRanked[i]!;
        const stc = evaluateHolyGrailDirectional({
          searcher: bestSearcherCanon,
          counterparty: row.candidate,
          evaluatedAt,
        });
        const cts = evaluateHolyGrailDirectional({
          searcher: row.candidate,
          counterparty: bestSearcherCanon,
          evaluatedAt,
        });
        hgSamples.push({
          rank: i + 1,
          candidateId: row.candidate.profileId,
          hgSearcherToCandidate: {
            overall: stc.overallHardEligibility,
            children_unsure: stc.eligibilityFlags.children_unsure,
            dimensions: Object.fromEntries(
              Object.entries(stc.dimensions).map(([k, v]) => [k, { status: v.status, reasonCode: v.reasonCode }]),
            ),
          },
          hgCandidateToSearcher: {
            overall: cts.overallHardEligibility,
            children_unsure: cts.eligibilityFlags.children_unsure,
            dimensions: Object.fromEntries(
              Object.entries(cts.dimensions).map(([k, v]) => [k, { status: v.status, reasonCode: v.reasonCode }]),
            ),
          },
          rankScore: row.rankScore,
          rankReasons: row.rankReasons,
          rankBreakdown: row.rankBreakdown,
          candidateRankingSignals: row.candidate.rankingSignals ?? null,
        });
      }
    }

    const report = {
      meta: {
        evaluatedAtIso: evaluatedAt.toISOString(),
        pool: 'same synthetic prefixes as hg-soft-pass-simulation',
        searchersLoaded: searchers.length,
      },
      eligibility: {
        status: mapFailures === 0 ? 'OK' : 'DEGRADED_MAP_FAILURES',
        totalMutualPassPairsAcrossAllSearcherRuns: totalMutualPassPairs,
        totalDirectedCandidateSlotsConsidered: totalCandidatesConsidered,
        canonicalMapFailures: mapFailures,
        perSearcher,
      },
      ranking: {
        totalRankedRows: allRankScores.length,
        tiePctAmongRankedScores: tiePct(allRankScores),
        scoreHistogram: histogram(allRankScores),
        scoreMin: allRankScores.length ? Math.min(...allRankScores) : null,
        scoreMax: allRankScores.length ? Math.max(...allRankScores) : null,
        scoreMean:
          allRankScores.length > 0
            ? Math.round((allRankScores.reduce((a, b) => a + b, 0) / allRankScores.length) * 1e6) / 1e6
            : null,
        top10VsLexicographicOrder: top10VsIdOrder,
        deterministicSpreadRows: rankedRowsUsingDeterministicSpread,
        deterministicSpreadPctOfRankedRows:
          allRankScores.length > 0
            ? Math.round((1e4 * rankedRowsUsingDeterministicSpread) / allRankScores.length) / 100
            : null,
      },
      signal_quality: {
        profileObservations: profilesSignalChecked,
        countsAtLeastOne: signalCounts,
        pctAnyRankingSignal:
          profilesSignalChecked > 0
            ? Math.round((1e4 * signalCounts.anySignal) / profilesSignalChecked) / 100
            : null,
        /** % of profile mapping observations with a non-null / usable value (CI guard uses these). */
        pctAtLeastOne: {
          dailyRhythm: signalPct(signalCounts.hasDaily, profilesSignalChecked),
          autonomyTogetherness: signalPct(signalCounts.hasAuto, profilesSignalChecked),
          conflictStyle: signalPct(signalCounts.hasConflict, profilesSignalChecked),
          lifestylePace: signalPct(signalCounts.hasPace, profilesSignalChecked),
          interestsTop: signalPct(signalCounts.hasInterests, profilesSignalChecked),
        },
      },
      tenMatchesFullBreakdown: hgSamples,
    };

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report, null, 2));
    console.error(`\nWrote ${OUTPUT_JSON}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
