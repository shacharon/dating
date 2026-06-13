/**
 * HTTP integration: /api/v1/admin/photos/*
 * Run: `npx jest admin-photos-http.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserProfilePhotoStatus, UserStatus } from '@prisma/client';
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

describe('admin photos HTTP (integration)', () => {
  let app: INestApplication<App>;
  const ADMIN_USER_ID = 'user_admin_1';
  const NON_ADMIN_USER_ID = 'user_non_admin';
  const RAW_SESSION = 'raw-admin-photo-session';
  const PEPPER = 'admin-photo-test-pepper';
  const SESSION_COOKIE = 'dating_session';

  const photoStorageMock = {
    read: jest.fn().mockResolvedValue(Buffer.from([1, 2, 3])),
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
      findFirst: jest.fn(),
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

  it('returns 403 for non-admin on pending list', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/photos/pending')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403);
  });

  it('returns 403 for non-admin on moderate', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/photos/photo_pending_1')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .send({ decision: 'approve' })
      .expect(403);
  });

  it('returns 403 for non-admin on photo file', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/photos/photo_pending_1/file')
      .set('Cookie', cookieHeader(NON_ADMIN_USER_ID))
      .expect(403);
  });

  it('lists pending photos for admin', async () => {
    prismaMock.userProfilePhoto.findMany.mockResolvedValue([
      {
        id: 'photo_pending_1',
        profileId: 'prof_1',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        mimeType: 'image/jpeg',
        originalFileName: 'pic.jpg',
        profile: { userId: 'user_owner' },
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/photos/pending')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe('photo_pending_1');
  });

  it('approves pending photo', async () => {
    prismaMock.userProfilePhoto.findUnique.mockResolvedValue({
      id: 'photo_pending_1',
      status: UserProfilePhotoStatus.PENDING,
      profileId: 'prof_1',
      profile: { userId: 'user_owner' },
    });
    prismaMock.$transaction.mockImplementation(async (fn) =>
      fn({
        userProfilePhoto: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({
            id: 'photo_pending_1',
            profileId: 'prof_1',
            status: UserProfilePhotoStatus.APPROVED,
            rejectionReason: null,
            isPrimary: true,
            updatedAt: new Date('2026-06-02T00:00:00.000Z'),
          }),
        },
      }),
    );

    const res = await request(app.getHttpServer())
      .patch('/api/v1/admin/photos/photo_pending_1')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .send({ decision: 'approve' })
      .expect(200);

    expect(res.body.status).toBe('APPROVED');
  });

  it('rejects pending photo with reason', async () => {
    prismaMock.userProfilePhoto.findUnique.mockResolvedValue({
      id: 'photo_pending_1',
      status: UserProfilePhotoStatus.PENDING,
      profileId: 'prof_1',
      profile: { userId: 'user_owner' },
    });
    prismaMock.userProfilePhoto.update.mockResolvedValue({
      id: 'photo_pending_1',
      profileId: 'prof_1',
      status: UserProfilePhotoStatus.REJECTED,
      rejectionReason: 'Not a clear face photo',
      isPrimary: false,
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/admin/photos/photo_pending_1')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .send({
        decision: 'reject',
        rejectionReason: 'Not a clear face photo',
      })
      .expect(200);

    expect(res.body.status).toBe('REJECTED');
    expect(res.body.rejectionReason).toBe('Not a clear face photo');
    expect(res.body.isPrimary).toBe(false);
  });

  it('serves photo file for admin', async () => {
    prismaMock.userProfilePhoto.findUnique.mockResolvedValue({
      mimeType: 'image/jpeg',
      storageKey: 'uploads/x.jpg',
    });

    await request(app.getHttpServer())
      .get('/api/v1/admin/photos/photo_pending_1/file')
      .set('Cookie', cookieHeader(ADMIN_USER_ID))
      .expect(200)
      .expect('Content-Type', /image\/jpeg/);
  });
});
