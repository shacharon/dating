/**
 * HTTP integration: /api/v1/admin/content-violations/*
 * Run: `npx jest admin-content-violations-http.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserStatus } from '@prisma/client';
import { AdminModule } from '../admin.module';
import { AnalyticsModule } from '../../analytics/analytics.module';
import { AuthModule } from '../../auth/auth.module';
import { GoogleAuthService } from '../../auth/google-auth.service';
import { ContentViolationService } from '../../content-moderation/content-violation.service';
import { CONTENT_VIOLATION_REPOSITORY } from '../../content-moderation/repositories/content-violation.repository';
import { PrismaContentViolationRepository } from '../../content-moderation/repositories/prisma-content-violation.repository';
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

describe('admin content violations HTTP (integration)', () => {
  let app: INestApplication<App>;
  const ADMIN_USER_ID = 'user_admin_1';
  const NON_ADMIN_USER_ID = 'user_non_admin';
  const RAW_SESSION = 'raw-admin-cv-session';
  const PEPPER = 'admin-cv-test-pepper';
  const SESSION_COOKIE = 'dating_session';

  const photoStorageMock = {
    read: jest.fn(),
  };

  const contentViolationsMock = {
    getViolationStats: jest.fn(),
  };

  const prismaMock = {
    userSession: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    userProfilePhoto: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userContentViolation: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    userReport: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const contentViolationRepository = new PrismaContentViolationRepository(
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
      .overrideProvider(CONTENT_VIOLATION_REPOSITORY)
      .useValue(contentViolationRepository)
      .overrideProvider(PHOTO_STORAGE)
      .useValue(photoStorageMock)
      .overrideProvider(AuthSessionConfigService)
      .useValue(configStub)
      .overrideProvider(GoogleAuthService)
      .useValue({ verifyIdToken: jest.fn() })
      .overrideProvider(ContentViolationService)
      .useValue(contentViolationsMock)
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
    prismaMock.user.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) => {
        if (where.id === ADMIN_USER_ID) {
          return Promise.resolve(
            activeUser(ADMIN_USER_ID, 'admin@example.com'),
          );
        }
        if (where.id === NON_ADMIN_USER_ID) {
          return Promise.resolve(
            activeUser(NON_ADMIN_USER_ID, 'other@example.com'),
          );
        }
        if (where.id === 'user_muted') {
          return Promise.resolve({
            ...activeUser('user_muted', 'muted@example.com'),
            contentViolationStatus: 'messaging_muted',
          });
        }
        return Promise.resolve(null);
      },
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
      .get('/api/v1/admin/content-violations')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403);
  });

  it('lists violations for admin', async () => {
    prismaMock.userContentViolation.findMany.mockResolvedValue([
      {
        id: 'vio_1',
        userId: 'user_muted',
        surface: 'message',
        category: 'hate',
        flaggedText: 'bad words here',
        score: 0.8,
        action: 'blocked',
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        conversationId: 'mutual_abc',
        recipientUserId: 'user_recipient',
        user: {
          email: 'muted@example.com',
          contentViolationStatus: 'messaging_muted',
          contentViolationMutedUntil: null,
          profile: { nickname: 'MutedUser' },
        },
        recipient: {
          email: 'recipient@example.com',
          profile: { nickname: 'Recipient' },
        },
      },
    ]);
    prismaMock.userContentViolation.count.mockResolvedValue(1);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/content-violations?surface=message')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.violations[0]).toMatchObject({
      id: 'vio_1',
      userEmail: 'muted@example.com',
      userStatus: 'messaging_muted',
      flaggedTextPreview: 'bad words here',
      conversationId: 'mutual_abc',
      recipientUserId: 'user_recipient',
      recipientEmail: 'recipient@example.com',
      recipientNickname: 'Recipient',
    });
    expect(res.body.violations[0]).not.toHaveProperty('flaggedText');
  });

  it('returns 403 for non-admin on blocked-users', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/content-violations/blocked-users')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403);
  });

  it('lists blocked users with full latest flaggedText', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'user_muted',
        email: 'muted@example.com',
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: null,
        contentViolationCount: 5,
        profile: { nickname: 'MutedUser' },
        contentViolations: [
          {
            id: 'vio_1',
            surface: 'message',
            category: 'hate',
            flaggedText: 'full blocked phrase',
            score: 0.9,
            action: 'blocked',
            createdAt: new Date('2026-08-01T10:00:00.000Z'),
            conversationId: 'mutual_abc',
            recipientUserId: 'user_recipient',
            recipient: {
              email: 'recipient@example.com',
              profile: { nickname: 'Recipient' },
            },
          },
        ],
      },
    ]);
    prismaMock.user.count.mockResolvedValue(1);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/content-violations/blocked-users')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.users[0]).toMatchObject({
      userId: 'user_muted',
      userStatus: 'messaging_muted',
      latestViolation: expect.objectContaining({
        flaggedText: 'full blocked phrase',
        recipientEmail: 'recipient@example.com',
      }),
    });
  });

  it('includes flaggedText on violations list when includeFullText=1', async () => {
    prismaMock.userContentViolation.findMany.mockResolvedValue([
      {
        id: 'vio_1',
        userId: 'user_muted',
        surface: 'message',
        category: 'hate',
        flaggedText: 'full text for review',
        score: 0.8,
        action: 'blocked',
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        conversationId: null,
        recipientUserId: null,
        user: {
          email: 'muted@example.com',
          contentViolationStatus: 'ok',
          contentViolationMutedUntil: null,
          profile: null,
        },
        recipient: null,
      },
    ]);
    prismaMock.userContentViolation.count.mockResolvedValue(1);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/content-violations?includeFullText=1')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.violations[0].flaggedText).toBe('full text for review');
  });

  it('filters violations list by action=blocked', async () => {
    prismaMock.userContentViolation.findMany.mockResolvedValue([]);
    prismaMock.userContentViolation.count.mockResolvedValue(0);

    await request(app.getHttpServer())
      .get('/api/v1/admin/content-violations?action=blocked')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(prismaMock.userContentViolation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: 'blocked' }),
      }),
    );
  });

  it('filters violations list by userStatus and hasRecipient', async () => {
    prismaMock.userContentViolation.findMany.mockResolvedValue([]);
    prismaMock.userContentViolation.count.mockResolvedValue(0);

    await request(app.getHttpServer())
      .get(
        '/api/v1/admin/content-violations?userStatus=messaging_muted&hasRecipient=1',
      )
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(prismaMock.userContentViolation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: { contentViolationStatus: 'messaging_muted' },
          recipientUserId: { not: null },
        }),
      }),
    );
  });

  it('returns empty blocked-users after unblock mock clears status', async () => {
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.user.count.mockResolvedValue(0);

    await request(app.getHttpServer())
      .post('/api/v1/admin/content-violations/unblock/user_muted')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .send({ reason: 'cleared' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/content-violations/blocked-users')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.users).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('returns stats for admin', async () => {
    contentViolationsMock.getViolationStats.mockResolvedValue({
      totalViolations: 10,
      violationsByCategory: { hate: 10 },
      violationsBySurface: { message: 10 },
      blockedProfileUsers: 1,
      mutedMessageUsers: 2,
      mutedMessageUsersTemporary: 1,
      mutedMessageUsersIndefinite: 1,
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/content-violations/stats')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.totalViolations).toBe(10);
    expect(res.body.blockedProfileUsers).toBe(1);
  });

  it('unblocks user for admin', async () => {
    prismaMock.user.update.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/content-violations/unblock/user_muted')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .send({ reason: 'False positive - medical terminology' })
      .expect(200);

    expect(res.body).toMatchObject({
      success: true,
      userId: 'user_muted',
      previousStatus: 'messaging_muted',
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user_muted' },
      data: {
        contentViolationStatus: 'ok',
        contentViolationMutedUntil: null,
      },
    });
  });

  it('returns 400 when unblock reason is empty', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/content-violations/unblock/user_muted')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .send({ reason: '' })
      .expect(400);
  });

  it('returns 404 when unblock target missing', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/content-violations/unblock/missing_user')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .send({ reason: 'cleanup' })
      .expect(404);
  });
});
