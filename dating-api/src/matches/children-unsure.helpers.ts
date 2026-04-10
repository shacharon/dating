import { CHILDREN_UNSURE_RANKING_PENALTY_RATE } from './children-unsure.product-policy';
import type { ChildrenUnsureDirectionsDto } from './match.types';

export function anyChildrenUnsure(
  row: ChildrenUnsureDirectionsDto | null | undefined,
): boolean {
  if (!row) return false;
  return row.profile_a_to_profile_b || row.profile_b_to_profile_a;
}

/**
 * Rounded display/ranking score after optional children_unsure penalty.
 * `penaltyApplies` is typically `anyChildrenUnsure(children_unsure)`.
 */
export function applyChildrenUnsurePenalty(score: number, penaltyApplies: boolean): number {
  if (!penaltyApplies) return Math.round(score);
  return Math.round(score * (1 - CHILDREN_UNSURE_RANKING_PENALTY_RATE));
}

export type DisplayScoreMatchSlice = {
  readonly rankingScore?: number;
  readonly finalScore?: number;
  readonly overall: number;
};

/** Score used for ordering and list card display after list enrichment. */
export function getDisplayScore(match: DisplayScoreMatchSlice): number {
  return match.rankingScore ?? match.finalScore ?? match.overall;
}
