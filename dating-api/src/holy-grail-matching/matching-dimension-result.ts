/**
 * HOLY_GRAIL_MATCHING — per-dimension outcome (Step 3 doc).
 * Lives outside matching-canonical.types.ts until promoted.
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
