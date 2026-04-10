/**
 * Layer 4 — Product-facing pair outcome from dimension maps (no scores, no legacy DTOs).
 */

export const HolyGrailPairDecisions = {
  /** No hard block in either direction; every dimension is MATCH or SKIPPED in both directions. */
  MUTUAL_MATCH: 'MUTUAL_MATCH',
  /** At least one dimension is NO_MATCH in either direction. */
  NO_MATCH: 'NO_MATCH',
  /** No NO_MATCH, but at least one dimension is UNKNOWN or NOT_ENFORCEABLE in either direction (SKIPPED does not cause this). */
  INDETERMINATE: 'INDETERMINATE',
} as const;

export type HolyGrailPairDecision =
  (typeof HolyGrailPairDecisions)[keyof typeof HolyGrailPairDecisions];

export interface HolyGrailPairDecisionV1 {
  readonly decisionVersion: 'holy_grail_pair_decision_v1';
  readonly decision: HolyGrailPairDecision;
  readonly searcherProfileId: string;
  readonly counterpartyProfileId: string;
}
