/**
 * Sub-split from me-profile.service.spec.ts (Sprint 69 Story 03).
 * legacy table proxy trap + static isolation contract
 */
import { NotFoundException } from '@nestjs/common';
import { ProfileGender, UserProfileStatus } from '@prisma/client';
import {
  createMeProfileServiceTestContext,
  type MeProfileServiceTestContext,
} from './me-profile.service.spec-support';
import type { MeProfileService } from './profile/me-profile.service';

describe('MeProfileService — legacy isolation', () => {
  let service: MeProfileService;
  let prisma: MeProfileServiceTestContext['prisma'];
  let userId: string;
  let baseRow: MeProfileServiceTestContext['baseRow'];
  let profileRow: MeProfileServiceTestContext['profileRow'];
  let buildService: MeProfileServiceTestContext['buildService'];

  beforeEach(() => {
    ({ service, prisma, userId, baseRow, profileRow, buildService } =
      createMeProfileServiceTestContext());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── Runtime call contract — proxy trap ──────────────────────────────────────
  //
  // Every legacy Prisma table delegate is replaced with a Proxy that throws on
  // any property access. MeProfileService methods must complete without triggering
  // any legacy delegate.
  //
  // Proven by: runtime call — the proxy throws immediately if any legacy table is
  // accessed; the test fails before reaching its expect.
  describe('no legacy table writes — runtime call contract (proxy trap)', () => {
    const LEGACY_TABLES = [
      'matchmakingProfile',
      'profileExtractionV2',
      'profileEvaluationRaw',
      'profileEvaluation',
    ] as const;

    function mountLegacyTraps() {
      for (const table of LEGACY_TABLES) {
        (prisma as Record<string, unknown>)[table] = new Proxy(
          {},
          {
            get(_target, prop) {
              throw new Error(
                `LEGACY_TABLE_ACCESSED: ${table}.${String(prop)} must never be called from the active me-profile path`,
              );
            },
          },
        );
      }
    }

    it('getForUser() completes without accessing any legacy table', async () => {
      mountLegacyTraps();
      prisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(service.getForUser(userId)).resolves.toBeNull();
      expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
        include: { preference: true },
      });
    });

    it('createForUser() persists to UserProfile only — no legacy table access', async () => {
      mountLegacyTraps();
      const created = { ...baseRow, gender: ProfileGender.FEMALE };
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...created,
          desiredPartnerGenders: created.desiredPartnerGenders,
        })
        .mockResolvedValueOnce(profileRow(created));
      prisma.userProfile.create.mockResolvedValue(created);

      await expect(
        service.createForUser(userId, { gender: ProfileGender.FEMALE }),
      ).resolves.toBeDefined();
    });

    it('patchForUser() updates UserProfile only — no legacy table access', async () => {
      mountLegacyTraps();
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(profileRow({ ...baseRow, gender: ProfileGender.FEMALE }))
        .mockResolvedValueOnce({
          ...baseRow,
          gender: ProfileGender.FEMALE,
          desiredPartnerGenders: baseRow.desiredPartnerGenders,
        })
        .mockResolvedValueOnce(
          profileRow({
            ...baseRow,
            aboutMe: 'updated',
            gender: ProfileGender.FEMALE,
          }),
        );
      prisma.userProfile.update.mockResolvedValue({
        ...baseRow,
        aboutMe: 'updated',
        gender: ProfileGender.FEMALE,
      });

      await expect(service.patchForUser(userId, { aboutMe: 'updated' })).resolves.toBeDefined();
    });

    it('submitForUser() transitions to SUBMITTED without accessing any legacy table', async () => {
      mountLegacyTraps();
      const submittedAt = new Date();
      prisma.userProfile.findUnique
        .mockResolvedValueOnce({
          ...baseRow,
          status: UserProfileStatus.DRAFT,
          gender: ProfileGender.FEMALE,
        })
        .mockResolvedValueOnce(
          profileRow({
            ...baseRow,
            status: 'SUBMITTED' as UserProfileStatus,
            gender: ProfileGender.FEMALE,
            submittedAt,
            lastAnalysisError: null,
          }),
        );
      prisma.userProfile.update.mockResolvedValue({
        ...baseRow,
        status: 'SUBMITTED' as UserProfileStatus,
        gender: ProfileGender.FEMALE,
        submittedAt,
        lastAnalysisError: null,
      });

      await expect(service.submitForUser(userId)).resolves.toBeDefined();
    });

    it('getLatestAnalysisForUser() reads from UserProfileEvaluation only — no legacy table access', async () => {
      mountLegacyTraps();
      prisma.userProfile.findUnique.mockResolvedValue(baseRow);
      prisma.userProfileEvaluation.findFirst.mockResolvedValue(null);

      await expect(service.getLatestAnalysisForUser(userId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ─── Static isolation contract — no legacy delegates in Prisma mock ───────────
  //
  // Constructs a Prisma mock that contains ONLY userProfile and
  // userProfileEvaluation. Legacy table properties are entirely absent so any
  // runtime access would throw a TypeError. The test passing proves that
  // MeProfileService does not need any legacy delegate at runtime.
  //
  // Proven by: static structure — absent properties vs. proxy traps above.
  describe('static isolation contract — Prisma mock contains only new-model delegates', () => {
    const newModelAnalysis = { runForUser: jest.fn().mockResolvedValue(undefined) };

    it('getForUser() succeeds with a Prisma mock that has no legacy table delegates', async () => {
      const newModelOnlyPrisma = {
        userProfile: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          update: jest.fn(),
        },
        userProfileEvaluation: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      const svc = buildService({ prisma: newModelOnlyPrisma });

      await expect(svc.getForUser(userId)).resolves.toBeNull();
    });

    it('submitForUser() succeeds with a Prisma mock that has no legacy table delegates', async () => {
      const now = new Date('2026-04-18T00:00:00.000Z');
      const newModelOnlyPrisma = {
        userProfile: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              ...baseRow,
              status: UserProfileStatus.DRAFT,
              gender: ProfileGender.FEMALE,
            })
            .mockResolvedValueOnce({
              ...baseRow,
              status: 'SUBMITTED' as UserProfileStatus,
              gender: ProfileGender.FEMALE,
              submittedAt: now,
              lastAnalysisError: null,
              preference: null,
            }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({
            ...baseRow,
            status: 'SUBMITTED' as UserProfileStatus,
            gender: ProfileGender.FEMALE,
            submittedAt: now,
            lastAnalysisError: null,
          }),
        },
        userProfileEvaluation: { findFirst: jest.fn().mockResolvedValue(null) },
        userProfilePhoto: { count: jest.fn().mockResolvedValue(1) },
      };
      const svc = buildService({ prisma: newModelOnlyPrisma });

      const result = await svc.submitForUser(userId);
      expect(result.analysisJobId).toBe('job_1');
      expect(result.profile.status).toBe('SUBMITTED');
      // Legacy tables absent from mock — if accessed they would throw TypeError.
      // Test passing proves UserProfile is the sole write target.
    });
  });
});
