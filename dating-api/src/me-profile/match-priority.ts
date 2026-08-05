/**
 * Sprint 41 Story 2 — list presentation priority from existing matchScore / finalScore.
 * Not part of the scoring engine.
 */

export type MatchPriorityTier = 'HIGH' | 'GOOD' | 'OTHER';

/** Inclusive lower bound for HIGH. */
export const PRIORITY_HIGH_MIN = 85;

/** Inclusive lower bound for GOOD (below HIGH). */
export const PRIORITY_GOOD_MIN = 70;

export function calculatePriorityTier(
  score: number | null | undefined,
): MatchPriorityTier {
  if (score == null || !Number.isFinite(score)) return 'OTHER';
  if (score >= PRIORITY_HIGH_MIN) return 'HIGH';
  if (score >= PRIORITY_GOOD_MIN) return 'GOOD';
  return 'OTHER';
}

export function toPriorityFields(matchScore: number | null): {
  priorityScore: number | null;
  priorityTier: MatchPriorityTier;
} {
  const priorityScore =
    matchScore != null && Number.isFinite(matchScore) ? matchScore : null;
  return {
    priorityScore,
    priorityTier: calculatePriorityTier(priorityScore),
  };
}
