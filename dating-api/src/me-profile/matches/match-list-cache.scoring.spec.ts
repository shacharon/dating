/**
 * Ownership: MatchListCacheService (list scoring / stale / sort) — characterization via MeMatchesService façade
 * (Sprint 50 Story 1). Split from match-list-cache.service.spec.ts for soft LOC budget.
 */
import {
  MatchCandidateNotFoundError,
  MatchDetailEvaluationNotFoundError,
  MatchListCandidateEvaluationMissingError,
  MatchListInvalidCursorError,
  MatchListViewerEvaluationMissingError,
  MatchViewerNotReadyError,
} from '../me-matches.errors';
import { MATCH_LIST_CACHE_VERSION } from '../../cache/match-list-cache';
import { ErrorCodes } from '../../logging/error-codes';
import * as holyGrailPair from '../../matches/holy-grail-pair-directions';
import * as matchEngine from '../../matches/match-engine';
import * as customMetrics from '../../observability/custom-metrics';
import { buildMeMatchesParticipantReadModel } from '../me-profile-engine.mapper';
import * as MeProfileEngineMapper from '../me-profile-engine.mapper';
import { resolveMatchNarrative } from './match-detail-narrative';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import {
  makePrefRow,
  makeProfileRow,
  S_ANALYZED,
  S_DRAFT,
  defaultLatestEval,
  setupMeMatchesUnitContext,
} from '../me-matches.spec-support';

describe('MeMatchesService — list scoring characterization', () => {
  const ctx = setupMeMatchesUnitContext();
  const viewerUserId = ctx.viewerUserId;
  const viewerProfileId = ctx.viewerProfileId;
  const candidateProfileId = ctx.candidateProfileId;
  let prisma: typeof ctx.prisma;
  let obs: typeof ctx.obs;
  let service: typeof ctx.service;
  let photoStorage: typeof ctx.photoStorage;
  let mutualMatches: typeof ctx.mutualMatches;
  let cache: typeof ctx.cache;
  let analytics: typeof ctx.analytics;
  let narrativeGenerate: typeof ctx.narrativeGenerate;
  let narrativeCacheFind: typeof ctx.narrativeCacheFind;
  let narrativeCacheUpsert: typeof ctx.narrativeCacheUpsert;
  let matchListRankQueue: typeof ctx.matchListRankQueue;

  beforeEach(() => {
    prisma = ctx.prisma;
    obs = ctx.obs;
    service = ctx.service;
    photoStorage = ctx.photoStorage;
    mutualMatches = ctx.mutualMatches;
    cache = ctx.cache;
    analytics = ctx.analytics;
    narrativeGenerate = ctx.narrativeGenerate;
    narrativeCacheFind = ctx.narrativeCacheFind;
    narrativeCacheUpsert = ctx.narrativeCacheUpsert;
    matchListRankQueue = ctx.matchListRankQueue;
  });

  it('returns numeric matchScore sourced from UserProfileEvaluation when both profiles have valid signals', async () => {
    const evalWithSignals = {
      profileId: candidateProfileId,
      evaluationJson: {
        self: { signals: { ambition: 0.6, socialBattery: 0.5, emotionalDepth: 0.7 } },
        partner: { signals: {} },
        relationship: { signals: {} },
      },
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
    };

    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
    );
    // Viewer evaluation (via latestEvaluationForProfile → findFirst)
    prisma.userProfileEvaluation.findFirst.mockResolvedValue({
      evaluationJson: evalWithSignals.evaluationJson,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      version: 'v1',
    });
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
    ]);
    prisma.userProfileEvaluation.findFirst.mockImplementation(() =>
      Promise.resolve({
        evaluationJson: evalWithSignals.evaluationJson,
        createdAt: evalWithSignals.createdAt,
        version: 'v1',
      }),
    );

    const result = await service.list(viewerUserId);

    expect(result.status).toBe('ready');
    expect(result.matches).toHaveLength(1);
    // matchScore must be a finite number — data sourced entirely from UserProfileEvaluation
    expect(typeof result.matches![0].matchScore).toBe('number');
    expect(Number.isFinite(result.matches![0].matchScore)).toBe(true);
    expect(result.matches![0].explainability).not.toBeNull();
  });

  it('list() uses only latest UserProfileEvaluation when multiple exist (DESC createdAt, take 1)', async () => {
    const oldEval = {
      profileId: candidateProfileId,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      evaluationJson: {
        self: { signals: { ambition: 0.3 } },
        partner: { signals: {} },
        relationship: { signals: {} },
      },
    };
    const newEval = {
      profileId: candidateProfileId,
      createdAt: new Date('2026-02-01T10:00:00.000Z'),
      version: 'v1',
      evaluationJson: {
        self: { signals: { ambition: 0.7 } },
        partner: { signals: {} },
        relationship: { signals: {} },
      },
    };

    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
    );
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
    ]);

    // Mock findFirst for viewer; candidates load via $queryRaw (bridged to findFirst in beforeEach)
    prisma.userProfileEvaluation.findFirst.mockImplementation(({ where, orderBy, take }) => {
      if (orderBy?.createdAt === 'desc' && take === 1) {
        // Return newest evaluation only
        return Promise.resolve(newEval);
      }
      // Query does not enforce latest evaluation correctly
      throw new Error('Query must use orderBy: { createdAt: desc }, take: 1');
    });

    const result = await service.list(viewerUserId);

    expect(result.status).toBe('ready');
    expect(result.matches).toHaveLength(1);
    // Viewer still uses findFirst; candidates use $queryRaw
    expect(prisma.userProfileEvaluation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        take: 1,
      }),
    );
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('list() sets profileAnalysisStale=true when profile.updatedAt > evaluation.createdAt', async () => {
    const profileUpdatedAt = new Date('2026-02-01T10:00:00.000Z');
    const evalCreatedAt = new Date('2026-01-01T10:00:00.000Z');

    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
    );
    prisma.userProfile.findMany.mockResolvedValue([
      {
        ...makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
        updatedAt: profileUpdatedAt,
      },
    ]);
    prisma.userProfileEvaluation.findFirst.mockResolvedValue({
      evaluationJson: { self: { signals: { ambition: 0.6 } }, partner: { signals: {} }, relationship: { signals: {} } },
      createdAt: evalCreatedAt,
      version: 'v1',
    });

    const result = await service.list(viewerUserId);

    expect(result.status).toBe('ready');
    expect(result.matches).toHaveLength(1);
    expect(result.matches![0].profileAnalysisStale).toBe(true);
  });

  it('list() sets profileAnalysisStale=false when profile.updatedAt <= evaluation.createdAt', async () => {
    const profileUpdatedAt = new Date('2026-01-01T10:00:00.000Z');
    const evalCreatedAt = new Date('2026-02-01T10:00:00.000Z');

    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
    );
    prisma.userProfile.findMany.mockResolvedValue([
      {
        ...makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
        updatedAt: profileUpdatedAt,
      },
    ]);
    prisma.userProfileEvaluation.findFirst.mockResolvedValue({
      evaluationJson: { self: { signals: { ambition: 0.6 } }, partner: { signals: {} }, relationship: { signals: {} } },
      createdAt: evalCreatedAt,
      version: 'v1',
    });

    const result = await service.list(viewerUserId);

    expect(result.status).toBe('ready');
    expect(result.matches).toHaveLength(1);
    expect(result.matches![0].profileAnalysisStale).toBe(false);
  });

  it('list() sets viewerProfileAnalysisStale=true when viewer.updatedAt > viewerEval.createdAt', async () => {
    const viewerUpdatedAt = new Date('2026-02-01T10:00:00.000Z');
    const viewerEvalCreatedAt = new Date('2026-01-01T10:00:00.000Z');

    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({
        id: viewerProfileId,
        userId: viewerUserId,
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
        updatedAt: viewerUpdatedAt,
      }),
    );
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({
        id: candidateProfileId,
        userId: 'user_cand',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
      }),
    ]);
    prisma.userProfileEvaluation.findFirst.mockImplementation(
      ({ where: { profileId } }: { where: { profileId: string } }) => {
        if (profileId === viewerProfileId) {
          return Promise.resolve({
            ...defaultLatestEval(viewerProfileId),
            createdAt: viewerEvalCreatedAt,
          });
        }
        return Promise.resolve(defaultLatestEval(profileId));
      },
    );

    const result = await service.list(viewerUserId);

    expect(result.status).toBe('ready');
    expect(result.viewerProfileAnalysisStale).toBe(true);
  });

  it('list() sets viewerProfileAnalysisStale=false when viewer.updatedAt <= viewerEval.createdAt', async () => {
    const viewerUpdatedAt = new Date('2026-01-01T10:00:00.000Z');
    const viewerEvalCreatedAt = new Date('2026-02-01T10:00:00.000Z');

    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({
        id: viewerProfileId,
        userId: viewerUserId,
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
        updatedAt: viewerUpdatedAt,
      }),
    );
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({
        id: candidateProfileId,
        userId: 'user_cand',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
      }),
    ]);
    prisma.userProfileEvaluation.findFirst.mockImplementation(
      ({ where: { profileId } }: { where: { profileId: string } }) => {
        if (profileId === viewerProfileId) {
          return Promise.resolve({
            ...defaultLatestEval(viewerProfileId),
            createdAt: viewerEvalCreatedAt,
          });
        }
        return Promise.resolve(defaultLatestEval(profileId));
      },
    );

    const result = await service.list(viewerUserId);

    expect(result.status).toBe('ready');
    expect(result.viewerProfileAnalysisStale).toBe(false);
  });

  it('list() omits viewerProfileAnalysisStale when status is not_ready', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({
        id: viewerProfileId,
        userId: viewerUserId,
        status: S_DRAFT,
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
      }),
    );

    const result = await service.list(viewerUserId);

    expect(result.status).toBe('not_ready');
    expect(result).not.toHaveProperty('viewerProfileAnalysisStale');
  });

  it('list() sorts matches by matchScore DESC', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
    );
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({ id: 'cand_1', userId: 'user_1', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
      makeProfileRow({ id: 'cand_2', userId: 'user_2', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
      makeProfileRow({ id: 'cand_3', userId: 'user_3', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
    ]);

    // Mock evaluations with different ambition scores to produce different final scores
    const evalScores = [
      { ambition: 0.3, socialBattery: 0.5, emotionalDepth: 0.4 }, // Lower score
      { ambition: 0.9, socialBattery: 0.8, emotionalDepth: 0.9 }, // Highest score
      { ambition: 0.6, socialBattery: 0.6, emotionalDepth: 0.7 }, // Middle score
    ];
    let callIdx = 0;
    prisma.userProfileEvaluation.findFirst.mockImplementation(({ where }) => {
      const idx = callIdx++;
      // First call is for viewer, rest are for candidates
      const signalSet = idx === 0 ? evalScores[1] : evalScores[idx - 1] || evalScores[0];
      return Promise.resolve({
        evaluationJson: { 
          self: { signals: signalSet },
          partner: { signals: {} },
          relationship: { signals: {} }
        },
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        version: 'v1',
      });
    });

    const result = await service.list(viewerUserId);

    expect(result.status).toBe('ready');
    expect(result.matches).toHaveLength(3);
    // Matches should be sorted DESC by matchScore
    const scores = result.matches!.map(m => m.matchScore);
    // All scores should be non-null numbers
    scores.forEach(s => expect(typeof s).toBe('number'));
    // Verify DESC order
    expect(scores[0]!).toBeGreaterThanOrEqual(scores[1]!);
    expect(scores[1]!).toBeGreaterThanOrEqual(scores[2]!);
    for (const m of result.matches!) {
      expect(m.priorityScore).toBe(m.matchScore);
      expect(['HIGH', 'GOOD', 'OTHER']).toContain(m.priorityTier);
      if (m.matchScore != null && m.matchScore >= 85) {
        expect(m.priorityTier).toBe('HIGH');
      } else if (m.matchScore != null && m.matchScore >= 70) {
        expect(m.priorityTier).toBe('GOOD');
      } else {
        expect(m.priorityTier).toBe('OTHER');
      }
    }
  });

  it('list() sorts null matchScores last', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
    );
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({ id: 'cand_1', userId: 'user_1', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
      makeProfileRow({ id: 'cand_2', userId: 'user_2', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
    ]);

    let callIdx = 0;
    prisma.userProfileEvaluation.findFirst.mockImplementation(() => {
      const idx = callIdx++;
      if (idx === 0) {
        // Viewer evaluation
        return Promise.resolve({
          evaluationJson: { self: { signals: { ambition: 0.5, socialBattery: 0.5, emotionalDepth: 0.5 } }, partner: { signals: {} }, relationship: { signals: {} } },
          createdAt: new Date('2026-04-01T10:00:00.000Z'),
          version: 'v1',
        });
      }
      if (idx === 1) {
        // First candidate has valid signals → produces score
        return Promise.resolve({
          evaluationJson: { self: { signals: { ambition: 0.5, socialBattery: 0.5, emotionalDepth: 0.5 } }, partner: { signals: {} }, relationship: { signals: {} } },
          createdAt: new Date('2026-04-01T10:00:00.000Z'),
          version: 'v1',
        });
      }
      // Second candidate has empty signals → null score
      return Promise.resolve({
        evaluationJson: { self: { signals: {} }, partner: { signals: {} }, relationship: { signals: {} } },
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        version: 'v1',
      });
    });

    const result = await service.list(viewerUserId);

    expect(result.status).toBe('ready');
    expect(result.matches).toHaveLength(2);
    // Match with numeric score should come first
    expect(result.matches![0].matchScore).not.toBeNull();
    expect(typeof result.matches![0].matchScore).toBe('number');
    // Match with null score should come last
    expect(result.matches![1].matchScore).toBeNull();
  });
});
