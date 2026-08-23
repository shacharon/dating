/**
 * Sub-split from me-profile.service.spec.ts (Sprint 69 Story 03).
 * match list rank rebuild enqueue
 */
import { ProfileGender } from '@prisma/client';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import {
  createMeProfileServiceTestContext,
  type MeProfileServiceTestContext,
} from './me-profile.service.spec-support';
import type { MeProfileService } from './me-profile.service';

describe('MeProfileService — rank rebuild', () => {
  let service: MeProfileService;
  let prisma: MeProfileServiceTestContext['prisma'];
  let userId: string;
  let baseRow: MeProfileServiceTestContext['baseRow'];
  let profileRow: MeProfileServiceTestContext['profileRow'];
  let matchListRankQueue: MeProfileServiceTestContext['matchListRankQueue'];
  let meMatches: MeProfileServiceTestContext['meMatches'];
  let analytics: MeProfileServiceTestContext['analytics'];

  beforeEach(() => {
    ({
      service,
      prisma,
      userId,
      baseRow,
      profileRow,
      matchListRankQueue,
      meMatches,
      analytics,
    } = createMeProfileServiceTestContext());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('match list rank rebuild enqueue', () => {
    it('createForUser enqueues preferences_changed', async () => {
      const created = { ...baseRow, gender: ProfileGender.FEMALE };
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...created,
          desiredPartnerGenders: created.desiredPartnerGenders,
        })
        .mockResolvedValueOnce(profileRow(created));
      prisma.userProfile.create.mockResolvedValue(created);

      await service.createForUser(userId, { gender: ProfileGender.FEMALE });

      expect(matchListRankQueue.enqueueRebuild).toHaveBeenCalledWith(
        userId,
        'preferences_changed',
      );
    });

    it('patchForUser enqueues preferences_changed when preference fields change', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(profileRow(baseRow))
        .mockResolvedValueOnce({
          ...baseRow,
          desiredPartnerGenders: baseRow.desiredPartnerGenders,
        })
        .mockResolvedValueOnce(profileRow(baseRow));

      await service.patchForUser(userId, { maxDistanceKm: 50 });

      expect(matchListRankQueue.enqueueRebuild).toHaveBeenCalledWith(
        userId,
        'preferences_changed',
      );
    });

    it('patchForUser does not enqueue when only non-preference fields change', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(profileRow(baseRow))
        .mockResolvedValueOnce({
          ...baseRow,
          desiredPartnerGenders: baseRow.desiredPartnerGenders,
        })
        .mockResolvedValueOnce(profileRow({ ...baseRow, aboutMe: 'updated' }));
      prisma.userProfile.update.mockResolvedValue({
        ...baseRow,
        aboutMe: 'updated',
      });

      await service.patchForUser(userId, { aboutMe: 'updated' });

      expect(matchListRankQueue.enqueueRebuild).not.toHaveBeenCalled();
    });

    it('patchForUser datingChapter change invalidates match list cache and tracks analytics', async () => {
      const updated = { ...baseRow, datingChapter: 'ready_again' };
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(profileRow(baseRow))
        .mockResolvedValueOnce({
          ...baseRow,
          desiredPartnerGenders: baseRow.desiredPartnerGenders,
        })
        .mockResolvedValueOnce(profileRow(updated));
      prisma.userProfile.update.mockResolvedValue(updated);

      const r = await service.patchForUser(userId, {
        datingChapter: 'ready_again' as never,
      });

      expect(r.datingChapter).toBe('ready_again');
      expect(prisma.userProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: { datingChapter: 'ready_again' },
      });
      expect(meMatches.invalidateMatchListCache).toHaveBeenCalledWith(userId);
      expect(analytics.track).toHaveBeenCalledWith(
        userId,
        ProductAnalyticsEvents.PROFILE_DATING_CHAPTER_SET,
        { dating_chapter: 'ready_again' },
      );
      expect(matchListRankQueue.enqueueRebuild).not.toHaveBeenCalled();
    });

    it('patchForUser same datingChapter does not invalidate cache', async () => {
      const row = { ...baseRow, datingChapter: 'first_chapter' };
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(profileRow(row))
        .mockResolvedValueOnce({
          ...row,
          desiredPartnerGenders: row.desiredPartnerGenders,
        })
        .mockResolvedValueOnce(profileRow(row));
      prisma.userProfile.update.mockResolvedValue(row);

      await service.patchForUser(userId, {
        datingChapter: 'first_chapter' as never,
        aboutMe: 'same-chapter',
      });

      expect(meMatches.invalidateMatchListCache).not.toHaveBeenCalled();
      expect(analytics.track).not.toHaveBeenCalledWith(
        userId,
        ProductAnalyticsEvents.PROFILE_DATING_CHAPTER_SET,
        expect.anything(),
      );
    });
  });
});
