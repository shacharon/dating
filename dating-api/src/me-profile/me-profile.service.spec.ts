import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Prisma,
  ProfileGender,
  UserProfileOnboardingStep,
  UserProfileStatus,
} from '@prisma/client';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { MeProfileAnalysisService } from './me-profile-analysis.service';
import { MeProfileService } from './me-profile.service';

describe('MeProfileService', () => {
  const userId = 'user_svc_1';
  const baseRow = {
    id: 'prof_1',
    userId,
    status: UserProfileStatus.DRAFT,
    onboardingStep: UserProfileOnboardingStep.BASIC,
    gender: ProfileGender.FEMALE,
    aboutMe: 'a' as string | null,
    aboutPartner: null as string | null,
    aboutRelationship: null as string | null,
    desiredPartnerGenders: null as unknown,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  /** `findUnique` with `include: { preference: true }` — HG prefs are not on `UserProfile` (Phase F). */
  function profileRow<T extends Record<string, unknown>>(row: T) {
    return { ...row, preference: null };
  }

  let prisma: {
    $transaction: jest.Mock;
    userProfile: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    userProfileEvaluation: { findFirst: jest.Mock };
    userProfilePreference: { upsert: jest.Mock };
  };
  let service: MeProfileService;
  let obs: jest.Mocked<
    Pick<
      StructuredObservabilityService,
      'trace' | 'error' | 'fatal' | 'httpServerError'
    >
  >;
  let analysis: jest.Mocked<Pick<MeProfileAnalysisService, 'runForUser'>>;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
      ),
      userProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userProfileEvaluation: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      userProfilePreference: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    obs = {
      trace: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      httpServerError: jest.fn(),
    };
    analysis = { runForUser: jest.fn().mockResolvedValue(undefined) };
    service = new MeProfileService(
      prisma as unknown as PrismaService,
      obs as unknown as StructuredObservabilityService,
      analysis as unknown as MeProfileAnalysisService,
    );
  });

  it('getForUser returns null when row missing', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    await expect(service.getForUser(userId)).resolves.toBeNull();
    expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId },
      include: { preference: true },
    });
  });

  it('getForUser maps row to response DTO', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(profileRow(baseRow));
    const r = await service.getForUser(userId);
    expect(r).toMatchObject({
      id: 'prof_1',
      userId,
      status: UserProfileStatus.DRAFT,
      aboutMe: 'a',
      birthDate: null,
      gender: ProfileGender.FEMALE,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
    });
    expect(r?.createdAt).toEqual(baseRow.createdAt);
  });

  it('createForUser creates DRAFT with default gender when body is empty (onboarding step 1)', async () => {
    const created = {
      ...baseRow,
      gender: ProfileGender.PREFER_NOT_TO_SAY,
      aboutMe: null,
    };
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...created,
        desiredPartnerGenders: created.desiredPartnerGenders,
      })
      .mockResolvedValueOnce(profileRow(created));
    prisma.userProfile.create.mockResolvedValue(created);

    await service.createForUser(userId, {});

    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: { connect: { id: userId } },
        status: UserProfileStatus.DRAFT,
        gender: ProfileGender.PREFER_NOT_TO_SAY,
      }),
    });
  });

  it('createForUser rejects TEXTS onboarding without desiredPartnerGenders', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    await expect(
      service.createForUser(userId, {
        onboardingStep: UserProfileOnboardingStep.TEXTS,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'onboarding_partner_genders_required',
      }),
    });
    expect(prisma.userProfile.create).not.toHaveBeenCalled();
  });

  it('createForUser throws ConflictException when profile exists', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(baseRow);
    await expect(
      service.createForUser(userId, { gender: ProfileGender.FEMALE }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.userProfile.create).not.toHaveBeenCalled();
  });

  it('createForUser persists DRAFT with picked fields', async () => {
    const created = { ...baseRow, aboutMe: 'new', gender: ProfileGender.FEMALE };
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...created,
        desiredPartnerGenders: created.desiredPartnerGenders,
      })
      .mockResolvedValueOnce(profileRow(created));
    prisma.userProfile.create.mockResolvedValue(created);

    const r = await service.createForUser(userId, {
      gender: ProfileGender.FEMALE,
      aboutMe: 'new',
      desiredPartnerGenders: [ProfileGender.MALE],
      onboardingStep: UserProfileOnboardingStep.TEXTS,
    });

    expect(r.aboutMe).toBe('new');
    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: { connect: { id: userId } },
        status: UserProfileStatus.DRAFT,
        aboutMe: 'new',
        onboardingStep: UserProfileOnboardingStep.TEXTS,
      }),
    });
  });

  it('patchForUser throws NotFoundException when profile missing', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    await expect(
      service.patchForUser(userId, { aboutMe: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  it('patchForUser returns existing without update when body is empty', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(profileRow(baseRow));
    const r = await service.patchForUser(userId, {});
    expect(r).toMatchObject({ id: 'prof_1', aboutMe: 'a' });
    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  it('patchForUser updates when fields provided', async () => {
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(profileRow(baseRow))
      .mockResolvedValueOnce({
        ...baseRow,
        desiredPartnerGenders: baseRow.desiredPartnerGenders,
      })
      .mockResolvedValueOnce(
        profileRow({
          ...baseRow,
          aboutMe: 'patched',
          updatedAt: new Date('2026-01-03'),
        }),
      );
    prisma.userProfile.update.mockResolvedValue({
      ...baseRow,
      aboutMe: 'patched',
      updatedAt: new Date('2026-01-03'),
    });

    const r = await service.patchForUser(userId, { aboutMe: 'patched' });

    expect(r.aboutMe).toBe('patched');
    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId },
      data: { aboutMe: 'patched' },
    });
  });

  it('patchForUser rejects COMPLETED onboarding when text fields are incomplete', async () => {
    prisma.userProfile.findUnique.mockResolvedValueOnce(profileRow(baseRow));
    await expect(
      service.patchForUser(userId, {
        onboardingStep: UserProfileOnboardingStep.COMPLETED,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'onboarding_texts_incomplete' }),
    });
    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  it('patchForUser persists COMPLETED onboarding with completion timestamp', async () => {
    const rich = {
      ...baseRow,
      aboutMe: 'me',
      aboutPartner: 'them',
      aboutRelationship: 'us',
    };
    const completedAt = new Date('2026-01-10T12:00:00.000Z');
    jest.useFakeTimers({ now: completedAt });
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(profileRow(rich))
      .mockResolvedValueOnce({
        ...rich,
        desiredPartnerGenders: rich.desiredPartnerGenders,
      })
      .mockResolvedValueOnce(
        profileRow({
          ...rich,
          onboardingStep: UserProfileOnboardingStep.COMPLETED,
          onboardingCompletedAt: completedAt,
        }),
      );
    prisma.userProfile.update.mockResolvedValue({
      ...rich,
      onboardingStep: UserProfileOnboardingStep.COMPLETED,
      onboardingCompletedAt: completedAt,
    });

    const r = await service.patchForUser(userId, {
      onboardingStep: UserProfileOnboardingStep.COMPLETED,
    });
    jest.useRealTimers();

    expect(r.onboardingStep).toBe(UserProfileOnboardingStep.COMPLETED);
    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId },
      data: expect.objectContaining({
        onboardingStep: UserProfileOnboardingStep.COMPLETED,
        onboardingCompletedAt: completedAt,
      }),
    });
  });

  it('createForUser maps identity fields to Prisma', async () => {
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        profileRow({
          ...baseRow,
          birthDate: new Date('1991-06-15'),
          gender: ProfileGender.FEMALE,
          desiredPartnerGenders: ['MALE', ProfileGender.NON_BINARY],
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv',
        }),
      );
    const created = {
      ...baseRow,
      birthDate: new Date('1991-06-15'),
      gender: ProfileGender.FEMALE,
      desiredPartnerGenders: ['MALE', ProfileGender.NON_BINARY],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv',
    };
    prisma.userProfile.create.mockResolvedValue(created);

    await service.createForUser(userId, {
      birthDate: '1991-06-15',
      gender: ProfileGender.FEMALE,
      desiredPartnerGenders: [ProfileGender.MALE, ProfileGender.NON_BINARY],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv',
    });

    expect(prisma.userProfile.findUnique).toHaveBeenLastCalledWith({
      where: { userId },
      include: { preference: true },
    });
    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        birthDate: new Date('1991-06-15'),
        gender: ProfileGender.FEMALE,
        desiredPartnerGenders: [ProfileGender.MALE, ProfileGender.NON_BINARY],
        city: 'TLV',
        country: 'IL',
        locationLabel: 'Tel Aviv',
      }),
    });
  });

  it('getForUser maps enriched row and parses desiredPartnerGenders JSON', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      profileRow({
        ...baseRow,
        birthDate: new Date('1990-05-01T00:00:00.000Z'),
        gender: ProfileGender.MALE,
        desiredPartnerGenders: ['FEMALE', 'OTHER'],
        city: 'Haifa',
        country: 'IL',
        locationLabel: 'Haifa, IL',
      }),
    );
    const r = await service.getForUser(userId);
    expect(r?.birthDate).toEqual(new Date('1990-05-01T00:00:00.000Z'));
    expect(r?.gender).toBe(ProfileGender.MALE);
    expect(r?.desiredPartnerGenders).toEqual(['FEMALE', 'OTHER']);
    expect(r?.city).toBe('Haifa');
    expect(r?.country).toBe('IL');
    expect(r?.locationLabel).toBe('Haifa, IL');
  });

  it('patchForUser clears desiredPartnerGenders with null', async () => {
    prisma.userProfile.findUnique
      .mockResolvedValueOnce(profileRow(baseRow))
      .mockResolvedValueOnce(
        profileRow({
          ...baseRow,
          desiredPartnerGenders: null,
        }),
      );
    prisma.userProfile.update.mockResolvedValue({
      ...baseRow,
      desiredPartnerGenders: null,
    });

    await service.patchForUser(userId, { desiredPartnerGenders: null });

    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId },
      data: { desiredPartnerGenders: Prisma.DbNull },
    });
  });

  // ---------------------------------------------------------------------------
  // submitForUser
  // ---------------------------------------------------------------------------

  describe('submitForUser', () => {
    it('throws NotFoundException when profile missing', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);
      await expect(service.submitForUser(userId)).rejects.toBeInstanceOf(
        NotFoundException,
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
      'throws UnprocessableEntityException when gender is %s',
      async (_label, gender) => {
        prisma.userProfile.findUnique.mockResolvedValue({
          ...baseRow,
          status: UserProfileStatus.DRAFT,
          gender: gender as unknown as typeof baseRow.gender,
        });
        await expect(service.submitForUser(userId)).rejects.toMatchObject({
          response: expect.objectContaining({ error: 'gender_required' }),
        });
        expect(prisma.userProfile.update).not.toHaveBeenCalled();
        expect(analysis.runForUser).not.toHaveBeenCalled();
      },
    );

    it.each([S.SUBMITTED, S.ANALYZING])(
      'throws UnprocessableEntityException when status is %s',
      async (status) => {
        // status guard fires before gender guard — gender=null is intentional here
        prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status, gender: null });
        await expect(service.submitForUser(userId)).rejects.toBeInstanceOf(
          UnprocessableEntityException,
        );
        expect(prisma.userProfile.update).not.toHaveBeenCalled();
        expect(analysis.runForUser).not.toHaveBeenCalled();
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
        expect(r.status).toBe(S.SUBMITTED);
        expect(r.submittedAt).toEqual(now);
        // Analysis should be triggered as fire-and-forget
        expect(analysis.runForUser).toHaveBeenCalledWith(userId);

        jest.useRealTimers();
      },
    );

    it('throws InternalServerErrorException when Prisma update rejects', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({
        ...baseRow,
        status: UserProfileStatus.DRAFT,
        gender: ProfileGender.FEMALE,
      });
      prisma.userProfile.update.mockRejectedValue(new Error('db error'));

      await expect(service.submitForUser(userId)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(obs.error).toHaveBeenCalledWith(
        expect.stringContaining('submit persistence failed'),
        'ME_PROFILE_SUBMIT_FAILED',
        expect.any(Error),
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

      expect(r.lastAnalysisError).toBeNull();
      expect(prisma.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lastAnalysisError: null }),
        }),
      );
    });
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
      const svc = new MeProfileService(
        newModelOnlyPrisma as unknown as PrismaService,
        obs as unknown as StructuredObservabilityService,
        newModelAnalysis as unknown as MeProfileAnalysisService,
      );

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
      };
      const svc = new MeProfileService(
        newModelOnlyPrisma as unknown as PrismaService,
        obs as unknown as StructuredObservabilityService,
        newModelAnalysis as unknown as MeProfileAnalysisService,
      );

      const result = await svc.submitForUser(userId);
      expect(result.status).toBe('SUBMITTED');
      // Legacy tables absent from mock — if accessed they would throw TypeError.
      // Test passing proves UserProfile is the sole write target.
    });
  });

  describe('getLatestAnalysisForUser', () => {
    it('throws NotFoundException when profile missing', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);
      await expect(service.getLatestAnalysisForUser(userId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.userProfileEvaluation.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when no UserProfileEvaluation row exists', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(baseRow);
      prisma.userProfileEvaluation.findFirst.mockResolvedValue(null);

      await expect(service.getLatestAnalysisForUser(userId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.userProfileEvaluation.findFirst).toHaveBeenCalledWith({
        where: { profileId: 'prof_1' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      expect(obs.trace).not.toHaveBeenCalledWith(
        expect.stringContaining('me profile latest analysis'),
        'ME_PROFILE_ANALYSIS_LATEST_OK',
      );
    });

    it('returns latest evaluation snapshot when row exists', async () => {
      const createdAt = new Date('2026-04-15T14:00:00.000Z');
      prisma.userProfile.findUnique.mockResolvedValue(baseRow);
      prisma.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'upeval_1',
        profileId: 'prof_1',
        version: 'v1',
        evaluationJson: { ok: true, self: {} },
        createdAt,
      });

      const r = await service.getLatestAnalysisForUser(userId);

      expect(prisma.userProfileEvaluation.findFirst).toHaveBeenCalledWith({
        where: { profileId: 'prof_1' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      expect(r.userProfileId).toBe('prof_1');
      expect(r.evaluationId).toBe('upeval_1');
      expect(r.createdAt).toBe(createdAt.toISOString());
      expect(r.evaluationJson).toEqual({ ok: true, self: {} });
    });

    it('returns only the single row from latestEvaluationForProfile (no merge with older evaluations)', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(baseRow);
      prisma.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_latest_only',
        profileId: 'prof_1',
        version: 'v1',
        evaluationJson: { run: 'latest' },
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
      });

      const r = await service.getLatestAnalysisForUser(userId);

      expect(r.evaluationId).toBe('eval_latest_only');
      expect(r.evaluationJson).toEqual({ run: 'latest' });
    });
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
        minimumPartnerEducation: null,
        acceptedPartnerGenders: [] as string[],
        acceptedPartnerSmoking: ['NONE_ONLY'],
        acceptedPartnerAlcohol: ['MODERATE_OK'],
        acceptedPartnerReligions: [] as string[],
        partnerWantsChildren: null,
        partnerHasChildren: null,
        maxDistanceKm: null,
        similarityPreference: null,
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
        acceptedPartnerSmoking: ['NONE_ONLY'] as never,
        acceptedPartnerAlcohol: ['MODERATE_OK'] as never,
        partnerAgeMin: 28,
        partnerAgeMax: 40,
      });

      expect(prisma.userProfilePreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { profileId: 'prof_new' },
          create: expect.objectContaining({
            profileId: 'prof_new',
            acceptedPartnerGenders: [],
            acceptedPartnerSmoking: ['NONE_ONLY'],
            acceptedPartnerAlcohol: ['MODERATE_OK'],
            partnerAgeMin: 28,
            partnerAgeMax: 40,
          }),
          update: expect.objectContaining({
            acceptedPartnerSmoking: ['NONE_ONLY'],
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
        minimumPartnerEducation: null,
        acceptedPartnerGenders: [] as string[],
        acceptedPartnerSmoking: [] as string[],
        acceptedPartnerAlcohol: [] as string[],
        acceptedPartnerReligions: ['JEWISH'] as string[],
        partnerWantsChildren: null,
        partnerHasChildren: null,
        maxDistanceKm: 50,
        similarityPreference: null,
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
        acceptedPartnerReligions: ['JEWISH'] as never,
        maxDistanceKm: 50,
      });

      expect(prisma.userProfile.update).not.toHaveBeenCalled();
      expect(prisma.userProfilePreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { profileId: baseRow.id },
          update: expect.objectContaining({
            acceptedPartnerReligions: ['JEWISH'],
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
