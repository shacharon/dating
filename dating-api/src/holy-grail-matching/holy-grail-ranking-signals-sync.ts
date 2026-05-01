import type { PrismaClient } from '@prisma/client';

/**
 * Legacy hook retained for callers. Previously synced HG ranking columns on a per-profile snapshot row;
 * snapshot persistence was retired (Migration 2). No database writes.
 */
export async function syncProfileHgRankingSignalColumns(
  _prisma: PrismaClient,
  _profileId: string,
): Promise<void> {
  return;
}
