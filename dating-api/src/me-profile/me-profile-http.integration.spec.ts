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
import { GoogleOAuthVerifier } from '../auth/google-oauth.verifier';
import { MeProfileModule } from './me-profile.module';

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
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    googleClientSecret: 'google-secret',
    googleRedirectUri: 'http://localhost:3001/auth/google/callback',
    authSuccessRedirectUrl: 'http://localhost:3000/',
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
        AuthModule,
        MeProfileModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(AuthSessionConfigService)
      .useValue(configStub)
      .overrideProvider(GoogleOAuthVerifier)
      .useValue({ verifyAuthorizationCode: jest.fn() })
      .overrideProvider(GoogleAuthService)
      .useValue({ verifyIdToken })
      .overrideProvider(UsersService)
      .useValue(usersServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
      onboardingStep: 1,
      aboutMe: 'first',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    };
    const updated = {
      ...created,
      aboutMe: 'second',
      aboutPartner: 'partner line',
      updatedAt: new Date('2026-02-02T00:00:00.000Z'),
    };

    prismaMock.userProfile.findUnique.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    prismaMock.userProfile.findUnique.mockResolvedValueOnce(null);
    prismaMock.userProfile.create.mockResolvedValue(created);
    const postRes = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: 'first' })
      .expect(201);
    expect(postRes.body.aboutMe).toBe('first');

    prismaMock.userProfile.findUnique.mockResolvedValue(created);
    const getRes = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);
    expect(getRes.body.aboutMe).toBe('first');

    prismaMock.userProfile.findUnique.mockResolvedValue(created);
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
      onboardingStep: 1,
      aboutMe: 'hi',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique.mockResolvedValue(row);

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'prof_1',
      userId: USER_ID,
      status: 'DRAFT',
      onboardingStep: 1,
      aboutMe: 'hi',
    });
    expect(prismaMock.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  it('POST /api/v1/me/profile returns 201 and creates for session user', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValueOnce(null);
    const created = {
      id: 'prof_new',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 2,
      aboutMe: 'x',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    };
    prismaMock.userProfile.create.mockResolvedValue(created);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: 'x', onboardingStep: 2 })
      .expect(201);

    expect(res.body.userId).toBe(USER_ID);
    expect(prismaMock.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: { connect: { id: USER_ID } },
        status: UserProfileStatus.DRAFT,
        aboutMe: 'x',
        onboardingStep: 2,
      }),
    });
  });

  it('POST /api/v1/me/profile returns 409 when profile already exists', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_existing',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 1,
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({})
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

  it('POST /api/v1/me/profile returns 400 when onboardingStep is not a positive integer', async () => {
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
    ['string', { onboardingStep: '2' }],
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
      onboardingStep: 3,
      aboutMe: 'keep',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique.mockResolvedValue(existing);

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({})
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'prof_partial',
      aboutMe: 'keep',
      onboardingStep: 3,
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
      onboardingStep: 1,
      aboutMe: 'unchanged',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique.mockResolvedValue(existing);
    prismaMock.userProfile.update.mockResolvedValue({
      ...existing,
      onboardingStep: 4,
      updatedAt: new Date('2026-01-05T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ onboardingStep: 4 })
      .expect(200);

    expect(res.body.onboardingStep).toBe(4);
    expect(res.body.aboutMe).toBe('unchanged');
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { onboardingStep: 4 },
    });
  });

  it('PATCH /api/v1/me/profile returns 200 when clearing aboutMe with null', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_null',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 1,
      aboutMe: 'will clear',
      aboutPartner: 'p',
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique.mockResolvedValue(existing);
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

  it('PATCH /api/v1/me/profile returns 400 when onboardingStep is not a positive integer', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_u',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 1,
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
      onboardingStep: 1,
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
      onboardingStep: 1,
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique.mockResolvedValue(existing);
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
      onboardingStep: 1,
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
      onboardingStep: 1,
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
    prismaMock.userProfile.findUnique.mockResolvedValueOnce(null);
    const created = {
      id: 'prof_identity',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 1,
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
      onboardingStep: 1,
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
    prismaMock.userProfile.findUnique.mockResolvedValue(existing);
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
      onboardingStep: 2,
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
    prismaMock.userProfile.findUnique.mockResolvedValue(row);

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'prof_enriched_get',
      onboardingStep: 2,
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
      onboardingStep: 1,
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
    prismaMock.userProfile.findUnique.mockResolvedValue(existing);
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
});
