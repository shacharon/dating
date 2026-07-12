/**
 * HTTP integration: PATCH /api/v1/me/notification-preferences
 * Run: `npx jest me-notification-preferences-http.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserStatus } from '@prisma/client';
import { AuthSessionConfigModule } from '../config/auth-session-config.module';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { GoogleAuthService } from '../auth/google-auth.service';
import { requestCorrelationMiddleware } from '../logging/request-correlation.middleware';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { LLM_CONFIG } from '../llm/llm.constants';
import { PHOTO_STORAGE } from '../photo-storage/photo-storage.module';
import { MeProfileAnalysisService } from './me-profile-analysis.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MeProfileModule } from './me-profile.module';
import { MeProfileValidationPipe } from './me-profile-validation.pipe';
import { hashSessionToken } from '../session/session-token.crypto';

describe('notification preferences HTTP (integration)', () => {
  let app: INestApplication<App>;
  const USER_ID = 'user_notif_prefs_1';
  const RAW_SESSION = 'raw-notif-prefs-session';
  const PEPPER = 'notif-prefs-test-pepper';
  const SESSION_COOKIE = 'dating_session';

  const prismaMock = {
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
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
    email: 'notif@example.com',
    googleId: 'google-notif',
    displayName: 'NP',
    avatarUrl: null,
    status: UserStatus.ACTIVE,
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
        MeProfileModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(AuthSessionConfigService)
      .useValue(configStub)
      .overrideProvider(GoogleAuthService)
      .useValue({ verifyIdToken: jest.fn() })
      .overrideProvider(LLM_CONFIG)
      .useValue({ openai: { apiKey: 'test-key' }, models: new Map() })
      .overrideProvider(MeProfileAnalysisService)
      .useValue({ runForUser: jest.fn() })
      .overrideProvider(PHOTO_STORAGE)
      .useValue({
        driver: 'local',
        buildStorageKey: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
        read: jest.fn(),
      })
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
      id: 'sess_row',
      userId: USER_ID,
      sessionTokenHash: hash,
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
      revokedAt: null,
    });
    prismaMock.user.findUnique.mockResolvedValue(activeUser);
  });

  function authedCookie(): string {
    return `${SESSION_COOKIE}=${RAW_SESSION}`;
  }

  it('PATCH returns 401 without session', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/me/notification-preferences')
      .send({ inAppNotificationsEnabled: false })
      .expect(401);
  });

  it('PATCH returns 400 for empty body', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/me/notification-preferences')
      .set('Cookie', [authedCookie()])
      .send({})
      .expect(400);
  });

  it('PATCH returns 400 for non-boolean value', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/me/notification-preferences')
      .set('Cookie', [authedCookie()])
      .send({ inAppNotificationsEnabled: 'no' })
      .expect(400);
  });

  it('PATCH returns 400 for unknown keys', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/me/notification-preferences')
      .set('Cookie', [authedCookie()])
      .send({ notificationsEnabled: false })
      .expect(400);
  });

  it('PATCH updates one flag and leaves the other unchanged', async () => {
    prismaMock.user.update.mockResolvedValue({
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: false,
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/notification-preferences')
      .set('Cookie', [authedCookie()])
      .send({ inAppNotificationsEnabled: false })
      .expect(200);

    expect(res.body).toEqual({
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: false,
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { inAppNotificationsEnabled: false },
      select: {
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
      },
    });
  });

  it('PATCH updates both flags', async () => {
    prismaMock.user.update.mockResolvedValue({
      emailNotificationsEnabled: false,
      inAppNotificationsEnabled: false,
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/notification-preferences')
      .set('Cookie', [authedCookie()])
      .send({
        emailNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      })
      .expect(200);

    expect(res.body).toEqual({
      emailNotificationsEnabled: false,
      inAppNotificationsEnabled: false,
    });
  });
});
