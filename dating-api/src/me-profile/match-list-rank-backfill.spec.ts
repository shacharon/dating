import {
  matchListRankBackfillViewerWhere,
  resolveMatchListBackfillDelayMs,
} from './match-list-rank-backfill';
import { UserProfilePhotoStatus, UserProfileStatus } from '@prisma/client';

describe('matchListRankBackfill helpers', () => {
  it('viewer where requires ANALYZED + approved photo', () => {
    expect(matchListRankBackfillViewerWhere()).toEqual({
      status: UserProfileStatus.ANALYZED,
      photos: {
        some: { status: UserProfilePhotoStatus.APPROVED },
      },
    });
  });

  it('delay defaults to 200', () => {
    expect(resolveMatchListBackfillDelayMs({})).toBe(200);
    expect(resolveMatchListBackfillDelayMs({ MATCH_LIST_BACKFILL_DELAY_MS: '50' })).toBe(
      50,
    );
    expect(
      resolveMatchListBackfillDelayMs({ MATCH_LIST_BACKFILL_DELAY_MS: '-1' }),
    ).toBe(200);
  });
});
