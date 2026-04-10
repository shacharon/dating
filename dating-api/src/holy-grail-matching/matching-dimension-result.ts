/**
 * HOLY_GRAIL_MATCHING — per-dimension outcome labels used in audit/legacy bridges (Step 3 doc vocabulary: MATCH / NO_MATCH / …).
 * Layer 3 runtime evaluation uses `HolyGrailHardEligibilityStatus` in `eligibility.evaluator.ts` (PASS / FAIL / SKIPPED / SOFT_PASS).
 * See `docs/HOLY_GRAIL_MATCHING.md` § “Locked Layer 3 policy” for SOFT_PASS rules and doc↔code mapping.
 */

/** Runtime literals for comparisons and audit (type is `MatchingDimensionResult`). */
export const MatchingDimensionResults = {
  MATCH: 'MATCH',
  NO_MATCH: 'NO_MATCH',
  /** Active rule but fact withheld / indeterminate (not the same as SKIPPED). */
  UNKNOWN: 'UNKNOWN',
  NOT_ENFORCEABLE: 'NOT_ENFORCEABLE',
  /** Dimension not applicable; ignored for strict hard-eligibility conjunction (Layer 3 SKIPPED). */
  SKIPPED: 'SKIPPED',
} as const;

export type MatchingDimensionResult =
  (typeof MatchingDimensionResults)[keyof typeof MatchingDimensionResults];
