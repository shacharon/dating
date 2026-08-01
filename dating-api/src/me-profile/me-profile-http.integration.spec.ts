/**
 * HTTP integration: `/api/v1/me/profile` with mocked Prisma + Google auth stack.
 * Run: `npm run smoke:me-profile` or `npm run validate:phase2-me-profile` (includes service unit tests).
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
import { GoogleAuthService } from '../auth/google-auth.service';
import { requestCorrelationMiddleware } from '../logging/request-correlation.middleware';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { LLM_CONFIG } from '../llm/llm.constants';
import { MatchNarrativeGenerator } from '../matches/match-narrative';
import { PHOTO_STORAGE } from '../photo-storage/photo-storage.module';
import { MeProfileAnalysisService } from './me-profile-analysis.service';
import { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import { MeConversationsService } from './me-conversations.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import {
  createMatchNarrativeCachePrismaMock,
  createMatchNarrativeGeneratorStub,
} from './match-narrative-test-stubs';
import { MeProfileModule } from './me-profile.module';
import { MeProfileValidationPipe } from './me-profile-validation.pipe';

function parseStructuredJsonLogs(
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

function extractCookieValue(
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

describe('me profile HTTP (integration)', () => {
  let app: INestApplication<App>;
  const narrativeCachePrisma = createMatchNarrativeCachePrismaMock();
  const matchNarrativeGeneratorStub = createMatchNarrativeGeneratorStub({
    source: 'llm',
    narrative: 'HTTP stub LLM narrative about shared emotional depth.',
  });
  const prismaMock = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(async (sql: { values: unknown[]; strings?: readonly string[] }) => {
      const sqlText = Array.isArray(sql.strings) ? sql.strings.join(' ') : '';
      // Sprint 28 Story 4 — inbox unread batch (UNNEST on Message). Default empty; tests override.
      if (sqlText.includes('UNNEST') || sqlText.includes('"Message"')) {
        return [];
      }
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
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn(),
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

  const PEPPER = 'me-profile-test-pepper';
  const SESSION_COOKIE = 'dating_session';
  const configStub = {
    googleClientId: 'google-client-id',
    sessionSecretPepper: PEPPER,
    sessionCookieName: SESSION_COOKIE,
    sessionTtlDays: 14,
    cookieDomain: undefined as string | undefined,
    cookieSecure: false,
    corsOrigin: 'http://localhost:3000',
  };

  const USER_ID = 'user_me_profile_1';

  beforeAll(async () => {
    prismaMock.userSession.create.mockImplementation(async ({ data }) => ({
      id: 'sess_me_profile',
      expiresAt: data.expiresAt,
    }));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AuthSessionConfigModule,
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
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(requestCorrelationMiddleware);
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
    prismaMock.matchFeedback.findUnique?.mockReset?.();
    prismaMock.matchFeedback.upsert?.mockReset?.();
    prismaMock.mutualMatch.upsert?.mockReset?.();
    prismaMock.mutualMatch.create?.mockReset?.();
    prismaMock.mutualMatch.findFirst?.mockReset?.();
    prismaMock.mutualMatch.findMany?.mockReset?.();
    prismaMock.mutualMatch.findMany?.mockResolvedValue([]);
    prismaMock.mutualMatch.findUnique?.mockReset?.();
    prismaMock.mutualMatch.update?.mockReset?.();
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
    app.get(ConversationMessageRateLimitService).resetForTests();
  });

  async function loginAndCookie(): Promise<string> {
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
  }

  it('GET /api/v1/me/profile returns 401 without session', async () => {
    await request(app.getHttpServer()).get('/api/v1/me/profile').expect(401);
  });

  it('POST /api/v1/me/profile returns 401 without session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .send({ aboutMe: 'x' })
      .expect(401);
  });

  it('PATCH /api/v1/me/profile returns 401 without session', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .send({ aboutMe: 'x' })
      .expect(401);
  });

  it('GET /api/v1/me/profile returns 404 when profile row missing', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    expect(res.body).toMatchObject({
      error: 'profile_not_found',
      message: expect.stringContaining('No profile exists'),
    });
  });

  it('full create → read → patch flow for current session user', async () => {
    const raw = await loginAndCookie();
    const created = {
      id: 'prof_flow',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'first',
      aboutPartner: null,
      aboutRelationship: null,
      gender: 'FEMALE' as const,
      desiredPartnerGenders: null as unknown,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    };
    const updated = {
      ...created,
      aboutMe: 'second',
      aboutPartner: 'partner line',
      updatedAt: new Date('2026-02-02T00:00:00.000Z'),
    };

    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce(null) // GET 404
      .mockResolvedValueOnce(null) // POST conflict check
      .mockResolvedValueOnce({ ...created, desiredPartnerGenders: null }) // POST: upsertPreference snapshot by id
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: null }) // POST: refetch for response
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: null }) // GET profile
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: null }) // PATCH load
      .mockResolvedValueOnce({ ...created, desiredPartnerGenders: null }) // PATCH: upsertPreference snapshot
      .mockResolvedValueOnce({ ...updated, preference: null, desiredPartnerGenders: null }); // PATCH refetch
    prismaMock.userProfile.create.mockResolvedValue(created);
    await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    const postRes = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ gender: 'FEMALE', aboutMe: 'first' })
      .expect(201);
    expect(postRes.body.aboutMe).toBe('first');

    const getRes = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);
    expect(getRes.body.aboutMe).toBe('first');

    prismaMock.userProfile.update.mockResolvedValue(updated);
    const patchRes = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: 'second', aboutPartner: 'partner line' })
      .expect(200);
    expect(patchRes.body.aboutMe).toBe('second');
    expect(patchRes.body.aboutPartner).toBe('partner line');
  });

  it('GET /api/v1/me/profile returns 200 when profile exists', async () => {
    const raw = await loginAndCookie();
    const row = {
      id: 'prof_1',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'hi',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique.mockResolvedValue({ ...row, preference: null });

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'prof_1',
      userId: USER_ID,
      status: 'DRAFT',
      onboardingStep: 'BASIC',
      aboutMe: 'hi',
    });
    expect(prismaMock.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      include: { preference: true },
    });
  });

  it('POST /api/v1/me/profile returns 201 without gender (defaults; onboarding step 1)', async () => {
    const raw = await loginAndCookie();
    const created = {
      id: 'prof_min',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC' as const,
      gender: 'PREFER_NOT_TO_SAY' as const,
      nickname: 'River',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: new Date('1990-06-01'),
      desiredPartnerGenders: null as unknown,
      city: 'TLV',
      country: 'IL',
      locationLabel: null,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...created, desiredPartnerGenders: null })
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: null });
    prismaMock.userProfile.create.mockResolvedValue(created);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({
        nickname: 'River',
        birthDate: '1990-06-01',
        city: 'TLV',
        country: 'IL',
        onboardingStep: 'BASIC',
      })
      .expect(201);

    expect(res.body.onboardingStep).toBe('BASIC');
    expect(res.body.nickname).toBe('River');
    expect(prismaMock.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: { connect: { id: USER_ID } },
        status: UserProfileStatus.DRAFT,
        gender: 'PREFER_NOT_TO_SAY',
        nickname: 'River',
        onboardingStep: 'BASIC',
      }),
    });
  });

  it('POST /api/v1/me/profile returns 201 and creates for session user', async () => {
    const raw = await loginAndCookie();
    const created = {
      id: 'prof_new',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'TEXTS',
      gender: 'MALE' as const,
      aboutMe: 'x',
      aboutPartner: null,
      aboutRelationship: null,
      desiredPartnerGenders: null as unknown,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...created, desiredPartnerGenders: null })
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: null });
    prismaMock.userProfile.create.mockResolvedValue(created);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({
        gender: 'MALE',
        aboutMe: 'x',
        desiredPartnerGenders: ['FEMALE'],
        onboardingStep: 'TEXTS',
      })
      .expect(201);

    expect(res.body.userId).toBe(USER_ID);
    expect(prismaMock.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: { connect: { id: USER_ID } },
        status: UserProfileStatus.DRAFT,
        gender: 'MALE',
        aboutMe: 'x',
        desiredPartnerGenders: ['FEMALE'],
        onboardingStep: 'TEXTS',
      }),
    });
  });

  it('POST /api/v1/me/profile returns 422 when onboardingStep TEXTS without desiredPartnerGenders', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ gender: 'MALE', onboardingStep: 'TEXTS' })
      .expect(422);

    expect(res.body).toMatchObject({ error: 'onboarding_partner_genders_required' });
    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 422 when onboardingStep COMPLETED without all texts', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_inc',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'TEXTS',
      aboutMe: 'only me',
      aboutPartner: null,
      aboutRelationship: null,
      gender: 'MALE' as const,
      desiredPartnerGenders: ['FEMALE'] as unknown,
      preference: null,
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ onboardingStep: 'COMPLETED' })
      .expect(422);

    expect(res.body).toMatchObject({ error: 'onboarding_texts_incomplete' });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 400 when partnerAgeMin exceeds partnerAgeMax', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_inc',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'COMPLETED',
      aboutMe: 'me',
      aboutPartner: 'partner',
      aboutRelationship: 'rel',
      gender: 'MALE' as const,
      desiredPartnerGenders: ['FEMALE'] as unknown,
      preference: null,
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ partnerAgeMin: 40, partnerAgeMax: 30 })
      .expect(400);

    expect(
      Array.isArray(res.body.message)
        ? res.body.message.join(' ')
        : String(res.body.message),
    ).toMatch(/partnerAgeMin must be less than or equal to partnerAgeMax/i);
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 409 when profile already exists', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_existing',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ gender: 'FEMALE' })
      .expect(409);

    expect(res.body).toMatchObject({
      error: 'profile_already_exists',
      message: expect.stringContaining('PATCH'),
    });
    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when body includes userId', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ userId: 'evil' })
      .expect(400);

    expect(
      Array.isArray(res.body.message)
        ? res.body.message.join(' ')
        : String(res.body.message),
    ).toMatch(/userId|not allowed/i);
    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when status is sent (not whitelisted)', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ status: 'DISABLED' })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when onboardingStep is not a valid enum', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ onboardingStep: 0 })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it.each([
    ['fraction', { onboardingStep: 1.5 }],
    ['negative', { onboardingStep: -1 }],
    ['invalid string', { onboardingStep: 'STEP_99' }],
  ])(
    'POST /api/v1/me/profile returns 400 when onboardingStep is invalid (%s)',
    async (_label, body) => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/me/profile')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send(body)
        .expect(400);

      expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
    },
  );

  it('POST /api/v1/me/profile returns 400 when aboutMe is not a string', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: ['not', 'a', 'string'] })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when aboutRelationship is not a string', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutRelationship: 99 })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 404 when profile missing', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: 'nope' })
      .expect(404);

    expect(res.body).toMatchObject({ error: 'profile_not_found' });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 200 with empty body and does not call update', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_partial',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'COMPLETED',
      aboutMe: 'keep',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique.mockResolvedValue({
      ...existing,
      preference: null,
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({})
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'prof_partial',
      aboutMe: 'keep',
      onboardingStep: 'COMPLETED',
      status: 'DRAFT',
    });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 200 for partial field-only update (onboardingStep only)', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_step',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'] as unknown,
      aboutMe: 'unchanged',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce({
        ...existing,
        preference: null,
      })
      .mockResolvedValueOnce({ ...existing })
      .mockResolvedValueOnce({
        ...existing,
        onboardingStep: 'TEXTS',
        updatedAt: new Date('2026-01-05T00:00:00.000Z'),
        preference: null,
      });
    prismaMock.userProfile.update.mockResolvedValue({
      ...existing,
      onboardingStep: 'TEXTS',
      updatedAt: new Date('2026-01-05T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ onboardingStep: 'TEXTS' })
      .expect(200);

    expect(res.body.onboardingStep).toBe('TEXTS');
    expect(res.body.aboutMe).toBe('unchanged');
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { onboardingStep: 'TEXTS' },
    });
  });

  it('PATCH /api/v1/me/profile returns 200 when clearing aboutMe with null', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_null',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'will clear',
      aboutPartner: 'p',
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce({ ...existing, preference: null, desiredPartnerGenders: null })
      .mockResolvedValueOnce({ ...existing, desiredPartnerGenders: null })
      .mockResolvedValueOnce({
        ...existing,
        aboutMe: null,
        updatedAt: new Date('2026-01-06T00:00:00.000Z'),
        preference: null,
        desiredPartnerGenders: null,
      });
    prismaMock.userProfile.update.mockResolvedValue({
      ...existing,
      aboutMe: null,
      updatedAt: new Date('2026-01-06T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: null })
      .expect(200);

    expect(res.body.aboutMe).toBeNull();
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { aboutMe: null },
    });
  });

  it('PATCH /api/v1/me/profile returns 400 when onboardingStep is not a valid enum', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_u',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'a',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ onboardingStep: 0 })
      .expect(400);

    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 400 when aboutPartner is not a string', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_u',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'a',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutPartner: { o: 'no' } })
      .expect(400);

    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 200 and updates current user row', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_u',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce({ ...existing, preference: null, desiredPartnerGenders: null })
      .mockResolvedValueOnce({ ...existing, desiredPartnerGenders: null })
      .mockResolvedValueOnce({
        ...existing,
        aboutMe: 'patched',
        updatedAt: new Date('2026-01-04T00:00:00.000Z'),
        preference: null,
        desiredPartnerGenders: null,
      });
    prismaMock.userProfile.update.mockResolvedValue({
      ...existing,
      aboutMe: 'patched',
      updatedAt: new Date('2026-01-04T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: 'patched' })
      .expect(200);

    expect(res.body.aboutMe).toBe('patched');
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { aboutMe: 'patched' },
    });
  });

  it('PATCH /api/v1/me/profile returns 400 when status is sent (not whitelisted)', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_u',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'a',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ status: 'DISABLED' })
      .expect(400);

    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 400 when body includes userId', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_u',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'a',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ userId: 'evil', aboutMe: 'b' })
      .expect(400);

    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when birthDate is in the future', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ birthDate: '2099-01-01' })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when birthDate is not a valid ISO date string', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ birthDate: 'not-a-date' })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when gender is not a ProfileGender value', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ gender: 'AGENDER' })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when desiredPartnerGenders is an empty array', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ desiredPartnerGenders: [] })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when desiredPartnerGenders contains an invalid enum', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ desiredPartnerGenders: ['MALE', 'INVALID'] })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when city is not a string', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ city: 12345 })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 201 with identity fields', async () => {
    const raw = await loginAndCookie();
    const created = {
      id: 'prof_identity',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: new Date('1990-05-20T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'Haifa',
      country: 'IL',
      locationLabel: 'Haifa, IL',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...created, desiredPartnerGenders: ['MALE'] })
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: ['MALE'] });
    prismaMock.userProfile.create.mockResolvedValue(created);

    const postRes = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({
        birthDate: '1990-05-20',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
        city: 'Haifa',
        country: 'IL',
        locationLabel: 'Haifa, IL',
      })
      .expect(201);

    expect(postRes.body).toMatchObject({
      gender: 'FEMALE',
      city: 'Haifa',
      country: 'IL',
      locationLabel: 'Haifa, IL',
      desiredPartnerGenders: ['MALE'],
    });
    expect(typeof postRes.body.birthDate).toBe('string');

    expect(prismaMock.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        birthDate: expect.any(Date),
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
        city: 'Haifa',
        country: 'IL',
        locationLabel: 'Haifa, IL',
      }),
    });
  });

  it('PATCH /api/v1/me/profile clears desiredPartnerGenders with null', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_clr_dpg',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: null,
      desiredPartnerGenders: ['FEMALE'],
      city: null,
      country: null,
      locationLabel: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce({ ...existing, preference: null })
      .mockResolvedValueOnce({
        ...existing,
        desiredPartnerGenders: null,
        updatedAt: new Date('2026-01-07T00:00:00.000Z'),
        preference: null,
      });
    prismaMock.userProfile.update.mockResolvedValue({
      ...existing,
      desiredPartnerGenders: null,
      updatedAt: new Date('2026-01-07T00:00:00.000Z'),
    });

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ desiredPartnerGenders: null })
      .expect(200);

    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { desiredPartnerGenders: Prisma.DbNull },
    });
  });

  it('GET /api/v1/me/profile returns enriched fields when stored on row', async () => {
    const raw = await loginAndCookie();
    const row = {
      id: 'prof_enriched_get',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'TEXTS',
      aboutMe: 'About',
      aboutPartner: null,
      aboutRelationship: 'LT',
      birthDate: new Date('1988-03-10T00:00:00.000Z'),
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE', 'NON_BINARY'],
      city: 'Beer Sheva',
      country: 'IL',
      locationLabel: 'Beer Sheva, IL',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique.mockResolvedValue({ ...row, preference: null });

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'prof_enriched_get',
      onboardingStep: 'TEXTS',
      aboutMe: 'About',
      aboutRelationship: 'LT',
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE', 'NON_BINARY'],
      city: 'Beer Sheva',
      country: 'IL',
      locationLabel: 'Beer Sheva, IL',
    });
    expect(typeof res.body.birthDate).toBe('string');
  });

  it('PATCH /api/v1/me/profile persists enriched fields', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_patch_enr',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: null,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const updated = {
      ...existing,
      birthDate: new Date('1992-11-05T00:00:00.000Z'),
      gender: 'NON_BINARY',
      desiredPartnerGenders: ['MALE'],
      city: 'Jerusalem',
      country: 'IL',
      locationLabel: 'Jerusalem, IL',
      aboutMe: 'Patched bio',
      updatedAt: new Date('2026-01-08T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce({ ...existing, preference: null })
      .mockResolvedValueOnce({ ...updated, preference: null });
    prismaMock.userProfile.update.mockResolvedValue(updated);

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({
        birthDate: '1992-11-05',
        gender: 'NON_BINARY',
        desiredPartnerGenders: ['MALE'],
        city: 'Jerusalem',
        country: 'IL',
        locationLabel: 'Jerusalem, IL',
        aboutMe: 'Patched bio',
      })
      .expect(200);

    expect(res.body.gender).toBe('NON_BINARY');
    expect(res.body.city).toBe('Jerusalem');
    expect(res.body.desiredPartnerGenders).toEqual(['MALE']);
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: expect.objectContaining({
        birthDate: expect.any(Date),
        gender: 'NON_BINARY',
        desiredPartnerGenders: ['MALE'],
        city: 'Jerusalem',
        country: 'IL',
        locationLabel: 'Jerusalem, IL',
        aboutMe: 'Patched bio',
      }),
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/me/profile/analysis/latest
  // ---------------------------------------------------------------------------

  it('GET /api/v1/me/profile/analysis/latest returns 401 without session', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/me/profile/analysis/latest')
      .expect(401);
  });

  it('GET /api/v1/me/profile/analysis/latest returns 404 when profile does not exist', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile/analysis/latest')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    expect(res.body).toMatchObject({ error: 'profile_not_found' });
  });

  it('GET /api/v1/me/profile/analysis/latest returns 404 when no UserProfileEvaluation row exists', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_analysis_latest_1',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'BASIC',
      aboutMe: 'x',
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: null,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
      submittedAt: null,
      analyzedAt: null,
      lastAnalysisError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.userProfileEvaluation.findFirst.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile/analysis/latest')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    expect(res.body).toMatchObject({ error: 'evaluation_not_found' });
  });

  it('GET /api/v1/me/profile/analysis/latest returns latest UserProfileEvaluation', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_analysis_latest_2',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'BASIC',
      aboutMe: 'x',
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: null,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
      submittedAt: null,
      analyzedAt: null,
      lastAnalysisError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const createdAt = new Date('2026-04-15T15:00:00.000Z');
    prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
      id: 'upeval_int_1',
      profileId: 'prof_analysis_latest_2',
      version: 'v1',
      evaluationJson: { self: {}, partner: {} },
      createdAt,
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile/analysis/latest')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);

    expect(res.body.userProfileId).toBe('prof_analysis_latest_2');
    expect(res.body.evaluationId).toBe('upeval_int_1');
    expect(res.body.createdAt).toBe(createdAt.toISOString());
    expect(res.body.evaluationJson).toEqual({ self: {}, partner: {} });
    expect(prismaMock.userProfileEvaluation.findFirst).toHaveBeenCalledWith({
      where: { profileId: 'prof_analysis_latest_2' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/me/profile/submit
  // ---------------------------------------------------------------------------

  it('POST /api/v1/me/profile/submit returns 401 without session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .expect(401);
  });

  it('POST /api/v1/me/profile/submit returns 404 when profile does not exist', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    expect(res.body).toMatchObject({
      error: 'profile_not_found',
      message: expect.stringContaining('No profile exists'),
    });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile/submit returns 422 when gender is not explicitly chosen', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_submit_nogender',
      userId: USER_ID,
      status: 'DRAFT' as UserProfileStatus,
      onboardingStep: 'BASIC',
      aboutMe: 'ready',
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: 'PREFER_NOT_TO_SAY' as const,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
      submittedAt: null,
      analyzedAt: null,
      lastAnalysisError: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(422);

    expect(res.body).toMatchObject({ error: 'gender_required' });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile/submit returns 422 when no approved photo', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_submit_nophoto',
      userId: USER_ID,
      status: 'DRAFT' as UserProfileStatus,
      onboardingStep: 'BASIC',
      aboutMe: 'ready',
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: 'FEMALE' as const,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
      submittedAt: null,
      analyzedAt: null,
      lastAnalysisError: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    });
    prismaMock.userProfilePhoto.count.mockResolvedValue(0);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(422);

    expect(res.body).toMatchObject({ error: 'photo_required' });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile/submit returns 202 and sets status SUBMITTED from DRAFT', async () => {
    const raw = await loginAndCookie();
    const draftRow = {
      id: 'prof_submit_1',
      userId: USER_ID,
      status: 'DRAFT' as UserProfileStatus,
      onboardingStep: 'BASIC',
      aboutMe: 'ready',
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: 'FEMALE' as const,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
      submittedAt: null,
      analyzedAt: null,
      lastAnalysisError: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    };
    const submittedAt = new Date('2026-04-15T10:00:00.000Z');
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce(draftRow)
      .mockResolvedValueOnce({
        ...draftRow,
        status: 'SUBMITTED' as UserProfileStatus,
        submittedAt,
        updatedAt: submittedAt,
        preference: null,
      });
    prismaMock.userProfile.update.mockResolvedValue({
      ...draftRow,
      status: 'SUBMITTED' as UserProfileStatus,
      submittedAt,
      updatedAt: submittedAt,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(202);

    expect(res.body.analysisJobId).toBeTruthy();
    expect(res.body.profile.status).toBe('SUBMITTED');
    expect(res.body.profile.submittedAt).toBeTruthy();
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: expect.objectContaining({
        status: 'SUBMITTED',
        lastAnalysisError: null,
      }),
    });
  });

  it.each(['SUBMITTED', 'ANALYZING'] as const)(
    'POST /api/v1/me/profile/submit returns 422 when status is %s',
    async (status) => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue({
        id: 'prof_inflight',
        userId: USER_ID,
        status: status as UserProfileStatus,
        onboardingStep: 'BASIC',
        aboutMe: null,
        aboutPartner: null,
        aboutRelationship: null,
        birthDate: null,
        gender: null,
        desiredPartnerGenders: null,
        city: null,
        country: null,
        locationLabel: null,
        submittedAt: new Date(),
        analyzedAt: null,
        lastAnalysisError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/profile/submit')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(422);

      expect(res.body).toMatchObject({
        error: 'invalid_submit_state',
        currentStatus: status,
      });
      expect(Array.isArray(res.body.allowedStatuses)).toBe(true);
      expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
    },
  );

  describe('observability: request id + structured logs', () => {
    it('echoes x-request-id on unauthenticated GET /api/v1/me/profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me/profile')
        .set('x-request-id', 'client-req-id-me-1')
        .expect(401);
      expect(res.headers['x-request-id']).toBe('client-req-id-me-1');
    });

    it('emits structured JSON with AUTH_GUARD_UNAUTHORIZED on 401', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await request(app.getHttpServer()).get('/api/v1/me/profile').expect(401);
        const hit = parseStructuredJsonLogs(spy).find(
          (o) =>
            typeof o === 'object' &&
            o !== null &&
            (o as { errorCode?: string }).errorCode === 'AUTH_GUARD_UNAUTHORIZED',
        );
        expect(hit).toBeDefined();
        expect((hit as { level: string }).level).toBe('error');
        expect((hit as { service: string }).service).toBe('dating-api');
      } finally {
        spy.mockRestore();
      }
    });

    it('emits ME_PROFILE_GET_NOT_FOUND trace on GET profile 404', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const raw = await loginAndCookie();
        prismaMock.userProfile.findUnique.mockResolvedValue(null);
        await request(app.getHttpServer())
          .get('/api/v1/me/profile')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .expect(404);
        const hit = parseStructuredJsonLogs(spy).find(
          (o) =>
            (o as { errorCode?: string }).errorCode === 'ME_PROFILE_GET_NOT_FOUND',
        );
        expect(hit).toBeDefined();
        expect((hit as { level: string }).level).toBe('trace');
      } finally {
        spy.mockRestore();
      }
    });

    it('emits ME_PROFILE_VALIDATION_FAILED on invalid POST body', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const raw = await loginAndCookie();
        prismaMock.userProfile.findUnique.mockResolvedValue(null);
        await request(app.getHttpServer())
          .post('/api/v1/me/profile')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ onboardingStep: 'INVALID' })
          .expect(400);
        const hit = parseStructuredJsonLogs(spy).find(
          (o) =>
            (o as { errorCode?: string }).errorCode === 'ME_PROFILE_VALIDATION_FAILED',
        );
        expect(hit).toBeDefined();
        expect((hit as { level: string }).level).toBe('error');
      } finally {
        spy.mockRestore();
      }
    });

    it('emits ME_PROFILE_CREATE_CONFLICT on POST 409', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const raw = await loginAndCookie();
        prismaMock.userProfile.findUnique.mockResolvedValue({
          id: 'prof_exists',
          userId: USER_ID,
          status: UserProfileStatus.DRAFT,
          onboardingStep: 'BASIC',
          aboutMe: 'x',
          aboutPartner: null,
          aboutRelationship: null,
          birthDate: null,
          gender: null,
          desiredPartnerGenders: null,
          city: null,
          country: null,
          locationLabel: null,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        });
        // gender must be present so the gender guard passes and the conflict check runs
        await request(app.getHttpServer())
          .post('/api/v1/me/profile')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ gender: 'FEMALE', aboutMe: 'y' })
          .expect(409);
        const hit = parseStructuredJsonLogs(spy).find(
          (o) =>
            (o as { errorCode?: string }).errorCode === 'ME_PROFILE_CREATE_CONFLICT',
        );
        expect(hit).toBeDefined();
        expect((hit as { level: string }).level).toBe('error');
      } finally {
        spy.mockRestore();
      }
    });
  });

  // ─── Phase 3 Step 5: GET /api/v1/me/matches ──────────────────────────────────

  /**
   * Minimal `UserProfilePreference` joined row for /me/matches mocks.
   * Must not set partnerAgeMin/Max (HG age eval FAILs when candidate birthDate is null in fixtures).
   * Use maxDistanceKm and/or acceptedPartnerGenders so the row is non-empty (no pref fallback log).
   */
  function testUserProfilePreference(
    profileId: string,
    opts?: { acceptedPartnerGenders?: string[] },
  ) {
    return {
      id: `pref_${profileId}`,
      profileId,
      partnerAgeMin: null as number | null,
      partnerAgeMax: null as number | null,
      maxDistanceKm: 100,
      acceptedPartnerGenders: opts?.acceptedPartnerGenders ?? ([] as string[]),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
  }

  /** HG fact columns on `UserProfile`. Partner prefs live on `UserProfilePreference` (Phase F). */
  const HG_FIELD_DEFAULTS = {
    childrenStatus: null as string | null,
    wantsChildren: null as string | null,
    smokingFrequency: null as string | null,
    alcoholUse: null as string | null,
    education: null as string | null,
    religion: null as string | null,
  };

  describe('GET /api/v1/me/matches', () => {
    const viewerProfile = {
      id: 'prof_viewer_s5',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_s5', {
        acceptedPartnerGenders: ['MALE'],
      }),
    };

    function mockListEvaluations() {
      prismaMock.userProfileEvaluation.findFirst.mockImplementation(
        async (args: { where?: { profileId?: string } }) => {
          const profileId = args?.where?.profileId ?? viewerProfile.id;
          return {
            id: `eval_${profileId}`,
            profileId,
            version: 'v1',
            createdAt: new Date('2026-04-01T10:00:00.000Z'),
            evaluationJson: { display: { summary: 'Test summary.' } },
          };
        },
      );
    }

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .expect(401);
    });

    it('returns 200 not_ready(no_profile) when viewer has no UserProfile', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('not_ready');
      expect(res.body.reason).toBe('no_profile');
    });

    it('returns 200 not_ready(not_analyzed) when viewer profile is DRAFT', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue({
        ...viewerProfile,
        status: UserProfileStatus.DRAFT,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('not_ready');
      expect(res.body.reason).toBe('not_analyzed');
    });

    it('returns 200 not_ready(no_photo) when viewer is ANALYZED but has no approved photos', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfilePhoto.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('not_ready');
      expect(res.body.reason).toBe('no_photo');
    });

    it('returns 200 ready with empty matches when no candidates exist', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count.mockResolvedValue(0);
      prismaMock.userProfile.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.viewerProfileId).toBe('prof_viewer_s5');
      expect(res.body.matches).toHaveLength(0);
      expect(res.body.totalCandidatesBeforeFilter).toBe(0);
      expect(res.body.filteredNoPhotoCandidates).toBe(0);
    });

    it('returns 200 ready — gender-mismatched candidate excluded', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count.mockResolvedValue(1);
      // Candidate is FEMALE — viewer (FEMALE) wants MALE only → excluded
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_1',
          userId: 'user_s5_cand_1',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1992-03-15T00:00:00.000Z'),
          gender: 'FEMALE',
          desiredPartnerGenders: null,
          city: 'NYC',
          country: 'US',
          locationLabel: 'New York, US',
          aboutMe: null,
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-01T10:00:00.000Z'),
          photos: [{ id: 'photo_cand_1', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_1'),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.totalCandidatesBeforeFilter).toBe(1);
      expect(res.body.matches).toHaveLength(0);
    });

    it('returns 200 ready — valid candidate included and id is UserProfile.id', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count.mockResolvedValue(1);
      // Candidate is MALE — viewer (FEMALE) wants MALE, candidate has no filter → included
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_2',
          userId: 'user_s5_cand_2',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1988-07-20T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
          photos: [{ id: 'photo_match_1', isPrimary: true }],
          _count: { evaluations: 2 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_2'),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.matches).toHaveLength(1);
      expect(res.body.matches[0].id).toBe('prof_s5_cand_2');
      expect(res.body.matches[0].gender).toBe('MALE');
      expect(res.body.matches[0].hasEvaluation).toBe(true);
      expect(res.body.matches[0].primaryPhotoUrl).toBe(
        '/api/v1/me/matches/prof_s5_cand_2/photos/photo_match_1/file',
      );
      expect(res.body.matches[0].approvedPhotoCount).toBe(1);
      expect(res.body.matches[0].yourAction).toBeNull();
    });

    it('includes yourAction on list items from batch action join', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count.mockResolvedValue(2);
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_2',
          userId: 'user_s5_cand_2',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1988-07-20T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate A',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
          photos: [{ id: 'photo_cand_2', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_2'),
        },
        {
          id: 'prof_s5_cand_3',
          userId: 'user_s5_cand_3',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1987-05-10T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate B',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-03T11:00:00.000Z'),
          photos: [{ id: 'photo_cand_3', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_3'),
        },
      ]);
      prismaMock.matchAction.findMany.mockResolvedValue([
        { targetUserId: 'user_s5_cand_2', action: 'LIKE' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.matches).toHaveLength(2);
      const liked = res.body.matches.find(
        (m: { id: string }) => m.id === 'prof_s5_cand_2',
      );
      const other = res.body.matches.find(
        (m: { id: string }) => m.id === 'prof_s5_cand_3',
      );
      expect(liked.yourAction).toBe('LIKE');
      expect(other.yourAction).toBeNull();
      expect(prismaMock.matchAction.findMany).toHaveBeenCalledWith({
        where: { actorUserId: USER_ID },
        select: { targetUserId: true, action: true },
      });
    });

    it('excludes blocked candidates from list', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count.mockResolvedValue(2);
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_2',
          userId: 'user_s5_cand_2',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1988-07-20T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate A',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
          photos: [{ id: 'photo_cand_2', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_2'),
        },
        {
          id: 'prof_s5_cand_3',
          userId: 'user_s5_cand_3',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1987-05-10T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate B',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-03T11:00:00.000Z'),
          photos: [{ id: 'photo_cand_3', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_3'),
        },
      ]);
      prismaMock.matchAction.findMany.mockResolvedValue([
        { targetUserId: 'user_s5_cand_2', action: 'BLOCK' },
        { targetUserId: 'user_s5_cand_3', action: 'LIKE' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.matches).toHaveLength(1);
      expect(res.body.matches[0].id).toBe('prof_s5_cand_3');
      expect(res.body.matches[0].yourAction).toBe('LIKE');
    });

    it('excludes analyzed candidates with zero approved photos from list', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count
        .mockResolvedValueOnce(2) // base ANALYZED
        .mockResolvedValueOnce(1); // photo+prefilter eligible
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_photo',
          userId: 'user_s5_cand_photo',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1988-07-20T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Has photo',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
          photos: [{ id: 'photo_match_1', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_photo'),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.matches).toHaveLength(1);
      expect(res.body.filteredNoPhotoCandidates).toBe(1);
      expect(res.body.totalCandidatesBeforeFilter).toBe(1);
    });
  });

  // ─── Phase 3 Step 5: GET /api/v1/me/matches/:id ───────────────────────────

  describe('GET /api/v1/me/matches/:id', () => {
    const viewerProfile = {
      id: 'prof_viewer_s5_det',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_s5_det', {
        acceptedPartnerGenders: ['MALE'],
      }),
    };

    const candidateProfile = {
      id: 'prof_s5_det_cand',
      userId: 'user_s5_det_cand',
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_s5_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_s5_det_cand'),
      user: { deletedAt: null },
    };

    it('returns 404 when candidate has no approved photos — no existence leak', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({ ...candidateProfile, photos: [] });

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .expect(401);
    });

    it('returns 404 when viewer has no UserProfile', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 404 when candidate does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 404 when candidate fails gender filter — no existence leak', async () => {
      const raw = await loginAndCookie();
      // Candidate is FEMALE — viewer (FEMALE) wants MALE only → ineligible → 404
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({ ...candidateProfile, gender: 'FEMALE' as const });

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 200 with detail — does not expose aboutMe/aboutPartner/aboutRelationship', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(candidateProfile);
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_s5_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.id).toBe('prof_s5_det_cand');
      expect(res.body.gender).toBe('MALE');
      expect(res.body.hasEvaluation).toBe(true);
      expect(res.body.evaluationSummary).toBe('Warm and grounded individual.');
      // Ownership check: raw profile text must never appear in the response
      expect(res.body.aboutMe).toBeUndefined();
      expect(res.body.aboutPartner).toBeUndefined();
      expect(res.body.aboutRelationship).toBeUndefined();
      expect(res.body.userId).toBeUndefined();
    });

    it('returns 404 when viewer blocked the candidate', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(candidateProfile);
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_s5_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'BLOCK' });

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('serves approved primary match photo through controlled endpoint', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({
          ...candidateProfile,
          preference: testUserProfilePreference('prof_s5_det_cand'),
        });
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        id: 'photo_s5_primary',
        profileId: 'prof_s5_det_cand',
        storageKey: 'uploads/profile-photos/prof_s5_det_cand/photo_s5_primary.jpg',
        mimeType: 'image/jpeg',
      });
      photoStorageMock.read.mockResolvedValue(Buffer.from([255, 216, 255]));

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand/photos/photo_s5_primary/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200)
        .expect('Content-Type', /image\/jpeg/);
    });

    it('returns 404 for photo when viewer blocked the candidate', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({
          ...candidateProfile,
          preference: testUserProfilePreference('prof_s5_det_cand'),
        });
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'BLOCK' });

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand/photos/photo_s5_primary/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.userProfilePhoto.findFirst).not.toHaveBeenCalled();
    });

    it('returns 404 for match photo when viewer has no approved photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({
          ...candidateProfile,
          preference: testUserProfilePreference('prof_s5_det_cand'),
        });
      prismaMock.userProfilePhoto.count.mockImplementation(
        async (args: { where: { profileId: string } }) =>
          args.where.profileId === viewerProfile.id ? 0 : 1,
      );

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand/photos/photo_s5_primary/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.userProfilePhoto.findFirst).not.toHaveBeenCalled();
    });

    it('returns 404 for match photo when candidate has no approved photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({
          ...candidateProfile,
          preference: testUserProfilePreference('prof_s5_det_cand'),
        });
      prismaMock.userProfilePhoto.count.mockImplementation(
        async (args: { where: { profileId: string } }) =>
          args.where.profileId === candidateProfile.id ? 0 : 1,
      );

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand/photos/photo_s5_primary/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.userProfilePhoto.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 22 Story 2: matchNarrative on detail ─────────────────────────

  describe('Sprint 22 — matchNarrative on GET /api/v1/me/matches/:id', () => {
    const viewerProfile = {
      id: 'prof_viewer_s22_narr',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_s22_narr', {
        acceptedPartnerGenders: ['MALE'],
      }),
    };

    const candidateProfile = {
      id: 'prof_s22_narr_cand',
      userId: 'user_s22_narr_cand',
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_s22_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_s22_narr_cand'),
      user: { deletedAt: null },
    };

    const validEvalJson = {
      self: {
        signals: {
          ambition: 0.6,
          socialBattery: 0.5,
          emotionalDepth: 0.7,
          attachmentSecurity: 0.6,
        },
      },
      partner: { signals: {} },
      relationship: { signals: {} },
      display: { summary: 'Warm and grounded individual.' },
    };

    function mockScoredEvals(candidateEvalId = 'eval_s22_cand_1') {
      prismaMock.userProfileEvaluation.findFirst.mockImplementation(
        ({ where: { profileId } }: { where: { profileId: string } }) =>
          Promise.resolve({
            id:
              profileId === viewerProfile.id
                ? 'eval_s22_viewer_1'
                : candidateEvalId,
            profileId,
            version: 'v1',
            createdAt: new Date('2026-04-02T12:00:00.000Z'),
            evaluationJson: validEvalJson,
          }),
      );
    }

    it('returns matchNarrative and skips generator on second open (cache hit)', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockImplementation(
        ({ where }: { where: { userId?: string; id?: string } }) => {
          if (where.userId === USER_ID) return Promise.resolve(viewerProfile);
          if (where.id === candidateProfile.id) {
            return Promise.resolve(candidateProfile);
          }
          return Promise.resolve(null);
        },
      );
      mockScoredEvals();

      const first = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s22_narr_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(first.body.matchNarrative).toBe(
        'HTTP stub LLM narrative about shared emotional depth.',
      );
      expect(matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(1);
      expect(narrativeCachePrisma.store.size).toBe(1);

      const second = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s22_narr_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(second.body.matchNarrative).toBe(
        'HTTP stub LLM narrative about shared emotional depth.',
      );
      expect(matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(1);
    });

    it('regenerates when candidate evaluation id changes', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockImplementation(
        ({ where }: { where: { userId?: string; id?: string } }) => {
          if (where.userId === USER_ID) return Promise.resolve(viewerProfile);
          if (where.id === candidateProfile.id) {
            return Promise.resolve(candidateProfile);
          }
          return Promise.resolve(null);
        },
      );
      mockScoredEvals('eval_s22_cand_1');

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s22_narr_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);
      expect(matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(1);

      mockScoredEvals('eval_s22_cand_2');
      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s22_narr_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);
      expect(matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(2);
    });

    it('does not cache fallback narratives', async () => {
      matchNarrativeGeneratorStub.generate.mockResolvedValue({
        narrative: 'Template fallback prose.',
        source: 'fallback',
        promptVersion: 'v1',
      });
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockImplementation(
        ({ where }: { where: { userId?: string; id?: string } }) => {
          if (where.userId === USER_ID) return Promise.resolve(viewerProfile);
          if (where.id === candidateProfile.id) {
            return Promise.resolve(candidateProfile);
          }
          return Promise.resolve(null);
        },
      );
      mockScoredEvals();

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s22_narr_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.matchNarrative).toBe('Template fallback prose.');
      expect(narrativeCachePrisma.store.size).toBe(0);
      expect(prismaMock.matchNarrativeCache.upsert).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 10 Story 4: match feedback ─────────────────────────────────────

  describe('PUT/GET /api/v1/me/matches/:id/feedback', () => {
    const CANDIDATE_USER_ID = 'user_feedback_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_feedback',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_feedback', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_feedback_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_feedback_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_feedback_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_feedback_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    it('returns 401 without session on GET', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_feedback_cand/feedback')
        .expect(401);
    });

    it('returns 401 without session on PUT', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/me/matches/prof_feedback_cand/feedback')
        .send({ sentiment: 'positive' })
        .expect(401);
    });

    it('GET returns null sentiment when no feedback row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchFeedback.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({ sentiment: null });
    });

    it('PUT positive upserts and GET returns POSITIVE', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-06-06T10:00:00.000Z');
      const updatedAt = new Date('2026-06-06T10:00:00.000Z');
      prismaMock.matchFeedback.upsert.mockResolvedValue({
        matchProfileId: candidateProfile.id,
        sentiment: 'POSITIVE',
        createdAt,
        updatedAt,
      });
      prismaMock.matchFeedback.findUnique.mockResolvedValue({
        sentiment: 'POSITIVE',
      });

      const putRes = await request(app.getHttpServer())
        .put('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ sentiment: 'positive' })
        .expect(200);

      expect(putRes.body).toMatchObject({
        matchProfileId: 'prof_feedback_cand',
        sentiment: 'POSITIVE',
      });

      const getRes = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(getRes.body).toEqual({ sentiment: 'POSITIVE' });
    });

    it('PUT negative updates existing row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchFeedback.upsert.mockResolvedValue({
        matchProfileId: candidateProfile.id,
        sentiment: 'NEGATIVE',
        createdAt: new Date('2026-06-06T10:00:00.000Z'),
        updatedAt: new Date('2026-06-06T11:00:00.000Z'),
      });

      const res = await request(app.getHttpServer())
        .put('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ sentiment: 'negative' })
        .expect(200);

      expect(res.body.sentiment).toBe('NEGATIVE');
      expect(prismaMock.matchFeedback.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { sentiment: 'NEGATIVE' },
        }),
      );
    });

    it('PUT on self profile returns 400 cannot_feedback_self', async () => {
      const raw = await loginAndCookie();
      const selfViewerProfile = {
        ...viewerProfile,
        gender: 'FEMALE' as const,
        desiredPartnerGenders: ['FEMALE'],
        preference: testUserProfilePreference('prof_viewer_feedback', {
          acceptedPartnerGenders: ['FEMALE'],
        }),
      };
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return selfViewerProfile;
          }
          if (args.where.id === selfViewerProfile.id) {
            return {
              ...selfViewerProfile,
              photos: [{ id: 'photo_self', isPrimary: true }],
              user: { deletedAt: null },
              _count: { evaluations: 1 },
            };
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_self',
        profileId: selfViewerProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Self summary.' } },
      });

      const res = await request(app.getHttpServer())
        .put(`/api/v1/me/matches/${selfViewerProfile.id}/feedback`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ sentiment: 'positive' })
        .expect(400);

      expect(res.body.error).toBe('cannot_feedback_self');
      expect(prismaMock.matchFeedback.upsert).not.toHaveBeenCalled();
    });

    it('GET on invisible candidate returns 404', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.matchFeedback.findUnique).not.toHaveBeenCalled();
    });

    it('PUT with invalid sentiment returns 400', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();

      await request(app.getHttpServer())
        .put('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ sentiment: 'maybe' })
        .expect(400);

      expect(prismaMock.matchFeedback.upsert).not.toHaveBeenCalled();
    });

    it('PUT on invisible candidate returns 404', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .put('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ sentiment: 'positive' })
        .expect(404);

      expect(prismaMock.matchFeedback.upsert).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 1 Story 3: GET /api/v1/me/matches/:id/actions ────────────────

  describe('GET /api/v1/me/matches/:id/actions', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_action',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_action', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_action_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_action_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_action_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .expect(401);
    });

    it('returns 404 when candidate does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.matchAction.findUnique).not.toHaveBeenCalled();
    });

    it('returns 200 with action null when match visible and no row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        action: null,
        mutualMatch: false,
        conversationId: null,
      });
      expect(prismaMock.matchAction.findUnique).toHaveBeenCalledWith({
        where: {
          actorUserId_targetUserId: {
            actorUserId: USER_ID,
            targetUserId: CANDIDATE_USER_ID,
          },
        },
        select: { action: true, createdAt: true },
      });
    });

    it('returns 200 with LIKE action and createdAt', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');
      prismaMock.matchAction.findUnique.mockResolvedValue({
        action: 'LIKE',
        createdAt,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        action: 'LIKE',
        createdAt: createdAt.toISOString(),
        mutualMatch: false,
        conversationId: null,
      });
    });

    it('returns 404 when viewer blocked the candidate', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'BLOCK' });

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });
  });

  // ─── Sprint 1 Story 1: POST /api/v1/me/matches/:id/actions ───────────────

  describe('POST /api/v1/me/matches/:id/actions', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_action',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_action', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_action_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_action_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_action_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .send({ action: 'LIKE' })
        .expect(401);
    });

    it('returns 404 when candidate does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(404);

      expect(prismaMock.matchAction.upsert).not.toHaveBeenCalled();
    });

    it('returns 400 when acting on self (same user id)', async () => {
      const raw = await loginAndCookie();
      const selfViewerProfile = {
        ...viewerProfile,
        gender: 'FEMALE' as const,
        desiredPartnerGenders: ['FEMALE'],
        preference: testUserProfilePreference('prof_viewer_action', {
          acceptedPartnerGenders: ['FEMALE'],
        }),
      };
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return selfViewerProfile;
          }
          if (args.where.id === selfViewerProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return { id: selfViewerProfile.id, userId: USER_ID };
            }
            return {
              ...selfViewerProfile,
              id: selfViewerProfile.id,
              userId: USER_ID,
              photos: [{ id: 'photo_self', isPrimary: true }],
              user: { deletedAt: null },
              _count: { evaluations: 1 },
            };
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_self',
        profileId: selfViewerProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Self summary.' } },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/me/matches/${selfViewerProfile.id}/actions`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(400);

      expect(prismaMock.matchAction.upsert).not.toHaveBeenCalled();
    });

    it('creates PASS action with user-to-user identity (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T11:00:00.000Z');
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_pass',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'PASS',
        createdAt,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      expect(res.body).toMatchObject({
        id: 'action_row_pass',
        action: 'PASS',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: 'prof_action_cand',
        createdAt: createdAt.toISOString(),
      });
    });

    it('creates BLOCK action with user-to-user identity (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T12:00:00.000Z');
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_block',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'BLOCK',
        createdAt,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'BLOCK' })
        .expect(201);

      expect(res.body).toMatchObject({
        id: 'action_row_block',
        action: 'BLOCK',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: 'prof_action_cand',
        createdAt: createdAt.toISOString(),
      });
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ action: 'BLOCK' }),
        }),
      );
    });

    it('BLOCK overwrites prior LIKE on same user pair (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T12:00:00.000Z');
      prismaMock.matchAction.upsert
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'LIKE',
          createdAt,
        })
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'BLOCK',
          createdAt,
        });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      const blockRes = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'BLOCK' })
        .expect(201);

      expect(blockRes.body.action).toBe('BLOCK');
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.matchAction.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ action: 'BLOCK' }),
        }),
      );
    });

    it('BLOCK overwrites prior PASS on same user pair (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T12:00:00.000Z');
      prismaMock.matchAction.upsert
        .mockResolvedValueOnce({
          id: 'action_row_pass',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'PASS',
          createdAt,
        })
        .mockResolvedValueOnce({
          id: 'action_row_pass',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'BLOCK',
          createdAt,
        });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      const blockRes = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'BLOCK' })
        .expect(201);

      expect(blockRes.body.action).toBe('BLOCK');
      expect(prismaMock.matchAction.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ action: 'BLOCK' }),
        }),
      );
    });

    it('returns 400 for invalid action value', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'INVALID' })
        .expect(400);

      expect(prismaMock.matchAction.upsert).not.toHaveBeenCalled();
    });

    it('creates LIKE action with user-to-user identity (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_1',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'LIKE',
        createdAt,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(res.body).toMatchObject({
        id: 'action_row_1',
        action: 'LIKE',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: 'prof_action_cand',
        createdAt: createdAt.toISOString(),
      });
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledWith({
        where: {
          actorUserId_targetUserId: {
            actorUserId: USER_ID,
            targetUserId: CANDIDATE_USER_ID,
          },
        },
        create: expect.objectContaining({
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'LIKE',
        }),
        update: expect.objectContaining({
          action: 'LIKE',
          targetProfileIdSnapshot: candidateProfile.id,
        }),
      });
    });

    it('re-LIKE is idempotent (upsert, 201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_1',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'LIKE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
      });

      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/me/matches/prof_action_cand/actions')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ action: 'LIKE' })
          .expect(201);
      }

      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(2);
    });

    it('re-PASS is idempotent (upsert, 201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_pass',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'PASS',
        createdAt: new Date('2026-05-31T11:00:00.000Z'),
      });

      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/me/matches/prof_action_cand/actions')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ action: 'PASS' })
          .expect(201);
      }

      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(2);
    });

    it('PASS overwrites prior LIKE on same user pair (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');
      prismaMock.matchAction.upsert
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'LIKE',
          createdAt,
        })
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'PASS',
          createdAt,
        });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      const passRes = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      expect(passRes.body.action).toBe('PASS');
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.matchAction.upsert).toHaveBeenLastCalledWith({
        where: {
          actorUserId_targetUserId: {
            actorUserId: USER_ID,
            targetUserId: CANDIDATE_USER_ID,
          },
        },
        create: expect.objectContaining({ action: 'PASS' }),
        update: expect.objectContaining({
          action: 'PASS',
          targetProfileIdSnapshot: candidateProfile.id,
        }),
      });
    });

    it('LIKE overwrites prior PASS on same user pair (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');
      prismaMock.matchAction.upsert
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'PASS',
          createdAt,
        })
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'LIKE',
          createdAt,
        });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      const likeRes = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(likeRes.body.action).toBe('LIKE');
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.matchAction.upsert).toHaveBeenLastCalledWith({
        where: {
          actorUserId_targetUserId: {
            actorUserId: USER_ID,
            targetUserId: CANDIDATE_USER_ID,
          },
        },
        create: expect.objectContaining({ action: 'LIKE' }),
        update: expect.objectContaining({
          action: 'LIKE',
          targetProfileIdSnapshot: candidateProfile.id,
        }),
      });
    });
  });

  // ─── Sprint 2 Story 1: mutual match detection on LIKE ───────────────────

  describe('Sprint 2 Story 1: mutual match detection', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_action',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_action', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_action_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_action_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_action_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    function mockLikeUpsert() {
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_like',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'LIKE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
      });
    }

    it('does not create MutualMatch when only one user has LIKED', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
    });

    it('creates MutualMatch when reciprocal LIKE exists (sorted user ids)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'LIKE' });
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);
      prismaMock.mutualMatch.create.mockResolvedValue({
        id: 'mutual_row_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
        unmatchedAt: null,
        unmatchedByUserId: null,
      });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).toHaveBeenCalledWith({
        data: {
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          status: 'ACTIVE',
        },
      });
    });

    it('re-LIKE after mutual is idempotent (201, no second create)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'LIKE' });
      const existingMutual = {
        id: 'mutual_row_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-31T09:00:00.000Z'),
        unmatchedAt: null,
        unmatchedByUserId: null,
      };
      prismaMock.mutualMatch.findUnique.mockResolvedValue(existingMutual);

      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/me/matches/prof_action_cand/actions')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ action: 'LIKE' })
          .expect(201);
      }

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
    });

    it('does not create MutualMatch when reverse action is PASS', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'PASS' });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
    });

    it('does not invoke mutual detection on PASS', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_pass',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'PASS',
        createdAt: new Date('2026-05-31T11:00:00.000Z'),
      });
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'LIKE' });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
    });

    it('does not change MutualMatch when BLOCK overwrites LIKE (deferred Story 1 behavior)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_block',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'BLOCK',
        createdAt: new Date('2026-05-31T12:00:00.000Z'),
      });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'BLOCK' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 2 Story 4: mutual match notification flags ───────────────────

  describe('Sprint 2 Story 4: mutual match notification', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_action',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_action', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_action_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_action_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_action_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    function mockLikeUpsert() {
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_like',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'LIKE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
      });
    }

    it('POST LIKE returns mutualMatch false when only one-sided like', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(res.body).toMatchObject({
        action: 'LIKE',
        mutualMatch: false,
        conversationId: null,
      });
    });

    it('POST LIKE returns mutualMatch true and conversationId on reciprocal like', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'LIKE' });
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);
      prismaMock.mutualMatch.create.mockResolvedValue({
        id: 'mutual_row_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
        unmatchedAt: null,
        unmatchedByUserId: null,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(res.body).toMatchObject({
        action: 'LIKE',
        mutualMatch: true,
        conversationId: 'mutual_row_1',
      });
    });

    it('POST PASS returns mutualMatch false', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_pass',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'PASS',
        createdAt: new Date('2026-05-31T11:00:00.000Z'),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      expect(res.body).toMatchObject({
        action: 'PASS',
        mutualMatch: false,
        conversationId: null,
      });
    });

    it('GET actions returns mutualMatch true when ACTIVE mutual exists', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');
      prismaMock.matchAction.findUnique.mockResolvedValue({
        action: 'LIKE',
        createdAt,
      });
      prismaMock.mutualMatch.findFirst.mockResolvedValue({
        id: 'mutual_row_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt,
        unmatchedAt: null,
        unmatchedByUserId: null,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        action: 'LIKE',
        createdAt: createdAt.toISOString(),
        mutualMatch: true,
        conversationId: 'mutual_row_1',
      });
      expect(prismaMock.mutualMatch.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId1: CANDIDATE_USER_ID,
            userId2: USER_ID,
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });

  // ─── Sprint 2 Story 2: GET /api/v1/me/conversations ─────────────────────

  describe('Sprint 2 Story 2: GET /api/v1/me/conversations', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .expect(401);
    });

    it('returns 200 with empty list when no ACTIVE mutual matches', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({ conversations: [] });
      expect(prismaMock.mutualMatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            OR: [{ userId1: USER_ID }, { userId2: USER_ID }],
          }),
        }),
      );
    });

    it('returns other user profile info for ACTIVE mutual match', async () => {
      const raw = await loginAndCookie();
      const matchedAt = new Date('2026-05-31T14:00:00.000Z');
      prismaMock.mutualMatch.findMany.mockResolvedValue([
        {
          id: 'mutual_row_list_1',
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAt,
          user1LastReadAt: null,
          user2LastReadAt: null,
        },
      ]);
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_action_cand',
          userId: CANDIDATE_USER_ID,
          nickname: 'Yonatan',
          gender: 'MALE',
          birthDate: new Date('1988-07-20T00:00:00.000Z'),
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          desiredPartnerGenders: ['FEMALE'],
          photos: [{ id: 'photo_conv_primary', isPrimary: true }],
        },
      ]);
      prismaMock.message.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.conversations).toHaveLength(1);
      expect(res.body.conversations[0]).toMatchObject({
        id: 'mutual_row_list_1',
        matchedAt: matchedAt.toISOString(),
        unreadCount: 0,
        otherUser: {
          id: CANDIDATE_USER_ID,
          profileId: 'prof_action_cand',
          nickname: 'Yonatan',
          gender: 'MALE',
          locationLabel: 'Tel Aviv, IL',
          photoUrl:
            '/api/v1/me/matches/prof_action_cand/photos/photo_conv_primary/file',
        },
      });
      expect(typeof res.body.conversations[0].otherUser.ageYears).toBe('number');
    });

    it('GET match photo returns 200 when ACTIVE mutual exists despite gender ineligibility', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findFirst.mockResolvedValue({
        id: 'mutual_row_photo_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
        unmatchedAt: null,
        unmatchedByUserId: null,
      });
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: { where: { id?: string } }) => {
          if (args.where.id === 'prof_action_cand') {
            return {
              id: 'prof_action_cand',
              userId: CANDIDATE_USER_ID,
              status: UserProfileStatus.ANALYZED,
              gender: 'MALE' as const,
              desiredPartnerGenders: ['MALE'],
              birthDate: new Date('1988-07-20T00:00:00.000Z'),
              city: 'TLV',
              country: 'IL',
              locationLabel: 'Tel Aviv, IL',
              aboutMe: null,
              aboutPartner: null,
              aboutRelationship: null,
              preference: null,
            };
          }
          return null;
        },
      );
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        mimeType: 'image/jpeg',
        storageKey: 'photos/conv-test.jpg',
      });
      photoStorageMock.read.mockResolvedValue(Buffer.from([9, 8, 7]));

      await request(app.getHttpServer())
        .get(
          '/api/v1/me/matches/prof_action_cand/photos/photo_conv_primary/file',
        )
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(prismaMock.mutualMatch.findFirst).toHaveBeenCalled();
      expect(photoStorageMock.read).toHaveBeenCalledWith('photos/conv-test.jpg');
    });
  });

  // ─── Sprint 3 Story 5: GET /api/v1/me/conversations unreadCount ────────

  describe('Sprint 3 Story 5: GET /api/v1/me/conversations unreadCount', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_unread_list_1';
    const CONVERSATION_READ_ID = 'mutual_row_unread_list_2';
    const matchedAtNewer = new Date('2026-05-31T14:00:00.000Z');
    const matchedAtOlder = new Date('2026-05-30T10:00:00.000Z');

    const listProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      nickname: 'Yonatan',
      gender: 'MALE' as const,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      desiredPartnerGenders: ['FEMALE'],
      photos: [{ id: 'photo_conv_primary', isPrimary: true }],
    };

    it('returns unreadCount 3 when peer messages exist and lastReadAt is null', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findMany.mockResolvedValue([
        {
          id: CONVERSATION_ID,
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAtNewer,
          user1LastReadAt: null,
          user2LastReadAt: null,
        },
      ]);
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);
      prismaMock.$queryRaw.mockResolvedValue([
        { conversationId: CONVERSATION_ID, cnt: 3 },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.conversations[0].unreadCount).toBe(3);
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(prismaMock.message.count).not.toHaveBeenCalled();
    });

    it('returns unreadCount 0 after mark-as-read then list', async () => {
      const raw = await loginAndCookie();
      let user2LastReadAt: Date | null = null;
      prismaMock.mutualMatch.findUnique.mockImplementation(async () => ({
        id: CONVERSATION_ID,
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE' as const,
        createdAt: matchedAtNewer,
        user1LastReadAt: null,
        user2LastReadAt,
      }));
      prismaMock.mutualMatch.findMany.mockImplementation(async () => [
        {
          id: CONVERSATION_ID,
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAtNewer,
          user1LastReadAt: null,
          user2LastReadAt,
        },
      ]);
      prismaMock.mutualMatch.update.mockImplementation(
        async (args: { data: { user2LastReadAt?: Date } }) => {
          if (args.data.user2LastReadAt) {
            user2LastReadAt = args.data.user2LastReadAt;
          }
          return {};
        },
      );
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);
      prismaMock.$queryRaw
        .mockResolvedValueOnce([{ conversationId: CONVERSATION_ID, cnt: 3 }])
        .mockResolvedValueOnce([]);

      const before = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);
      expect(before.body.conversations[0].unreadCount).toBe(3);

      await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      const after = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);
      expect(after.body.conversations[0].unreadCount).toBe(0);
    });

    it('sorts conversations with unread before read', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findMany.mockResolvedValue([
        {
          id: CONVERSATION_READ_ID,
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAtNewer,
          user1LastReadAt: null,
          user2LastReadAt: new Date('2026-06-01T12:00:00.000Z'),
        },
        {
          id: CONVERSATION_ID,
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAtOlder,
          user1LastReadAt: null,
          user2LastReadAt: null,
        },
      ]);
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);
      prismaMock.$queryRaw.mockResolvedValue([
        { conversationId: CONVERSATION_ID, cnt: 2 },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.conversations).toHaveLength(2);
      expect(res.body.conversations[0].id).toBe(CONVERSATION_ID);
      expect(res.body.conversations[0].unreadCount).toBe(2);
      expect(res.body.conversations[1].id).toBe(CONVERSATION_READ_ID);
      expect(res.body.conversations[1].unreadCount).toBe(0);
    });
  });

  // ─── Sprint 2 Story 3: GET /api/v1/me/conversations/:id ─────────────────

  describe('Sprint 2 Story 3: GET /api/v1/me/conversations/:id', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_detail_1';

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .expect(401);
    });

    it('returns 404 when conversation does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(res.body).toMatchObject({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      });
    });

    it('returns 404 when conversation is UNMATCHED', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: CONVERSATION_ID,
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'UNMATCHED',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
      });

      await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 403 when session user is not a participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: CONVERSATION_ID,
        userId1: 'user_not_participant',
        userId2: CANDIDATE_USER_ID,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(403);

      expect(res.body).toMatchObject({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      });
    });

    it('returns 200 with conversation detail for participant', async () => {
      const raw = await loginAndCookie();
      const matchedAt = new Date('2026-05-31T14:00:00.000Z');
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: CONVERSATION_ID,
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: matchedAt,
      });
      prismaMock.userProfile.findUnique.mockResolvedValue({
        id: 'prof_action_cand',
        userId: CANDIDATE_USER_ID,
        nickname: 'Yonatan',
        gender: 'MALE',
        birthDate: new Date('1988-07-20T00:00:00.000Z'),
        city: 'TLV',
        country: 'IL',
        locationLabel: 'Tel Aviv, IL',
        desiredPartnerGenders: ['FEMALE'],
        photos: [{ id: 'photo_conv_primary', isPrimary: true }],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toMatchObject({
        id: CONVERSATION_ID,
        matchedAt: matchedAt.toISOString(),
        status: 'ACTIVE',
        lastReadAt: null,
        otherUser: {
          id: CANDIDATE_USER_ID,
          profileId: 'prof_action_cand',
          nickname: 'Yonatan',
          gender: 'MALE',
          locationLabel: 'Tel Aviv, IL',
          photoUrl:
            '/api/v1/me/matches/prof_action_cand/photos/photo_conv_primary/file',
        },
      });
    });
  });

  // ─── Sprint 2 Story 5: DELETE /api/v1/me/conversations/:id ──────────────

  describe('Sprint 2 Story 5: DELETE /api/v1/me/conversations/:id', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_unmatch_1';

    const activeMatch = {
      id: CONVERSATION_ID,
      userId1: CANDIDATE_USER_ID,
      userId2: USER_ID,
      status: 'ACTIVE' as const,
    };

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .expect(401);
    });

    it('returns 404 when conversation does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(res.body).toMatchObject({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      });
      expect(prismaMock.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation is already UNMATCHED', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        status: 'UNMATCHED',
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('returns 403 when session user is not a participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        userId1: 'user_not_participant',
        userId2: CANDIDATE_USER_ID,
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(403);

      expect(res.body).toMatchObject({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      });
      expect(prismaMock.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('returns 204 and soft-unmatches ACTIVE conversation for participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.mutualMatch.update.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(204);

      expect(prismaMock.mutualMatch.update).toHaveBeenCalledWith({
        where: { id: CONVERSATION_ID },
        data: expect.objectContaining({
          status: 'UNMATCHED',
          unmatchedByUserId: USER_ID,
          unmatchedAt: expect.any(Date),
        }),
      });
    });

    it('returns 404 on second DELETE after unmatch', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique
        .mockResolvedValueOnce(activeMatch)
        .mockResolvedValueOnce({
          ...activeMatch,
          status: 'UNMATCHED',
        });
      prismaMock.mutualMatch.update.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.mutualMatch.update).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Sprint 3 Story 1: POST /api/v1/me/conversations/:id/messages ───────

  describe('Sprint 3 Story 1: POST /api/v1/me/conversations/:id/messages', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_message_1';

    const activeMatch = {
      id: CONVERSATION_ID,
      userId1: CANDIDATE_USER_ID,
      userId2: USER_ID,
      status: 'ACTIVE' as const,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
    };

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .send({ text: 'Hello' })
        .expect(401);
    });

    it('returns 201 and creates message for ACTIVE participant', async () => {
      const raw = await loginAndCookie();
      const createdAt = new Date('2026-05-31T16:00:00.000Z');
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.create.mockResolvedValue({
        id: 'msg_created_1',
        conversationId: CONVERSATION_ID,
        senderId: USER_ID,
        text: 'Hello!',
        createdAt,
        status: 'SENT',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Hello!' })
        .expect(201);

      expect(res.body).toEqual({
        id: 'msg_created_1',
        conversationId: CONVERSATION_ID,
        senderId: USER_ID,
        text: 'Hello!',
        createdAt: createdAt.toISOString(),
        status: 'SENT',
      });
      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'Hello!',
          status: 'SENT',
        },
      });
    });

    it('returns 403 when session user is not a participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        userId1: 'user_not_participant',
        userId2: CANDIDATE_USER_ID,
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Hello' })
        .expect(403);

      expect(res.body).toMatchObject({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      });
      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Hello' })
        .expect(404);

      expect(res.body).toMatchObject({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      });
      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation is UNMATCHED', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        status: 'UNMATCHED',
      });

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Hello' })
        .expect(404);

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 400 when text is empty', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: '' })
        .expect(400);

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 400 when text is whitespace only', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: '   ' })
        .expect(400);

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 400 when text exceeds 2000 characters', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'x'.repeat(2001) })
        .expect(400);

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('persists trimmed text', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.create.mockResolvedValue({
        id: 'msg_trim',
        conversationId: CONVERSATION_ID,
        senderId: USER_ID,
        text: 'Hi',
        createdAt: new Date(),
        status: 'SENT',
      });

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: '  Hi  ' })
        .expect(201);

      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ text: 'Hi' }),
      });
    });
  });

  // ─── Sprint 3 Story 6: message safety guardrails ───────────────────────────

  describe('Sprint 3 Story 6: message safety guardrails', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_message_guardrails_1';

    const activeMatch = {
      id: CONVERSATION_ID,
      userId1: CANDIDATE_USER_ID,
      userId2: USER_ID,
      status: 'ACTIVE' as const,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
    };

    beforeEach(() => {
      app.get(ConversationMessageRateLimitService).resetForTests();
    });

    it('returns 429 on 11th POST within the rate-limit window', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

      let seq = 0;
      prismaMock.message.create.mockImplementation(
        async (args: {
          data: {
            conversationId: string;
            senderId: string;
            text: string;
            status: string;
          };
        }) => {
          seq += 1;
          return {
            id: `msg_rate_${seq}`,
            conversationId: args.data.conversationId,
            senderId: args.data.senderId,
            text: args.data.text,
            createdAt: new Date('2026-05-31T16:00:00.000Z'),
            status: 'SENT',
          };
        },
      );

      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ text: `Message ${i}` })
          .expect(201);
      }

      const res = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Message 11' })
        .expect(429);

      expect(res.body).toMatchObject({
        message: 'Too many messages. Please wait.',
      });
      expect(prismaMock.message.create).toHaveBeenCalledTimes(10);
    });

    it('returns 400 when text exceeds 2000 characters (Story 6 guardrail)', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'x'.repeat(2001) })
        .expect(400);

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 3 Story 2: GET /api/v1/me/conversations/:id/messages ──────────

  describe('Sprint 3 Story 2: GET /api/v1/me/conversations/:id/messages', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_message_list_1';

    const activeMatch = {
      id: CONVERSATION_ID,
      userId1: CANDIDATE_USER_ID,
      userId2: USER_ID,
      status: 'ACTIVE' as const,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
    };

    const t1 = new Date('2026-05-31T10:00:00.000Z');
    const t2 = new Date('2026-05-31T11:00:00.000Z');
    const t3 = new Date('2026-05-31T12:00:00.000Z');

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .expect(401);
    });

    it('returns 200 with messages in chronological ASC order', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.findMany.mockResolvedValue([
        {
          id: 'msg_3',
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'Third',
          createdAt: t3,
          status: 'SENT',
        },
        {
          id: 'msg_2',
          conversationId: CONVERSATION_ID,
          senderId: CANDIDATE_USER_ID,
          text: 'Second',
          createdAt: t2,
          status: 'SENT',
        },
        {
          id: 'msg_1',
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'First',
          createdAt: t1,
          status: 'SENT',
        },
      ]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.messages.map((m: { id: string }) => m.id)).toEqual([
        'msg_1',
        'msg_2',
        'msg_3',
      ]);
      expect(res.body.pagination).toEqual({
        hasMore: false,
        nextCursor: null,
      });
    });

    it('returns 200 with empty array when no messages exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        messages: [],
        pagination: { hasMore: false, nextCursor: null },
      });
    });

    it('returns pagination when more messages exist than limit', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.findMany.mockResolvedValue([
        {
          id: 'msg_3',
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'Third',
          createdAt: t3,
          status: 'SENT',
        },
        {
          id: 'msg_2',
          conversationId: CONVERSATION_ID,
          senderId: CANDIDATE_USER_ID,
          text: 'Second',
          createdAt: t2,
          status: 'SENT',
        },
        {
          id: 'msg_1',
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'First',
          createdAt: t1,
          status: 'SENT',
        },
      ]);

      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/me/conversations/${CONVERSATION_ID}/messages?limit=2`,
        )
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.messages.map((m: { id: string }) => m.id)).toEqual([
        'msg_2',
        'msg_3',
      ]);
      expect(res.body.pagination).toEqual({
        hasMore: true,
        nextCursor: 'msg_2',
      });
    });

    it('returns earlier page when before cursor is provided', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.findFirst.mockResolvedValue({
        id: 'msg_2',
        createdAt: t2,
      });
      prismaMock.message.findMany.mockResolvedValue([
        {
          id: 'msg_1',
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'First',
          createdAt: t1,
          status: 'SENT',
        },
      ]);

      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/me/conversations/${CONVERSATION_ID}/messages?before=msg_2`,
        )
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.messages).toHaveLength(1);
      expect(res.body.messages[0].id).toBe('msg_1');
      expect(prismaMock.message.findFirst).toHaveBeenCalled();
    });

    it('returns 403 when session user is not a participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        userId1: 'user_not_participant',
        userId2: CANDIDATE_USER_ID,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(403);

      expect(res.body).toMatchObject({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      });
      expect(prismaMock.message.findMany).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(res.body).toMatchObject({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      });
      expect(prismaMock.message.findMany).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation is UNMATCHED', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        status: 'UNMATCHED',
      });

      await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.message.findMany).not.toHaveBeenCalled();
    });

    it('returns 400 when before cursor is invalid', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(
          `/api/v1/me/conversations/${CONVERSATION_ID}/messages?before=msg_missing`,
        )
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(400);

      expect(prismaMock.message.findMany).not.toHaveBeenCalled();
    });

    it.each(['0', '101', 'abc'])(
      'returns 400 when limit is invalid (%s)',
      async (limit) => {
        const raw = await loginAndCookie();
        prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

        await request(app.getHttpServer())
          .get(
            `/api/v1/me/conversations/${CONVERSATION_ID}/messages?limit=${limit}`,
          )
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .expect(400);

        expect(prismaMock.message.findMany).not.toHaveBeenCalled();
      },
    );
  });

  // ─── Sprint 3 Story 4: PUT /api/v1/me/conversations/:id/read ────────────

  describe('Sprint 3 Story 4: PUT /api/v1/me/conversations/:id/read', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_mark_read_1';
    const matchedAt = new Date('2026-05-31T10:00:00.000Z');

    function mockActiveMatchWithReadState() {
      let user2LastReadAt: Date | null = null;
      prismaMock.mutualMatch.findUnique.mockImplementation(async () => ({
        id: CONVERSATION_ID,
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE' as const,
        createdAt: matchedAt,
        user1LastReadAt: null,
        user2LastReadAt,
      }));
      prismaMock.mutualMatch.update.mockImplementation(
        async (args: { data: { user2LastReadAt?: Date } }) => {
          if (args.data.user2LastReadAt) {
            user2LastReadAt = args.data.user2LastReadAt;
          }
          return {};
        },
      );
      return {
        getUser2LastReadAt: () => user2LastReadAt,
      };
    }

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .expect(401);
    });

    it('returns 200 with lastReadAt and updates DB column for recipient', async () => {
      const raw = await loginAndCookie();
      mockActiveMatchWithReadState();

      const res = await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.lastReadAt).toEqual(expect.any(String));
      expect(prismaMock.mutualMatch.update).toHaveBeenCalledWith({
        where: { id: CONVERSATION_ID },
        data: { user2LastReadAt: expect.any(Date) },
      });
    });

    it('GET detail returns lastReadAt after mark-as-read', async () => {
      const raw = await loginAndCookie();
      const readAt = new Date('2026-06-01T18:30:00.000Z');
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: CONVERSATION_ID,
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: matchedAt,
        user1LastReadAt: null,
        user2LastReadAt: readAt,
      });
      prismaMock.userProfile.findUnique.mockResolvedValue({
        id: 'prof_action_cand',
        userId: CANDIDATE_USER_ID,
        nickname: 'Yonatan',
        gender: 'MALE',
        birthDate: new Date('1988-07-20T00:00:00.000Z'),
        city: 'TLV',
        country: 'IL',
        locationLabel: 'Tel Aviv, IL',
        desiredPartnerGenders: ['FEMALE'],
        photos: [],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.lastReadAt).toBe(readAt.toISOString());
    });

    it('countUnreadForParticipant is 3 before read and 0 after PUT', async () => {
      const raw = await loginAndCookie();
      mockActiveMatchWithReadState();
      prismaMock.message.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);

      const conversations = app.get(MeConversationsService);

      const before = await conversations.countUnreadForParticipant(
        USER_ID,
        CONVERSATION_ID,
      );
      expect(before).toBe(3);

      await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      const after = await conversations.countUnreadForParticipant(
        USER_ID,
        CONVERSATION_ID,
      );
      expect(after).toBe(0);
      expect(prismaMock.message.count).toHaveBeenCalledTimes(2);
    });

    it('returns 403 when session user is not a participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: CONVERSATION_ID,
        userId1: 'user_not_participant',
        userId2: CANDIDATE_USER_ID,
        status: 'ACTIVE',
        createdAt: matchedAt,
        user1LastReadAt: null,
        user2LastReadAt: null,
      });

      const res = await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(403);

      expect(res.body).toMatchObject({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      });
      expect(prismaMock.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(res.body).toMatchObject({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      });
    });

    it('returns 404 when conversation is UNMATCHED', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: CONVERSATION_ID,
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'UNMATCHED',
        createdAt: matchedAt,
        user1LastReadAt: null,
        user2LastReadAt: null,
      });

      await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.mutualMatch.update).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 1 Story 4: DELETE /api/v1/me/matches/:id/actions ───────────

  describe('DELETE /api/v1/me/matches/:id/actions', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_action',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_action', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_action_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_action_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_action_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .expect(401);
    });

    it('returns 404 when candidate does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.matchAction.delete).not.toHaveBeenCalled();
    });

    it('returns 404 when visible but no action row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(res.body.message).toBe('No action to undo');
      expect(prismaMock.matchAction.delete).not.toHaveBeenCalled();
    });

    it('returns 204 and deletes LIKE row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'LIKE' });
      prismaMock.matchAction.delete.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(204);

      expect(prismaMock.matchAction.delete).toHaveBeenCalledWith({
        where: {
          actorUserId_targetUserId: {
            actorUserId: USER_ID,
            targetUserId: CANDIDATE_USER_ID,
          },
        },
      });
    });

    it('returns 204 and deletes PASS row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'PASS' });
      prismaMock.matchAction.delete.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(204);

      expect(prismaMock.matchAction.delete).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when action is BLOCK (blocked match hidden)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'BLOCK' });

      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.matchAction.delete).not.toHaveBeenCalled();
    });

    it('allows POST LIKE after DELETE (undo then re-like)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');

      prismaMock.matchAction.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ action: 'LIKE' });
      prismaMock.matchAction.delete.mockResolvedValueOnce({});
      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(204);

      prismaMock.matchAction.upsert.mockResolvedValueOnce({
        id: 'action_row_new',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'LIKE',
        createdAt,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(res.body.action).toBe('LIKE');
      expect(prismaMock.matchAction.delete).toHaveBeenCalledTimes(1);
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Photo API: /api/v1/me/profile/photos
  // ---------------------------------------------------------------------------
  describe('photo API', () => {
    const profileRow = {
      id: 'prof_photo_1',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      name: '',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: 'FEMALE' as const,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
      submittedAt: null,
      analyzedAt: null,
      lastAnalysisError: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('uploads photo successfully', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findMany.mockResolvedValue([]);
      prismaMock.userProfilePhoto.create.mockResolvedValue({
        id: 'photo_1',
        profileId: profileRow.id,
        storageKey: 'pending://storage-key',
        originalFileName: 'pic.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 4,
        position: 0,
        isPrimary: false,
        status: 'PENDING',
        moderationProvider: 'manual_queue',
        moderationResultJson: null,
        rejectionReason: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      });
      photoStorageMock.buildStorageKey.mockReturnValue(
        'uploads/profile-photos/prof_photo_1/photo_1.jpg',
      );
      prismaMock.userProfilePhoto.update.mockResolvedValue({
        id: 'photo_1',
        profileId: profileRow.id,
        storageKey: 'uploads/profile-photos/prof_photo_1/photo_1.jpg',
        originalFileName: 'pic.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 4,
        position: 0,
        isPrimary: false,
        status: 'PENDING',
        moderationProvider: 'manual_queue',
        moderationResultJson: null,
        rejectionReason: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/profile/photos')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .attach('file', Buffer.from([1, 2, 3, 4]), {
          filename: 'pic.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(res.body.id).toBe('photo_1');
      expect(res.body.status).toBe('PENDING');
      expect(prismaMock.userProfilePhoto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
            isPrimary: false,
          }),
        }),
      );
      expect(photoStorageMock.save).toHaveBeenCalled();
    });

    it('rejects 4th photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findMany.mockResolvedValue([
        { id: 'p1', position: 0, status: 'APPROVED', isPrimary: true },
        { id: 'p2', position: 1, status: 'APPROVED', isPrimary: false },
        { id: 'p3', position: 2, status: 'APPROVED', isPrimary: false },
      ]);

      await request(app.getHttpServer())
        .post('/api/v1/me/profile/photos')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .attach('file', Buffer.from([1, 2, 3]), {
          filename: 'pic.jpg',
          contentType: 'image/jpeg',
        })
        .expect(422);
    });

    it('rejects invalid mime', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);

      await request(app.getHttpServer())
        .post('/api/v1/me/profile/photos')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .attach('file', Buffer.from([1, 2, 3]), {
          filename: 'bad.gif',
          contentType: 'image/gif',
        })
        .expect(422);
    });

    it('rejects oversized file', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      const tooBig = Buffer.alloc(5 * 1024 * 1024 + 1, 1);

      await request(app.getHttpServer())
        .post('/api/v1/me/profile/photos')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .attach('file', tooBig, {
          filename: 'big.jpg',
          contentType: 'image/jpeg',
        })
        .expect(413);
    });

    it('lists own photos only', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findMany.mockResolvedValue([
        {
          id: 'photo_a',
          profileId: profileRow.id,
          storageKey: 'uploads/profile-photos/prof_photo_1/photo_a.jpg',
          originalFileName: 'a.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1,
          position: 0,
          isPrimary: true,
          status: 'APPROVED',
          moderationProvider: 'stub',
          moderationResultJson: null,
          rejectionReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const res = await request(app.getHttpServer())
        .get('/api/v1/me/profile/photos')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('photo_a');
      expect(prismaMock.userProfilePhoto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { profileId: profileRow.id } }),
      );
    });

    it('cannot delete another user photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/api/v1/me/profile/photos/photo_other')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('set primary works only for own APPROVED photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        id: 'photo_2',
        profileId: profileRow.id,
        status: 'REJECTED',
      });

      await request(app.getHttpServer())
        .patch('/api/v1/me/profile/photos/photo_2/primary')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(422);
    });

    it('delete primary promotes lowest-position approved remaining photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst
        .mockResolvedValueOnce({
          id: 'photo_primary',
          profileId: profileRow.id,
          storageKey: 'uploads/profile-photos/prof_photo_1/photo_primary.jpg',
          isPrimary: true,
          status: 'APPROVED',
          position: 0,
        })
        .mockResolvedValueOnce({
          id: 'photo_next',
          profileId: profileRow.id,
          storageKey: 'uploads/profile-photos/prof_photo_1/photo_next.jpg',
          isPrimary: false,
          status: 'APPROVED',
          position: 1,
        });
      prismaMock.userProfilePhoto.delete.mockResolvedValue({});
      prismaMock.userProfilePhoto.update.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete('/api/v1/me/profile/photos/photo_primary')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(prismaMock.userProfilePhoto.update).toHaveBeenCalledWith({
        where: { id: 'photo_next' },
        data: { isPrimary: true },
      });
    });

    it('owner can read own image file', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        id: 'photo_own',
        profileId: profileRow.id,
        storageKey: 'uploads/profile-photos/prof_photo_1/photo_own.jpg',
        mimeType: 'image/jpeg',
      });
      photoStorageMock.read.mockResolvedValue(Buffer.from([255, 216, 255]));

      await request(app.getHttpServer())
        .get('/api/v1/me/profile/photos/photo_own/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200)
        .expect('Content-Type', /image\/jpeg/);
    });

    it('other user cannot read image', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/profile/photos/photo_other/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('missing file returns 404', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        id: 'photo_missing',
        profileId: profileRow.id,
        storageKey: 'uploads/profile-photos/prof_photo_1/photo_missing.jpg',
        mimeType: 'image/jpeg',
      });
      photoStorageMock.read.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/profile/photos/photo_missing/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('content-type matches photo mimeType', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        id: 'photo_png',
        profileId: profileRow.id,
        storageKey: 'uploads/profile-photos/prof_photo_1/photo_png.png',
        mimeType: 'image/png',
      });
      photoStorageMock.read.mockResolvedValue(Buffer.from([137, 80, 78, 71]));

      await request(app.getHttpServer())
        .get('/api/v1/me/profile/photos/photo_png/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200)
        .expect('Content-Type', /image\/png/);
    });
  });

  // ─── Phase 3 Step 4: GET /api/v1/me/profile/matches ──────────────────────────

  describe('GET /api/v1/me/profile/matches', () => {
    const viewerProfile = {
      id: 'prof_viewer_int',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
    };

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/profile/matches')
        .expect(401);
    });

    it('returns 404 when viewer has no UserProfile', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/profile/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 200 with gender-filtered candidates — mismatched gender excluded', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);

      // Candidate is FEMALE — viewer (FEMALE) wants MALE only → mismatch, excluded
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_cand_int_1',
          birthDate: new Date('1992-03-15T00:00:00.000Z'),
          gender: 'FEMALE',
          desiredPartnerGenders: null,
          city: 'NYC',
          country: 'US',
          locationLabel: 'New York, US',
          aboutMe: 'Candidate text',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-01T10:00:00.000Z'),
          _count: { evaluations: 1 },
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/profile/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.viewerGender).toBe('FEMALE');
      expect(res.body.viewerAcceptedPartnerGenders).toEqual(['MALE']);
      expect(res.body.totalCandidatesBeforeFilter).toBe(1);
      expect(res.body.candidates).toHaveLength(0);
    });

    it('returns 200 with matching candidate included — correct gender passes filter', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);

      // Candidate is MALE — viewer wants MALE, candidate has no filter → both directions pass
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_cand_int_2',
          birthDate: new Date('1988-07-20T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
          _count: { evaluations: 2 },
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/profile/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.totalCandidatesBeforeFilter).toBe(1);
      expect(res.body.candidates).toHaveLength(1);
      expect(res.body.candidates[0].userProfileId).toBe('prof_cand_int_2');
      expect(res.body.candidates[0].gender).toBe('MALE');
      expect(res.body.candidates[0].hasEvaluation).toBe(true);
    });
  });
});
