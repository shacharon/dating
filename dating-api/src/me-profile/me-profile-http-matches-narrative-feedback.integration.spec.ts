/**
 * Sub-split from me-profile-http-matches.integration.spec.ts (Sprint 65 Story 3).
 * Sprint 22 narrative + match feedback endpoints
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

describe('me profile HTTP — matches narrative/feedback (integration)', () => {
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

});
