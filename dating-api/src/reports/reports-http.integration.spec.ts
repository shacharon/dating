/**
 * HTTP integration: POST /api/v1/me/reports
 * Run: `npx jest reports-http.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  MutualMatchStatus,
  UserReportContextType,
  UserReportReason,
  UserStatus,
} from '@prisma/client';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { GoogleAuthService } from '../auth/google-auth.service';
import { AuthSessionConfigModule } from '../config/auth-session-config.module';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { requestCorrelationMiddleware } from '../logging/request-correlation.middleware';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionModule } from '../session/session.module';
import { hashSessionToken } from '../session/session-token.crypto';
import { UsersModule } from '../users/users.module';
import { ReportsModule } from './reports.module';
import { PrismaReportRepository } from './repositories/prisma-report.repository';
import { REPORT_REPOSITORY } from './repositories/report.repository';

describe('reports HTTP (integration)', () => {
  let app: INestApplication<App>;
  const USER_ID = 'user_reporter_1';
  const TARGET_USER_ID = 'user_target_1';
  const RAW_SESSION = 'raw-report-session';
  const PEPPER = 'report-test-pepper';
  const SESSION_COOKIE = 'dating_session';

  const prismaMock = {
    userSession: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
    },
    mutualMatch: {
      findUnique: jest.fn(),
    },
    userReport: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
  const reportRepository = new PrismaReportRepository(
    prismaMock as unknown as PrismaService,
  );

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
    email: 'reporter@example.com',
    googleId: 'google-reporter',
    displayName: 'Reporter',
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
        NotificationsModule,
        AuthModule,
        ReportsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(REPORT_REPOSITORY)
      .useValue(reportRepository)
      .overrideProvider(AuthSessionConfigService)
      .useValue(configStub)
      .overrideProvider(GoogleAuthService)
      .useValue({ verifyIdToken: jest.fn() })
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
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      user: activeUser,
    });
    prismaMock.user.findUnique.mockResolvedValue(activeUser);
  });

  function authedPost(body: object) {
    return request(app.getHttpServer())
      .post('/api/v1/me/reports')
      .set('Cookie', [`${SESSION_COOKIE}=${RAW_SESSION}`])
      .send(body);
  }

  it('POST /api/v1/me/reports returns 201 for valid MATCH_PROFILE report', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      userId: TARGET_USER_ID,
    });
    prismaMock.userReport.findFirst.mockResolvedValue(null);
    prismaMock.userReport.create.mockResolvedValue({
      id: 'report_1',
      reason: UserReportReason.HARASSMENT,
      status: 'OPEN',
      createdAt: new Date('2026-06-06T12:00:00.000Z'),
      contextType: UserReportContextType.MATCH_PROFILE,
      contextId: 'prof_target',
    });

    const res = await authedPost({
      reason: 'HARASSMENT',
      contextType: 'MATCH_PROFILE',
      contextId: 'prof_target',
      details: 'Bad behavior',
    }).expect(201);

    expect(res.body).toMatchObject({
      id: 'report_1',
      reason: 'HARASSMENT',
      status: 'OPEN',
      contextType: 'MATCH_PROFILE',
      contextId: 'prof_target',
    });
  });

  it('POST /api/v1/me/reports returns 201 for valid CONVERSATION report', async () => {
    prismaMock.mutualMatch.findUnique.mockResolvedValue({
      userId1: USER_ID,
      userId2: TARGET_USER_ID,
      status: MutualMatchStatus.ACTIVE,
    });
    prismaMock.userReport.findFirst.mockResolvedValue(null);
    prismaMock.userReport.create.mockResolvedValue({
      id: 'report_conv',
      reason: UserReportReason.SPAM,
      status: 'OPEN',
      createdAt: new Date('2026-06-06T12:00:00.000Z'),
      contextType: UserReportContextType.CONVERSATION,
      contextId: 'conv_1',
    });

    const res = await authedPost({
      reason: 'SPAM',
      contextType: 'CONVERSATION',
      contextId: 'conv_1',
    }).expect(201);

    expect(res.body).toMatchObject({
      id: 'report_conv',
      contextType: 'CONVERSATION',
      contextId: 'conv_1',
    });
  });

  it('POST /api/v1/me/reports returns 400 when reportedUserId is sent', async () => {
    await authedPost({
      reason: 'HARASSMENT',
      contextType: 'MATCH_PROFILE',
      contextId: 'prof_target',
      reportedUserId: TARGET_USER_ID,
    }).expect(400);

    expect(prismaMock.userReport.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/reports returns 409 on duplicate within 24h', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      userId: TARGET_USER_ID,
    });
    prismaMock.userReport.findFirst.mockResolvedValue({ id: 'existing' });

    const res = await authedPost({
      reason: 'HARASSMENT',
      contextType: 'MATCH_PROFILE',
      contextId: 'prof_target',
    }).expect(409);

    expect(res.body).toMatchObject({ error: 'report_duplicate' });
    expect(prismaMock.userReport.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/reports returns 400 when reporting self via profile', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({ userId: USER_ID });

    const res = await authedPost({
      reason: 'SPAM',
      contextType: 'MATCH_PROFILE',
      contextId: 'prof_self',
    }).expect(400);

    expect(res.body).toMatchObject({ error: 'cannot_report_self' });
  });

  it('POST /api/v1/me/reports returns 404 for unknown profile context', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await authedPost({
      reason: 'OTHER',
      contextType: 'MATCH_PROFILE',
      contextId: 'missing',
    }).expect(404);

    expect(res.body).toMatchObject({ error: 'report_context_not_found' });
  });

  it('POST /api/v1/me/reports returns 404 for conversation viewer is not participant', async () => {
    prismaMock.mutualMatch.findUnique.mockResolvedValue({
      userId1: 'other-a',
      userId2: 'other-b',
      status: MutualMatchStatus.ACTIVE,
    });

    const res = await authedPost({
      reason: 'HARASSMENT',
      contextType: 'CONVERSATION',
      contextId: 'conv_1',
    }).expect(404);

    expect(res.body).toMatchObject({ error: 'report_context_not_found' });
  });

  it('POST /api/v1/me/reports returns 401 without session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/me/reports')
      .send({
        reason: 'HARASSMENT',
        contextType: 'MATCH_PROFILE',
        contextId: 'prof_1',
      })
      .expect(401);
  });
});
