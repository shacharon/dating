import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { evaluateHolyGrailDirectional } from './eligibility.evaluator';

export interface PairwiseHardEligibilityFilterDebug {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
}

export interface PairwiseHardEligibilityFilterResult {
  readonly filteredCandidates: readonly MatchingCanonicalModel[];
  readonly debug?: PairwiseHardEligibilityFilterDebug;
}

/**
 * Pairwise hard eligibility: keep candidates where neither direction has a dimension `FAIL`
 * (`PASS` and `SOFT_PASS` both count as surviving). Policy: `docs/HOLY_GRAIL_MATCHING.md` § “Locked Layer 3 policy”.
 * Does not use pair-decision / MUTUAL_MATCH.
 */
export function filterCandidatesByHardEligibility(args: {
  readonly searcher: MatchingCanonicalModel;
  readonly candidates: readonly MatchingCanonicalModel[];
  readonly evaluatedAt?: Date;
  readonly includeDebug?: boolean;
}): PairwiseHardEligibilityFilterResult {
  const evaluatedAt = args.evaluatedAt ?? new Date();
  const filtered: MatchingCanonicalModel[] = [];
  let failed = 0;

  for (const candidate of args.candidates) {
    const searcherToCandidate = evaluateHolyGrailDirectional({
      searcher: args.searcher,
      counterparty: candidate,
      evaluatedAt,
    });
    const candidateToSearcher = evaluateHolyGrailDirectional({
      searcher: candidate,
      counterparty: args.searcher,
      evaluatedAt,
    });
    const ok =
      searcherToCandidate.overallHardEligibility === 'PASS' &&
      candidateToSearcher.overallHardEligibility === 'PASS';
    if (ok) {
      filtered.push(candidate);
    } else {
      failed += 1;
    }
  }

  const total = args.candidates.length;
  const passed = filtered.length;
  return {
    filteredCandidates: filtered,
    ...(args.includeDebug ? { debug: { total, passed, failed } } : {}),
  };
}
