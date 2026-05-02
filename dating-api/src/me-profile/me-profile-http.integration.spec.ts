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
import { MeProfileAnalysisService } from './me-profile-analysis.service';
import { MeProfileModule } from './me-profile.module';

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
  const prismaMock = {
    $transaction: jest.fn(),
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
    },
    userProfileEvaluation: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    userProfilePreference: {
      upsert: jest.fn().mockResolvedValue({}),
    },
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
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
    );
    prismaMock.userProfile.findUnique.mockReset();
    verifyIdToken.mockReset();
    usersServiceMock.findByEmail.mockResolvedValue(null);
    usersServiceMock.findByGoogleId.mockResolvedValue(null);
    usersServiceMock.findById.mockResolvedValue(null);
    prismaMock.userSession.create.mockImplementation(async ({ data }) => ({
      id: 'sess_me_profile',
      expiresAt: data.expiresAt,
    }));
    prismaMock.userSession.update.mockResolvedValue({});
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

  it('POST /api/v1/me/profile/submit returns 200 and sets status SUBMITTED from DRAFT', async () => {
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
      .expect(200);

    expect(res.body.status).toBe('SUBMITTED');
    expect(res.body.submittedAt).toBeTruthy();
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
      minimumPartnerEducation: null as string | null,
      acceptedPartnerGenders: opts?.acceptedPartnerGenders ?? ([] as string[]),
      acceptedPartnerSmoking: [] as string[],
      acceptedPartnerAlcohol: [] as string[],
      acceptedPartnerReligions: [] as string[],
      partnerWantsChildren: null as string | null,
      partnerHasChildren: null as string | null,
      similarityPreference: null as string | null,
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

    it('returns 200 ready with empty matches when no candidates exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.viewerProfileId).toBe('prof_viewer_s5');
      expect(res.body.matches).toHaveLength(0);
      expect(res.body.totalCandidatesBeforeFilter).toBe(0);
    });

    it('returns 200 ready — gender-mismatched candidate excluded', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      // Candidate is FEMALE — viewer (FEMALE) wants MALE only → excluded
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_1',
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
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      // Candidate is MALE — viewer (FEMALE) wants MALE, candidate has no filter → included
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_2',
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
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_s5_det_cand'),
    };

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
