/**
 * HTTP integration: /api/v1/admin/reports/*
 * Run: `npx jest admin-reports-http.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  UserReportContextType,
  UserReportReason,
  UserReportStatus,
  UserStatus,
} from '@prisma/client';
import { AdminModule } from '../admin.module';
import { AnalyticsModule } from '../../analytics/analytics.module';
import { AuthModule } from '../../auth/auth.module';
import { GoogleAuthService } from '../../auth/google-auth.service';
import { AuthSessionConfigModule } from '../../config/auth-session-config.module';
import { AuthSessionConfigService } from '../../config/auth-session-config.service';
import { SimpleLoggerModule } from '../../logger/simple-logger.module';
import { requestCorrelationMiddleware } from '../../logging/request-correlation.middleware';
import { StructuredLoggingModule } from '../../logging/structured-logging.module';
import { PHOTO_STORAGE } from '../../photo-storage/photo-storage.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionModule } from '../../session/session.module';
import { hashSessionToken } from '../../session/session-token.crypto';
import { UsersModule } from '../../users/users.module';

describe('admin reports HTTP (integration)', () => {
  let app: INestApplication<App>;
  const ADMIN_USER_ID = 'user_admin_1';
  const NON_ADMIN_USER_ID = 'user_non_admin';
  const RAW_SESSION = 'raw-admin-report-session';
  const PEPPER = 'admin-report-test-pepper';
  const SESSION_COOKIE = 'dating_session';

  const photoStorageMock = {
    read: jest.fn(),
  };

  const prismaMock = {
    userSession: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn(),
    },
    userProfilePhoto: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userReport: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
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

  const activeUser = (id: string, email: string) => ({
    id,
    email,
    googleId: `google-${id}`,
    displayName: id,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
    deletedAt: null,
  });

  const openReportRow = {
    id: 'report_open_1',
    reason: UserReportReason.HARASSMENT,
    status: UserReportStatus.OPEN,
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
    reporterUserId: 'user_reporter',
    reportedUserId: 'user_reported',
    contextType: UserReportContextType.MATCH_PROFILE,
    contextId: 'prof_target',
    details: 'Inappropriate messages in profile',
    opsNote: null,
  };

  beforeAll(async () => {
    process.env.ADMIN_USER_IDS = ADMIN_USER_ID;

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
        AdminModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(PHOTO_STORAGE)
      .useValue(photoStorageMock)
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
    delete process.env.ADMIN_USER_IDS;
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const hash = hashSessionToken(RAW_SESSION, PEPPER);
    prismaMock.userSession.findUnique.mockResolvedValue({
      id: 'sess_row',
      userId: ADMIN_USER_ID,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    });
    prismaMock.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === ADMIN_USER_ID
          ? activeUser(ADMIN_USER_ID, 'admin@example.com')
          : where.id === NON_ADMIN_USER_ID
            ? activeUser(NON_ADMIN_USER_ID, 'other@example.com')
            : null,
      ),
    );
  });

  function cookieHeader(userId: string) {
    if (userId === ADMIN_USER_ID) {
      return [`${SESSION_COOKIE}=${RAW_SESSION}`];
    }
    const hash = hashSessionToken('other-session', PEPPER);
    prismaMock.userSession.findUnique.mockResolvedValue({
      id: 'sess_other',
      userId: NON_ADMIN_USER_ID,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    });
    return [`${SESSION_COOKIE}=other-session`];
  }

  it('returns 403 for non-admin on list', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/reports')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403);
  });

  it('returns 403 for non-admin on detail', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/reports/report_open_1')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403);
  });

  it('returns 403 for non-admin on patch', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/reports/report_open_1')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .send({ status: 'DISMISSED' })
      .expect(403);
  });

  it('lists OPEN reports without details', async () => {
    prismaMock.userReport.findMany.mockResolvedValue([openReportRow]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/reports')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe('report_open_1');
    expect(res.body.items[0]).not.toHaveProperty('details');
  });

  it('returns report detail with contextPath', async () => {
    prismaMock.userReport.findUnique.mockResolvedValue(openReportRow);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/reports/report_open_1')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.details).toBe('Inappropriate messages in profile');
    expect(res.body.contextPath).toBe('/dating/me-matches/prof_target');
  });

  it('returns 404 when report detail is missing', async () => {
    prismaMock.userReport.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/api/v1/admin/reports/report_missing')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(404);
  });

  it('dismisses OPEN report', async () => {
    prismaMock.userReport.findUnique.mockResolvedValue(openReportRow);
    prismaMock.userReport.update.mockResolvedValue({
      ...openReportRow,
      status: UserReportStatus.DISMISSED,
      opsNote: 'Reviewed — no action',
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/admin/reports/report_open_1')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .send({ status: 'DISMISSED', opsNote: 'Reviewed — no action' })
      .expect(200);

    expect(res.body.status).toBe('DISMISSED');
    expect(res.body.opsNote).toBe('Reviewed — no action');
  });

  it('marks OPEN report as action taken', async () => {
    prismaMock.userReport.findUnique.mockResolvedValue(openReportRow);
    prismaMock.userReport.update.mockResolvedValue({
      ...openReportRow,
      status: UserReportStatus.ACTION_TAKEN,
      opsNote: 'User warned',
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/admin/reports/report_open_1')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .send({ status: 'ACTION_TAKEN', opsNote: 'User warned' })
      .expect(200);

    expect(res.body.status).toBe('ACTION_TAKEN');
    expect(res.body.opsNote).toBe('User warned');
  });

  it('returns 422 when report is not OPEN', async () => {
    prismaMock.userReport.findUnique.mockResolvedValue({
      ...openReportRow,
      status: UserReportStatus.DISMISSED,
    });

    await request(app.getHttpServer())
      .patch('/api/v1/admin/reports/report_open_1')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .send({ status: 'ACTION_TAKEN' })
      .expect(422);
  });
});
