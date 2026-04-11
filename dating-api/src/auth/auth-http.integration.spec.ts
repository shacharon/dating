/**
 * Auth HTTP integration (supertest): cookie session, legacy `/auth/*`, and `/api/v1/auth/*`.
 * Google verification is mocked (`GoogleOAuthVerifier`, `GoogleAuthService`).
 *
 * Run full auth foundation: `npm run smoke:auth`
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserStatus } from '@prisma/client';
import { AuthSessionConfigModule } from '../config/auth-session-config.module';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { hashSessionToken } from '../session/session-token.crypto';
import { UsersService } from '../users/users.service';
import { AuthModule } from './auth.module';
import { AUTH_ERROR_CODES } from './auth-error-codes';
import { GOOGLE_OAUTH_STATE_COOKIE_NAME } from './auth.constants';
import { GoogleAuthService } from './google-auth.service';
import { GoogleOAuthVerifier } from './google-oauth.verifier';

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

describe('auth HTTP (integration)', () => {
  let app: INestApplication<App>;
  let prismaMock: {
    userSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let usersServiceMock: {
    findById: jest.Mock;
    findByEmail: jest.Mock;
    findByGoogleId: jest.Mock;
    createFromGoogleIdentity: jest.Mock;
    updateLoginFields: jest.Mock;
  };
  let verifyCode: jest.Mock;
  let verifyIdToken: jest.Mock;

  const PEPPER = 'integration-test-pepper';
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

  beforeAll(async () => {
    verifyCode = jest.fn();
    verifyIdToken = jest.fn();
    usersServiceMock = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      createFromGoogleIdentity: jest.fn(),
      updateLoginFields: jest.fn(),
    };
    prismaMock = {
      userSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn(),
      },
    };

    prismaMock.userSession.create.mockImplementation(async ({ data }) => ({
      id: 'sess_integration_1',
      expiresAt: data.expiresAt,
    }));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AuthSessionConfigModule,
        PrismaModule,
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(AuthSessionConfigService)
      .useValue(configStub)
      .overrideProvider(GoogleOAuthVerifier)
      .useValue({ verifyAuthorizationCode: verifyCode })
      .overrideProvider(GoogleAuthService)
      .useValue({ verifyIdToken: verifyIdToken })
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
      id: 'sess_integration_1',
      expiresAt: data.expiresAt,
    }));
  });

  describe('smoke: /auth/me and /auth/logout', () => {
    const raw = 'known-raw-session-token';
    const hash = hashSessionToken(raw, PEPPER);

    it('GET /auth/me returns 401 without cookie', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('GET /auth/me returns 401 when session row is missing', async () => {
      prismaMock.userSession.findUnique.mockResolvedValue(null);
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(401);
    });

    it('GET /auth/me returns 401 when session is revoked', async () => {
      prismaMock.userSession.findUnique.mockResolvedValue({
        id: 'sid',
        userId: 'user_1',
        sessionTokenHash: hash,
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
        revokedAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(401);
    });

    it('GET /auth/me returns 401 when session is expired', async () => {
      prismaMock.userSession.findUnique.mockResolvedValue({
        id: 'sid',
        userId: 'user_1',
        sessionTokenHash: hash,
        expiresAt: new Date('2000-01-01T00:00:00.000Z'),
        revokedAt: null,
      });
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(401);
    });

    it('GET /auth/me returns safe user DTO when session is valid', async () => {
      const exp = new Date('2038-01-01T00:00:00.000Z');
      prismaMock.userSession.findUnique.mockResolvedValue({
        id: 'sid',
        userId: 'user_1',
        sessionTokenHash: hash,
        expiresAt: exp,
        revokedAt: null,
      });
      usersServiceMock.findById.mockResolvedValue({
        id: 'user_1',
        email: 'who@example.com',
        displayName: 'Who',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      });

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        id: 'user_1',
        email: 'who@example.com',
        displayName: 'Who',
        avatarUrl: null,
        status: 'ACTIVE',
      });
      expect(prismaMock.userSession.findUnique).toHaveBeenCalledWith({
        where: { sessionTokenHash: hash },
      });
    });

    it('GET /auth/me returns 403 with auth_error disabled_user when account is disabled', async () => {
      prismaMock.userSession.findUnique.mockResolvedValue({
        id: 'sid',
        userId: 'user_1',
        sessionTokenHash: hash,
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
        revokedAt: null,
      });
      usersServiceMock.findById.mockResolvedValue({
        id: 'user_1',
        email: 'who@example.com',
        displayName: 'Who',
        avatarUrl: null,
        status: UserStatus.DISABLED,
      });

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(403);

      expect(res.body).toEqual(
        expect.objectContaining({
          auth_error: AUTH_ERROR_CODES.disabled_user,
        }),
      );
    });

    it('POST /auth/logout revokes session and clears cookie', async () => {
      prismaMock.userSession.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({ ok: true });
      expect(prismaMock.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sessionTokenHash: hash,
            revokedAt: null,
          }),
        }),
      );
      const cleared = res.headers['set-cookie']?.join(';') ?? '';
      expect(cleared).toContain(`${SESSION_COOKIE}=`);
      expect(cleared.toLowerCase()).toMatch(
        /max-age=0|expires=thu, 01 jan 1970 00:00:00 gmt/,
      );
    });
  });

  describe('OAuth callback hardening (integration)', () => {
    it('redirects email_in_use when email belongs to another googleId', async () => {
      verifyCode.mockResolvedValue({
        googleId: 'google-new',
        email: 'taken@example.com',
        displayName: 'T',
        avatarUrl: null,
      });
      usersServiceMock.findByGoogleId.mockResolvedValue(null);
      usersServiceMock.findByEmail.mockResolvedValue({
        id: 'existing',
        email: 'taken@example.com',
        googleId: 'google-old',
        displayName: 'E',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      });

      const start = await request(app.getHttpServer()).get('/auth/google').expect(302);
      const state = extractCookieValue(
        start.headers['set-cookie'],
        GOOGLE_OAUTH_STATE_COOKIE_NAME,
      );
      const cb = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .query({ code: 'c1', state })
        .set('Cookie', [`${GOOGLE_OAUTH_STATE_COOKIE_NAME}=${state}`])
        .expect(302);

      expect(cb.headers.location).toContain(
        `auth_error=${AUTH_ERROR_CODES.email_in_use}`,
      );
      expect(prismaMock.userSession.create).not.toHaveBeenCalled();
    });

    it('redirects disabled_user when Google account matches a disabled user', async () => {
      verifyCode.mockResolvedValue({
        googleId: 'gid-dis',
        email: 'd@example.com',
        displayName: 'D',
        avatarUrl: null,
      });
      usersServiceMock.findByGoogleId.mockResolvedValue({
        id: 'u-dis',
        email: 'd@example.com',
        googleId: 'gid-dis',
        displayName: 'D',
        avatarUrl: null,
        status: UserStatus.DISABLED,
      });

      const start = await request(app.getHttpServer()).get('/auth/google').expect(302);
      const state = extractCookieValue(
        start.headers['set-cookie'],
        GOOGLE_OAUTH_STATE_COOKIE_NAME,
      );
      const cb = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .query({ code: 'c2', state })
        .set('Cookie', [`${GOOGLE_OAUTH_STATE_COOKIE_NAME}=${state}`])
        .expect(302);

      expect(cb.headers.location).toContain(
        `auth_error=${AUTH_ERROR_CODES.disabled_user}`,
      );
      expect(prismaMock.userSession.create).not.toHaveBeenCalled();
    });
  });

  describe('callback flow: google -> callback -> me -> logout', () => {
    it('chains OAuth start, mocked callback, /auth/me, then logout', async () => {
      verifyCode.mockResolvedValue({
        googleId: 'google-sub-xyz',
        email: 'u@example.com',
        displayName: 'User',
        avatarUrl: null,
      });
      usersServiceMock.findByGoogleId.mockResolvedValue(null);
      usersServiceMock.createFromGoogleIdentity.mockResolvedValue({
        id: 'user_oauth_1',
        email: 'u@example.com',
        googleId: 'google-sub-xyz',
        displayName: 'User',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      });

      const start = await request(app.getHttpServer())
        .get('/auth/google')
        .expect(302);

      expect(start.headers.location).toContain('accounts.google.com');
      const state = extractCookieValue(
        start.headers['set-cookie'],
        GOOGLE_OAUTH_STATE_COOKIE_NAME,
      );
      expect(state).toBeTruthy();
      const stateCookieHeader = `${GOOGLE_OAUTH_STATE_COOKIE_NAME}=${state}`;

      const cb = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .query({ code: 'fake-auth-code', state })
        .set('Cookie', [stateCookieHeader])
        .expect(302);

      expect(cb.headers.location).toBe(configStub.authSuccessRedirectUrl);

      const rawSession = extractCookieValue(
        cb.headers['set-cookie'],
        SESSION_COOKIE,
      );
      expect(rawSession).toBeTruthy();
      const sessionHash = hashSessionToken(rawSession!, PEPPER);

      prismaMock.userSession.findUnique.mockResolvedValue({
        id: 'sess_after_cb',
        userId: 'user_oauth_1',
        sessionTokenHash: sessionHash,
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
        revokedAt: null,
      });
      usersServiceMock.findById.mockResolvedValue({
        id: 'user_oauth_1',
        email: 'u@example.com',
        displayName: 'User',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      });

      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${rawSession}`])
        .expect(200);

      expect(me.body.email).toBe('u@example.com');
      expect(me.body.id).toBe('user_oauth_1');

      prismaMock.userSession.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.userSession.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [`${SESSION_COOKIE}=${rawSession}`])
        .expect(200);

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${rawSession}`])
        .expect(401);
    });
  });

  describe('api/v1/auth (id_token login)', () => {
    it('GET /api/v1/auth/me returns 401 without cookie', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('GET /api/v1/auth/protected-test returns 401 without session cookie', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/protected-test')
        .expect(401);
    });

    it('GET /api/v1/auth/protected-test returns 401 when session is revoked (same as AuthGuard on /auth/me)', async () => {
      const raw = 'revoked-protected-token';
      const hash = hashSessionToken(raw, PEPPER);
      prismaMock.userSession.findUnique.mockResolvedValue({
        id: 'sid',
        userId: 'user_1',
        sessionTokenHash: hash,
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
        revokedAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      await request(app.getHttpServer())
        .get('/api/v1/auth/protected-test')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(401);
    });

    it('POST /api/v1/auth/google returns 400 without idToken', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({})
        .expect(400);
      expect(verifyIdToken).not.toHaveBeenCalled();
    });

    it('POST /api/v1/auth/google returns 403 auth_error email_in_use when email owned by other googleId', async () => {
      verifyIdToken.mockResolvedValue({
        googleId: 'google-new',
        email: 'taken@example.com',
        displayName: 'T',
        avatarUrl: null,
      });
      usersServiceMock.findByGoogleId.mockResolvedValue(null);
      usersServiceMock.findByEmail.mockResolvedValue({
        id: 'existing',
        email: 'taken@example.com',
        googleId: 'google-old',
        displayName: 'E',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ idToken: 'fake-google-jwt' })
        .expect(403);

      expect(res.body).toEqual(
        expect.objectContaining({
          auth_error: AUTH_ERROR_CODES.email_in_use,
        }),
      );
      expect(prismaMock.userSession.create).not.toHaveBeenCalled();
    });

    it('POST /api/v1/auth/google sets session cookie and GET /api/v1/auth/me returns user', async () => {
      verifyIdToken.mockResolvedValue({
        googleId: 'google-api-v1',
        email: 'api@example.com',
        displayName: 'API',
        avatarUrl: null,
      });
      usersServiceMock.findByGoogleId.mockResolvedValue(null);
      usersServiceMock.createFromGoogleIdentity.mockResolvedValue({
        id: 'user_api_v1',
        email: 'api@example.com',
        googleId: 'google-api-v1',
        displayName: 'API',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      });

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ idToken: 'any-mocked-jwt' })
        .expect(200);

      expect(login.body).toEqual({
        id: 'user_api_v1',
        email: 'api@example.com',
        displayName: 'API',
        avatarUrl: null,
        status: 'ACTIVE',
      });
      expect(login.body).not.toHaveProperty('rawToken');
      expect(login.body).not.toHaveProperty('sessionToken');

      const setCookie = login.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const joined = setCookie!.join('\n');
      expect(joined.toLowerCase()).toMatch(/httponly/);
      expect(joined).toMatch(/path=\//i);
      expect(joined.toLowerCase()).toMatch(/samesite=lax/);

      const rawSession = extractCookieValue(setCookie, SESSION_COOKIE);
      expect(rawSession).toBeTruthy();
      const sessionHash = hashSessionToken(rawSession!, PEPPER);

      expect(prismaMock.userSession.create).toHaveBeenCalled();
      const createArg = prismaMock.userSession.create.mock.calls.at(-1)![0];
      expect(createArg.data.sessionTokenHash).toBe(sessionHash);
      expect(JSON.stringify(createArg.data)).not.toContain(rawSession!);

      prismaMock.userSession.findUnique.mockResolvedValue({
        id: 'sess_v1',
        userId: 'user_api_v1',
        sessionTokenHash: sessionHash,
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
        revokedAt: null,
      });
      usersServiceMock.findById.mockResolvedValue({
        id: 'user_api_v1',
        email: 'api@example.com',
        displayName: 'API',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      });

      const me = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${rawSession}`])
        .expect(200);

      expect(me.body.email).toBe('api@example.com');

      const meLegacy = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${rawSession}`])
        .expect(200);
      expect(meLegacy.body).toEqual(me.body);

      const prot = await request(app.getHttpServer())
        .get('/api/v1/auth/protected-test')
        .set('Cookie', [`${SESSION_COOKIE}=${rawSession}`])
        .expect(200);
      expect(prot.body).toEqual({ ok: true, userId: 'user_api_v1' });

      prismaMock.userSession.updateMany.mockResolvedValue({ count: 1 });
      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', [`${SESSION_COOKIE}=${rawSession}`])
        .expect(200);

      expect(logoutRes.body).toEqual({ ok: true });
      expect(prismaMock.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sessionTokenHash: sessionHash,
            revokedAt: null,
          }),
        }),
      );
      const cleared = logoutRes.headers['set-cookie']?.join(';') ?? '';
      expect(cleared).toContain(`${SESSION_COOKIE}=`);
      expect(cleared.toLowerCase()).toMatch(
        /max-age=0|expires=thu, 01 jan 1970 00:00:00 gmt/,
      );

      prismaMock.userSession.findUnique.mockResolvedValue(null);
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${rawSession}`])
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/auth/protected-test')
        .set('Cookie', [`${SESSION_COOKIE}=${rawSession}`])
        .expect(401);
    });

    it('second POST /api/v1/auth/google reuses user (updateLoginFields) not createFromGoogleIdentity', async () => {
      const identity = {
        googleId: 'google-repeat',
        email: 'repeat@example.com',
        displayName: 'Repeat',
        avatarUrl: null as string | null,
      };
      verifyIdToken.mockResolvedValue(identity);

      const existing = {
        id: 'user_repeat',
        email: 'repeat@example.com',
        googleId: 'google-repeat',
        displayName: 'Old',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      };

      usersServiceMock.findByGoogleId.mockResolvedValueOnce(existing);
      usersServiceMock.updateLoginFields.mockResolvedValueOnce({
        ...existing,
        displayName: 'Repeat',
      });

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ idToken: 'jwt-2' })
        .expect(200);

      expect(usersServiceMock.createFromGoogleIdentity).not.toHaveBeenCalled();
      expect(usersServiceMock.updateLoginFields).toHaveBeenCalledWith(
        'user_repeat',
        identity,
      );
      expect(login.body).toEqual({
        id: 'user_repeat',
        email: 'repeat@example.com',
        displayName: 'Repeat',
        avatarUrl: null,
        status: 'ACTIVE',
      });
      expect(login.body).not.toHaveProperty('sessionToken');
      expect(login.body).not.toHaveProperty('rawToken');
    });
  });
});
