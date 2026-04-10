import type { Prisma } from '@prisma/client';

/**
 * Prisma select for `ProfileSignalSnapshot` domain `self` HG ranking runtime reads.
 * Use everywhere ranking / HG pair eval loads profile rows (retrieval, match detail, validation scripts).
 */
export const HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT = {
  lifestylePace: true,
  conflictStyle: true,
  hgRankingDailyRhythm: true,
  hgRankingAutonomyTogetherness: true,
  hgRankingInterestsTop: true,
} as const satisfies Prisma.ProfileSignalSnapshotSelect;
