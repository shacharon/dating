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

describe('me profile HTTP — matches (integration)', () => {
  let h: MeProfileHttpHarness;
  let app: MeProfileHttpHarness['app'];
  let prismaMock: MeProfileHttpHarness['prismaMock'];
  let narrativeCachePrisma: MeProfileHttpHarness['narrativeCachePrisma'];
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
    narrativeCachePrisma = h.narrativeCachePrisma;
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

  // ─── Phase 3 Step 5: GET /api/v1/me/matches ──────────────────────────────────

  /**
   * Minimal `UserProfilePreference` joined row for /me/matches mocks.
   * Must not set partnerAgeMin/Max (HG age eval FAILs when candidate birthDate is null in fixtures).
   * Use maxDistanceKm and/or acceptedPartnerGenders so the row is non-empty (no pref fallback log).
   */
  function testUserProfilePreference(
    profileId: string,
    opts?: { acceptedPartnerGenders?: string[] },
  ) {
    return {
      id: `pref_${profileId}`,
      profileId,
      partnerAgeMin: null as number | null,
      partnerAgeMax: null as number | null,
      maxDistanceKm: 100,
      acceptedPartnerGenders: opts?.acceptedPartnerGenders ?? ([] as string[]),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
  }

  /** HG fact columns on `UserProfile`. Partner prefs live on `UserProfilePreference` (Phase F). */
  const HG_FIELD_DEFAULTS = {
    childrenStatus: null as string | null,
    wantsChildren: null as string | null,
    smokingFrequency: null as string | null,
    alcoholUse: null as string | null,
    education: null as string | null,
    religion: null as string | null,
  };

  describe('GET /api/v1/me/matches', () => {
    const viewerProfile = {
      id: 'prof_viewer_s5',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_s5', {
        acceptedPartnerGenders: ['MALE'],
      }),
    };

    function mockListEvaluations() {
      prismaMock.userProfileEvaluation.findFirst.mockImplementation(
        async (args: { where?: { profileId?: string } }) => {
          const profileId = args?.where?.profileId ?? viewerProfile.id;
          return {
            id: `eval_${profileId}`,
            profileId,
            version: 'v1',
            createdAt: new Date('2026-04-01T10:00:00.000Z'),
            evaluationJson: { display: { summary: 'Test summary.' } },
          };
        },
      );
    }

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .expect(401);
    });

    it('returns 200 not_ready(no_profile) when viewer has no UserProfile', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('not_ready');
      expect(res.body.reason).toBe('no_profile');
    });

    it('returns 200 not_ready(not_analyzed) when viewer profile is DRAFT', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue({
        ...viewerProfile,
        status: UserProfileStatus.DRAFT,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('not_ready');
      expect(res.body.reason).toBe('not_analyzed');
    });

    it('returns 200 not_ready(no_photo) when viewer is ANALYZED but has no approved photos', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfilePhoto.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('not_ready');
      expect(res.body.reason).toBe('no_photo');
    });

    it('returns 200 ready with empty matches when no candidates exist', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count.mockResolvedValue(0);
      prismaMock.userProfile.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.viewerProfileId).toBe('prof_viewer_s5');
      expect(res.body.matches).toHaveLength(0);
      expect(res.body.totalCandidatesBeforeFilter).toBe(0);
      expect(res.body.filteredNoPhotoCandidates).toBe(0);
    });

    it('returns 400 invalid_cursor when cursor is not decodable', async () => {
      const raw = await loginAndCookie();

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .query({ cursor: '!!!' })
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(400);

      expect(res.body).toMatchObject({ error: 'invalid_cursor' });
    });

    it('returns 200 ready — gender-mismatched candidate excluded', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count.mockResolvedValue(1);
      // Candidate is FEMALE — viewer (FEMALE) wants MALE only → excluded
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_1',
          userId: 'user_s5_cand_1',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1992-03-15T00:00:00.000Z'),
          gender: 'FEMALE',
          desiredPartnerGenders: null,
          city: 'NYC',
          country: 'US',
          locationLabel: 'New York, US',
          aboutMe: null,
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-01T10:00:00.000Z'),
          photos: [{ id: 'photo_cand_1', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_1'),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.totalCandidatesBeforeFilter).toBe(1);
      expect(res.body.matches).toHaveLength(0);
    });

    it('returns 200 ready — valid candidate included and id is UserProfile.id', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count.mockResolvedValue(1);
      // Candidate is MALE — viewer (FEMALE) wants MALE, candidate has no filter → included
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_2',
          userId: 'user_s5_cand_2',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1988-07-20T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
          photos: [{ id: 'photo_match_1', isPrimary: true }],
          _count: { evaluations: 2 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_2'),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.matches).toHaveLength(1);
      expect(res.body.matches[0].id).toBe('prof_s5_cand_2');
      expect(res.body.matches[0].gender).toBe('MALE');
      expect(res.body.matches[0].hasEvaluation).toBe(true);
      expect(res.body.matches[0].primaryPhotoUrl).toBe(
        '/api/v1/me/matches/prof_s5_cand_2/photos/photo_match_1/file',
      );
      expect(res.body.matches[0].approvedPhotoCount).toBe(1);
      expect(res.body.matches[0].yourAction).toBeNull();
    });

    it('includes yourAction on list items from batch action join', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count.mockResolvedValue(2);
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_2',
          userId: 'user_s5_cand_2',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1988-07-20T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate A',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
          photos: [{ id: 'photo_cand_2', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_2'),
        },
        {
          id: 'prof_s5_cand_3',
          userId: 'user_s5_cand_3',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1987-05-10T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate B',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-03T11:00:00.000Z'),
          photos: [{ id: 'photo_cand_3', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_3'),
        },
      ]);
      prismaMock.matchAction.findMany.mockResolvedValue([
        { targetUserId: 'user_s5_cand_2', action: 'LIKE' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.matches).toHaveLength(2);
      const liked = res.body.matches.find(
        (m: { id: string }) => m.id === 'prof_s5_cand_2',
      );
      const other = res.body.matches.find(
        (m: { id: string }) => m.id === 'prof_s5_cand_3',
      );
      expect(liked.yourAction).toBe('LIKE');
      expect(other.yourAction).toBeNull();
      expect(prismaMock.matchAction.findMany).toHaveBeenCalledWith({
        where: { actorUserId: USER_ID },
        select: { targetUserId: true, action: true },
      });
    });

    it('excludes blocked candidates from list', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count.mockResolvedValue(2);
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_2',
          userId: 'user_s5_cand_2',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1988-07-20T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate A',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
          photos: [{ id: 'photo_cand_2', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_2'),
        },
        {
          id: 'prof_s5_cand_3',
          userId: 'user_s5_cand_3',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1987-05-10T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate B',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-03T11:00:00.000Z'),
          photos: [{ id: 'photo_cand_3', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_3'),
        },
      ]);
      prismaMock.matchAction.findMany.mockResolvedValue([
        { targetUserId: 'user_s5_cand_2', action: 'BLOCK' },
        { targetUserId: 'user_s5_cand_3', action: 'LIKE' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.matches).toHaveLength(1);
      expect(res.body.matches[0].id).toBe('prof_s5_cand_3');
      expect(res.body.matches[0].yourAction).toBe('LIKE');
    });

    it('excludes analyzed candidates with zero approved photos from list', async () => {
      const raw = await loginAndCookie();
      mockListEvaluations();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);
      prismaMock.userProfile.count
        .mockResolvedValueOnce(2) // base ANALYZED
        .mockResolvedValueOnce(1); // photo+prefilter eligible
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_s5_cand_photo',
          userId: 'user_s5_cand_photo',
          status: UserProfileStatus.ANALYZED,
          birthDate: new Date('1988-07-20T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Has photo',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
          photos: [{ id: 'photo_match_1', isPrimary: true }],
          _count: { evaluations: 1 },
          ...HG_FIELD_DEFAULTS,
          preference: testUserProfilePreference('prof_s5_cand_photo'),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.matches).toHaveLength(1);
      expect(res.body.filteredNoPhotoCandidates).toBe(1);
      expect(res.body.totalCandidatesBeforeFilter).toBe(1);
    });
  });

  // ─── Phase 3 Step 5: GET /api/v1/me/matches/:id ───────────────────────────

  describe('GET /api/v1/me/matches/:id', () => {
    const viewerProfile = {
      id: 'prof_viewer_s5_det',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_s5_det', {
        acceptedPartnerGenders: ['MALE'],
      }),
    };

    const candidateProfile = {
      id: 'prof_s5_det_cand',
      userId: 'user_s5_det_cand',
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_s5_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_s5_det_cand'),
      user: { deletedAt: null },
    };

    it('returns 404 when candidate has no approved photos — no existence leak', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({ ...candidateProfile, photos: [] });

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .expect(401);
    });

    it('returns 404 when viewer has no UserProfile', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 404 when candidate does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 404 when candidate fails gender filter — no existence leak', async () => {
      const raw = await loginAndCookie();
      // Candidate is FEMALE — viewer (FEMALE) wants MALE only → ineligible → 404
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({ ...candidateProfile, gender: 'FEMALE' as const });

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 200 with detail — does not expose aboutMe/aboutPartner/aboutRelationship', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(candidateProfile);
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_s5_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.id).toBe('prof_s5_det_cand');
      expect(res.body.gender).toBe('MALE');
      expect(res.body.hasEvaluation).toBe(true);
      expect(res.body.evaluationSummary).toBe('Warm and grounded individual.');
      // Ownership check: raw profile text must never appear in the response
      expect(res.body.aboutMe).toBeUndefined();
      expect(res.body.aboutPartner).toBeUndefined();
      expect(res.body.aboutRelationship).toBeUndefined();
      expect(res.body.userId).toBeUndefined();
    });

    it('returns 404 when viewer blocked the candidate', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(candidateProfile);
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_s5_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'BLOCK' });

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('serves approved primary match photo through controlled endpoint', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({
          ...candidateProfile,
          preference: testUserProfilePreference('prof_s5_det_cand'),
        });
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        id: 'photo_s5_primary',
        profileId: 'prof_s5_det_cand',
        storageKey: 'uploads/profile-photos/prof_s5_det_cand/photo_s5_primary.jpg',
        mimeType: 'image/jpeg',
      });
      photoStorageMock.read.mockResolvedValue(Buffer.from([255, 216, 255]));

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand/photos/photo_s5_primary/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200)
        .expect('Content-Type', /image\/jpeg/);
    });

    it('returns 404 for photo when viewer blocked the candidate', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({
          ...candidateProfile,
          preference: testUserProfilePreference('prof_s5_det_cand'),
        });
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'BLOCK' });

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand/photos/photo_s5_primary/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.userProfilePhoto.findFirst).not.toHaveBeenCalled();
    });

    it('returns 404 for match photo when viewer has no approved photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({
          ...candidateProfile,
          preference: testUserProfilePreference('prof_s5_det_cand'),
        });
      prismaMock.userProfilePhoto.count.mockImplementation(
        async (args: { where: { profileId: string } }) =>
          args.where.profileId === viewerProfile.id ? 0 : 1,
      );

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand/photos/photo_s5_primary/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.userProfilePhoto.findFirst).not.toHaveBeenCalled();
    });

    it('returns 404 for match photo when candidate has no approved photo', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce({
          ...candidateProfile,
          preference: testUserProfilePreference('prof_s5_det_cand'),
        });
      prismaMock.userProfilePhoto.count.mockImplementation(
        async (args: { where: { profileId: string } }) =>
          args.where.profileId === candidateProfile.id ? 0 : 1,
      );

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s5_det_cand/photos/photo_s5_primary/file')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.userProfilePhoto.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 22 Story 2: matchNarrative on detail ─────────────────────────

  describe('Sprint 22 — matchNarrative on GET /api/v1/me/matches/:id', () => {
    const viewerProfile = {
      id: 'prof_viewer_s22_narr',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_s22_narr', {
        acceptedPartnerGenders: ['MALE'],
      }),
    };

    const candidateProfile = {
      id: 'prof_s22_narr_cand',
      userId: 'user_s22_narr_cand',
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_s22_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_s22_narr_cand'),
      user: { deletedAt: null },
    };

    const validEvalJson = {
      self: {
        signals: {
          ambition: 0.6,
          socialBattery: 0.5,
          emotionalDepth: 0.7,
          attachmentSecurity: 0.6,
        },
      },
      partner: { signals: {} },
      relationship: { signals: {} },
      display: { summary: 'Warm and grounded individual.' },
    };

    function mockScoredEvals(candidateEvalId = 'eval_s22_cand_1') {
      prismaMock.userProfileEvaluation.findFirst.mockImplementation(
        ({ where: { profileId } }: { where: { profileId: string } }) =>
          Promise.resolve({
            id:
              profileId === viewerProfile.id
                ? 'eval_s22_viewer_1'
                : candidateEvalId,
            profileId,
            version: 'v1',
            createdAt: new Date('2026-04-02T12:00:00.000Z'),
            evaluationJson: validEvalJson,
          }),
      );
    }

    it('returns matchNarrative and skips generator on second open (cache hit)', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockImplementation(
        ({ where }: { where: { userId?: string; id?: string } }) => {
          if (where.userId === USER_ID) return Promise.resolve(viewerProfile);
          if (where.id === candidateProfile.id) {
            return Promise.resolve(candidateProfile);
          }
          return Promise.resolve(null);
        },
      );
      mockScoredEvals();

      const first = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s22_narr_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(first.body.matchNarrative).toBe(
        'HTTP stub LLM narrative about shared emotional depth.',
      );
      expect(matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(1);
      expect(narrativeCachePrisma.store.size).toBe(1);

      const second = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s22_narr_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(second.body.matchNarrative).toBe(
        'HTTP stub LLM narrative about shared emotional depth.',
      );
      expect(matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(1);
    });

    it('regenerates when candidate evaluation id changes', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockImplementation(
        ({ where }: { where: { userId?: string; id?: string } }) => {
          if (where.userId === USER_ID) return Promise.resolve(viewerProfile);
          if (where.id === candidateProfile.id) {
            return Promise.resolve(candidateProfile);
          }
          return Promise.resolve(null);
        },
      );
      mockScoredEvals('eval_s22_cand_1');

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s22_narr_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);
      expect(matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(1);

      mockScoredEvals('eval_s22_cand_2');
      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s22_narr_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);
      expect(matchNarrativeGeneratorStub.generate).toHaveBeenCalledTimes(2);
    });

    it('does not cache fallback narratives', async () => {
      matchNarrativeGeneratorStub.generate.mockResolvedValue({
        narrative: 'Template fallback prose.',
        source: 'fallback',
        promptVersion: 'v1',
      });
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockImplementation(
        ({ where }: { where: { userId?: string; id?: string } }) => {
          if (where.userId === USER_ID) return Promise.resolve(viewerProfile);
          if (where.id === candidateProfile.id) {
            return Promise.resolve(candidateProfile);
          }
          return Promise.resolve(null);
        },
      );
      mockScoredEvals();

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_s22_narr_cand')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.matchNarrative).toBe('Template fallback prose.');
      expect(narrativeCachePrisma.store.size).toBe(0);
      expect(prismaMock.matchNarrativeCache.upsert).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 10 Story 4: match feedback ─────────────────────────────────────

  describe('PUT/GET /api/v1/me/matches/:id/feedback', () => {
    const CANDIDATE_USER_ID = 'user_feedback_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_feedback',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_feedback', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_feedback_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_feedback_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_feedback_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_feedback_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    it('returns 401 without session on GET', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_feedback_cand/feedback')
        .expect(401);
    });

    it('returns 401 without session on PUT', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/me/matches/prof_feedback_cand/feedback')
        .send({ sentiment: 'positive' })
        .expect(401);
    });

    it('GET returns null sentiment when no feedback row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchFeedback.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({ sentiment: null });
    });

    it('PUT positive upserts and GET returns POSITIVE', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-06-06T10:00:00.000Z');
      const updatedAt = new Date('2026-06-06T10:00:00.000Z');
      prismaMock.matchFeedback.upsert.mockResolvedValue({
        matchProfileId: candidateProfile.id,
        sentiment: 'POSITIVE',
        createdAt,
        updatedAt,
      });
      prismaMock.matchFeedback.findUnique.mockResolvedValue({
        sentiment: 'POSITIVE',
      });

      const putRes = await request(app.getHttpServer())
        .put('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ sentiment: 'positive' })
        .expect(200);

      expect(putRes.body).toMatchObject({
        matchProfileId: 'prof_feedback_cand',
        sentiment: 'POSITIVE',
      });

      const getRes = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(getRes.body).toEqual({ sentiment: 'POSITIVE' });
    });

    it('PUT negative updates existing row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchFeedback.upsert.mockResolvedValue({
        matchProfileId: candidateProfile.id,
        sentiment: 'NEGATIVE',
        createdAt: new Date('2026-06-06T10:00:00.000Z'),
        updatedAt: new Date('2026-06-06T11:00:00.000Z'),
      });

      const res = await request(app.getHttpServer())
        .put('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ sentiment: 'negative' })
        .expect(200);

      expect(res.body.sentiment).toBe('NEGATIVE');
      expect(prismaMock.matchFeedback.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { sentiment: 'NEGATIVE' },
        }),
      );
    });

    it('PUT on self profile returns 400 cannot_feedback_self', async () => {
      const raw = await loginAndCookie();
      const selfViewerProfile = {
        ...viewerProfile,
        gender: 'FEMALE' as const,
        desiredPartnerGenders: ['FEMALE'],
        preference: testUserProfilePreference('prof_viewer_feedback', {
          acceptedPartnerGenders: ['FEMALE'],
        }),
      };
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return selfViewerProfile;
          }
          if (args.where.id === selfViewerProfile.id) {
            return {
              ...selfViewerProfile,
              photos: [{ id: 'photo_self', isPrimary: true }],
              user: { deletedAt: null },
              _count: { evaluations: 1 },
            };
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_self',
        profileId: selfViewerProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Self summary.' } },
      });

      const res = await request(app.getHttpServer())
        .put(`/api/v1/me/matches/${selfViewerProfile.id}/feedback`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ sentiment: 'positive' })
        .expect(400);

      expect(res.body.error).toBe('cannot_feedback_self');
      expect(prismaMock.matchFeedback.upsert).not.toHaveBeenCalled();
    });

    it('GET on invisible candidate returns 404', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.matchFeedback.findUnique).not.toHaveBeenCalled();
    });

    it('PUT with invalid sentiment returns 400', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();

      await request(app.getHttpServer())
        .put('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ sentiment: 'maybe' })
        .expect(400);

      expect(prismaMock.matchFeedback.upsert).not.toHaveBeenCalled();
    });

    it('PUT on invisible candidate returns 404', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .put('/api/v1/me/matches/prof_feedback_cand/feedback')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ sentiment: 'positive' })
        .expect(404);

      expect(prismaMock.matchFeedback.upsert).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 1 Story 3: GET /api/v1/me/matches/:id/actions ────────────────

  describe('GET /api/v1/me/matches/:id/actions', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_action',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_action', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_action_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_action_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_action_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .expect(401);
    });

    it('returns 404 when candidate does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.matchAction.findUnique).not.toHaveBeenCalled();
    });

    it('returns 200 with action null when match visible and no row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        action: null,
        mutualMatch: false,
        conversationId: null,
      });
      expect(prismaMock.matchAction.findUnique).toHaveBeenCalledWith({
        where: {
          actorUserId_targetUserId: {
            actorUserId: USER_ID,
            targetUserId: CANDIDATE_USER_ID,
          },
        },
        select: { action: true, createdAt: true },
      });
    });

    it('returns 200 with LIKE action and createdAt', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');
      prismaMock.matchAction.findUnique.mockResolvedValue({
        action: 'LIKE',
        createdAt,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        action: 'LIKE',
        createdAt: createdAt.toISOString(),
        mutualMatch: false,
        conversationId: null,
      });
    });

    it('returns 404 when viewer blocked the candidate', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'BLOCK' });

      await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });
  });

  // ─── Sprint 1 Story 1: POST /api/v1/me/matches/:id/actions ───────────────

  describe('POST /api/v1/me/matches/:id/actions', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_action',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_action', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_action_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_action_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_action_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .send({ action: 'LIKE' })
        .expect(401);
    });

    it('returns 404 when candidate does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(404);

      expect(prismaMock.matchAction.upsert).not.toHaveBeenCalled();
    });

    it('returns 400 when acting on self (same user id)', async () => {
      const raw = await loginAndCookie();
      const selfViewerProfile = {
        ...viewerProfile,
        gender: 'FEMALE' as const,
        desiredPartnerGenders: ['FEMALE'],
        preference: testUserProfilePreference('prof_viewer_action', {
          acceptedPartnerGenders: ['FEMALE'],
        }),
      };
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return selfViewerProfile;
          }
          if (args.where.id === selfViewerProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return { id: selfViewerProfile.id, userId: USER_ID };
            }
            return {
              ...selfViewerProfile,
              id: selfViewerProfile.id,
              userId: USER_ID,
              photos: [{ id: 'photo_self', isPrimary: true }],
              user: { deletedAt: null },
              _count: { evaluations: 1 },
            };
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_self',
        profileId: selfViewerProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Self summary.' } },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/me/matches/${selfViewerProfile.id}/actions`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(400);

      expect(prismaMock.matchAction.upsert).not.toHaveBeenCalled();
    });

    it('creates PASS action with user-to-user identity (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T11:00:00.000Z');
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_pass',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'PASS',
        createdAt,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      expect(res.body).toMatchObject({
        id: 'action_row_pass',
        action: 'PASS',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: 'prof_action_cand',
        createdAt: createdAt.toISOString(),
      });
    });

    it('creates BLOCK action with user-to-user identity (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T12:00:00.000Z');
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_block',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'BLOCK',
        createdAt,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'BLOCK' })
        .expect(201);

      expect(res.body).toMatchObject({
        id: 'action_row_block',
        action: 'BLOCK',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: 'prof_action_cand',
        createdAt: createdAt.toISOString(),
      });
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ action: 'BLOCK' }),
        }),
      );
    });

    it('BLOCK overwrites prior LIKE on same user pair (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T12:00:00.000Z');
      prismaMock.matchAction.upsert
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'LIKE',
          createdAt,
        })
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'BLOCK',
          createdAt,
        });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      const blockRes = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'BLOCK' })
        .expect(201);

      expect(blockRes.body.action).toBe('BLOCK');
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.matchAction.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ action: 'BLOCK' }),
        }),
      );
    });

    it('BLOCK overwrites prior PASS on same user pair (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T12:00:00.000Z');
      prismaMock.matchAction.upsert
        .mockResolvedValueOnce({
          id: 'action_row_pass',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'PASS',
          createdAt,
        })
        .mockResolvedValueOnce({
          id: 'action_row_pass',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'BLOCK',
          createdAt,
        });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      const blockRes = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'BLOCK' })
        .expect(201);

      expect(blockRes.body.action).toBe('BLOCK');
      expect(prismaMock.matchAction.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ action: 'BLOCK' }),
        }),
      );
    });

    it('returns 400 for invalid action value', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'INVALID' })
        .expect(400);

      expect(prismaMock.matchAction.upsert).not.toHaveBeenCalled();
    });

    it('creates LIKE action with user-to-user identity (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_1',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'LIKE',
        createdAt,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(res.body).toMatchObject({
        id: 'action_row_1',
        action: 'LIKE',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: 'prof_action_cand',
        createdAt: createdAt.toISOString(),
      });
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledWith({
        where: {
          actorUserId_targetUserId: {
            actorUserId: USER_ID,
            targetUserId: CANDIDATE_USER_ID,
          },
        },
        create: expect.objectContaining({
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'LIKE',
        }),
        update: expect.objectContaining({
          action: 'LIKE',
          targetProfileIdSnapshot: candidateProfile.id,
        }),
      });
    });

    it('re-LIKE is idempotent (upsert, 201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_1',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'LIKE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
      });

      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/me/matches/prof_action_cand/actions')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ action: 'LIKE' })
          .expect(201);
      }

      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(2);
    });

    it('re-PASS is idempotent (upsert, 201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_pass',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'PASS',
        createdAt: new Date('2026-05-31T11:00:00.000Z'),
      });

      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/me/matches/prof_action_cand/actions')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ action: 'PASS' })
          .expect(201);
      }

      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(2);
    });

    it('PASS overwrites prior LIKE on same user pair (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');
      prismaMock.matchAction.upsert
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'LIKE',
          createdAt,
        })
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'PASS',
          createdAt,
        });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      const passRes = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      expect(passRes.body.action).toBe('PASS');
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.matchAction.upsert).toHaveBeenLastCalledWith({
        where: {
          actorUserId_targetUserId: {
            actorUserId: USER_ID,
            targetUserId: CANDIDATE_USER_ID,
          },
        },
        create: expect.objectContaining({ action: 'PASS' }),
        update: expect.objectContaining({
          action: 'PASS',
          targetProfileIdSnapshot: candidateProfile.id,
        }),
      });
    });

    it('LIKE overwrites prior PASS on same user pair (201)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');
      prismaMock.matchAction.upsert
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'PASS',
          createdAt,
        })
        .mockResolvedValueOnce({
          id: 'action_row_1',
          actorUserId: USER_ID,
          targetUserId: CANDIDATE_USER_ID,
          targetProfileIdSnapshot: candidateProfile.id,
          action: 'LIKE',
          createdAt,
        });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      const likeRes = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(likeRes.body.action).toBe('LIKE');
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.matchAction.upsert).toHaveBeenLastCalledWith({
        where: {
          actorUserId_targetUserId: {
            actorUserId: USER_ID,
            targetUserId: CANDIDATE_USER_ID,
          },
        },
        create: expect.objectContaining({ action: 'LIKE' }),
        update: expect.objectContaining({
          action: 'LIKE',
          targetProfileIdSnapshot: candidateProfile.id,
        }),
      });
    });
  });

  // ─── Sprint 2 Story 1: mutual match detection on LIKE ───────────────────

  describe('Sprint 2 Story 1: mutual match detection', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_action',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_action', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_action_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_action_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_action_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    function mockLikeUpsert() {
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_like',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'LIKE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
      });
    }

    it('does not create MutualMatch when only one user has LIKED', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
    });

    it('creates MutualMatch when reciprocal LIKE exists (sorted user ids)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'LIKE' });
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);
      prismaMock.mutualMatch.create.mockResolvedValue({
        id: 'mutual_row_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
        unmatchedAt: null,
        unmatchedByUserId: null,
      });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).toHaveBeenCalledWith({
        data: {
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          status: 'ACTIVE',
        },
      });
    });

    it('re-LIKE after mutual is idempotent (201, no second create)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'LIKE' });
      const existingMutual = {
        id: 'mutual_row_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-31T09:00:00.000Z'),
        unmatchedAt: null,
        unmatchedByUserId: null,
      };
      prismaMock.mutualMatch.findUnique.mockResolvedValue(existingMutual);

      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/me/matches/prof_action_cand/actions')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ action: 'LIKE' })
          .expect(201);
      }

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
    });

    it('does not create MutualMatch when reverse action is PASS', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'PASS' });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
    });

    it('does not invoke mutual detection on PASS', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_pass',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'PASS',
        createdAt: new Date('2026-05-31T11:00:00.000Z'),
      });
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'LIKE' });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
    });

    it('does not change MutualMatch when BLOCK overwrites LIKE (deferred Story 1 behavior)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_block',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'BLOCK',
        createdAt: new Date('2026-05-31T12:00:00.000Z'),
      });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'BLOCK' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 2 Story 4: mutual match notification flags ───────────────────

  describe('Sprint 2 Story 4: mutual match notification', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_action',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_action', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_action_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_action_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_action_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    function mockLikeUpsert() {
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_like',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'LIKE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
      });
    }

    it('POST LIKE returns mutualMatch false when only one-sided like', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(res.body).toMatchObject({
        action: 'LIKE',
        mutualMatch: false,
        conversationId: null,
      });
    });

    it('POST LIKE returns mutualMatch true and conversationId on reciprocal like', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'LIKE' });
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);
      prismaMock.mutualMatch.create.mockResolvedValue({
        id: 'mutual_row_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
        unmatchedAt: null,
        unmatchedByUserId: null,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(res.body).toMatchObject({
        action: 'LIKE',
        mutualMatch: true,
        conversationId: 'mutual_row_1',
      });
    });

    it('POST PASS returns mutualMatch false', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.upsert.mockResolvedValue({
        id: 'action_row_pass',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'PASS',
        createdAt: new Date('2026-05-31T11:00:00.000Z'),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'PASS' })
        .expect(201);

      expect(res.body).toMatchObject({
        action: 'PASS',
        mutualMatch: false,
        conversationId: null,
      });
    });

    it('GET actions returns mutualMatch true when ACTIVE mutual exists', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');
      prismaMock.matchAction.findUnique.mockResolvedValue({
        action: 'LIKE',
        createdAt,
      });
      prismaMock.mutualMatch.findFirst.mockResolvedValue({
        id: 'mutual_row_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt,
        unmatchedAt: null,
        unmatchedByUserId: null,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        action: 'LIKE',
        createdAt: createdAt.toISOString(),
        mutualMatch: true,
        conversationId: 'mutual_row_1',
      });
      expect(prismaMock.mutualMatch.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId1: CANDIDATE_USER_ID,
            userId2: USER_ID,
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });

  // ─── Sprint 2 Story 2: GET /api/v1/me/conversations ─────────────────────


  describe('DELETE /api/v1/me/matches/:id/actions', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    const viewerProfile = {
      id: 'prof_viewer_action',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_viewer_action', {
        acceptedPartnerGenders: ['MALE'],
      }),
      signals: [],
      interests: [],
    };

    const candidateProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      status: UserProfileStatus.ANALYZED,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      gender: 'MALE' as const,
      desiredPartnerGenders: null,
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      aboutMe: 'Male candidate detail',
      aboutPartner: null,
      aboutRelationship: null,
      analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
      updatedAt: new Date('2026-04-02T11:00:00.000Z'),
      photos: [{ id: 'photo_action_primary', isPrimary: true }],
      _count: { evaluations: 1 },
      ...HG_FIELD_DEFAULTS,
      preference: testUserProfilePreference('prof_action_cand'),
      signals: [],
      interests: [],
      user: { deletedAt: null },
    };

    function mockEligibleMatchDetail() {
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: {
          where: { userId?: string; id?: string };
          select?: Record<string, unknown>;
        }) => {
          if (args.where.userId === USER_ID) {
            return viewerProfile;
          }
          if (args.where.id === candidateProfile.id) {
            const sel = args.select;
            const isUserIdOnlyLookup =
              sel &&
              sel.userId === true &&
              sel.id === true &&
              Object.keys(sel).length === 2;
            if (isUserIdOnlyLookup) {
              return {
                id: candidateProfile.id,
                userId: candidateProfile.userId,
              };
            }
            return candidateProfile;
          }
          return null;
        },
      );
      prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_action_1',
        profileId: candidateProfile.id,
        version: 'v1',
        createdAt: new Date('2026-04-02T12:00:00.000Z'),
        evaluationJson: { display: { summary: 'Warm and grounded individual.' } },
      });
      prismaMock.matchAction.findUnique.mockResolvedValue(null);
    }

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .expect(401);
    });

    it('returns 404 when candidate does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique
        .mockResolvedValueOnce(viewerProfile)
        .mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.matchAction.delete).not.toHaveBeenCalled();
    });

    it('returns 404 when visible but no action row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(res.body.message).toBe('No action to undo');
      expect(prismaMock.matchAction.delete).not.toHaveBeenCalled();
    });

    it('returns 204 and deletes LIKE row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'LIKE' });
      prismaMock.matchAction.delete.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(204);

      expect(prismaMock.matchAction.delete).toHaveBeenCalledWith({
        where: {
          actorUserId_targetUserId: {
            actorUserId: USER_ID,
            targetUserId: CANDIDATE_USER_ID,
          },
        },
      });
    });

    it('returns 204 and deletes PASS row', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'PASS' });
      prismaMock.matchAction.delete.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(204);

      expect(prismaMock.matchAction.delete).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when action is BLOCK (blocked match hidden)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'BLOCK' });

      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.matchAction.delete).not.toHaveBeenCalled();
    });

    it('allows POST LIKE after DELETE (undo then re-like)', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      const createdAt = new Date('2026-05-31T10:00:00.000Z');

      prismaMock.matchAction.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ action: 'LIKE' });
      prismaMock.matchAction.delete.mockResolvedValueOnce({});
      await request(app.getHttpServer())
        .delete('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(204);

      prismaMock.matchAction.upsert.mockResolvedValueOnce({
        id: 'action_row_new',
        actorUserId: USER_ID,
        targetUserId: CANDIDATE_USER_ID,
        targetProfileIdSnapshot: candidateProfile.id,
        action: 'LIKE',
        createdAt,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(res.body.action).toBe('LIKE');
      expect(prismaMock.matchAction.delete).toHaveBeenCalledTimes(1);
      expect(prismaMock.matchAction.upsert).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Photo API: /api/v1/me/profile/photos

  describe('GET /api/v1/me/profile/matches', () => {
    const viewerProfile = {
      id: 'prof_viewer_int',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      name: '',
      aboutMe: 'I like hiking',
      aboutPartner: 'Looking for warmth',
      aboutRelationship: 'Long term',
      birthDate: new Date('1990-01-10T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      submittedAt: new Date('2026-04-01T08:00:00.000Z'),
      analyzedAt: new Date('2026-04-01T09:00:00.000Z'),
      lastAnalysisError: null as string | null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
    };

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/profile/matches')
        .expect(401);
    });

    it('returns 404 when viewer has no UserProfile', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/me/profile/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 200 with gender-filtered candidates — mismatched gender excluded', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);

      // Candidate is FEMALE — viewer (FEMALE) wants MALE only → mismatch, excluded
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_cand_int_1',
          birthDate: new Date('1992-03-15T00:00:00.000Z'),
          gender: 'FEMALE',
          desiredPartnerGenders: null,
          city: 'NYC',
          country: 'US',
          locationLabel: 'New York, US',
          aboutMe: 'Candidate text',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-01T10:00:00.000Z'),
          _count: { evaluations: 1 },
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/profile/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.viewerGender).toBe('FEMALE');
      expect(res.body.viewerAcceptedPartnerGenders).toEqual(['MALE']);
      expect(res.body.totalCandidatesBeforeFilter).toBe(1);
      expect(res.body.candidates).toHaveLength(0);
    });

    it('returns 200 with matching candidate included — correct gender passes filter', async () => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(viewerProfile);

      // Candidate is MALE — viewer wants MALE, candidate has no filter → both directions pass
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
          id: 'prof_cand_int_2',
          birthDate: new Date('1988-07-20T00:00:00.000Z'),
          gender: 'MALE',
          desiredPartnerGenders: null,
          city: 'TLV',
          country: 'IL',
          locationLabel: 'Tel Aviv, IL',
          aboutMe: 'Male candidate',
          aboutPartner: null,
          aboutRelationship: null,
          analyzedAt: new Date('2026-04-02T11:00:00.000Z'),
          _count: { evaluations: 2 },
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/profile/matches')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.totalCandidatesBeforeFilter).toBe(1);
      expect(res.body.candidates).toHaveLength(1);
      expect(res.body.candidates[0].userProfileId).toBe('prof_cand_int_2');
      expect(res.body.candidates[0].gender).toBe('MALE');
      expect(res.body.candidates[0].hasEvaluation).toBe(true);
    });
  });
});
