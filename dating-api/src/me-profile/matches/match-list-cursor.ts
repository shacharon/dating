import { Prisma } from '@prisma/client';
import type { MatchListCursorPayload } from '../../cache/match-list-cache';

/** Prisma where for MatchListRank rows strictly after a list cursor. */
export function matchListRankAfterCursorWhere(
  viewerUserId: string,
  cursor: MatchListCursorPayload | null,
): Prisma.MatchListRankWhereInput {
  if (!cursor) {
    return { viewerUserId };
  }
  const hardBlocked = cursor.b === 1;
  const sameBucketLowerScore: Prisma.MatchListRankWhereInput = {
    hardBlocked,
    matchScore: { lt: cursor.s },
  };
  const sameBucketSameScore: Prisma.MatchListRankWhereInput = {
    hardBlocked,
    matchScore: cursor.s,
    candidateProfileId: { gt: cursor.id },
  };
  if (cursor.b === 0) {
    return {
      viewerUserId,
      OR: [
        { hardBlocked: true },
        sameBucketLowerScore,
        sameBucketSameScore,
      ],
    };
  }
  return {
    viewerUserId,
    OR: [sameBucketLowerScore, sameBucketSameScore],
  };
}
