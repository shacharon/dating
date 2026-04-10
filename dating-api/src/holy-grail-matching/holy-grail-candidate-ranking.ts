import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import {
  computeHolyGrailFiveSignalRank,
  type HolyGrailRankSignalBreakdown,
} from './holy-grail-five-signal-ranking';
import { filterCandidatesByHardEligibility } from './pairwise-hard-eligibility-filter';

export interface RankedHolyGrailCandidate {
  readonly candidate: MatchingCanonicalModel;
  readonly rankScore: number;
  readonly rankReasons: readonly string[];
  readonly rankBreakdown: readonly HolyGrailRankSignalBreakdown[];
}

export interface HolyGrailCandidateRankingDebug {
  readonly inputTotal: number;
  readonly passedHardFilter: number;
  readonly failedHardFilter: number;
  readonly rankedCount: number;
}

export interface HolyGrailCandidateRankingResult {
  readonly rankedCandidates: readonly RankedHolyGrailCandidate[];
  readonly debug?: HolyGrailCandidateRankingDebug;
}

/**
 * Hard filter first (pairwise eligibility), then deterministic rank on survivors only.
 * Ranking uses five HG sidecar signals (`rankingSignals`), optional `similarityPreference` bonus, and optional
 * `personalityTraits` / `lifestyleSignals` / `interestTags` overlap bonuses from grounded free-text tags; never affects eligibility.
 */
export function rankHolyGrailCandidatesAfterHardFilter(args: {
  readonly searcher: MatchingCanonicalModel;
  readonly candidates: readonly MatchingCanonicalModel[];
  readonly evaluatedAt?: Date;
  readonly includeDebug?: boolean;
}): HolyGrailCandidateRankingResult {
  const evaluatedAt = args.evaluatedAt ?? new Date();
  const filterResult = filterCandidatesByHardEligibility({
    searcher: args.searcher,
    candidates: args.candidates,
    evaluatedAt,
    includeDebug: args.includeDebug === true,
  });

  const passed = filterResult.filteredCandidates;
  const rows: RankedHolyGrailCandidate[] = passed.map((candidate) => {
    const { rankScore, rankReasons, rankBreakdown } = computeHolyGrailFiveSignalRank({
      searcher: args.searcher,
      candidate,
    });
    return { candidate, rankScore, rankReasons, rankBreakdown };
  });

  rows.sort((a, b) => {
    if (b.rankScore !== a.rankScore) {
      return b.rankScore - a.rankScore;
    }
    return a.candidate.profileId.localeCompare(b.candidate.profileId);
  });

  return {
    rankedCandidates: rows,
    ...(args.includeDebug === true && filterResult.debug !== undefined
      ? {
          debug: {
            inputTotal: filterResult.debug.total,
            passedHardFilter: filterResult.debug.passed,
            failedHardFilter: filterResult.debug.failed,
            rankedCount: rows.length,
          },
        }
      : {}),
  };
}
