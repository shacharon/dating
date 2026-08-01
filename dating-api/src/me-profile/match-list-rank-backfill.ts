import { UserProfilePhotoStatus, UserProfileStatus } from '@prisma/client';

/** Pure selection helpers for MatchListRank backfill (Sprint 31 Story 5). */

export type BackfillViewerRow = {
  userId: string;
  id: string;
};

/**
 * Prisma where: ANALYZED profiles with at least one APPROVED photo.
 */
export function matchListRankBackfillViewerWhere() {
  return {
    status: UserProfileStatus.ANALYZED,
    photos: {
      some: { status: UserProfilePhotoStatus.APPROVED },
    },
  };
}

export function resolveMatchListBackfillDelayMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env['MATCH_LIST_BACKFILL_DELAY_MS'];
  if (raw == null || String(raw).trim() === '') return 200;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 200;
  return Math.floor(n);
}
