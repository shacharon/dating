/**
 * Split from me-profile-http.integration.spec.ts (Sprint 63 Story 2).
 * Shared bootstrap: ./me-profile-http.shared-harness.ts
 */
import request from 'supertest';
import { UserProfileStatus, UserStatus } from '@prisma/client';
import type { MeProfileHttpHarness } from './me-profile-http.shared-harness';
import {
  createMeProfileHttpHarness,
  ME_PROFILE_HTTP_PEPPER,
  ME_PROFILE_HTTP_SESSION_COOKIE,
  ME_PROFILE_HTTP_USER_ID,
  parseStructuredJsonLogs,
} from './me-profile-http.shared-harness';

describe('me profile HTTP — photos (integration)', () => {
  let h: MeProfileHttpHarness;
  let app: MeProfileHttpHarness['app'];
  let prismaMock: MeProfileHttpHarness['prismaMock'];
  let photoStorageMock: MeProfileHttpHarness['photoStorageMock'];
  let moderationClientMock: MeProfileHttpHarness['moderationClientMock'];
  let contentViolationsMock: MeProfileHttpHarness['contentViolationsMock'];
  let matchNarrativeGeneratorStub: MeProfileHttpHarness['matchNarrativeGeneratorStub'];
  let usersServiceMock: MeProfileHttpHarness['usersServiceMock'];
  let verifyIdToken: MeProfileHttpHarness['verifyIdToken'];
  const USER_ID = ME_PROFILE_HTTP_USER_ID;
  const SESSION_COOKIE = ME_PROFILE_HTTP_SESSION_COOKIE;
  const PEPPER = ME_PROFILE_HTTP_PEPPER;
  let loginAndCookie: () => Promise<string>;

  beforeAll(async () => {
    h = await createMeProfileHttpHarness();
    app = h.app;
    prismaMock = h.prismaMock;
    photoStorageMock = h.photoStorageMock;
    moderationClientMock = h.moderationClientMock;
    contentViolationsMock = h.contentViolationsMock;
    matchNarrativeGeneratorStub = h.matchNarrativeGeneratorStub;
    usersServiceMock = h.usersServiceMock;
    verifyIdToken = h.verifyIdToken;
    loginAndCookie = h.loginAndCookie;
  });

  afterAll(async () => {
    await h.close();
  });

  beforeEach(async () => {
    await h.resetForTest();
  });

  describe('photo API', () => {
    const profileRow = {
      id: 'prof_photo_1',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      name: '',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: 'FEMALE' as const,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
      submittedAt: null,
      analyzedAt: null,
      lastAnalysisError: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('uploads photo successfully', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findMany.mockResolvedValue([]);
      prismaMock.userProfilePhoto.create.mockResolvedValue({
        id: 'photo_1',
        profileId: profileRow.id,
        storageKey: 'pending://storage-key',
        originalFileName: 'pic.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 4,
        position: 0,
        isPrimary: false,
        status: 'PENDING',
        moderationProvider: 'manual_queue',
        moderationResultJson: null,
        rejectionReason: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      });
      photoStorageMock.buildStorageKey.mockReturnValue(
        'uploads/profile-photos/prof_photo_1/photo_1.jpg',
      );
      prismaMock.userProfilePhoto.update.mockResolvedValue({
        id: 'photo_1',
        profileId: profileRow.id,
        storageKey: 'uploads/profile-photos/prof_photo_1/photo_1.jpg',
        originalFileName: 'pic.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 4,
        position: 0,
        isPrimary: false,
        status: 'PENDING',
        moderationProvider: 'manual_queue',
        moderationResultJson: null,
        rejectionReason: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/profile/photos')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .attach('file', Buffer.from([1, 2, 3, 4]), {
          filename: 'pic.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(res.body.id).toBe('photo_1');
      expect(res.body.status).toBe('PENDING');
      expect(prismaMock.userProfilePhoto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
            isPrimary: false,
          }),
        }),
      );
      expect(photoStorageMock.save).toHaveBeenCalled();
    });

    it('rejects 4th photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findMany.mockResolvedValue([
        { id: 'p1', position: 0, status: 'APPROVED', isPrimary: true },
        { id: 'p2', position: 1, status: 'APPROVED', isPrimary: false },
        { id: 'p3', position: 2, status: 'APPROVED', isPrimary: false },
      ]);

      await request(app.getHttpServer())
        .post('/api/v1/me/profile/photos')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .attach('file', Buffer.from([1, 2, 3]), {
          filename: 'pic.jpg',
          contentType: 'image/jpeg',
        })
        .expect(422);
    });

    it('rejects invalid mime', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);

      await request(app.getHttpServer())
        .post('/api/v1/me/profile/photos')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .attach('file', Buffer.from([1, 2, 3]), {
          filename: 'bad.gif',
          contentType: 'image/gif',
        })
        .expect(422);
    });

    it('rejects oversized file', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      const tooBig = Buffer.alloc(5 * 1024 * 1024 + 1, 1);

      await request(app.getHttpServer())
        .post('/api/v1/me/profile/photos')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .attach('file', tooBig, {
          filename: 'big.jpg',
          contentType: 'image/jpeg',
        })
        .expect(413);
    });

    it('lists own photos only', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findMany.mockResolvedValue([
        {
          id: 'photo_a',
          profileId: profileRow.id,
          storageKey: 'uploads/profile-photos/prof_photo_1/photo_a.jpg',
          originalFileName: 'a.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1,
          position: 0,
          isPrimary: true,
          status: 'APPROVED',
          moderationProvider: 'stub',
          moderationResultJson: null,
          rejectionReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const res = await request(app.getHttpServer())
        .get('/api/v1/me/profile/photos')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('photo_a');
      expect(prismaMock.userProfilePhoto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { profileId: profileRow.id } }),
      );
    });

    it('cannot delete another user photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/api/v1/me/profile/photos/photo_other')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('set primary works only for own APPROVED photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        id: 'photo_2',
        profileId: profileRow.id,
        status: 'REJECTED',
      });

      await request(app.getHttpServer())
        .patch('/api/v1/me/profile/photos/photo_2/primary')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(422);
    });

    it('delete primary promotes lowest-position approved remaining photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst
        .mockResolvedValueOnce({
          id: 'photo_primary',
          profileId: profileRow.id,
          storageKey: 'uploads/profile-photos/prof_photo_1/photo_primary.jpg',
          isPrimary: true,
          status: 'APPROVED',
          position: 0,
        })
        .mockResolvedValueOnce({
          id: 'photo_next',
          profileId: profileRow.id,
          storageKey: 'uploads/profile-photos/prof_photo_1/photo_next.jpg',
          isPrimary: false,
          status: 'APPROVED',
          position: 1,
        });
      prismaMock.userProfilePhoto.delete.mockResolvedValue({});
      prismaMock.userProfilePhoto.update.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete('/api/v1/me/profile/photos/photo_primary')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(prismaMock.userProfilePhoto.update).toHaveBeenCalledWith({
        where: { id: 'photo_next' },
        data: { isPrimary: true },
      });
    });

    it('owner can read own image file', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        id: 'photo_own',
        profileId: profileRow.id,
        storageKey: 'uploads/profile-photos/prof_photo_1/photo_own.jpg',
        mimeType: 'image/jpeg',
      });
      photoStorageMock.read.mockResolvedValue(Buffer.from([255, 216, 255]));

      await request(app.getHttpServer())
        .get('/api/v1/me/profile/photos/photo_own/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200)
        .expect('Content-Type', /image\/jpeg/);
    });

    it('other user cannot read image', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/profile/photos/photo_other/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('missing file returns 404', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        id: 'photo_missing',
        profileId: profileRow.id,
        storageKey: 'uploads/profile-photos/prof_photo_1/photo_missing.jpg',
        mimeType: 'image/jpeg',
      });
      photoStorageMock.read.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/profile/photos/photo_missing/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('content-type matches photo mimeType', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(profileRow);
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        id: 'photo_png',
        profileId: profileRow.id,
        storageKey: 'uploads/profile-photos/prof_photo_1/photo_png.png',
        mimeType: 'image/png',
      });
      photoStorageMock.read.mockResolvedValue(Buffer.from([137, 80, 78, 71]));

      await request(app.getHttpServer())
        .get('/api/v1/me/profile/photos/photo_png/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200)
        .expect('Content-Type', /image\/png/);
    });
  });

  // ─── Phase 3 Step 4: GET /api/v1/me/profile/matches ──────────────────────────

});
