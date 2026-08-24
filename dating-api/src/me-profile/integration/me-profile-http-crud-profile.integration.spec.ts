/**
 * Sub-split from me-profile-http-crud.integration.spec.ts (Sprint 69 Story 02).
 * Profile lifecycle — auth, create, read, patch, moderation, onboarding gates.
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

describe('me profile HTTP — crud profile (integration)', () => {
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

  it('GET /api/v1/me/profile returns 401 without session', async () => {
    await request(app.getHttpServer()).get('/api/v1/me/profile').expect(401);
  });

  it('POST /api/v1/me/profile returns 401 without session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .send({ aboutMe: 'x' })
      .expect(401);
  });

  it('PATCH /api/v1/me/profile returns 401 without session', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .send({ aboutMe: 'x' })
      .expect(401);
  });

  it('GET /api/v1/me/profile returns 404 when profile row missing', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    expect(res.body).toMatchObject({
      error: 'profile_not_found',
      message: expect.stringContaining('No profile exists'),
    });
  });

  it('full create → read → patch flow for current session user', async () => {
    const raw = await loginAndCookie();
    const created = {
      id: 'prof_flow',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'first',
      aboutPartner: null,
      aboutRelationship: null,
      gender: 'FEMALE' as const,
      desiredPartnerGenders: null as unknown,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    };
    const updated = {
      ...created,
      aboutMe: 'second',
      aboutPartner: 'partner line',
      updatedAt: new Date('2026-02-02T00:00:00.000Z'),
    };

    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce(null) // GET 404
      .mockResolvedValueOnce(null) // POST conflict check
      .mockResolvedValueOnce({ ...created, desiredPartnerGenders: null }) // POST: upsertPreference snapshot by id
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: null }) // POST: refetch for response
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: null }) // GET profile
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: null }) // PATCH load
      .mockResolvedValueOnce({ ...created, desiredPartnerGenders: null }) // PATCH: upsertPreference snapshot
      .mockResolvedValueOnce({ ...updated, preference: null, desiredPartnerGenders: null }); // PATCH refetch
    prismaMock.userProfile.create.mockResolvedValue(created);
    await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(404);

    const postRes = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ gender: 'FEMALE', aboutMe: 'first' })
      .expect(201);
    expect(postRes.body.aboutMe).toBe('first');

    const getRes = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);
    expect(getRes.body.aboutMe).toBe('first');

    prismaMock.userProfile.update.mockResolvedValue(updated);
    const patchRes = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: 'second', aboutPartner: 'partner line' })
      .expect(200);
    expect(patchRes.body.aboutMe).toBe('second');
    expect(patchRes.body.aboutPartner).toBe('partner line');
  });

  it('GET /api/v1/me/profile returns 200 when profile exists', async () => {
    const raw = await loginAndCookie();
    const row = {
      id: 'prof_1',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'hi',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique.mockResolvedValue({ ...row, preference: null });

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'prof_1',
      userId: USER_ID,
      status: 'DRAFT',
      onboardingStep: 'BASIC',
      aboutMe: 'hi',
    });
    expect(prismaMock.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      include: { preference: true },
    });
  });

  it('POST /api/v1/me/profile returns 201 without gender (defaults; onboarding step 1)', async () => {
    const raw = await loginAndCookie();
    const created = {
      id: 'prof_min',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC' as const,
      gender: 'PREFER_NOT_TO_SAY' as const,
      nickname: 'River',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: new Date('1990-06-01'),
      desiredPartnerGenders: null as unknown,
      city: 'TLV',
      country: 'IL',
      locationLabel: null,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...created, desiredPartnerGenders: null })
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: null });
    prismaMock.userProfile.create.mockResolvedValue(created);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({
        nickname: 'River',
        birthDate: '1990-06-01',
        city: 'TLV',
        country: 'IL',
        onboardingStep: 'BASIC',
      })
      .expect(201);

    expect(res.body.onboardingStep).toBe('BASIC');
    expect(res.body.nickname).toBe('River');
    expect(prismaMock.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: { connect: { id: USER_ID } },
        status: UserProfileStatus.DRAFT,
        gender: 'PREFER_NOT_TO_SAY',
        nickname: 'River',
        onboardingStep: 'BASIC',
      }),
    });
  });

  it('POST /api/v1/me/profile returns 201 and creates for session user', async () => {
    const raw = await loginAndCookie();
    const created = {
      id: 'prof_new',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'TEXTS',
      gender: 'MALE' as const,
      aboutMe: 'x',
      aboutPartner: null,
      aboutRelationship: null,
      desiredPartnerGenders: null as unknown,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...created, desiredPartnerGenders: null })
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: null });
    prismaMock.userProfile.create.mockResolvedValue(created);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({
        gender: 'MALE',
        aboutMe: 'x',
        desiredPartnerGenders: ['FEMALE'],
        onboardingStep: 'TEXTS',
      })
      .expect(201);

    expect(res.body.userId).toBe(USER_ID);
    expect(prismaMock.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user: { connect: { id: USER_ID } },
        status: UserProfileStatus.DRAFT,
        gender: 'MALE',
        aboutMe: 'x',
        desiredPartnerGenders: ['FEMALE'],
        onboardingStep: 'TEXTS',
      }),
    });
  });

  it('POST /api/v1/me/profile returns 400 when aboutMe is flagged by moderation', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);
    moderationClientMock.checkContent.mockResolvedValue({
      flagged: true,
      categories: ['sexual'],
      primaryCategory: 'sexual',
      score: 0.95,
      sexualScore: null,
      failOpen: false,
    });
    contentViolationsMock.getViolationCount.mockResolvedValue(1);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: 'explicit content here' })
      .expect(400);

    expect(res.body).toMatchObject({
      error: 'content_moderation_failed',
      details: expect.objectContaining({
        field: 'aboutMe',
        category: 'sexual',
        source: 'openai',
        flaggedText: expect.any(String),
        reason: expect.any(String),
        suggestion: expect.any(String),
      }),
    });
    expect(contentViolationsMock.recordViolation).toHaveBeenCalled();
    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 403 when profile_edit_blocked', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_blocked',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'ok',
      aboutPartner: null,
      aboutRelationship: null,
      gender: 'FEMALE',
      desiredPartnerGenders: null,
      preference: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    contentViolationsMock.getUserViolationStatus.mockResolvedValue({
      status: 'profile_edit_blocked',
      mutedUntil: null,
      violationCount: 3,
    });
    contentViolationsMock.isUserBlocked.mockResolvedValue(true);

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: 'retry' })
      .expect(403);

    expect(res.body).toMatchObject({ error: 'profile_edit_blocked' });
    expect(moderationClientMock.checkContent).not.toHaveBeenCalled();
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 422 when onboardingStep TEXTS without desiredPartnerGenders', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ gender: 'MALE', onboardingStep: 'TEXTS' })
      .expect(422);

    expect(res.body).toMatchObject({ error: 'onboarding_partner_genders_required' });
    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 422 when onboardingStep COMPLETED without all texts', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_inc',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'TEXTS',
      aboutMe: 'only me',
      aboutPartner: null,
      aboutRelationship: null,
      gender: 'MALE' as const,
      desiredPartnerGenders: ['FEMALE'] as unknown,
      preference: null,
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ onboardingStep: 'COMPLETED' })
      .expect(422);

    expect(res.body).toMatchObject({ error: 'onboarding_texts_incomplete' });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 400 when partnerAgeMin exceeds partnerAgeMax', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_inc',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'COMPLETED',
      aboutMe: 'me',
      aboutPartner: 'partner',
      aboutRelationship: 'rel',
      gender: 'MALE' as const,
      desiredPartnerGenders: ['FEMALE'] as unknown,
      preference: null,
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ partnerAgeMin: 40, partnerAgeMax: 30 })
      .expect(400);

    expect(
      Array.isArray(res.body.message)
        ? res.body.message.join(' ')
        : String(res.body.message),
    ).toMatch(/partnerAgeMin must be less than or equal to partnerAgeMax/i);
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 409 when profile already exists', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_existing',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ gender: 'FEMALE' })
      .expect(409);

    expect(res.body).toMatchObject({
      error: 'profile_already_exists',
      message: expect.stringContaining('PATCH'),
    });
    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when body includes userId', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ userId: 'evil' })
      .expect(400);

    expect(
      Array.isArray(res.body.message)
        ? res.body.message.join(' ')
        : String(res.body.message),
    ).toMatch(/userId|not allowed/i);
    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when status is sent (not whitelisted)', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ status: 'DISABLED' })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when onboardingStep is not a valid enum', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ onboardingStep: 0 })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it.each([
    ['fraction', { onboardingStep: 1.5 }],
    ['negative', { onboardingStep: -1 }],
    ['invalid string', { onboardingStep: 'STEP_99' }],
  ])(
    'POST /api/v1/me/profile returns 400 when onboardingStep is invalid (%s)',
    async (_label, body) => {
      const raw = await loginAndCookie();
      prismaMock.userProfile.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/me/profile')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send(body)
        .expect(400);

      expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
    },
  );

  it('POST /api/v1/me/profile returns 400 when aboutMe is not a string', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: ['not', 'a', 'string'] })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when aboutRelationship is not a string', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutRelationship: 99 })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

});
