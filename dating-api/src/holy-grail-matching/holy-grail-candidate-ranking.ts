/**
 * Post-eligibility HG candidate ordering.
 *
 * Sprint 21 Story 5: the five-signal *ranker* is retired. Live product ranking is
 * `compareWithStatus` / matchScore. This function still hard-filters (eligibility),
 * then returns survivors in stable profileId order with a stub rankScore (0).
 * It does **not** score pairs with the old HG five-signal composite.
 */

import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { filterCandidatesByHardEligibility } from './pairwise-hard-eligibility-filter';

/** Kept for wire/DTO compatibility; unused after five-signal ranker deletion. */
export interface HolyGrailRankSignalBreakdown {
  readonly signal: string;
  readonly weight: number;
  readonly points: number;
  readonly note: string;
}

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

const RETIRED_REASON =
  'hg_rank_retired:live_engine_is_compareWithStatus' as const;

/**
 * Hard filter first (pairwise eligibility), then stable id order on survivors.
 * No five-signal / overlay composite score.
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

  const passed = [...filterResult.filteredCandidates].sort((a, b) =>
    a.profileId.localeCompare(b.profileId),
  );

  const rows: RankedHolyGrailCandidate[] = passed.map((candidate) => ({
    candidate,
    rankScore: 0,
    rankReasons: [RETIRED_REASON],
    rankBreakdown: [],
  }));

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
