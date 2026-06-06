/**
 * Children "unsure" soft-pass helpers for match list filtering and display score.
 */

export interface ChildrenUnsureDirections {
  profile_a_to_profile_b: boolean;
  profile_b_to_profile_a: boolean;
}

export function anyChildrenUnsure(
  row: ChildrenUnsureDirections | null | undefined,
): boolean {
  if (!row) return false;
  return row.profile_a_to_profile_b || row.profile_b_to_profile_a;
}

export type DisplayScoreMatchSlice = {
  rankingScore?: number;
  finalScore?: number;
};

/** Score used for ordering and list card display after list enrichment. */
export function getDisplayScore(match: DisplayScoreMatchSlice): number {
  if (
    match.rankingScore != null &&
    Number.isFinite(match.rankingScore)
  ) {
    return match.rankingScore;
  }
  const s = match.finalScore;
  return typeof s === 'number' && Number.isFinite(s) ? s : 0;
}
