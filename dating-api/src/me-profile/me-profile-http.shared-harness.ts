/**
 * Shared Nest + mocked Prisma harness for me-profile HTTP integration suites.
 *
 * Entrypoints (Sprint 63 Story 2 + Sprint 65 Story 3 matches sub-split):
 * - me-profile-http-crud.integration.spec.ts
 * - me-profile-http-matches-list-detail.integration.spec.ts
 * - me-profile-http-matches-narrative-feedback.integration.spec.ts
 * - me-profile-http-matches-actions.integration.spec.ts
 * - me-profile-http-matches-mutual.integration.spec.ts
 * - me-profile-http-conversations.integration.spec.ts
 * - me-profile-http-photos.integration.spec.ts
 *
 * Run: npx jest --no-coverage "me-profile-http-.*\\.integration\\.spec" --runInBand
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Prisma, UserProfileStatus, UserStatus } from '@prisma/client';
import { AuthSessionConfigModule } from '../config/auth-session-config.module';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionModule } from '../session/session.module';
import { hashSessionToken } from '../session/session-token.crypto';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { AuthModule } from '../auth/auth.module';
import { jwtConfigStub } from '../auth/auth-test.stub';
import { GoogleAuthService } from '../auth/google-auth.service';
import { JwtAuthConfigModule } from '../config/jwt-auth-config.module';
import { JwtAuthConfigService } from '../config/jwt-auth-config.service';
import { requestCorrelationMiddleware } from '../logging/request-correlation.middleware';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { LLM_CONFIG } from '../llm/llm.constants';
import { MatchNarrativeGenerator } from '../matches/match-narrative';
import { PHOTO_STORAGE } from '../photo-storage/photo-storage.module';
import { MeProfileAnalysisService } from './me-profile-analysis.service';
import { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import {
  createMatchNarrativeCachePrismaMock,
  createMatchNarrativeGeneratorStub,
} from './match-narrative-test-stubs';
import { MeProfileModule } from './me-profile.module';
import { MeProfileValidationPipe } from './me-profile-validation.pipe';
import { CONTENT_MODERATION } from '../content-moderation/content-moderation.ports';
import { ContentViolationService } from '../content-moderation/content-violation.service';
import * as contentModerationTypes from '../content-moderation/content-moderation.types';
import { MATCH_LIST_MATERIALIZED_ENV } from './match-list-materialized-flag';
import { MatchListRankQueueService } from '../workers/match-list-rank.worker';

export function parseStructuredJsonLogs(
  spy: jest.SpiedFunction<typeof console.log>,
): unknown[] {
  const out: unknown[] = [];
  for (const call of spy.mock.calls) {
    const s = call[0];
    if (typeof s === 'string' && s.startsWith('{')) {
      try {
        out.push(JSON.parse(s));
      } catch {
        /* non-JSON line */
      }
    }
  }
  return out;
}

export function extractCookieValue(
  setCookie: string[] | undefined,
  name: string,
): string | undefined {
  if (!setCookie?.length) {
    return undefined;
  }
  for (const line of setCookie) {
    if (line.startsWith(`${name}=`)) {
      return line.split(';')[0].slice(name.length + 1);
    }
  }
  return undefined;
}

/** Stable fixture ids — module-scope so nested describe consts can close over them. */
export const ME_PROFILE_HTTP_USER_ID = 'user_me_profile_1';
export const ME_PROFILE_HTTP_SESSION_COOKIE = 'dating_session';
export const ME_PROFILE_HTTP_PEPPER = 'me-profile-test-pepper';

export type MeProfileHttpHarness = {
  app: INestApplication<App>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock: any;
  narrativeCachePrisma: ReturnType<typeof createMatchNarrativeCachePrismaMock>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  photoStorageMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moderationClientMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentViolationsMock: any;
  matchNarrativeGeneratorStub: ReturnType<
    typeof createMatchNarrativeGeneratorStub
  >;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usersServiceMock: any;
  verifyIdToken: jest.Mock;
  USER_ID: string;
  SESSION_COOKIE: string;
  PEPPER: string;
  loginAndCookie: () => Promise<string>;
  resetForTest: () => Promise<void>;
  close: () => Promise<void>;
};

export async function createMeProfileHttpHarness(): Promise<MeProfileHttpHarness> {
  let app: INestApplication<App>;
  const prevMaterializedFlag = process.env[MATCH_LIST_MATERIALIZED_ENV];
  // Live ranking path: HTTP suite fixtures seed userProfile.findMany, not MatchListRank rows.
  process.env[MATCH_LIST_MATERIALIZED_ENV] = '0';

  const matchListRankQueueStub = {
    enqueueRebuild: jest.fn().mockResolvedValue('inline:me-profile-http'),
  };

  const narrativeCachePrisma = createMatchNarrativeCachePrismaMock();
  const matchNarrativeGeneratorStub = createMatchNarrativeGeneratorStub({
    source: 'llm',
    narrative: 'HTTP stub LLM narrative about shared emotional depth.',
  });
  const moderationClientMock = {
    checkContent: jest.fn().mockResolvedValue({
      flagged: false,
      categories: [],
      primaryCategory: null,
      score: 0,
      sexualScore: null,
      failOpen: false,
    }),
  };
  const contentViolationsMock = {
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
  const prismaMock = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(async (sql: { values: unknown[]; strings?: readonly string[] }) => {
      const sqlText = Array.isArray(sql.strings) ? sql.strings.join(' ') : '';
      // Sprint 68 Story 1 — inbox list page (WITH inbox). Default empty; tests override.
      if (/\bWITH inbox\b/i.test(sqlText) && /\bFROM inbox\b/i.test(sqlText)) {
        return [];
      }
      // Sprint 34 Story 1 — last SENT message batch (DISTINCT ON Message). Default empty.
      // Do NOT short-circuit UserProfileEvaluation DISTINCT ON (match list latest-eval batch).
      if (
        sqlText.includes('DISTINCT ON') &&
        (sqlText.includes('"Message"') || sqlText.includes(' FROM "Message"'))
      ) {
        return [];
      }
      // Sprint 28 Story 4 — inbox unread batch (UNNEST on Message). Default empty; tests override.
      if (sqlText.includes('UNNEST')) {
        return [];
      }
      // Latest UserProfileEvaluation batch (DISTINCT ON "profileId") + other raw helpers.
      const rows: Array<{
        profileId: string;
        evaluationJson: unknown;
        createdAt: unknown;
        version: unknown;
      }> = [];
      for (const profileId of sql.values as string[]) {
        if (typeof profileId !== 'string') {
          continue;
        }
        const row = await prismaMock.userProfileEvaluation.findFirst({
          where: { profileId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        });
        if (row != null) {
          rows.push({
            profileId: (row.profileId as string | undefined) ?? profileId,
            evaluationJson: row.evaluationJson,
            createdAt: row.createdAt,
            version: row.version,
          });
        }
      }
      return rows;
    }),
    matchNarrativeCache: narrativeCachePrisma.matchNarrativeCache,
    matchListRank: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'rt_me_profile' }),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    userProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    userProfileEvaluation: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    userProfilePreference: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    userProfilePhoto: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    matchAction: {
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    matchFeedback: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    mutualMatch: {
      upsert: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };
  const photoStorageMock = {
    driver: 'local' as const,
    buildStorageKey: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    read: jest.fn(),
  };
  const usersServiceMock = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByGoogleId: jest.fn(),
    createFromGoogleIdentity: jest.fn(),
    updateLoginFields: jest.fn(),
  };
  const verifyIdToken = jest.fn();
  
  const PEPPER = ME_PROFILE_HTTP_PEPPER;
  const SESSION_COOKIE = ME_PROFILE_HTTP_SESSION_COOKIE;
  const configStub = {
    googleClientId: 'google-client-id',
    sessionSecretPepper: PEPPER,
    sessionCookieName: SESSION_COOKIE,
    sessionTtlDays: 14,
    cookieDomain: undefined as string | undefined,
    cookieSecure: false,
    corsOrigin: 'http://localhost:3000',
  };

  const USER_ID = ME_PROFILE_HTTP_USER_ID;

      prismaMock.userSession.create.mockImplementation(async ({ data }) => ({
      id: 'sess_me_profile',
      expiresAt: data.expiresAt,
    }));
  
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AuthSessionConfigModule,
        JwtAuthConfigModule,
        PrismaModule,
        SessionModule,
        UsersModule,
        StructuredLoggingModule,
        // SimpleLoggerModule is @Global() — satisfies EvaluateController's SimpleLogger dep
        SimpleLoggerModule,
        AnalyticsModule,
        AuthModule,
        MeProfileModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(AuthSessionConfigService)
      .useValue(configStub)
      .overrideProvider(JwtAuthConfigService)
      .useValue(jwtConfigStub)
      .overrideProvider(GoogleAuthService)
      .useValue({ verifyIdToken })
      .overrideProvider(UsersService)
      .useValue(usersServiceMock)
      // MeProfileModule imports EvaluateServiceModule (→ LlmModule → ExtractionCoreModule).
      // ExtractionCoreModule is the pure extraction module; it does NOT register
      // ExtractionV2PersistenceService (legacy DB writer) in the me-profile DI scope.
      // LLM_CONFIG is overridden to prevent the OPENAI_API_KEY-missing throw.
      // MeProfileAnalysisService is overridden so no LLM calls are made in HTTP tests.
      .overrideProvider(LLM_CONFIG)
      .useValue({ openai: { apiKey: 'test-key-not-used' }, models: new Map() })
      .overrideProvider(MeProfileAnalysisService)
      .useValue({ runForUser: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(MeProfileValidationPipe)
      .useValue({ transform: (v: unknown) => v })
      .overrideProvider(PHOTO_STORAGE)
      .useValue(photoStorageMock)
      .overrideProvider(MatchNarrativeGenerator)
      .useValue(matchNarrativeGeneratorStub)
      .overrideProvider(CONTENT_MODERATION)
      .useValue(moderationClientMock)
      .overrideProvider(ContentViolationService)
      .useValue(contentViolationsMock)
      // Profile CRUD / actions enqueue rebuilds; stub so findUnique Once-chains stay valid.
      .overrideProvider(MatchListRankQueueService)
      .useValue(matchListRankQueueStub)
      .compile();
  
    app = moduleFixture.createNestApplication();
    app.use(requestCorrelationMiddleware);
    app.use(cookieParser());
    await app.init();

  const resetForTest = async (): Promise<void> => {
      jest.clearAllMocks();
      jest
        .spyOn(contentModerationTypes, 'isContentModerationEnabled')
        .mockReturnValue(true);
      moderationClientMock.checkContent.mockResolvedValue({
        flagged: false,
        categories: [],
        primaryCategory: null,
        score: 0,
        sexualScore: null,
        failOpen: false,
      });
      contentViolationsMock.getUserViolationStatus.mockResolvedValue({
        status: 'ok',
        mutedUntil: null,
        violationCount: 0,
      });
      contentViolationsMock.recordViolation.mockResolvedValue(undefined);
      contentViolationsMock.getViolationCount.mockResolvedValue(0);
      contentViolationsMock.isUserBlocked.mockResolvedValue(false);
      contentViolationsMock.enforceViolationThreshold.mockResolvedValue({
        shouldBlock: false,
        reason: 'under_threshold',
      });
      narrativeCachePrisma.store.clear();
      matchNarrativeGeneratorStub.generate.mockResolvedValue({
        narrative: 'HTTP stub LLM narrative about shared emotional depth.',
        source: 'llm',
        promptVersion: 'v1',
      });
      prismaMock.$transaction.mockImplementation(
        async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
      );
      prismaMock.userProfile.findUnique.mockReset();
      prismaMock.userProfile.findFirst.mockReset();
      prismaMock.userProfile.count.mockReset();
      prismaMock.userProfile.count.mockResolvedValue(0);
      prismaMock.userProfile.findFirst.mockResolvedValue(null);
      prismaMock.userProfilePhoto.findMany.mockReset();
      prismaMock.userProfilePhoto.findFirst.mockReset();
      prismaMock.userProfilePhoto.create.mockReset();
      prismaMock.userProfilePhoto.update.mockReset();
      prismaMock.userProfilePhoto.updateMany.mockReset();
      prismaMock.userProfilePhoto.delete.mockReset();
      prismaMock.userProfilePhoto.count.mockReset();
      prismaMock.matchAction.upsert.mockReset();
      prismaMock.matchAction.findMany.mockReset();
      prismaMock.matchAction.findMany.mockResolvedValue([]);
      prismaMock.matchAction.findUnique?.mockReset?.();
      prismaMock.matchAction.delete?.mockReset?.();
      prismaMock.matchListRank.findMany.mockReset();
      prismaMock.matchListRank.findMany.mockResolvedValue([]);
      prismaMock.matchListRank.count.mockReset();
      prismaMock.matchListRank.count.mockResolvedValue(0);
      prismaMock.matchListRank.deleteMany.mockReset();
      prismaMock.matchListRank.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.user.findUnique?.mockReset?.();
      prismaMock.user.findMany?.mockReset?.();
      prismaMock.user.findMany?.mockResolvedValue([]);
      prismaMock.matchFeedback.findUnique?.mockReset?.();
      prismaMock.matchFeedback.upsert?.mockReset?.();
      prismaMock.mutualMatch.upsert?.mockReset?.();
      prismaMock.mutualMatch.create?.mockReset?.();
      prismaMock.mutualMatch.findFirst?.mockReset?.();
      prismaMock.mutualMatch.findMany?.mockReset?.();
      prismaMock.mutualMatch.findMany?.mockResolvedValue([]);
      prismaMock.mutualMatch.findUnique?.mockReset?.();
      prismaMock.mutualMatch.update?.mockReset?.();
      prismaMock.mutualMatch.updateMany?.mockReset?.();
      prismaMock.mutualMatch.updateMany?.mockResolvedValue?.({ count: 0 });
      prismaMock.message.create?.mockReset?.();
      prismaMock.message.findMany?.mockReset?.();
      prismaMock.message.findFirst?.mockReset?.();
      prismaMock.message.count?.mockReset?.();
      photoStorageMock.buildStorageKey.mockReset();
      photoStorageMock.save.mockReset();
      photoStorageMock.delete.mockReset();
      photoStorageMock.read.mockReset();
      prismaMock.userProfilePhoto.findMany.mockResolvedValue([]);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue(null);
      prismaMock.userProfilePhoto.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.userProfilePhoto.count.mockResolvedValue(1);
      photoStorageMock.save.mockResolvedValue(undefined);
      photoStorageMock.delete.mockResolvedValue(undefined);
      photoStorageMock.read.mockResolvedValue(Buffer.from([1, 2, 3]));
      verifyIdToken.mockReset();
      usersServiceMock.findByEmail.mockResolvedValue(null);
      usersServiceMock.findByGoogleId.mockResolvedValue(null);
      usersServiceMock.findById.mockResolvedValue(null);
      prismaMock.userSession.create.mockImplementation(async ({ data }) => ({
        id: 'sess_me_profile',
        expiresAt: data.expiresAt,
      }));
      prismaMock.userSession.update.mockResolvedValue({});
      await app.get(ConversationMessageRateLimitService).resetForTests();
  };

    const loginAndCookie = async function loginAndCookie(): Promise<string> {
    verifyIdToken.mockResolvedValue({
      googleId: 'google-me-profile',
      email: 'meprofile@example.com',
      displayName: 'MP',
      avatarUrl: null,
    });
    usersServiceMock.findByGoogleId.mockResolvedValue(null);
    usersServiceMock.createFromGoogleIdentity.mockResolvedValue({
      id: USER_ID,
      email: 'meprofile@example.com',
      googleId: 'google-me-profile',
      displayName: 'MP',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    });
  
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: 'mock-jwt' })
      .expect(200);
  
    const rawSession = extractCookieValue(
      login.headers['set-cookie'],
      SESSION_COOKIE,
    );
    expect(rawSession).toBeTruthy();
    const sessionHash = hashSessionToken(rawSession!, PEPPER);
  
    prismaMock.userSession.findUnique.mockResolvedValue({
      id: 'sess_row',
      userId: USER_ID,
      sessionTokenHash: sessionHash,
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
      revokedAt: null,
    });
    usersServiceMock.findById.mockResolvedValue({
      id: USER_ID,
      email: 'meprofile@example.com',
      displayName: 'MP',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    });
  
    return rawSession!;
  };

  // Initial reset so first test starts clean (mirrors former beforeEach-before-first-it).
  await resetForTest();

  return {
    app,
    prismaMock,
    narrativeCachePrisma,
    photoStorageMock,
    moderationClientMock,
    contentViolationsMock,
    matchNarrativeGeneratorStub,
    usersServiceMock,
    verifyIdToken,
    USER_ID,
    SESSION_COOKIE,
    PEPPER,
    loginAndCookie,
    resetForTest,
    close: async () => {
      await app.close();
      if (prevMaterializedFlag === undefined) {
        delete process.env[MATCH_LIST_MATERIALIZED_ENV];
      } else {
        process.env[MATCH_LIST_MATERIALIZED_ENV] = prevMaterializedFlag;
      }
    },
  };
}
