/**
 * Sub-split from me-profile.service.spec.ts (Sprint 69 Story 03).
 * submitForUser
 */
import { ProfileGender, UserProfileStatus } from '@prisma/client';
import {
  ProfileNotFoundForSubmitError,
  ProfileSubmitInvalidStateError,
  ProfileSubmitPersistenceFailedError,
  ProfileSubmitPhotoRequiredError,
} from './me-profile.errors';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import {
  createMeProfileServiceTestContext,
  type MeProfileServiceTestContext,
} from './me-profile.service.spec-support';
import type { MeProfileService } from './me-profile.service';

describe('MeProfileService — submitForUser', () => {
  let service: MeProfileService;
  let prisma: MeProfileServiceTestContext['prisma'];
  let userId: string;
  let baseRow: MeProfileServiceTestContext['baseRow'];
  let profileRow: MeProfileServiceTestContext['profileRow'];
  let analysisQueue: MeProfileServiceTestContext['analysisQueue'];
  let analytics: MeProfileServiceTestContext['analytics'];

  beforeEach(() => {
    ({
      service,
      prisma,
      userId,
      baseRow,
      profileRow,
      analysisQueue,
      analytics,
    } = createMeProfileServiceTestContext());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // submitForUser
  // ---------------------------------------------------------------------------

  describe('submitForUser', () => {
    it('throws ProfileNotFoundForSubmitError when profile missing', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);
      await expect(service.submitForUser(userId)).rejects.toBeInstanceOf(
        ProfileNotFoundForSubmitError,
      );
      expect(prisma.userProfile.update).not.toHaveBeenCalled();
    });

    // Use string casts until `prisma generate` is run after the migration.
    // These values will be available as proper enum members once the client is regenerated.
    const S = {
      SUBMITTED: 'SUBMITTED' as UserProfileStatus,
      ANALYZING: 'ANALYZING' as UserProfileStatus,
      ANALYZED: 'ANALYZED' as UserProfileStatus,
      FAILED: 'FAILED' as UserProfileStatus,
    };

    it.each([
      ['null', null],
      ['PREFER_NOT_TO_SAY', ProfileGender.PREFER_NOT_TO_SAY],
    ] as const)(
      'throws ProfileSubmitGenderRequiredError when gender is %s',
      async (_label, gender) => {
        prisma.userProfile.findUnique.mockResolvedValue({
          ...baseRow,
          status: UserProfileStatus.DRAFT,
          gender: gender as unknown as typeof baseRow.gender,
        });
        await expect(service.submitForUser(userId)).rejects.toMatchObject({
          httpBody: expect.objectContaining({ error: 'gender_required' }),
        });
        expect(prisma.userProfile.update).not.toHaveBeenCalled();
        expect(analysisQueue.enqueueOrRunInline).not.toHaveBeenCalled();
      },
    );

    it('throws ProfileSubmitPhotoRequiredError when no approved photo', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({
        ...baseRow,
        status: UserProfileStatus.DRAFT,
        gender: ProfileGender.FEMALE,
      });
      prisma.userProfilePhoto.count.mockResolvedValue(0);

      await expect(service.submitForUser(userId)).rejects.toMatchObject({
        httpBody: expect.objectContaining({ error: 'photo_required' }),
      });
      expect(analytics.track).toHaveBeenCalledWith(
        userId,
        ProductAnalyticsEvents.PROFILE_PHOTO_GATE_BLOCKED,
        { surface: 'submit' },
      );
      expect(prisma.userProfile.update).not.toHaveBeenCalled();
      expect(analysisQueue.enqueueOrRunInline).not.toHaveBeenCalled();
    });

    it.each([S.SUBMITTED, S.ANALYZING])(
      'throws ProfileSubmitInvalidStateError when status is %s',
      async (status) => {
        // status guard fires before gender guard — gender=null is intentional here
        prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status, gender: null });
        await expect(service.submitForUser(userId)).rejects.toBeInstanceOf(
          ProfileSubmitInvalidStateError,
        );
        expect(prisma.userProfile.update).not.toHaveBeenCalled();
        expect(analysisQueue.enqueueOrRunInline).not.toHaveBeenCalled();
      },
    );

    it.each([UserProfileStatus.DRAFT, S.ANALYZED, S.FAILED])(
      'transitions status=%s to SUBMITTED and sets submittedAt',
      async (status) => {
        const now = new Date('2026-04-15T10:00:00.000Z');
        jest.useFakeTimers({ now });

        prisma.userProfile.findUnique
          .mockResolvedValueOnce({
            ...baseRow,
            status,
            gender: ProfileGender.FEMALE,
          })
          .mockResolvedValueOnce(
            profileRow({
              ...baseRow,
              gender: ProfileGender.FEMALE,
              status: S.SUBMITTED,
              submittedAt: now,
              lastAnalysisError: null,
            }),
          );
        prisma.userProfile.update.mockResolvedValue({
          ...baseRow,
          gender: ProfileGender.FEMALE,
          status: S.SUBMITTED,
          submittedAt: now,
          lastAnalysisError: null,
        });

        const r = await service.submitForUser(userId);

        expect(prisma.userProfile.update).toHaveBeenCalledWith({
          where: { userId },
          data: {
            status: S.SUBMITTED,
            submittedAt: now,
            lastAnalysisError: null,
          },
        });
        expect(r.analysisJobId).toBe('job_1');
        expect(r.profile.status).toBe(S.SUBMITTED);
        expect(r.profile.submittedAt).toEqual(now);
        // Analysis should be enqueued (Bull or inline degraded)
        expect(analysisQueue.enqueueOrRunInline).toHaveBeenCalledWith({
          userId,
          profileId: 'prof_1',
        });

        jest.useRealTimers();
      },
    );

    it('throws ProfileSubmitPersistenceFailedError when Prisma update rejects', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({
        ...baseRow,
        status: UserProfileStatus.DRAFT,
        gender: ProfileGender.FEMALE,
      });
      prisma.userProfile.update.mockRejectedValue(new Error('db error'));

      await expect(service.submitForUser(userId)).rejects.toBeInstanceOf(
        ProfileSubmitPersistenceFailedError,
      );
    });

    it('clears lastAnalysisError on re-submit from FAILED', async () => {
      const submittedAt = new Date('2026-04-20T12:00:00.000Z');
      prisma.userProfile.findUnique
        .mockResolvedValueOnce({
          ...baseRow,
          status: S.FAILED,
          gender: ProfileGender.FEMALE,
          lastAnalysisError: 'previous error',
        })
        .mockResolvedValueOnce(
          profileRow({
            ...baseRow,
            status: S.SUBMITTED,
            gender: ProfileGender.FEMALE,
            submittedAt,
            lastAnalysisError: null,
          }),
        );
      prisma.userProfile.update.mockResolvedValue({
        ...baseRow,
        status: S.SUBMITTED,
        submittedAt,
        lastAnalysisError: null,
      });

      const r = await service.submitForUser(userId);

      expect(r.profile.lastAnalysisError).toBeNull();
      expect(prisma.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lastAnalysisError: null }),
        }),
      );
    });
  });
});
