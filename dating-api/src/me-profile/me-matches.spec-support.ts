import type { UserProfileStatus } from '@prisma/client';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import { MeMatchesService } from './me-matches.service';
import { createMeMatchesServiceForTest } from './me-matches.test-harness';

export const S_ANALYZED = 'ANALYZED' as UserProfileStatus;
export const S_DRAFT = 'DRAFT' as UserProfileStatus;

/** Minimal UserProfilePreference fixture for Phase E tests. */
export function makePrefRow(
  overrides: {
    profileId?: string;
    acceptedPartnerGenders?: string[];
    partnerAgeMin?: number | null;
    partnerAgeMax?: number | null;
    maxDistanceKm?: number | null;
  } = {},
) {
  return {
    id: 'pref_' + (overrides.profileId ?? 'x'),
    profileId: overrides.profileId ?? 'prof_x',
    partnerAgeMin: overrides.partnerAgeMin ?? null,
    partnerAgeMax: overrides.partnerAgeMax ?? null,
    maxDistanceKm: overrides.maxDistanceKm ?? null,
    acceptedPartnerGenders: (overrides.acceptedPartnerGenders ??
      []) as string[],
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  };
}

export function makeProfileRow(overrides: {
  id: string;
  userId: string;
  status?: UserProfileStatus;
  gender?: string | null;
  desiredPartnerGenders?: unknown;
  evaluationCount?: number;
  nickname?: string | null;
  wantsChildren?: string | null;
  smokingFrequency?: string | null;
  alcoholUse?: string | null;
  aboutMe?: string | null;
  aboutPartner?: string | null;
  aboutRelationship?: string | null;
  updatedAt?: Date;
  birthDate?: Date;
  datingChapter?: string | null;
  preference?: ReturnType<typeof makePrefRow> | null;
  photos?: Array<{ id: string; isPrimary: boolean }>;
}) {
  return {
    id: overrides.id,
    userId: overrides.userId,
    name: `Profile ${overrides.id}`,
    nickname: overrides.nickname ?? null,
    status: overrides.status ?? S_ANALYZED,
    birthDate: overrides.birthDate ?? new Date('1990-06-15T00:00:00.000Z'),
    datingChapter: overrides.datingChapter ?? null,
    gender: (overrides.gender ?? null) as string | null,
    desiredPartnerGenders: overrides.desiredPartnerGenders ?? null,
    city: 'TLV',
    country: 'IL',
    locationLabel: 'Tel Aviv, IL',
    aboutMe: overrides.aboutMe ?? 'About me text',
    aboutPartner: overrides.aboutPartner ?? 'About partner text',
    aboutRelationship: overrides.aboutRelationship ?? 'About relationship text',
    analyzedAt: new Date('2026-04-01T10:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-04-01T10:00:00.000Z'),
    _count: { evaluations: overrides.evaluationCount ?? 1 },
    childrenStatus: null as string | null,
    wantsChildren: (overrides.wantsChildren ?? null) as string | null,
    smokingFrequency: (overrides.smokingFrequency ?? null) as string | null,
    alcoholUse: (overrides.alcoholUse ?? null) as string | null,
    education: null as string | null,
    religion: null as string | null,
    preference: overrides.preference !== undefined ? overrides.preference : null,
    photos: overrides.photos ?? [{ id: 'photo_default', isPrimary: true }],
  };
}

export function defaultLatestEval(profileId: string) {
  return {
    id: `eval_${profileId}`,
    profileId,
    version: 'v1',
    evaluationJson: {
      self: {
        signals: { ambition: 0.6, socialBattery: 0.5, emotionalDepth: 0.7 },
      },
      partner: { signals: {} },
      relationship: { signals: {} },
    },
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
  };
}

export type MeMatchesUnitContext = {
  viewerUserId: string;
  viewerProfileId: string;
  candidateProfileId: string;
  prisma: {
    $queryRaw: jest.Mock;
    userProfile: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    userProfileEvaluation: { findFirst: jest.Mock };
    userProfilePhoto: { findFirst: jest.Mock; count: jest.Mock };
    matchAction: { findMany: jest.Mock; findUnique: jest.Mock };
    mutualMatch: { findMany: jest.Mock };
  };
  obs: jest.Mocked<Pick<StructuredObservabilityService, 'trace' | 'error'>>;
  service: MeMatchesService;
  photoStorage: { read: jest.Mock };
  mutualMatches: { findActiveByUserPair: jest.Mock };
  cache: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    setNx: jest.Mock;
  };
  analytics: { track: jest.Mock };
  narrativeGenerate: jest.Mock;
  narrativeCacheFind: jest.Mock;
  narrativeCacheUpsert: jest.Mock;
  matchListRankQueue: { enqueueRebuild: jest.Mock };
};

/** Shared beforeEach/afterEach for me-matches façade characterization specs. */
export function setupMeMatchesUnitContext(): MeMatchesUnitContext {
  const viewerUserId = 'user_viewer';
  const viewerProfileId = 'prof_viewer';
  const candidateProfileId = 'prof_cand_1';

  let prevMaterializedFlag: string | undefined;
  const ctx = {
    viewerUserId,
    viewerProfileId,
    candidateProfileId,
  } as MeMatchesUnitContext;

  beforeEach(() => {
    prevMaterializedFlag = process.env['MATCH_LIST_MATERIALIZED'];
    process.env['MATCH_LIST_MATERIALIZED'] = '0';
    ctx.prisma = {
      $queryRaw: jest.fn(),
      userProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      userProfileEvaluation: {
        findFirst: jest.fn().mockImplementation(
          ({ where: { profileId } }: { where: { profileId: string } }) =>
            Promise.resolve(defaultLatestEval(profileId)),
        ),
      },
      userProfilePhoto: {
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      matchAction: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      mutualMatch: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    ctx.prisma.$queryRaw.mockImplementation(async (sql: { values: unknown[] }) => {
      const rows: Array<{
        profileId: string;
        evaluationJson: unknown;
        createdAt: Date;
        version: string;
      }> = [];
      for (const profileId of sql.values as string[]) {
        const row = await ctx.prisma.userProfileEvaluation.findFirst({
          where: { profileId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        });
        if (row != null) {
          rows.push({
            profileId,
            evaluationJson: row.evaluationJson,
            createdAt: row.createdAt,
            version: row.version,
          });
        }
      }
      return rows;
    });
    ctx.photoStorage = { read: jest.fn() };
    ctx.obs = { trace: jest.fn(), error: jest.fn() };
    ctx.mutualMatches = {
      findActiveByUserPair: jest.fn().mockResolvedValue(null),
    };
    ctx.analytics = { track: jest.fn() };
    ctx.cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      setNx: jest.fn().mockResolvedValue(true),
    };
    ctx.narrativeGenerate = jest.fn().mockResolvedValue({
      narrative: 'Generated narrative prose.',
      source: 'fallback',
      promptVersion: 'v1',
    });
    ctx.narrativeCacheFind = jest.fn().mockResolvedValue(null);
    ctx.narrativeCacheUpsert = jest.fn().mockResolvedValue(undefined);
    ctx.matchListRankQueue = {
      enqueueRebuild: jest.fn().mockResolvedValue('inline:u'),
    };
    ctx.service = createMeMatchesServiceForTest({
      prisma: ctx.prisma as unknown as PrismaService,
      obs: ctx.obs as unknown as StructuredObservabilityService,
      photoStorage: ctx.photoStorage as never,
      mutualMatches: ctx.mutualMatches as never,
      analytics: ctx.analytics as unknown as AnalyticsService,
      cache: ctx.cache as never,
      matchNarrativeGenerator: { generate: ctx.narrativeGenerate } as never,
      matchNarrativeCache: {
        find: ctx.narrativeCacheFind,
        upsert: ctx.narrativeCacheUpsert,
      } as never,
      matchListRankQueue: ctx.matchListRankQueue as never,
    });
  });

  afterEach(() => {
    if (prevMaterializedFlag === undefined) {
      delete process.env['MATCH_LIST_MATERIALIZED'];
    } else {
      process.env['MATCH_LIST_MATERIALIZED'] = prevMaterializedFlag;
    }
  });

  return ctx;
}
