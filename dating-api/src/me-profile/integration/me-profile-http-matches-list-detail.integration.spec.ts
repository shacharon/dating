/**
 * Sub-split from me-profile-http-matches.integration.spec.ts (Sprint 65 Story 3).
 * GET /api/v1/me/matches + GET /api/v1/me/matches/:id
 */
import request from 'supertest';
import { UserProfileStatus } from '@prisma/client';
import {
  createMatchesHttpIntegrationSuite,
  testUserProfilePreference,
  HG_FIELD_DEFAULTS,
  type MatchesHttpIntegrationContext,
} from './me-profile-http-matches.spec-support';
import {
  ME_PROFILE_HTTP_PEPPER,
  ME_PROFILE_HTTP_SESSION_COOKIE,
  ME_PROFILE_HTTP_USER_ID,
} from './me-profile-http.shared-harness';

describe('me profile HTTP — matches list/detail (integration)', () => {
  let h: MatchesHttpIntegrationContext['h'];
  let app: MatchesHttpIntegrationContext['app'];
  let prismaMock: MatchesHttpIntegrationContext['prismaMock'];
  let narrativeCachePrisma: MatchesHttpIntegrationContext['narrativeCachePrisma'];
  let photoStorageMock: MatchesHttpIntegrationContext['photoStorageMock'];
  let moderationClientMock: MatchesHttpIntegrationContext['moderationClientMock'];
  let contentViolationsMock: MatchesHttpIntegrationContext['contentViolationsMock'];
  let matchNarrativeGeneratorStub: MatchesHttpIntegrationContext['matchNarrativeGeneratorStub'];
  let usersServiceMock: MatchesHttpIntegrationContext['usersServiceMock'];
  let verifyIdToken: MatchesHttpIntegrationContext['verifyIdToken'];
  const USER_ID = ME_PROFILE_HTTP_USER_ID;
  const SESSION_COOKIE = ME_PROFILE_HTTP_SESSION_COOKIE;
  const PEPPER = ME_PROFILE_HTTP_PEPPER;
  let loginAndCookie: () => Promise<string>;

  beforeAll(async () => {
    const suite = await createMatchesHttpIntegrationSuite();
    h = suite.h;
    app = suite.app;
    prismaMock = suite.prismaMock;
    narrativeCachePrisma = suite.narrativeCachePrisma;
    photoStorageMock = suite.photoStorageMock;
    moderationClientMock = suite.moderationClientMock;
    contentViolationsMock = suite.contentViolationsMock;
    matchNarrativeGeneratorStub = suite.matchNarrativeGeneratorStub;
    usersServiceMock = suite.usersServiceMock;
    verifyIdToken = suite.verifyIdToken;
    loginAndCookie = suite.loginAndCookie;
  });

  afterAll(async () => {
    await h.close();
  });

  beforeEach(async () => {
    await h.resetForTest();
  });

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

});
