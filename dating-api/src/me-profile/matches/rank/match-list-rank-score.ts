/**
 * Encode engine matchScore for MatchListRank storage.
 * Unscored / null → -1 (aligned with match-list cursor `s`).
 */
export function toStoredMatchListScore(engineScore: number | null | undefined): number {
  if (engineScore == null || !Number.isFinite(engineScore)) {
    return -1;
  }
  return engineScore;
}
