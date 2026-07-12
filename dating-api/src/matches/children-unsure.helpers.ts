import type { ChildrenUnsureDirectionsDto } from './match.types';
import { resolveEngineFinalScore } from './match-score.util';

export function anyChildrenUnsure(
  row: ChildrenUnsureDirectionsDto | null | undefined,
): boolean {
  if (!row) return false;
  return row.profile_a_to_profile_b || row.profile_b_to_profile_a;
}

export type DisplayScoreMatchSlice = {
  readonly rankingScore?: number;
  readonly finalScore?: number;
};

/** Score used for ordering and list card display after list enrichment. */
export function getDisplayScore(match: DisplayScoreMatchSlice): number {
  if (
    match.rankingScore != null &&
    Number.isFinite(match.rankingScore)
  ) {
    return match.rankingScore;
  }
  return resolveEngineFinalScore(match);
}
