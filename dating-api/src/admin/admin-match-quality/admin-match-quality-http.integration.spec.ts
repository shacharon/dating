/**
 * HTTP integration: /api/v1/admin/match-quality/*
 * Run: `npx jest admin-match-quality-http.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { MatchFeedbackSentiment, UserStatus } from '@prisma/client';
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
import { MeMatchesService } from '../../me-profile/matches/core/me-matches.service';
import { buildMatchQualityAuditJson } from '../../me-profile/matches/actions/match-quality-audit';

jest.mock('../../me-profile/matches/actions/match-quality-audit', () => ({
  buildMatchQualityAuditJson: jest.fn(),
}));

const buildAuditMock = buildMatchQualityAuditJson as jest.MockedFunction<
  typeof buildMatchQualityAuditJson
>;

describe('admin match quality HTTP (integration)', () => {
  let app: INestApplication<App>;
  const ADMIN_USER_ID = 'user_admin_mq';
  const NON_ADMIN_USER_ID = 'user_non_admin_mq';
  const RAW_SESSION = 'raw-admin-mq-session';
  const PEPPER = 'admin-mq-test-pepper';
  const SESSION_COOKIE = 'dating_session';

  const photoStorageMock = {
    read: jest.fn(),
  };

  const meMatchesMock = {
    list: jest.fn(),
    getById: jest.fn(),
  };

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
    userProfilePhoto: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userReport: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    matchFeedback: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
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
      .overrideProvider(MeMatchesService)
      .useValue(meMatchesMock)
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
    const hash = hashSessionToken('other-mq-session', PEPPER);
    prismaMock.userSession.findUnique.mockResolvedValue({
      id: 'sess_other',
      userId: NON_ADMIN_USER_ID,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    });
    return [`${SESSION_COOKIE}=other-mq-session`];
  }

  it('returns 403 for non-admin on summary', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/summary')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403);
  });

  it('returns 403 for non-admin on negative-candidates', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/negative-candidates')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403);
  });

  it('returns empty summary with null positiveRate', async () => {
    prismaMock.matchFeedback.count.mockResolvedValue(0);
    prismaMock.matchFeedback.groupBy.mockResolvedValue([]);
    prismaMock.matchFeedback.findMany.mockResolvedValue([]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/summary')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.feedbackCount).toBe(0);
    expect(res.body.positiveRate).toBeNull();
    expect(res.body.windowDays).toBe(7);
  });

  it('returns summary and negative list for seeded feedback', async () => {
    prismaMock.matchFeedback.count.mockResolvedValue(8);
    prismaMock.matchFeedback.groupBy.mockResolvedValue([
      {
        sentiment: MatchFeedbackSentiment.POSITIVE,
        _count: { _all: 5 },
      },
      {
        sentiment: MatchFeedbackSentiment.NEGATIVE,
        _count: { _all: 3 },
      },
    ]);
    prismaMock.matchFeedback.findMany
      .mockResolvedValueOnce([
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: 'u3' },
      ])
      .mockResolvedValueOnce([
        { matchProfileId: 'p1' },
        { matchProfileId: 'p2' },
      ]);

    const lastAt = new Date('2026-06-05T12:00:00.000Z');
    prismaMock.$queryRaw
      .mockResolvedValueOnce([
        {
          matchProfileId: 'p2',
          negativeCount: 3,
          distinctViewers: 3,
          lastNegativeAt: lastAt,
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const summary = await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/summary?windowDays=7')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(summary.body.feedbackCount).toBe(8);
    expect(summary.body.positiveRate).toBeCloseTo(0.625);

    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/negative-candidates?windowDays=7')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(list.body.items[0].matchProfileId).toBe('p2');
    expect(list.body.items[0].negativeCount).toBe(3);
    expect(list.body.total).toBe(1);
  });

  it('accepts windowDays=90', async () => {
    prismaMock.matchFeedback.count.mockResolvedValue(0);
    prismaMock.matchFeedback.groupBy.mockResolvedValue([]);
    prismaMock.matchFeedback.findMany.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/summary?windowDays=90')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);
  });

  it('returns 400 when windowDays=0', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/summary?windowDays=0')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(400);
  });

  it('returns 403 for non-admin on candidate audit', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/candidates/cand_1/audit')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403);
  });

  it('returns 404 when candidate profile is missing', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/candidates/cand_missing/audit')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(404);

    expect(res.body.error).toBe('candidate_not_found');
  });

  it('returns 403 for non-admin on compare', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/compare?beforeDays=7&afterDays=7')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403);
  });

  it('returns compare with shorthand windows', async () => {
    prismaMock.matchFeedback.count.mockResolvedValue(4);
    prismaMock.matchFeedback.groupBy.mockResolvedValue([
      {
        sentiment: MatchFeedbackSentiment.POSITIVE,
        _count: { _all: 3 },
      },
      {
        sentiment: MatchFeedbackSentiment.NEGATIVE,
        _count: { _all: 1 },
      },
    ]);
    prismaMock.matchFeedback.findMany.mockResolvedValue([{ userId: 'u1' }]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/compare?beforeDays=7&afterDays=7')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.before.feedbackCount).toBe(4);
    expect(res.body.after.feedbackCount).toBe(4);
    expect(res.body.deltas.feedbackCountDelta).toBe(0);
    expect(res.body.deltas.positiveRateDelta).toBeCloseTo(0);
    expect(res.body.notes.adoptionComparison).toBe('logs_only');
  });

  it('returns compare deltas for ISO disjoint windows', async () => {
    const beforeStart = '2026-05-20T00:00:00.000Z';
    const beforeEnd = '2026-05-27T00:00:00.000Z';
    const afterStart = '2026-05-27T00:00:00.000Z';
    const afterEnd = '2026-06-03T00:00:00.000Z';

    prismaMock.matchFeedback.count.mockResolvedValue(10);
    prismaMock.matchFeedback.groupBy.mockImplementation(({ where }) => {
      const gte = where.createdAt.gte.toISOString();
      if (gte === beforeStart) {
        return Promise.resolve([
          {
            sentiment: MatchFeedbackSentiment.POSITIVE,
            _count: { _all: 8 },
          },
          {
            sentiment: MatchFeedbackSentiment.NEGATIVE,
            _count: { _all: 2 },
          },
        ]);
      }
      return Promise.resolve([
        {
          sentiment: MatchFeedbackSentiment.POSITIVE,
          _count: { _all: 5 },
        },
        {
          sentiment: MatchFeedbackSentiment.NEGATIVE,
          _count: { _all: 5 },
        },
      ]);
    });
    prismaMock.matchFeedback.findMany.mockResolvedValue([]);

    const res = await request(app.getHttpServer())
      .get(
        `/api/v1/admin/match-quality/compare?beforeStart=${beforeStart}&beforeEnd=${beforeEnd}&afterStart=${afterStart}&afterEnd=${afterEnd}`,
      )
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.before.positiveRate).toBeCloseTo(0.8);
    expect(res.body.after.positiveRate).toBeCloseTo(0.5);
    expect(res.body.deltas.positiveRateDelta).toBeCloseTo(-0.3);
  });

  it('returns 400 when compare windows overlap', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/admin/match-quality/compare?beforeStart=2026-05-20T00:00:00.000Z&beforeEnd=2026-06-01T00:00:00.000Z&afterStart=2026-05-27T00:00:00.000Z&afterEnd=2026-06-10T00:00:00.000Z',
      )
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(400);

    expect(res.body.error).toBe('compare_windows_overlap');
  });

  it('returns 403 for non-admin on export', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/export?windowDays=7&format=json')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403);
  });

  it('returns JSON export with summary and negativeCandidates', async () => {
    prismaMock.matchFeedback.count.mockResolvedValue(8);
    prismaMock.matchFeedback.groupBy.mockResolvedValue([
      {
        sentiment: MatchFeedbackSentiment.POSITIVE,
        _count: { _all: 5 },
      },
      {
        sentiment: MatchFeedbackSentiment.NEGATIVE,
        _count: { _all: 3 },
      },
    ]);
    prismaMock.matchFeedback.findMany
      .mockResolvedValueOnce([{ userId: 'u1' }])
      .mockResolvedValueOnce([{ matchProfileId: 'p1' }]);
    prismaMock.$queryRaw
      .mockResolvedValueOnce([
        {
          matchProfileId: 'p2',
          negativeCount: 3,
          distinctViewers: 3,
          lastNegativeAt: new Date('2026-06-05T12:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/export?windowDays=7&format=json')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.summary.feedbackCount).toBe(8);
    expect(res.body.summary.positiveRate).toBeCloseTo(0.625);
    expect(res.body.negativeCandidates[0].matchProfileId).toBe('p2');
    expect(res.body.notes.adoptionSource).toBe('logs_only');
    expect(res.headers['content-disposition']).toContain('.json');
  });

  it('returns CSV export with attachment headers', async () => {
    prismaMock.matchFeedback.count.mockResolvedValue(0);
    prismaMock.matchFeedback.groupBy.mockResolvedValue([]);
    prismaMock.matchFeedback.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/export?windowDays=7&format=csv')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toContain('.csv');
    expect(res.text).toContain('matchProfileId,negativeCount');
    expect(res.text).toContain('# positiveRate,');
  });

  it('returns candidate audit with scored outcome', async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({ id: 'cand_1' });
    prismaMock.matchFeedback.groupBy.mockResolvedValue([
      {
        sentiment: MatchFeedbackSentiment.NEGATIVE,
        _count: { _all: 1 },
      },
    ]);
    prismaMock.matchFeedback.findFirst.mockResolvedValue({
      sentiment: MatchFeedbackSentiment.NEGATIVE,
    });
    prismaMock.matchFeedback.findMany.mockResolvedValue([{ userId: 'viewer_1' }]);
    buildAuditMock.mockResolvedValue({
      schemaVersion: 1,
      generatedAt: '2026-06-01T00:00:00.000Z',
      env: { engineInputSource: 'evaluationJson' },
      viewer: { userId: 'viewer_1', profileId: 'vp1' },
      candidate: { profileId: 'cand_1' },
      engineInputSource: {
        viewer: 'evaluationJson',
        candidate: 'evaluationJson',
      },
      compare: { outcome: 'scored' },
      matchScore: 81,
      explainability: {
        positiveChips: ['Social rhythm'],
        reasonShort: 'Compatible',
      },
      recommendation: {
        explainability: {
          positiveChips: ['Social rhythm'],
          reasonShort: 'Compatible',
        },
        primaryTakeaway: 'Good fit',
        suggestedNextAction: 'Say hi',
      },
      evaluationSummary: 'Summary text',
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/match-quality/candidates/cand_1/audit?windowDays=7')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.feedbackSummary.negativeCount).toBe(1);
    expect(res.body.audit.compare.outcome).toBe('scored');
    expect(res.body.audit.matchScore).toBe(81);
  });
});

