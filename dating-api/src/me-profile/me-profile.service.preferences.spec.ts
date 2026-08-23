/**
 * Sub-split from me-profile.service.spec.ts (Sprint 69 Story 03).
 * Phase C dual-write UserProfilePreference
 */
import { InternalServerErrorException } from '@nestjs/common';
import { ProfileGender } from '@prisma/client';
import {
  createMeProfileServiceTestContext,
  type MeProfileServiceTestContext,
} from './me-profile.service.spec-support';
import type { MeProfileService } from './me-profile.service';

describe('MeProfileService — preferences', () => {
  let service: MeProfileService;
  let prisma: MeProfileServiceTestContext['prisma'];
  let userId: string;
  let baseRow: MeProfileServiceTestContext['baseRow'];
  let profileRow: MeProfileServiceTestContext['profileRow'];
  let obs: MeProfileServiceTestContext['obs'];

  beforeEach(() => {
    ({ service, prisma, userId, baseRow, profileRow, obs } =
      createMeProfileServiceTestContext());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Phase C dual-write: UserProfilePreference
  // ---------------------------------------------------------------------------

  describe('Phase C dual-write: UserProfilePreference', () => {
    it('createForUser upserts UserProfilePreference after profile creation', async () => {
      const created = {
        ...baseRow,
        id: 'prof_new',
        gender: ProfileGender.FEMALE,
      };
      const preferenceAfter = {
        id: 'pref_new',
        profileId: 'prof_new',
        partnerAgeMin: 28,
        partnerAgeMax: 40,
        acceptedPartnerGenders: [] as string[],
        maxDistanceKm: null,
        updatedAt: new Date('2026-01-02'),
      };
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...created,
          desiredPartnerGenders: created.desiredPartnerGenders,
        })
        .mockResolvedValueOnce({ ...created, preference: preferenceAfter });
      prisma.userProfile.create.mockResolvedValue(created);

      await service.createForUser(userId, {
        gender: ProfileGender.FEMALE,
        partnerAgeMin: 28,
        partnerAgeMax: 40,
      });

      expect(prisma.userProfilePreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { profileId: 'prof_new' },
          create: expect.objectContaining({
            profileId: 'prof_new',
            acceptedPartnerGenders: [],
            partnerAgeMin: 28,
            partnerAgeMax: 40,
          }),
          update: expect.objectContaining({
            partnerAgeMin: 28,
          }),
        }),
      );
    });

    it('patchForUser upserts UserProfilePreference when preference fields are present', async () => {
      const preferenceAfter = {
        id: 'pref_1',
        profileId: baseRow.id,
        partnerAgeMin: null,
        partnerAgeMax: null,
        acceptedPartnerGenders: [] as string[],
        maxDistanceKm: 50,
        updatedAt: new Date('2026-01-02'),
      };
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(profileRow(baseRow))
        .mockResolvedValueOnce({
          ...baseRow,
          desiredPartnerGenders: baseRow.desiredPartnerGenders,
        })
        .mockResolvedValueOnce({ ...baseRow, preference: preferenceAfter });

      await service.patchForUser(userId, {
        maxDistanceKm: 50,
      });

      expect(prisma.userProfile.update).not.toHaveBeenCalled();
      expect(prisma.userProfilePreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { profileId: baseRow.id },
          update: expect.objectContaining({
            maxDistanceKm: 50,
          }),
        }),
      );
    });

    it('patchForUser upserts UserProfilePreference even when only non-preference fields change', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(profileRow(baseRow))
        .mockResolvedValueOnce({
          ...baseRow,
          desiredPartnerGenders: baseRow.desiredPartnerGenders,
        })
        .mockResolvedValueOnce(profileRow({ ...baseRow, aboutMe: 'updated' }));
      prisma.userProfile.update.mockResolvedValue({ ...baseRow, aboutMe: 'updated' });

      await service.patchForUser(userId, { aboutMe: 'updated' });

      // Preference upsert still runs — ensures row exists after any patch
      expect(prisma.userProfilePreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { profileId: baseRow.id } }),
      );
    });

    it('preference upsert failure fails createForUser (atomic rollback)', async () => {
      prisma.userProfile.findUnique.mockResolvedValueOnce(null);
      prisma.userProfile.create.mockResolvedValue({ ...baseRow, id: 'prof_new' });
      prisma.userProfilePreference.upsert.mockRejectedValue(new Error('db error'));

      await expect(
        service.createForUser(userId, { gender: ProfileGender.FEMALE }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);

      expect(obs.error).toHaveBeenCalledWith(
        'me profile create persistence failed',
        'ME_PROFILE_SAVE_FAILED',
        expect.any(Error),
      );
    });

    it('preference upsert failure fails patchForUser (atomic rollback)', async () => {
      prisma.userProfile.findUnique.mockResolvedValueOnce(profileRow(baseRow));
      prisma.userProfile.update.mockResolvedValue({ ...baseRow, aboutMe: 'x' });
      prisma.userProfilePreference.upsert.mockRejectedValue(new Error('db error'));

      await expect(
        service.patchForUser(userId, { aboutMe: 'x' }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);

      expect(obs.error).toHaveBeenCalledWith(
        'me profile patch persistence failed',
        'ME_PROFILE_SAVE_FAILED',
        expect.any(Error),
      );
    });

    /**
     * Real Prisma runs profile + preference inside one interactive transaction; the root
     * client does not "commit" if the callback throws. We simulate that by routing writes
     * through a tx object whose `create`/`update` are not the same mocks as `prisma.*`,
     * while delegating `userProfilePreference.upsert` to `prisma` so
     * `prisma.userProfilePreference.upsert.mockRejectedValue` still drives the failure.
     */
    describe('UserProfilePreference upsert throws (rollback contract)', () => {
      it('createForUser: request fails; root UserProfile create is not invoked', async () => {
        const created = {
          ...baseRow,
          id: 'prof_tx',
          gender: ProfileGender.FEMALE,
        };
        const txCreate = jest.fn().mockResolvedValue(created);
        prisma.userProfile.findUnique
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ desiredPartnerGenders: null });
        prisma.userProfilePreference.upsert.mockRejectedValue(
          new Error('pref upsert failed'),
        );

        prisma.$transaction.mockImplementationOnce(
          async (fn: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              userProfile: {
                create: txCreate,
                update: prisma.userProfile.update,
                findUnique: prisma.userProfile.findUnique,
              },
              userProfilePreference: {
                upsert: (...args: unknown[]) =>
                  prisma.userProfilePreference.upsert(...args),
              },
            };
            return fn(tx);
          },
        );

        await expect(
          service.createForUser(userId, { gender: ProfileGender.FEMALE }),
        ).rejects.toBeInstanceOf(InternalServerErrorException);

        expect(prisma.userProfilePreference.upsert).toHaveBeenCalled();
        expect(txCreate).toHaveBeenCalled();
        expect(prisma.userProfile.create).not.toHaveBeenCalled();
      });

      it('patchForUser: request fails; root UserProfile update is not invoked', async () => {
        const txUpdate = jest
          .fn()
          .mockResolvedValue({ ...baseRow, aboutMe: 'would-rollback' });
        prisma.userProfile.findUnique
          .mockResolvedValueOnce(profileRow(baseRow))
          .mockResolvedValueOnce({
            desiredPartnerGenders: baseRow.desiredPartnerGenders,
          });
        prisma.userProfilePreference.upsert.mockRejectedValue(
          new Error('pref upsert failed'),
        );

        prisma.$transaction.mockImplementationOnce(
          async (fn: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              userProfile: {
                create: prisma.userProfile.create,
                update: txUpdate,
                findUnique: prisma.userProfile.findUnique,
              },
              userProfilePreference: {
                upsert: (...args: unknown[]) =>
                  prisma.userProfilePreference.upsert(...args),
              },
            };
            return fn(tx);
          },
        );

        await expect(
          service.patchForUser(userId, { aboutMe: 'would-rollback' }),
        ).rejects.toBeInstanceOf(InternalServerErrorException);

        expect(prisma.userProfilePreference.upsert).toHaveBeenCalled();
        expect(txUpdate).toHaveBeenCalled();
        expect(prisma.userProfile.update).not.toHaveBeenCalled();
      });
    });

    it('createForUser maps desiredPartnerGenders to acceptedPartnerGenders, drops PREFER_NOT_TO_SAY', async () => {
      const created = { ...baseRow, id: 'prof_pref' };
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(profileRow(created));
      prisma.userProfile.create.mockResolvedValue(created);

      await service.createForUser(userId, {
        gender: ProfileGender.FEMALE,
        desiredPartnerGenders: [ProfileGender.MALE, ProfileGender.PREFER_NOT_TO_SAY],
      });

      expect(prisma.userProfilePreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            acceptedPartnerGenders: [ProfileGender.MALE],
          }),
        }),
      );
    });
  });
});
