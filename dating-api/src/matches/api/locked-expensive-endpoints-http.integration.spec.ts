/**
 * Sprint 28 Story 2: legacy expensive routes require session + ADMIN_USER_IDS.
 * Run: `npx jest locked-expensive-endpoints-http.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserStatus } from '@prisma/client';
import { AdminAuthModule } from '../../admin/admin-auth.module';
import { AnalyticsModule } from '../../analytics/analytics.module';
import { AuthModule } from '../../auth/auth.module';
import { GoogleAuthService } from '../../auth/google-auth.service';
import { AuthSessionConfigModule } from '../../config/auth-session-config.module';
import { AuthSessionConfigService } from '../../config/auth-session-config.service';
import { SimpleLoggerModule } from '../../logger/simple-logger.module';
import { requestCorrelationMiddleware } from '../../logging/request-correlation.middleware';
import { StructuredLoggingModule } from '../../logging/structured-logging.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionModule } from '../../session/session.module';
import { hashSessionToken } from '../../session/session-token.crypto';
import { UsersModule } from '../../users/users.module';
import { MatchDaemonService } from './match-daemon.service';
import { MatchesController } from '../matches.controller';
import { MatchesService } from '../matches.service';
import { HolyGrailPairSnapshotTelemetryService } from '../holy-grail/holy-grail-pair-snapshot-telemetry.service';

describe('locked expensive endpoints HTTP (integration)', () => {
  let app: INestApplication<App>;
  const ADMIN_USER_ID = 'user_admin_lock_1';
  const NON_ADMIN_USER_ID = 'user_non_admin_lock';
  const RAW_SESSION = 'raw-lock-expensive-session';
  const PEPPER = 'lock-expensive-test-pepper';
  const SESSION_COOKIE = 'dating_session';

  const prismaMock = {
    userSession: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const matchDaemonMock = {
    runOnce: jest.fn().mockResolvedValue({ pairs: 0 }),
    getAutoIndex: jest.fn().mockResolvedValue(null),
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
        AdminAuthModule,
      ],
      controllers: [MatchesController],
      providers: [
        { provide: MatchesService, useValue: { compare: jest.fn(), getReadyMatchDetailContext: jest.fn() } },
        { provide: MatchDaemonService, useValue: matchDaemonMock },
        {
          provide: HolyGrailPairSnapshotTelemetryService,
          useValue: { recordDetailResolution: jest.fn() },
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
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
    prismaMock.user.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
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

  it('POST /api/v1/matches/rebuild returns 401 without session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/matches/rebuild')
      .expect(401);
    expect(matchDaemonMock.runOnce).not.toHaveBeenCalled();
  });

  it('POST /api/v1/matches/rebuild returns 403 for non-admin', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/matches/rebuild')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403)
      .expect((res) => {
        expect(res.body).toMatchObject({ error: 'admin_forbidden' });
      });
    expect(matchDaemonMock.runOnce).not.toHaveBeenCalled();
  });

  it('POST /api/v1/matches/rebuild succeeds for admin', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/matches/rebuild')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(201);
    expect(matchDaemonMock.runOnce).toHaveBeenCalled();
  });
});
