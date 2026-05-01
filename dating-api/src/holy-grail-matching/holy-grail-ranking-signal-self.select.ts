/**
 * Historical HG ranking column slice (formerly persisted on the retired snapshot table).
 * Kept as documentation-only constants; runtime reads use text/JSON paths instead.
 */
export const HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT = {
  lifestylePace: true,
  conflictStyle: true,
  hgRankingDailyRhythm: true,
  hgRankingAutonomyTogetherness: true,
  hgRankingInterestsTop: true,
} as const;
