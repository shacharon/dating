/**
 * Sub-split from me-profile-http-matches.integration.spec.ts (Sprint 65 Story 3).
 * Mutual match flows, DELETE actions, GET /api/v1/me/profile/matches
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

describe('me profile HTTP — matches mutual/unmatch (integration)', () => {
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

    it('Sprint 67.2: PASS soft-unmatches ACTIVE MutualMatch (sorted ids)', async () => {
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
      prismaMock.mutualMatch.updateMany.mockResolvedValue({ count: 1 });

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
      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
      expect(prismaMock.mutualMatch.updateMany).toHaveBeenCalledWith({
        where: {
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          status: 'ACTIVE',
        },
        data: {
          status: 'UNMATCHED',
          unmatchedAt: expect.any(Date),
          unmatchedByUserId: USER_ID,
        },
      });
    });

    it('Sprint 67.2: BLOCK soft-unmatches ACTIVE MutualMatch', async () => {
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
      prismaMock.mutualMatch.updateMany.mockResolvedValue({ count: 1 });

      await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'BLOCK' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
      expect(prismaMock.mutualMatch.updateMany).toHaveBeenCalledWith({
        where: {
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          status: 'ACTIVE',
        },
        data: {
          status: 'UNMATCHED',
          unmatchedAt: expect.any(Date),
          unmatchedByUserId: USER_ID,
        },
      });
    });

    it('Sprint 67.2: rematch LIKE reactivates UNMATCHED MutualMatch', async () => {
      const raw = await loginAndCookie();
      mockEligibleMatchDetail();
      mockLikeUpsert();
      prismaMock.matchAction.findUnique.mockResolvedValue({ action: 'LIKE' });
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: 'mutual_row_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'UNMATCHED',
        createdAt: new Date('2026-05-31T09:00:00.000Z'),
        unmatchedAt: new Date('2026-05-31T11:00:00.000Z'),
        unmatchedByUserId: USER_ID,
      });
      prismaMock.mutualMatch.update.mockResolvedValue({
        id: 'mutual_row_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-31T09:00:00.000Z'),
        unmatchedAt: null,
        unmatchedByUserId: null,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/matches/prof_action_cand/actions')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ action: 'LIKE' })
        .expect(201);

      expect(prismaMock.mutualMatch.create).not.toHaveBeenCalled();
      expect(prismaMock.mutualMatch.update).toHaveBeenCalledWith({
        where: { id: 'mutual_row_1' },
        data: {
          status: 'ACTIVE',
          unmatchedAt: null,
          unmatchedByUserId: null,
        },
      });
      expect(res.body).toMatchObject({
        action: 'LIKE',
        mutualMatch: true,
        conversationId: 'mutual_row_1',
      });
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
