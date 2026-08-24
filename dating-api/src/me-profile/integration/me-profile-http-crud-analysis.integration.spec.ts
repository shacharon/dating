/**
 * Sub-split from me-profile-http-crud.integration.spec.ts (Sprint 69 Story 02).
 * GET /profile/quality, GET /analysis/latest, POST /profile/submit.
 */
import request from 'supertest';
import { Prisma, UserProfileStatus, UserStatus } from '@prisma/client';
import {
  createCrudHttpIntegrationSuite,
  type CrudHttpIntegrationContext,
} from './me-profile-http-crud.spec-support';
import {
  ME_PROFILE_HTTP_PEPPER,
  ME_PROFILE_HTTP_SESSION_COOKIE,
  ME_PROFILE_HTTP_USER_ID,
} from './me-profile-http.shared-harness';

describe('me profile HTTP — crud analysis (integration)', () => {
  let h: CrudHttpIntegrationContext['h'];
  let app: CrudHttpIntegrationContext['app'];
  let prismaMock: CrudHttpIntegrationContext['prismaMock'];
  let photoStorageMock: CrudHttpIntegrationContext['photoStorageMock'];
  let moderationClientMock: CrudHttpIntegrationContext['moderationClientMock'];
  let contentViolationsMock: CrudHttpIntegrationContext['contentViolationsMock'];
  let matchNarrativeGeneratorStub: CrudHttpIntegrationContext['matchNarrativeGeneratorStub'];
  let usersServiceMock: CrudHttpIntegrationContext['usersServiceMock'];
  let verifyIdToken: CrudHttpIntegrationContext['verifyIdToken'];
  const USER_ID = ME_PROFILE_HTTP_USER_ID;
  const SESSION_COOKIE = ME_PROFILE_HTTP_SESSION_COOKIE;
  const PEPPER = ME_PROFILE_HTTP_PEPPER;
  let loginAndCookie: () => Promise<string>;

  beforeAll(async () => {
    const suite = await createCrudHttpIntegrationSuite();
    h = suite.h;
    app = suite.app;
    prismaMock = suite.prismaMock;
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


  // ---------------------------------------------------------------------------
  // GET /api/v1/me/profile/quality (Sprint 35 Story 3)
  // ---------------------------------------------------------------------------

  it('GET /api/v1/me/profile/quality returns 401 without session', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/me/profile/quality')
      .expect(401);
  });

  it('GET /api/v1/me/profile/quality returns 404 when profile row missing', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile/quality')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    expect(res.body).toMatchObject({ error: 'profile_not_found' });
  });

  it('GET /api/v1/me/profile/quality returns score and suggestions when profile exists', async () => {
    const raw = await loginAndCookie();
    const long = 'y'.repeat(50);
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_quality_1',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      nickname: 'Noa',
      aboutMe: long,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: new Date('1990-01-01'),
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
      city: 'Tel Aviv',
      country: null,
      locationLabel: null,
      submittedAt: null,
      analyzedAt: null,
      lastAnalysisError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      preference: null,
    });
    prismaMock.userProfilePhoto.count.mockResolvedValue(0);

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile/quality')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);

    expect(res.body.score).toBe(50); // nick 10 + location 10 + basics 10 + aboutMe 20
    expect(res.body.completeness).toMatchObject({
      hasNickname: true,
      hasLocation: true,
      hasBasics: true,
      hasAboutMe: true,
      hasAboutPartner: false,
      hasAboutRelationship: false,
      hasApprovedPhoto: false,
    });
    expect(res.body.suggestions.map((s: { id: string }) => s.id)).toEqual([
      'photo',
      'aboutPartner',
      'aboutRelationship',
    ]);
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/me/profile/analysis/latest
  // ---------------------------------------------------------------------------

  it('GET /api/v1/me/profile/analysis/latest returns 401 without session', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/me/profile/analysis/latest')
      .expect(401);
  });

  it('GET /api/v1/me/profile/analysis/latest returns 404 when profile does not exist', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile/analysis/latest')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    expect(res.body).toMatchObject({ error: 'profile_not_found' });
  });

  it('GET /api/v1/me/profile/analysis/latest returns 404 when no UserProfileEvaluation row exists', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_analysis_latest_1',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'BASIC',
      aboutMe: 'x',
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: null,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
      submittedAt: null,
      analyzedAt: null,
      lastAnalysisError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.userProfileEvaluation.findFirst.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile/analysis/latest')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    expect(res.body).toMatchObject({ error: 'evaluation_not_found' });
  });

  it('GET /api/v1/me/profile/analysis/latest returns latest UserProfileEvaluation', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_analysis_latest_2',
      userId: USER_ID,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'BASIC',
      aboutMe: 'x',
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: null,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
      submittedAt: null,
      analyzedAt: null,
      lastAnalysisError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const createdAt = new Date('2026-04-15T15:00:00.000Z');
    prismaMock.userProfileEvaluation.findFirst.mockResolvedValue({
      id: 'upeval_int_1',
      profileId: 'prof_analysis_latest_2',
      version: 'v1',
      evaluationJson: { self: {}, partner: {} },
      createdAt,
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile/analysis/latest')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);

    expect(res.body.userProfileId).toBe('prof_analysis_latest_2');
    expect(res.body.evaluationId).toBe('upeval_int_1');
    expect(res.body.createdAt).toBe(createdAt.toISOString());
    expect(res.body.evaluationJson).toEqual({ self: {}, partner: {} });
    expect(prismaMock.userProfileEvaluation.findFirst).toHaveBeenCalledWith({
      where: { profileId: 'prof_analysis_latest_2' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/me/profile/submit
  // ---------------------------------------------------------------------------

  it('POST /api/v1/me/profile/submit returns 401 without session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .expect(401);
  });

  it('POST /api/v1/me/profile/submit returns 404 when profile does not exist', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    expect(res.body).toMatchObject({
      error: 'profile_not_found',
      message: expect.stringContaining('No profile exists'),
    });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile/submit returns 422 when gender is not explicitly chosen', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_submit_nogender',
      userId: USER_ID,
      status: 'DRAFT' as UserProfileStatus,
      onboardingStep: 'BASIC',
      aboutMe: 'ready',
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: 'PREFER_NOT_TO_SAY' as const,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
      submittedAt: null,
      analyzedAt: null,
      lastAnalysisError: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(422);

    expect(res.body).toMatchObject({ error: 'gender_required' });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile/submit returns 422 when no approved photo', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_submit_nophoto',
      userId: USER_ID,
      status: 'DRAFT' as UserProfileStatus,
      onboardingStep: 'BASIC',
      aboutMe: 'ready',
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
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    });
    prismaMock.userProfilePhoto.count.mockResolvedValue(0);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(422);

    expect(res.body).toMatchObject({ error: 'photo_required' });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile/submit returns 202 and sets status SUBMITTED from DRAFT', async () => {
    const raw = await loginAndCookie();
    const draftRow = {
      id: 'prof_submit_1',
      userId: USER_ID,
      status: 'DRAFT' as UserProfileStatus,
      onboardingStep: 'BASIC',
      aboutMe: 'ready',
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
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    };
    const submittedAt = new Date('2026-04-15T10:00:00.000Z');
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce(draftRow)
      .mockResolvedValueOnce({
        ...draftRow,
        status: 'SUBMITTED' as UserProfileStatus,
        submittedAt,
        updatedAt: submittedAt,
        preference: null,
      });
    prismaMock.userProfile.update.mockResolvedValue({
      ...draftRow,
      status: 'SUBMITTED' as UserProfileStatus,
      submittedAt,
      updatedAt: submittedAt,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile/submit')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(202);

    expect(res.body.analysisJobId).toBeTruthy();
    expect(res.body.profile.status).toBe('SUBMITTED');
    expect(res.body.profile.submittedAt).toBeTruthy();
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: expect.objectContaining({
        status: 'SUBMITTED',
        lastAnalysisError: null,
      }),
    });
  });

  it.each(['SUBMITTED', 'ANALYZING'] as const)(
    'POST /api/v1/me/profile/submit returns 422 when status is %s',
    async (status) => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue({
        id: 'prof_inflight',
        userId: USER_ID,
        status: status as UserProfileStatus,
        onboardingStep: 'BASIC',
        aboutMe: null,
        aboutPartner: null,
        aboutRelationship: null,
        birthDate: null,
        gender: null,
        desiredPartnerGenders: null,
        city: null,
        country: null,
        locationLabel: null,
        submittedAt: new Date(),
        analyzedAt: null,
        lastAnalysisError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/me/profile/submit')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(422);

      expect(res.body).toMatchObject({
        error: 'invalid_submit_state',
        currentStatus: status,
      });
      expect(Array.isArray(res.body.allowedStatuses)).toBe(true);
      expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
    },
  );

});
