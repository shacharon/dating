/**
 * HTTP integration: DELETE /api/v1/me/account
 * Run: `npx jest me-account-http.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserStatus } from '@prisma/client';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { GoogleAuthService } from '../auth/google-auth.service';
import { AuthSessionConfigModule } from '../config/auth-session-config.module';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { requestCorrelationMiddleware } from '../logging/request-correlation.middleware';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionModule } from '../session/session.module';
import { hashSessionToken } from '../session/session-token.crypto';
import { UsersModule } from '../users/users.module';
import { MeProfileValidationPipe } from '../me-profile/me-profile-validation.pipe';
import { MeAccountModule } from './me-account.module';

describe('me-account HTTP (integration)', () => {
  let app: INestApplication<App>;
  const USER_ID = 'user_delete_1';
  const RAW_SESSION = 'raw-delete-session';
  const PEPPER = 'delete-test-pepper';
  const SESSION_COOKIE = 'dating_session';

  const prismaMock = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userProfilePhoto: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
    },
    userProfileEvaluation: { deleteMany: jest.fn() },
    userProfileSignal: { deleteMany: jest.fn() },
    userProfileInterest: { deleteMany: jest.fn() },
    userProfilePreference: { deleteMany: jest.fn() },
    matchAction: { deleteMany: jest.fn() },
    mutualMatch: { updateMany: jest.fn() },
    message: { updateMany: jest.fn() },
    userSession: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const configStub = {
    googleClientId: 'google-client-id',
    sessionSecretPepper: PEPPER,
    sessionCookieName: SESSION_COOKIE,
    sessionTtlDays: 14,
    cookieDomain: undefined as string | undefined,
    cookieSecure: false,
    corsOrigin: 'http://localhost:3000',
  };

  const activeUser = {
    id: USER_ID,
    email: 'delete@example.com',
    googleId: 'google-delete',
    displayName: 'Delete Me',
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    deletedAt: null,
    emailNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AuthSessionConfigModule,
        PrismaModule,
        SessionModule,
        UsersModule,
        StructuredLoggingModule,
        SimpleLoggerModule,
        AnalyticsModule,
        AuthModule,
        MeAccountModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(AuthSessionConfigService)
      .useValue(configStub)
      .overrideProvider(GoogleAuthService)
      .useValue({ verifyIdToken: jest.fn() })
      .overrideProvider(MeProfileValidationPipe)
      .useValue({ transform: (v: unknown) => v })
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
    const hash = hashSessionToken(RAW_SESSION, PEPPER);
    prismaMock.userSession.findUnique.mockResolvedValue({
      id: 'sess_delete',
      userId: USER_ID,
      sessionTokenHash: hash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
    });
    prismaMock.user.findUnique.mockResolvedValue(activeUser);
    prismaMock.userProfile.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
    );
    prismaMock.user.update.mockResolvedValue({
      ...activeUser,
      deletedAt: new Date(),
      status: UserStatus.DISABLED,
    });
  });

  function authedDelete(body: object) {
    return request(app.getHttpServer())
      .delete('/api/v1/me/account')
      .set('Cookie', `${SESSION_COOKIE}=${RAW_SESSION}`)
      .send(body);
  }

  it('returns 401 without session cookie', async () => {
    await authedDelete({ confirmation: 'DELETE' })
      .unset('Cookie')
      .expect(401);
  });

  it('returns 400 for invalid confirmation', async () => {
    const res = await authedDelete({ confirmation: 'NOPE' }).expect(400);
    expect(res.body).toEqual(
      expect.objectContaining({ error: 'account_delete_confirmation_invalid' }),
    );
  });

  it('returns 204, revokes sessions, and clears cookie', async () => {
    const res = await authedDelete({ confirmation: 'DELETE' }).expect(204);
    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(prismaMock.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, revokedAt: null },
      }),
    );
    const cleared = res.headers['set-cookie']?.join(';') ?? '';
    expect(cleared).toMatch(/Max-Age=0|Expires=/i);
  });

  it('returns 401 when user already deleted (auth guard)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...activeUser,
      deletedAt: new Date(),
    });
    await authedDelete({ confirmation: 'DELETE' }).expect(401);
  });

  it('GET /api/v1/auth/me returns 401 after delete when user has deletedAt', async () => {
    await authedDelete({ confirmation: 'DELETE' }).expect(204);
    prismaMock.user.findUnique.mockResolvedValue({
      ...activeUser,
      deletedAt: new Date(),
      status: UserStatus.DISABLED,
    });
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', `${SESSION_COOKIE}=${RAW_SESSION}`)
      .expect(401);
  });
});
