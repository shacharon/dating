/**
 * Sub-split from me-profile-http-matches.integration.spec.ts (Sprint 65 Story 3).
 * GET/POST /api/v1/me/matches/:id/actions
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

describe('me profile HTTP — matches actions (integration)', () => {
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

});
