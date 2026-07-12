/**
 * Auth HTTP integration (supertest): cookie session + `/api/v1/auth/*`.
 * Google `id_token` verification is mocked (`GoogleAuthService`).
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
import { requestCorrelationMiddleware } from '../logging/request-correlation.middleware';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { GoogleAuthService } from './google-auth.service';

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
  let verifyIdToken: jest.Mock;

  const PEPPER = 'integration-test-pepper';
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

  beforeAll(async () => {
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
        StructuredLoggingModule,
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(AuthSessionConfigService)
      .useValue(configStub)
      .overrideProvider(GoogleAuthService)
      .useValue({ verifyIdToken: verifyIdToken })
      .overrideProvider(UsersService)
      .useValue(usersServiceMock)
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
    verifyIdToken.mockReset();
    usersServiceMock.findByEmail.mockResolvedValue(null);
    usersServiceMock.findByGoogleId.mockResolvedValue(null);
    usersServiceMock.findById.mockResolvedValue(null);
    prismaMock.userSession.create.mockImplementation(async ({ data }) => ({
      id: 'sess_integration_1',
      expiresAt: data.expiresAt,
    }));
  });

  describe('GET /api/v1/auth/me (session cookie)', () => {
    const raw = 'known-raw-session-token';
    const hash = hashSessionToken(raw, PEPPER);

    it('returns 401 without cookie', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('returns 401 when session row is missing', async () => {
      prismaMock.userSession.findUnique.mockResolvedValue(null);
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(401);
    });

    it('returns 401 when session is revoked', async () => {
      prismaMock.userSession.findUnique.mockResolvedValue({
        id: 'sid',
        userId: 'user_1',
        sessionTokenHash: hash,
        expiresAt: new Date('2038-01-01T00:00:00.000Z'),
        revokedAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(401);
    });

    it('returns 401 when session is expired', async () => {
      prismaMock.userSession.findUnique.mockResolvedValue({
        id: 'sid',
        userId: 'user_1',
        sessionTokenHash: hash,
        expiresAt: new Date('2000-01-01T00:00:00.000Z'),
        revokedAt: null,
      });
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(401);
    });

    it('returns safe user DTO when session is valid', async () => {
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
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: false,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        id: 'user_1',
        email: 'who@example.com',
        displayName: 'Who',
        avatarUrl: null,
        status: 'ACTIVE',
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: false,
      });
      expect(prismaMock.userSession.findUnique).toHaveBeenCalledWith({
        where: { sessionTokenHash: hash },
      });
    });

    it('returns 403 with auth_error disabled_user when account is disabled', async () => {
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
        .get('/api/v1/auth/me')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(403);

      expect(res.body).toEqual(
        expect.objectContaining({
          auth_error: AUTH_ERROR_CODES.disabled_user,
        }),
      );
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    const raw = 'known-raw-session-token';
    const hash = hashSessionToken(raw, PEPPER);

    it('revokes session and clears cookie', async () => {
      prismaMock.userSession.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
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

  describe('api/v1/auth (id_token login)', () => {
    it('GET /api/v1/auth/protected-test returns 401 without session cookie', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/protected-test')
        .expect(401);
    });

    it('GET /api/v1/auth/protected-test returns 401 when session is revoked', async () => {
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
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
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
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
      });
      expect(login.body).not.toHaveProperty('sessionToken');
      expect(login.body).not.toHaveProperty('rawToken');
    });
  });

  describe('observability: request id + structured auth logs', () => {
    it('echoes x-request-id on POST /api/v1/auth/google', async () => {
      verifyIdToken.mockResolvedValue({
        googleId: 'google-obs-rid',
        email: 'obs-rid-auth@test.com',
        displayName: 'R',
        avatarUrl: null,
      });
      usersServiceMock.createFromGoogleIdentity.mockResolvedValue({
        id: 'user_obs_rid_auth',
        email: 'obs-rid-auth@test.com',
        googleId: 'google-obs-rid',
        displayName: 'R',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .set('x-request-id', 'auth-client-req-1')
        .send({ idToken: 'jwt-obs-rid' })
        .expect(200);
      expect(res.headers['x-request-id']).toBe('auth-client-req-1');
    });

    it('emits structured JSON AUTH_LOGIN_START and AUTH_LOGIN_SUCCESS on id-token login', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        verifyIdToken.mockResolvedValue({
          googleId: 'google-obs-json',
          email: 'obs-json-auth@test.com',
          displayName: 'J',
          avatarUrl: null,
        });
        usersServiceMock.createFromGoogleIdentity.mockResolvedValue({
          id: 'user_obs_json_auth',
          email: 'obs-json-auth@test.com',
          googleId: 'google-obs-json',
          displayName: 'J',
          avatarUrl: null,
          status: UserStatus.ACTIVE,
        });

        await request(app.getHttpServer())
          .post('/api/v1/auth/google')
          .send({ idToken: 'jwt-obs-json' })
          .expect(200);

        const lines = parseStructuredJsonLogs(spy);
        const codes = lines.map(
          (l) => (l as { errorCode?: string }).errorCode,
        );
        expect(codes).toContain('AUTH_LOGIN_START');
        expect(codes).toContain('AUTH_LOGIN_SUCCESS');
        const success = lines.find(
          (l) =>
            (l as { errorCode?: string }).errorCode === 'AUTH_LOGIN_SUCCESS',
        );
        expect((success as { level?: string }).level).toBe('trace');
        expect(typeof (success as { requestId?: string }).requestId).toBe(
          'string',
        );
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('referral attribution (Story 6)', () => {
    it('POST /api/v1/public/funnel/referral-landing-view returns 204', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/public/funnel/referral-landing-view')
        .send({ refPresent: true })
        .expect(204);
    });

    it('POST /api/v1/public/funnel/referral-landing-view accepts refPresent false', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/public/funnel/referral-landing-view')
        .send({ refPresent: false })
        .expect(204);
    });

    it('POST /api/v1/public/funnel/referral-landing-view returns 400 for invalid body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/public/funnel/referral-landing-view')
        .send({ refPresent: 'yes' })
        .expect(400);
    });

    it('POST /api/v1/auth/google new user with valid referrer passes referredByUserId to create', async () => {
      const identity = {
        googleId: 'google-ref-new',
        email: 'refnew@example.com',
        displayName: 'Ref New',
        avatarUrl: null as string | null,
      };
      verifyIdToken.mockResolvedValue(identity);
      usersServiceMock.findByGoogleId.mockResolvedValue(null);
      usersServiceMock.findByEmail.mockResolvedValue(null);
      usersServiceMock.findById.mockResolvedValue({
        id: 'user_referrer',
        status: UserStatus.ACTIVE,
        deletedAt: null,
      });
      usersServiceMock.createFromGoogleIdentity.mockResolvedValue({
        id: 'user_new_ref',
        email: identity.email,
        googleId: identity.googleId,
        displayName: identity.displayName,
        avatarUrl: null,
        status: UserStatus.ACTIVE,
        referredByUserId: 'user_referrer',
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ idToken: 'jwt-ref', referredByUserId: 'user_referrer' })
        .expect(200);

      expect(usersServiceMock.createFromGoogleIdentity).toHaveBeenCalledWith(
        identity,
        { referredByUserId: 'user_referrer' },
      );
    });

    it('POST /api/v1/auth/google new user with invalid referrer creates without attribution', async () => {
      const identity = {
        googleId: 'google-ref-invalid',
        email: 'refinvalid@example.com',
        displayName: 'Ref Invalid',
        avatarUrl: null as string | null,
      };
      verifyIdToken.mockResolvedValue(identity);
      usersServiceMock.findByGoogleId.mockResolvedValue(null);
      usersServiceMock.findByEmail.mockResolvedValue(null);
      usersServiceMock.findById.mockResolvedValue(null);
      usersServiceMock.createFromGoogleIdentity.mockResolvedValue({
        id: 'user_no_ref',
        email: identity.email,
        googleId: identity.googleId,
        displayName: identity.displayName,
        avatarUrl: null,
        status: UserStatus.ACTIVE,
        referredByUserId: null,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ idToken: 'jwt-noref', referredByUserId: 'user_missing' })
        .expect(200);

      expect(usersServiceMock.createFromGoogleIdentity).toHaveBeenCalledWith(
        identity,
        { referredByUserId: null },
      );
    });

    it('POST /api/v1/auth/google new user with deleted referrer creates without attribution', async () => {
      const identity = {
        googleId: 'google-ref-deleted',
        email: 'refdeleted@example.com',
        displayName: 'Ref Deleted',
        avatarUrl: null as string | null,
      };
      verifyIdToken.mockResolvedValue(identity);
      usersServiceMock.findByGoogleId.mockResolvedValue(null);
      usersServiceMock.findByEmail.mockResolvedValue(null);
      usersServiceMock.findById.mockResolvedValue({
        id: 'user_deleted_referrer',
        status: UserStatus.ACTIVE,
        deletedAt: new Date(),
      });
      usersServiceMock.createFromGoogleIdentity.mockResolvedValue({
        id: 'user_no_ref_deleted',
        email: identity.email,
        googleId: identity.googleId,
        displayName: identity.displayName,
        avatarUrl: null,
        status: UserStatus.ACTIVE,
        referredByUserId: null,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({
          idToken: 'jwt-deleted-ref',
          referredByUserId: 'user_deleted_referrer',
        })
        .expect(200);

      expect(usersServiceMock.createFromGoogleIdentity).toHaveBeenCalledWith(
        identity,
        { referredByUserId: null },
      );
    });

    it('POST /api/v1/auth/google returning user ignores referredByUserId', async () => {
      const identity = {
        googleId: 'google-return-ref',
        email: 'returnref@example.com',
        displayName: 'Return',
        avatarUrl: null as string | null,
      };
      verifyIdToken.mockResolvedValue(identity);
      usersServiceMock.findByGoogleId.mockResolvedValue({
        id: 'user_existing_ref',
        email: identity.email,
        googleId: identity.googleId,
        displayName: 'Old',
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      });
      usersServiceMock.updateLoginFields.mockResolvedValue({
        id: 'user_existing_ref',
        email: identity.email,
        googleId: identity.googleId,
        displayName: identity.displayName,
        avatarUrl: null,
        status: UserStatus.ACTIVE,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ idToken: 'jwt-return', referredByUserId: 'user_referrer' })
        .expect(200);

      expect(usersServiceMock.createFromGoogleIdentity).not.toHaveBeenCalled();
      expect(usersServiceMock.findById).not.toHaveBeenCalled();
    });
  });
});
