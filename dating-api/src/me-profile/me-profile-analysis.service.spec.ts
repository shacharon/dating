import { UserProfileStatus } from '@prisma/client';
import type { EvaluateService } from '../evaluate/evaluate.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import {
  buildAnalysisContext,
  EVALUATION_VERSION,
  latestEvaluationForProfile,
  latestEvaluationsForProfileIds,
  mapDbFirstColumnsFromEvaluation,
  MeProfileAnalysisService,
} from './me-profile-analysis.service';

// String casts until `prisma generate` is run after the migration.
const S = {
  SUBMITTED: 'SUBMITTED' as UserProfileStatus,
  ANALYZING: 'ANALYZING' as UserProfileStatus,
  ANALYZED: 'ANALYZED' as UserProfileStatus,
  FAILED: 'FAILED' as UserProfileStatus,
};

const baseRow = {
  id: 'prof_analysis_1',
  userId: 'user_analysis_1',
  status: S.SUBMITTED,
  onboardingStep: 'BASIC',
  name: '',
  aboutMe: 'I love hiking',
  aboutPartner: 'Looking for kindness',
  aboutRelationship: 'Long term',
  birthDate: new Date('1990-01-01T00:00:00.000Z'),
  gender: 'MALE' as const,
  desiredPartnerGenders: ['FEMALE'],
  city: 'TLV',
  country: 'IL',
  locationLabel: 'Tel Aviv, IL',
  submittedAt: new Date(),
  analyzedAt: null as Date | null,
  lastAnalysisError: null as string | null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

describe('MeProfileAnalysisService', () => {
  const userId = baseRow.userId;

  let prisma: {
    userProfile: { findUnique: jest.Mock; update: jest.Mock };
    userProfileEvaluation: { create: jest.Mock };
    userProfileSignal: { deleteMany: jest.Mock; upsert: jest.Mock };
    userProfileInterest: { deleteMany: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let evaluate: jest.Mocked<Pick<EvaluateService, 'evaluateBatch'>>;
  let obs: jest.Mocked<
    Pick<StructuredObservabilityService, 'trace' | 'error'>
  >;
  let service: MeProfileAnalysisService;

  beforeEach(() => {
    prisma = {
      userProfile: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      userProfileEvaluation: {
        create: jest.fn().mockResolvedValue({}),
      },
      userProfileSignal: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
      userProfileInterest: {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      // Simulate Prisma batch transaction: execute all promises in the array.
      $transaction: jest
        .fn()
        .mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    evaluate = { evaluateBatch: jest.fn() };
    obs = { trace: jest.fn(), error: jest.fn() };
    service = new MeProfileAnalysisService(
      prisma as unknown as PrismaService,
      evaluate as unknown as EvaluateService,
      obs as unknown as StructuredObservabilityService,
    );
  });

  it('skips when profile is not found', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);

    await service.runForUser(userId);

    expect(prisma.userProfile.update).not.toHaveBeenCalled();
    expect(evaluate.evaluateBatch).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('skipped'),
      'ME_PROFILE_ANALYSIS_SKIPPED',
    );
  });

  it.each([UserProfileStatus.DRAFT, S.ANALYZING, S.ANALYZED, S.FAILED])(
    'skips when profile status is %s (not SUBMITTED)',
    async (status) => {
      prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status });

      await service.runForUser(userId);

      expect(prisma.userProfile.update).not.toHaveBeenCalled();
      expect(evaluate.evaluateBatch).not.toHaveBeenCalled();
      expect(obs.trace).toHaveBeenCalledWith(
        expect.stringContaining('skipped'),
        'ME_PROFILE_ANALYSIS_SKIPPED',
      );
    },
  );

  it('transitions SUBMITTED → ANALYZING → ANALYZED on success', async () => {
    const now = new Date('2026-04-15T12:00:00.000Z');
    jest.useFakeTimers({ now });

    const fakeResult = { self: {}, partner: {}, relationship: {} };
    prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
    evaluate.evaluateBatch.mockResolvedValue({ ok: true, result: fakeResult } as never);

    await service.runForUser(userId);

    // First update (direct call): ANALYZING
    expect(prisma.userProfile.update).toHaveBeenNthCalledWith(1, {
      where: { userId },
      data: { status: S.ANALYZING },
    });

    // evaluateBatch called with text fields from UserProfile
    expect(evaluate.evaluateBatch).toHaveBeenCalledWith({
      aboutMe: 'I love hiking',
      aboutPartner: 'Looking for kindness',
      aboutRelationship: 'Long term',
      profileId: baseRow.id,
    });

    // Atomic transaction: ANALYZED status update + evaluation snapshot
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    // Inside the transaction: second update call → ANALYZED
    expect(prisma.userProfile.update).toHaveBeenNthCalledWith(2, {
      where: { userId },
      data: {
        status: S.ANALYZED,
        analyzedAt: now,
        lastAnalysisError: null,
        interestsTop: [],
        sigEmotionalDepth: null,
        sigLifestylePace: null,
        sigConflictStyle: null,
        sigIndependence: null,
        sigSocialBattery: null,
      },
    });

    // Inside the transaction: evaluation snapshot created
    expect(prisma.userProfileEvaluation.create).toHaveBeenCalledWith({
      data: {
        profileId: baseRow.id,
        version: EVALUATION_VERSION,
        evaluationJson: fakeResult,
      },
    });

    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('analysis complete'),
      'ME_PROFILE_ANALYSIS_SUCCESS',
    );

    jest.useRealTimers();
  });

  it('transitions SUBMITTED → ANALYZING → FAILED when evaluateBatch throws', async () => {
    prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
    const boom = new Error('LLM timeout');
    evaluate.evaluateBatch.mockRejectedValue(boom);

    await service.runForUser(userId);

    // First update (direct): ANALYZING
    expect(prisma.userProfile.update).toHaveBeenNthCalledWith(1, {
      where: { userId },
      data: { status: S.ANALYZING },
    });

    // $transaction never reached because evaluateBatch threw first
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.userProfileEvaluation.create).not.toHaveBeenCalled();

    // Second update (fallback): FAILED
    expect(prisma.userProfile.update).toHaveBeenNthCalledWith(2, {
      where: { userId },
      data: {
        status: S.FAILED,
        lastAnalysisError: 'LLM timeout',
      },
    });

    expect(obs.error).toHaveBeenCalledWith(
      expect.stringContaining('analysis failed'),
      'ME_PROFILE_ANALYSIS_FAILED',
      boom,
    );
  });

  it('truncates lastAnalysisError to 500 chars', async () => {
    prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
    evaluate.evaluateBatch.mockRejectedValue(new Error('x'.repeat(600)));

    await service.runForUser(userId);

    const failCall = prisma.userProfile.update.mock.calls.find(
      (c) => c[0].data.status === S.FAILED,
    );
    expect(failCall).toBeDefined();
    expect(failCall![0].data.lastAnalysisError).toHaveLength(500);
  });

  it('returns without calling evaluateBatch when ANALYZING update fails', async () => {
    prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
    const dbErr = new Error('DB connection lost');
    prisma.userProfile.update.mockRejectedValue(dbErr);

    await service.runForUser(userId);

    expect(evaluate.evaluateBatch).not.toHaveBeenCalled();
    expect(prisma.userProfileEvaluation.create).not.toHaveBeenCalled();
    expect(obs.error).toHaveBeenCalledWith(
      expect.stringContaining('failed to set ANALYZING'),
      'ME_PROFILE_ANALYSIS_FAILED',
      dbErr,
    );
    // Only one update attempt (the ANALYZING one that failed)
    expect(prisma.userProfile.update).toHaveBeenCalledTimes(1);
  });

  it('sets FAILED when the atomic transaction (ANALYZED + evaluation) throws', async () => {
    // Scenario: LLM pipeline completes fine, but the atomic DB write fails.
    // The system must move to FAILED as a safe unknown-state fallback.
    //
    // Note on call order: Prisma batch transactions take an array of eager promises,
    // so prisma.userProfile.update({ ANALYZED }) is called when *building* the array
    // (call #2), even though $transaction rejects. The FAILED fallback is call #3.
    prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
    evaluate.evaluateBatch.mockResolvedValue({ ok: true, result: {} } as never);
    const txErr = new Error('transaction failed');
    prisma.$transaction.mockRejectedValueOnce(txErr);

    await service.runForUser(userId);

    expect(evaluate.evaluateBatch).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // Call #1: ANALYZING (direct)
    expect(prisma.userProfile.update).toHaveBeenNthCalledWith(1, {
      where: { userId },
      data: { status: S.ANALYZING },
    });
    // Call #3: FAILED fallback (call #2 was the ANALYZED arg built into the array)
    expect(prisma.userProfile.update).toHaveBeenNthCalledWith(3, {
      where: { userId },
      data: {
        status: S.FAILED,
        lastAnalysisError: 'transaction failed',
      },
    });
    expect(obs.error).toHaveBeenCalledWith(
      expect.stringContaining('analysis failed'),
      'ME_PROFILE_ANALYSIS_FAILED',
      txErr,
    );
  });

  it('does not call $transaction when evaluateBatch throws', async () => {
    prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
    evaluate.evaluateBatch.mockRejectedValue(new Error('LLM down'));

    await service.runForUser(userId);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not throw even when the FAILED fallback update itself rejects', async () => {
    prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
    evaluate.evaluateBatch.mockRejectedValue(new Error('boom'));
    // ANALYZING update succeeds; FAILED fallback update rejects — must not surface
    prisma.userProfile.update
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('db down'));

    await expect(service.runForUser(userId)).resolves.toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Phase C dual-write: UserProfileSignal + UserProfileInterest (same transaction as
  // UserProfileEvaluation.create; evalVersion is pipeline tag — no evaluationId FK)
  // ---------------------------------------------------------------------------

  describe('Phase C dual-write: normalized signal + interest rows', () => {
    it('upserts UserProfileSignal rows for each non-null signal in the transaction', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
      evaluate.evaluateBatch.mockResolvedValue({
        ok: true,
        result: {
          self: {
            signals: {
              emotionalDepth: 7,
              lifestylePace: 5,
              conflictStyle: 8,
              independence: 6,
              socialBattery: 9,
            },
          },
          partner: {},
          relationship: {},
        },
      } as never);

      await service.runForUser(userId);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.userProfileSignal.deleteMany).toHaveBeenCalledWith({
        where: { profileId: baseRow.id },
      });
      expect(prisma.userProfileSignal.upsert).toHaveBeenCalledTimes(5);
      expect(prisma.userProfileSignal.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { profileId_signalKey: { profileId: baseRow.id, signalKey: 'emotionalDepth' } },
          create: expect.objectContaining({
            signalKey: 'emotionalDepth',
            signalValue: 7,
            evalVersion: EVALUATION_VERSION,
          }),
          // update omits signalKey (it's the unique key; never re-set on update)
          update: expect.objectContaining({ signalValue: 7, evalVersion: EVALUATION_VERSION }),
        }),
      );
    });

    it('creates UserProfileEvaluation before wiping UserProfileSignal (transaction op build order)', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
      evaluate.evaluateBatch.mockResolvedValue({
        ok: true,
        result: {
          self: { signals: { emotionalDepth: 3 } },
          partner: {},
          relationship: {},
        },
      } as never);

      await service.runForUser(userId);

      const evalOrder = prisma.userProfileEvaluation.create.mock.invocationCallOrder[0]!;
      const signalDeleteOrder = prisma.userProfileSignal.deleteMany.mock.invocationCallOrder[0]!;
      expect(evalOrder).toBeLessThan(signalDeleteOrder);
    });

    it('creates UserProfileEvaluation before deleting UserProfileInterest (transaction op build order)', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
      evaluate.evaluateBatch.mockResolvedValue({
        ok: true,
        result: {
          self: {},
          partner: {},
          relationship: {},
          enrichment: { signals: { interestsTop3: ['Reading'] } },
        },
      } as never);

      await service.runForUser(userId);

      const evalOrder = prisma.userProfileEvaluation.create.mock.invocationCallOrder[0]!;
      const interestDeleteOrder =
        prisma.userProfileInterest.deleteMany.mock.invocationCallOrder[0]!;
      expect(evalOrder).toBeLessThan(interestDeleteOrder);
    });

    it('skips UserProfileSignal rows for null / out-of-range signals', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
      evaluate.evaluateBatch.mockResolvedValue({
        ok: true,
        result: {
          self: { signals: { emotionalDepth: 0, lifestylePace: 11 } }, // both out of 1–10 range
          partner: {},
          relationship: {},
        },
      } as never);

      await service.runForUser(userId);

      expect(prisma.userProfileSignal.deleteMany).toHaveBeenCalledWith({
        where: { profileId: baseRow.id },
      });
      expect(prisma.userProfileSignal.upsert).not.toHaveBeenCalled();
    });

    it('deletes then re-creates UserProfileInterest rows for top interests', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
      evaluate.evaluateBatch.mockResolvedValue({
        ok: true,
        result: {
          self: {},
          partner: {},
          relationship: {},
          enrichment: { signals: { interestsTop3: ['Hiking', 'Coffee', 'Travel'] } },
        },
      } as never);

      await service.runForUser(userId);

      expect(prisma.userProfileInterest.deleteMany).toHaveBeenCalledWith({
        where: { profileId: baseRow.id },
      });
      expect(prisma.userProfileInterest.create).toHaveBeenCalledTimes(3);
      expect(prisma.userProfileInterest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tag: 'hiking',
          rank: 1,
          source: 'enrichment',
          evalVersion: EVALUATION_VERSION,
        }),
      });
      expect(prisma.userProfileInterest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tag: 'coffee', rank: 2, evalVersion: EVALUATION_VERSION }),
      });
      expect(prisma.userProfileInterest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tag: 'travel', rank: 3, evalVersion: EVALUATION_VERSION }),
      });
    });

    it('still deletes interests and creates zero rows when no interests are present', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
      evaluate.evaluateBatch.mockResolvedValue({
        ok: true,
        result: { self: {}, partner: {}, relationship: {} },
      } as never);

      await service.runForUser(userId);

      expect(prisma.userProfileInterest.deleteMany).toHaveBeenCalledWith({
        where: { profileId: baseRow.id },
      });
      expect(prisma.userProfileInterest.create).not.toHaveBeenCalled();
    });

    it('all normalized writes are included in the same $transaction as UserProfile.update', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
      evaluate.evaluateBatch.mockResolvedValue({
        ok: true,
        result: {
          self: { signals: { socialBattery: 4 } },
          partner: {},
          relationship: {},
          enrichment: { signals: { interestsTop3: ['Music'] } },
        },
      } as never);

      await service.runForUser(userId);

      // All operations land in one $transaction call — not separate round-trips.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // Verify the update, evaluation create, signal upsert, and interest ops all fired.
      expect(prisma.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: S.ANALYZED }) }),
      );
      expect(prisma.userProfileEvaluation.create).toHaveBeenCalledTimes(1);
      expect(prisma.userProfileSignal.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.userProfileInterest.deleteMany).toHaveBeenCalledTimes(1);
      expect(prisma.userProfileInterest.create).toHaveBeenCalledTimes(1);
      expect(prisma.userProfileInterest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tag: 'music', rank: 1, evalVersion: EVALUATION_VERSION }),
      });
    });

    it('UserProfile.update includes denorm columns (interestsTop, sig*) from same evaluationJson', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
      evaluate.evaluateBatch.mockResolvedValue({
        ok: true,
        result: {
          self: {
            signals: {
              emotionalDepth: 7,
              lifestylePace: 5,
              conflictStyle: 8,
              independence: 6,
              socialBattery: 9,
            },
          },
          partner: {},
          relationship: {},
          enrichment: { signals: { interestsTop3: ['Hiking', 'Coffee', 'Travel'] } },
        },
      } as never);

      await service.runForUser(userId);

      expect(prisma.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: S.ANALYZED,
            interestsTop: ['hiking', 'coffee', 'travel'],
            sigEmotionalDepth: 7,
            sigLifestylePace: 5,
            sigConflictStyle: 8,
            sigIndependence: 6,
            sigSocialBattery: 9,
          }),
        }),
      );
    });

    it('UserProfile.update uses lowercase interests (casing fix)', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ ...baseRow, status: S.SUBMITTED });
      evaluate.evaluateBatch.mockResolvedValue({
        ok: true,
        result: {
          self: {},
          partner: {},
          relationship: {},
          enrichment: { signals: { interestsTop3: ['YOGA', 'Running', 'CoOkInG'] } },
        },
      } as never);

      await service.runForUser(userId);

      expect(prisma.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            interestsTop: ['yoga', 'running', 'cooking'],
          }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Contract: no legacy table writes
  // ---------------------------------------------------------------------------
  //
  // Mounts a Proxy trap on every legacy Prisma table. Any access (upsert, create,
  // update, etc.) throws LEGACY_TABLE_ACCESSED. The test passes only when the
  // full happy-path run completes without triggering any legacy table.
  //
  // If a future change accidentally injects ProfilesPrismaService or
  // ExtractionV2PersistenceService into MeProfileAnalysisService, this test will
  // catch it immediately.
  describe('no legacy table writes (contract enforcement)', () => {
    const LEGACY_TABLES = [
      'matchmakingProfile',
      'profileExtractionV2',
      'profileEvaluationRaw',
      'profileEvaluation',
    ] as const;

    beforeEach(() => {
      for (const table of LEGACY_TABLES) {
        (prisma as Record<string, unknown>)[table] = new Proxy(
          {},
          {
            get(_target, prop) {
              throw new Error(
                `LEGACY_TABLE_ACCESSED: ${table}.${String(prop)} must never be called from the new product analysis flow`,
              );
            },
          },
        );
      }
    });

    it('completes the full happy-path without accessing any legacy table', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({
        ...baseRow,
        status: S.SUBMITTED,
      });
      evaluate.evaluateBatch.mockResolvedValue({
        ok: true,
        result: { self: {}, partner: {}, relationship: {} },
      } as never);

      await expect(service.runForUser(userId)).resolves.toBeUndefined();

      expect(prisma.userProfile.update).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.userProfileEvaluation.create).toHaveBeenCalled();
    });

    it('completes the FAILED path without accessing any legacy table', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({
        ...baseRow,
        status: S.SUBMITTED,
      });
      evaluate.evaluateBatch.mockRejectedValue(new Error('LLM failure'));

      await expect(service.runForUser(userId)).resolves.toBeUndefined();

      expect(prisma.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: S.FAILED }) }),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// latestEvaluationForProfile unit tests
// ---------------------------------------------------------------------------

describe('latestEvaluationsForProfileIds', () => {
  it('loads each distinct profileId via latestEvaluationForProfile only (no findMany)', async () => {
    const t1 = new Date('2026-01-01T00:00:00.000Z');
    const t3 = new Date('2026-01-03T00:00:00.000Z');
    const findFirst = jest.fn().mockImplementation(({ where: { profileId } }) => {
      if (profileId === 'p1') {
        return Promise.resolve({
          profileId: 'p1',
          evaluationJson: { v: 'latest_p1' },
          createdAt: t3,
          version: 'v1',
        });
      }
      if (profileId === 'p2') {
        return Promise.resolve({
          profileId: 'p2',
          evaluationJson: { v: 'only_p2' },
          createdAt: t1,
          version: 'v1',
        });
      }
      return Promise.resolve(null);
    });
    const mockPrisma = {
      userProfileEvaluation: { findFirst },
    };

    const map = await latestEvaluationsForProfileIds(
      mockPrisma as unknown as import('../prisma/prisma.service').PrismaService,
      ['p1', 'p2'],
    );

    expect(findFirst).toHaveBeenCalledTimes(2);
    expect(findFirst).toHaveBeenCalledWith({
      where: { profileId: 'p1' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { profileId: 'p2' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(map.get('p1')).toEqual({
      profileId: 'p1',
      evaluationJson: { v: 'latest_p1' },
      createdAt: t3,
      version: 'v1',
    });
    expect(map.get('p2')).toEqual({
      profileId: 'p2',
      evaluationJson: { v: 'only_p2' },
      createdAt: t1,
      version: 'v1',
    });
  });

  it('deduplicates profileIds so each id is queried once', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      profileId: 'p1',
      evaluationJson: {},
      createdAt: new Date(),
      version: 'v1',
    });
    const mockPrisma = { userProfileEvaluation: { findFirst } };

    await latestEvaluationsForProfileIds(
      mockPrisma as unknown as import('../prisma/prisma.service').PrismaService,
      ['p1', 'p1', 'p1'],
    );

    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('returns an empty map when profileIds is empty', async () => {
    const mockPrisma = {
      userProfileEvaluation: { findFirst: jest.fn() },
    };

    const map = await latestEvaluationsForProfileIds(
      mockPrisma as unknown as import('../prisma/prisma.service').PrismaService,
      [],
    );

    expect(map.size).toBe(0);
    expect(mockPrisma.userProfileEvaluation.findFirst).not.toHaveBeenCalled();
  });
});

describe('latestEvaluationForProfile', () => {
  it('calls findFirst with profileId filter ordered by createdAt desc', async () => {
    const mockPrisma = {
      userProfileEvaluation: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    await latestEvaluationForProfile(
      mockPrisma as unknown as import('../prisma/prisma.service').PrismaService,
      'prof_123',
    );

    expect(mockPrisma.userProfileEvaluation.findFirst).toHaveBeenCalledWith({
      where: { profileId: 'prof_123' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
  });

  it('returns the row provided by findFirst', async () => {
    const fakeRow = { id: 'eval_1', profileId: 'prof_123', version: 'v1' };
    const mockPrisma = {
      userProfileEvaluation: {
        findFirst: jest.fn().mockResolvedValue(fakeRow),
      },
    };

    const result = await latestEvaluationForProfile(
      mockPrisma as unknown as import('../prisma/prisma.service').PrismaService,
      'prof_123',
    );

    expect(result).toBe(fakeRow);
  });

  it('returns null when no evaluations exist', async () => {
    const mockPrisma = {
      userProfileEvaluation: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const result = await latestEvaluationForProfile(
      mockPrisma as unknown as import('../prisma/prisma.service').PrismaService,
      'prof_no_evals',
    );

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildAnalysisContext unit tests
// ---------------------------------------------------------------------------

describe('buildAnalysisContext', () => {
  it('maps all fields from UserProfile, defaulting nulls to empty string', () => {
    const ctx = buildAnalysisContext(baseRow);

    expect(ctx.profileId).toBe(baseRow.id);
    expect(ctx.aboutMe).toBe('I love hiking');
    expect(ctx.aboutPartner).toBe('Looking for kindness');
    expect(ctx.aboutRelationship).toBe('Long term');
    expect(ctx.birthDate).toEqual(baseRow.birthDate);
    expect(ctx.gender).toBe('MALE');
    expect(ctx.desiredPartnerGenders).toEqual(['FEMALE']);
    expect(ctx.city).toBe('TLV');
    expect(ctx.country).toBe('IL');
    expect(ctx.locationLabel).toBe('Tel Aviv, IL');
  });

  it('defaults all nullable text fields to empty string when null', () => {
    const ctx = buildAnalysisContext({
      ...baseRow,
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: null,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
    });

    expect(ctx.aboutMe).toBe('');
    expect(ctx.aboutPartner).toBe('');
    expect(ctx.aboutRelationship).toBe('');
    expect(ctx.birthDate).toBeNull();
    expect(ctx.gender).toBeNull();
    expect(ctx.desiredPartnerGenders).toBeNull();
    expect(ctx.city).toBeNull();
    expect(ctx.country).toBeNull();
    expect(ctx.locationLabel).toBeNull();
  });
});

describe('mapDbFirstColumnsFromEvaluation (write-only UserProfile denorm payload)', () => {
  it('maps enrichment interests and self signals to UserProfile DB-first fields', () => {
    const mapped = mapDbFirstColumnsFromEvaluation({
      self: {
        domain: 'self',
        version: 'v1',
        confidence: 0.9,
        signals: {
          emotionalDepth: 8,
          lifestylePace: 5,
          conflictStyle: 4,
          independence: 7,
          socialBattery: 6,
        },
        evidence: [],
      },
      partner: {
        domain: 'partner',
        version: 'v1',
        confidence: 0.9,
        signals: {},
        evidence: [],
      },
      relationship: {
        domain: 'relationship',
        version: 'v1',
        confidence: 0.9,
        signals: {},
        evidence: [],
      },
      compatibility: {
        selfVsPartner: {} as never,
        selfVsRelationship: {} as never,
      },
      display: { summary: 's', insight: 'i' },
      productScores: {} as never,
      productScoresPresentation: {} as never,
      flags: [],
      enrichment: {
        version: 'v1',
        signals: {
          dailyRhythm: null,
          autonomyTogethernessDepth: null,
          kidsTimeline: null,
          conflictStyleDetail: null,
          interestsTop3: ['hiking', 'Music', 'hiking'],
        },
      },
    });

    expect(mapped).toEqual({
      interestsTop: ['hiking', 'music'],
      sigEmotionalDepth: 8,
      sigLifestylePace: 5,
      sigConflictStyle: 4,
      sigIndependence: 7,
      sigSocialBattery: 6,
    });
  });

  it('falls back to extended interests and nulls invalid/out-of-range signal values', () => {
    const mapped = mapDbFirstColumnsFromEvaluation({
      self: {
        domain: 'self',
        version: 'v1',
        confidence: 0.9,
        signals: {
          emotionalDepth: 11,
          lifestylePace: -1,
          conflictStyle: null,
          independence: '7' as never,
          socialBattery: 'bad' as never,
        },
        evidence: [],
      },
      partner: {
        domain: 'partner',
        version: 'v1',
        confidence: 0.9,
        signals: {},
        evidence: [],
      },
      relationship: {
        domain: 'relationship',
        version: 'v1',
        confidence: 0.9,
        signals: {},
        evidence: [],
      },
      compatibility: {
        selfVsPartner: {} as never,
        selfVsRelationship: {} as never,
      },
      display: { summary: 's', insight: 'i' },
      productScores: {} as never,
      productScoresPresentation: {} as never,
      flags: [],
      extendedSignals: {
        version: 'v1',
        interests: ['  art ', 'travel', 'food', 'extra'],
        lifestyleTraits: [],
        preferences: [],
        boundaries: [],
        values: [],
      },
    });

    expect(mapped).toEqual({
      interestsTop: ['art', 'travel', 'food'],
      sigEmotionalDepth: null,
      sigLifestylePace: null,
      sigConflictStyle: null,
      sigIndependence: 7,
      sigSocialBattery: null,
    });
  });

  it('lowercases all interest tags (casing alignment fix)', () => {
    const mapped = mapDbFirstColumnsFromEvaluation({
      self: {
        domain: 'self',
        version: 'v1',
        confidence: 0.9,
        signals: {},
        evidence: [],
      },
      partner: { domain: 'partner', version: 'v1', confidence: 0.9, signals: {}, evidence: [] },
      relationship: {
        domain: 'relationship',
        version: 'v1',
        confidence: 0.9,
        signals: {},
        evidence: [],
      },
      compatibility: { selfVsPartner: {} as never, selfVsRelationship: {} as never },
      display: { summary: 's', insight: 'i' },
      productScores: {} as never,
      productScoresPresentation: {} as never,
      flags: [],
      enrichment: {
        version: 'v1',
        signals: {
          dailyRhythm: null,
          autonomyTogethernessDepth: null,
          kidsTimeline: null,
          conflictStyleDetail: null,
          interestsTop3: ['YOGA', 'Running', 'CoOkInG'],
        },
      },
    });

    expect(mapped.interestsTop).toEqual(['yoga', 'running', 'cooking']);
  });
});
