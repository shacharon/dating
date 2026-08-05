import { BadRequestException } from '@nestjs/common';
import type { UserProfileStatus } from '@prisma/client';
import {
  encodeMatchListCursor,
  MATCH_LIST_CACHE_VERSION,
} from '../cache/match-list-cache';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import * as matchEngine from '../matches/match-engine';
import * as holyGrailPair from '../matches/holy-grail-pair-directions';
import { MeMatchesService, matchListRankAfterCursorWhere } from './me-matches.service';
import { MATCH_LIST_MATERIALIZED_ENV } from './match-list-materialized-flag';

const S_ANALYZED = 'ANALYZED' as UserProfileStatus;

function makePref(profileId: string, genders: string[] = ['FEMALE']) {
  return {
    id: `pref_${profileId}`,
    profileId,
    partnerAgeMin: null,
    partnerAgeMax: null,
    maxDistanceKm: null,
    acceptedPartnerGenders: genders,
    updatedAt: new Date('2026-04-01'),
  };
}

function makeViewer(userId: string, profileId: string) {
  return {
    id: profileId,
    userId,
    name: 'Viewer',
    nickname: 'viewer',
    status: S_ANALYZED,
    birthDate: new Date('1990-01-01'),
    gender: 'MALE',
    desiredPartnerGenders: ['FEMALE'],
    city: 'TLV',
    country: 'IL',
    locationLabel: 'Tel Aviv',
    aboutMe: 'a',
    aboutPartner: 'b',
    aboutRelationship: 'c',
    analyzedAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    preference: makePref(profileId, ['FEMALE']),
    signals: [],
    interests: [],
    childrenStatus: null,
    wantsChildren: null,
    smokingFrequency: null,
    alcoholUse: null,
    education: null,
    religion: null,
  };
}

function makeCandidate(id: string, userId: string) {
  return {
    id,
    userId,
    name: id,
    nickname: id,
    status: S_ANALYZED,
    birthDate: new Date('1992-01-01'),
    gender: 'FEMALE',
    desiredPartnerGenders: ['MALE'],
    city: 'TLV',
    country: 'IL',
    locationLabel: 'Tel Aviv',
    aboutMe: null,
    aboutPartner: null,
    aboutRelationship: null,
    analyzedAt: new Date('2026-04-02'),
    updatedAt: new Date('2026-04-02'),
    preference: makePref(id, ['MALE']),
    signals: [],
    interests: [],
    photos: [{ id: `photo_${id}`, isPrimary: true, storageKey: null }],
    _count: { evaluations: 1 },
    childrenStatus: null,
    wantsChildren: null,
    smokingFrequency: null,
    alcoholUse: null,
    education: null,
    religion: null,
  };
}

describe('matchListRankAfterCursorWhere', () => {
  it('returns viewer-only filter without cursor', () => {
    expect(matchListRankAfterCursorWhere('u1', null)).toEqual({
      viewerUserId: 'u1',
    });
  });

  it('includes hardBlocked bucket when cursor in eligible', () => {
    const where = matchListRankAfterCursorWhere('u1', {
      b: 0,
      s: 80,
      id: 'p1',
    });
    expect(where.OR).toEqual(
      expect.arrayContaining([{ hardBlocked: true }]),
    );
  });
});

describe('MeMatchesService materialized list', () => {
  const viewerUserId = 'user_v';
  const viewerProfileId = 'prof_v';

  let prevFlag: string | undefined;
  let prisma: {
    userProfile: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    userProfilePhoto: { count: jest.Mock };
    userProfileEvaluation: { findFirst: jest.Mock };
    matchListRank: { findMany: jest.Mock; count: jest.Mock };
    matchAction: { findMany: jest.Mock };
    mutualMatch: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let cache: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    setNx: jest.Mock;
  };
  let matchListRankQueue: { enqueueRebuild: jest.Mock };
  let analytics: { track: jest.Mock };
  let service: MeMatchesService;
  let buildSpy: jest.SpyInstance;

  beforeEach(() => {
    prevFlag = process.env[MATCH_LIST_MATERIALIZED_ENV];
    process.env[MATCH_LIST_MATERIALIZED_ENV] = '1';

    prisma = {
      userProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      userProfilePhoto: { count: jest.fn().mockResolvedValue(1) },
      userProfileEvaluation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'eval_v',
          profileId: viewerProfileId,
          version: 'v1',
          evaluationJson: {
            self: { signals: { ambition: 0.5 } },
            partner: { signals: {} },
            relationship: { signals: {} },
          },
          createdAt: new Date('2026-04-01'),
        }),
      },
      matchListRank: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      matchAction: { findMany: jest.fn().mockResolvedValue([]) },
      mutualMatch: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    cache = {
      get: jest.fn().mockResolvedValue({
        version: MATCH_LIST_CACHE_VERSION,
        builtAt: 'x',
        statusMeta: { status: 'ready' },
        matches: [{ id: 'should-not-use', matchScore: 1 }],
      }),
      set: jest.fn(),
      del: jest.fn(),
      setNx: jest.fn().mockResolvedValue(true),
    };
    matchListRankQueue = {
      enqueueRebuild: jest.fn().mockResolvedValue('inline:v'),
    };
    analytics = { track: jest.fn() };

    service = new MeMatchesService(
      prisma as never,
      { trace: jest.fn(), error: jest.fn() } as never,
      {} as never,
      { findActiveByUserPair: jest.fn() } as never,
      analytics as never,
      cache as never,
      { generate: jest.fn() } as never,
      { find: jest.fn(), upsert: jest.fn() } as never,
      matchListRankQueue as never,
    );

    jest.spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections').mockReturnValue(null);
    jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
      finalScore: 77,
      explainability: { summary: 'ok' } as never,
      recommendation: { label: 'good' } as never,
    } as never);

    buildSpy = jest.spyOn(
      service as unknown as { buildFullRankedList: (...a: unknown[]) => unknown },
      'buildFullRankedList',
    );
  });

  afterEach(() => {
    if (prevFlag === undefined) {
      delete process.env[MATCH_LIST_MATERIALIZED_ENV];
    } else {
      process.env[MATCH_LIST_MATERIALIZED_ENV] = prevFlag;
    }
    jest.restoreAllMocks();
  });

  it('unset env uses materialized path by default', async () => {
    delete process.env[MATCH_LIST_MATERIALIZED_ENV];
    prisma.userProfile.findUnique.mockResolvedValue(
      makeViewer(viewerUserId, viewerProfileId),
    );
    prisma.matchListRank.findMany.mockResolvedValue([]);

    await service.list(viewerUserId);

    expect(prisma.matchListRank.findMany).toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
    expect(matchListRankQueue.enqueueRebuild).toHaveBeenCalledWith(
      viewerUserId,
      'list_empty',
    );
  });

  it('flag off uses Redis cache path (no matchListRank.findMany)', async () => {
    process.env[MATCH_LIST_MATERIALIZED_ENV] = '0';
    const result = await service.list(viewerUserId);
    expect(cache.get).toHaveBeenCalled();
    expect(prisma.matchListRank.findMany).not.toHaveBeenCalled();
    expect(result.matches?.[0]?.id).toBe('should-not-use');
    expect(matchListRankQueue.enqueueRebuild).not.toHaveBeenCalled();
  });

  it('flag on + not_ready skips rank query and enqueue', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    const result = await service.list(viewerUserId);
    expect(result).toEqual({
      status: 'not_ready',
      reason: 'no_profile',
      nextCursor: null,
      hasMore: false,
    });
    expect(prisma.matchListRank.findMany).not.toHaveBeenCalled();
    expect(matchListRankQueue.enqueueRebuild).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('flag on + empty ranks enqueues list_empty once', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      makeViewer(viewerUserId, viewerProfileId),
    );
    prisma.matchListRank.findMany.mockResolvedValue([]);

    const first = await service.list(viewerUserId);
    expect(first.status).toBe('ready');
    expect(first.matches).toEqual([]);
    expect(matchListRankQueue.enqueueRebuild).toHaveBeenCalledWith(
      viewerUserId,
      'list_empty',
    );
    expect(cache.setNx).toHaveBeenCalled();

    cache.setNx.mockResolvedValue(false);
    matchListRankQueue.enqueueRebuild.mockClear();
    await service.list(viewerUserId);
    expect(matchListRankQueue.enqueueRebuild).not.toHaveBeenCalled();
  });

  it('flag on + empty ranks with cursor does not enqueue', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      makeViewer(viewerUserId, viewerProfileId),
    );
    prisma.matchListRank.findMany.mockResolvedValue([]);
    const cursor = encodeMatchListCursor({ b: 0, s: 50, id: 'p_x' });

    await service.list(viewerUserId, { limit: 20, cursor });
    expect(matchListRankQueue.enqueueRebuild).not.toHaveBeenCalled();
  });

  it('flag on pages ranks and hydrates only page ids', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      makeViewer(viewerUserId, viewerProfileId),
    );
    const ranks = [
      { candidateProfileId: 'p1', matchScore: 90, hardBlocked: false },
      { candidateProfileId: 'p2', matchScore: 80, hardBlocked: false },
      { candidateProfileId: 'p3', matchScore: 70, hardBlocked: false },
    ];
    prisma.matchListRank.findMany.mockResolvedValue(ranks);
    prisma.matchListRank.count.mockResolvedValue(3);
    prisma.userProfile.findMany.mockResolvedValue([
      makeCandidate('p1', 'u1'),
      makeCandidate('p2', 'u2'),
    ]);
    prisma.$queryRaw.mockImplementation(async (sql: { values: unknown[] }) =>
      (sql.values as string[]).map((profileId) => ({
        profileId,
        evaluationJson: {
          self: { signals: { ambition: 0.5 } },
          partner: { signals: {} },
          relationship: { signals: {} },
        },
        createdAt: new Date('2026-04-01'),
        version: 'v1',
      })),
    );

    const result = await service.list(viewerUserId, { limit: 2 });

    expect(prisma.matchListRank.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
    expect(buildSpy).toHaveBeenCalledWith(
      viewerUserId,
      expect.objectContaining({
        candidateProfileIds: ['p1', 'p2'],
        emitListAnalytics: false,
      }),
    );
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeTruthy();
    expect(result.matches?.map((m) => m.id)).toEqual(['p1', 'p2']);
    // List score/tier come from MatchListRank, not hydrate re-compare.
    expect(result.matches?.map((m) => m.matchScore)).toEqual([90, 80]);
    expect(result.matches?.map((m) => m.priorityTier)).toEqual(['HIGH', 'GOOD']);
    expect(analytics.track).toHaveBeenCalledWith(
      viewerUserId,
      ProductAnalyticsEvents.MATCH_LIST_VIEWED,
      expect.objectContaining({ source: 'materialized', matchCount: 3 }),
    );
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('invalid cursor throws BadRequestException', async () => {
    await expect(
      service.list(viewerUserId, { limit: 20, cursor: '!!!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
