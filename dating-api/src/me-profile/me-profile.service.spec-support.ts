/** Test support only — excluded from Nest dist via tsconfig.build. */

import {
  ProfileGender,
  UserProfileOnboardingStep,
  UserProfileStatus,
} from '@prisma/client';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { MeProfileAnalysisService } from './profile/me-profile-analysis.service';
import type { MeProfileService } from './profile/me-profile.service';
import { createMeProfileServiceForTest } from './integration/me-profile.test-harness';
import * as contentModerationTypes from '../content-moderation/content-moderation.types';
import type { ContentModerationPort } from '../content-moderation/content-moderation.ports';
import type { ContentViolationService } from '../content-moderation/content-violation.service';

export const ME_PROFILE_SERVICE_USER_ID = 'user_svc_1';

export const ME_PROFILE_SERVICE_BASE_ROW = {
  id: 'prof_1',
  userId: ME_PROFILE_SERVICE_USER_ID,
  status: UserProfileStatus.DRAFT,
  onboardingStep: UserProfileOnboardingStep.BASIC,
  gender: ProfileGender.FEMALE,
  datingChapter: null as string | null,
  aboutMe: 'a' as string | null,
  aboutPartner: null as string | null,
  aboutRelationship: null as string | null,
  desiredPartnerGenders: null as unknown,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

/** `findUnique` with `include: { preference: true }` — HG prefs are not on `UserProfile` (Phase F). */
export function profileRow<T extends Record<string, unknown>>(row: T) {
  return { ...row, preference: null };
}

export type MeProfileServicePrismaMock = {
  $transaction: jest.Mock;
  user: { update: jest.Mock };
  userProfile: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  userProfileEvaluation: { findFirst: jest.Mock };
  userProfilePreference: { upsert: jest.Mock };
  userProfilePhoto: { count: jest.Mock };
};

export type MeProfileServiceTestContext = {
  userId: string;
  baseRow: typeof ME_PROFILE_SERVICE_BASE_ROW;
  profileRow: typeof profileRow;
  prisma: MeProfileServicePrismaMock;
  service: MeProfileService;
  obs: jest.Mocked<
    Pick<
      StructuredObservabilityService,
      'trace' | 'error' | 'fatal' | 'httpServerError'
    >
  >;
  analysisQueue: { enqueueOrRunInline: jest.Mock };
  meMatches: { invalidateMatchListCache: jest.Mock };
  matchListRankQueue: { enqueueRebuild: jest.Mock };
  analysis: jest.Mocked<Pick<MeProfileAnalysisService, 'runForUser'>>;
  analytics: { track: jest.Mock };
  moderation: { checkContent: jest.Mock };
  contentViolations: {
    getUserViolationStatus: jest.Mock;
    recordViolation: jest.Mock;
    getViolationCount: jest.Mock;
    isUserBlocked: jest.Mock;
    enforceViolationThreshold: jest.Mock;
  };
  buildService: (overrides?: { prisma?: unknown }) => MeProfileService;
};

/** Fresh mocks + service — call from each split file's `beforeEach`. */
export function createMeProfileServiceTestContext(): MeProfileServiceTestContext {
  const userId = ME_PROFILE_SERVICE_USER_ID;
  const baseRow = ME_PROFILE_SERVICE_BASE_ROW;

  const prisma: MeProfileServicePrismaMock = {
    $transaction: jest.fn(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    ),
    user: { update: jest.fn().mockResolvedValue({}) },
    userProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    userProfileEvaluation: { findFirst: jest.fn().mockResolvedValue(null) },
    userProfilePreference: { upsert: jest.fn().mockResolvedValue({}) },
    userProfilePhoto: { count: jest.fn().mockResolvedValue(1) },
  };

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    httpServerError: jest.fn(),
  };
  const analysis = { runForUser: jest.fn().mockResolvedValue(undefined) };
  const analytics = { track: jest.fn() };
  const analysisQueue = { enqueueOrRunInline: jest.fn().mockResolvedValue('job_1') };
  const meMatches = { invalidateMatchListCache: jest.fn().mockResolvedValue(undefined) };
  const matchListRankQueue = {
    enqueueRebuild: jest.fn().mockResolvedValue('inline:user'),
  };
  const moderation = {
    checkContent: jest.fn().mockResolvedValue({
      flagged: false,
      categories: [],
      primaryCategory: null,
      score: 0,
      sexualScore: null,
      failOpen: false,
    }),
  };
  const contentViolations = {
    getUserViolationStatus: jest.fn().mockResolvedValue({
      status: 'ok',
      mutedUntil: null,
      violationCount: 0,
    }),
    recordViolation: jest.fn().mockResolvedValue(undefined),
    getViolationCount: jest.fn().mockResolvedValue(0),
    isUserBlocked: jest.fn().mockResolvedValue(false),
    enforceViolationThreshold: jest.fn().mockResolvedValue({
      shouldBlock: false,
      reason: 'under_threshold',
    }),
  };

  jest
    .spyOn(contentModerationTypes, 'isContentModerationEnabled')
    .mockReturnValue(true);

  function buildService(overrides?: { prisma?: unknown }) {
    return createMeProfileServiceForTest({
      prisma: (overrides?.prisma ?? prisma) as unknown as PrismaService,
      obs: obs as unknown as StructuredObservabilityService,
      photoStorage: {} as never,
      analytics: analytics as unknown as AnalyticsService,
      analysisQueue: analysisQueue as never,
      photoModerationQueue: {
        enqueueOrRunInline: jest.fn().mockResolvedValue('photo_job_1'),
      } as never,
      meMatches: meMatches as never,
      moderation: moderation as unknown as ContentModerationPort,
      contentViolations: contentViolations as unknown as ContentViolationService,
      matchListRankQueue: matchListRankQueue as never,
    });
  }

  const service = buildService();

  return {
    userId,
    baseRow,
    profileRow,
    prisma,
    service,
    obs,
    analysisQueue,
    meMatches,
    matchListRankQueue,
    analysis,
    analytics,
    moderation,
    contentViolations,
    buildService,
  };
}

/** Wiring manifest — must sum to baseline. */
export const ME_PROFILE_SERVICE_BASELINE_TEST_COUNT = 58;

export const ME_PROFILE_SERVICE_SPLIT_TEST_COUNTS: Record<string, number> = {
  'me-profile.service.crud.spec.ts': 16,
  'me-profile.service.submit.spec.ts': 11,
  'me-profile.service.legacy-isolation.spec.ts': 7,
  'me-profile.service.analysis.spec.ts': 4,
  'me-profile.service.preferences.spec.ts': 8,
  'me-profile.service.moderation.spec.ts': 7,
  'me-profile.service.rank-rebuild.spec.ts': 5,
};
