/**
 * Split from me-profile-http.integration.spec.ts (Sprint 63 Story 2).
 * Shared bootstrap: ./me-profile-http.shared-harness.ts
 */
import request from 'supertest';
import { Prisma, UserProfileStatus, UserStatus } from '@prisma/client';
import type { MeProfileHttpHarness } from './me-profile-http.shared-harness';
import {
  createMeProfileHttpHarness,
  ME_PROFILE_HTTP_PEPPER,
  ME_PROFILE_HTTP_SESSION_COOKIE,
  ME_PROFILE_HTTP_USER_ID,
  parseStructuredJsonLogs,
} from './me-profile-http.shared-harness';

describe('me profile HTTP — crud (integration)', () => {
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

  it('PATCH /api/v1/me/profile returns 404 when profile missing', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: 'nope' })
      .expect(404);

    expect(res.body).toMatchObject({ error: 'profile_not_found' });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 200 with empty body and does not call update', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_partial',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'COMPLETED',
      aboutMe: 'keep',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique.mockResolvedValue({
      ...existing,
      preference: null,
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({})
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'prof_partial',
      aboutMe: 'keep',
      onboardingStep: 'COMPLETED',
      status: 'DRAFT',
    });
    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 200 for partial field-only update (onboardingStep only)', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_step',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'] as unknown,
      aboutMe: 'unchanged',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce({
        ...existing,
        preference: null,
      })
      .mockResolvedValueOnce({ ...existing })
      .mockResolvedValueOnce({
        ...existing,
        onboardingStep: 'TEXTS',
        updatedAt: new Date('2026-01-05T00:00:00.000Z'),
        preference: null,
      });
    prismaMock.userProfile.update.mockResolvedValue({
      ...existing,
      onboardingStep: 'TEXTS',
      updatedAt: new Date('2026-01-05T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ onboardingStep: 'TEXTS' })
      .expect(200);

    expect(res.body.onboardingStep).toBe('TEXTS');
    expect(res.body.aboutMe).toBe('unchanged');
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { onboardingStep: 'TEXTS' },
    });
  });

  it('PATCH /api/v1/me/profile returns 200 when clearing aboutMe with null', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_null',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'will clear',
      aboutPartner: 'p',
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce({ ...existing, preference: null, desiredPartnerGenders: null })
      .mockResolvedValueOnce({ ...existing, desiredPartnerGenders: null })
      .mockResolvedValueOnce({
        ...existing,
        aboutMe: null,
        updatedAt: new Date('2026-01-06T00:00:00.000Z'),
        preference: null,
        desiredPartnerGenders: null,
      });
    prismaMock.userProfile.update.mockResolvedValue({
      ...existing,
      aboutMe: null,
      updatedAt: new Date('2026-01-06T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: null })
      .expect(200);

    expect(res.body.aboutMe).toBeNull();
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { aboutMe: null },
    });
  });

  it('PATCH /api/v1/me/profile returns 400 when onboardingStep is not a valid enum', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_u',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'a',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ onboardingStep: 0 })
      .expect(400);

    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 400 when aboutPartner is not a string', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_u',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'a',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutPartner: { o: 'no' } })
      .expect(400);

    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 200 and updates current user row', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_u',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce({ ...existing, preference: null, desiredPartnerGenders: null })
      .mockResolvedValueOnce({ ...existing, desiredPartnerGenders: null })
      .mockResolvedValueOnce({
        ...existing,
        aboutMe: 'patched',
        updatedAt: new Date('2026-01-04T00:00:00.000Z'),
        preference: null,
        desiredPartnerGenders: null,
      });
    prismaMock.userProfile.update.mockResolvedValue({
      ...existing,
      aboutMe: 'patched',
      updatedAt: new Date('2026-01-04T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ aboutMe: 'patched' })
      .expect(200);

    expect(res.body.aboutMe).toBe('patched');
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { aboutMe: 'patched' },
    });
  });

  it('PATCH /api/v1/me/profile returns 400 when status is sent (not whitelisted)', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_u',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'a',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ status: 'DISABLED' })
      .expect(400);

    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/me/profile returns 400 when body includes userId', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue({
      id: 'prof_u',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: 'a',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ userId: 'evil', aboutMe: 'b' })
      .expect(400);

    expect(prismaMock.userProfile.update).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when birthDate is in the future', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ birthDate: '2099-01-01' })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when birthDate is not a valid ISO date string', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ birthDate: 'not-a-date' })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when gender is not a ProfileGender value', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ gender: 'AGENDER' })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when desiredPartnerGenders is an empty array', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ desiredPartnerGenders: [] })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when desiredPartnerGenders contains an invalid enum', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ desiredPartnerGenders: ['MALE', 'INVALID'] })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 400 when city is not a string', async () => {
    const raw = await loginAndCookie();
    prismaMock.userProfile.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ city: 12345 })
      .expect(400);

    expect(prismaMock.userProfile.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/me/profile returns 201 with identity fields', async () => {
    const raw = await loginAndCookie();
    const created = {
      id: 'prof_identity',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: new Date('1990-05-20T00:00:00.000Z'),
      gender: 'FEMALE' as const,
      desiredPartnerGenders: ['MALE'],
      city: 'Haifa',
      country: 'IL',
      locationLabel: 'Haifa, IL',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...created, desiredPartnerGenders: ['MALE'] })
      .mockResolvedValueOnce({ ...created, preference: null, desiredPartnerGenders: ['MALE'] });
    prismaMock.userProfile.create.mockResolvedValue(created);

    const postRes = await request(app.getHttpServer())
      .post('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({
        birthDate: '1990-05-20',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
        city: 'Haifa',
        country: 'IL',
        locationLabel: 'Haifa, IL',
      })
      .expect(201);

    expect(postRes.body).toMatchObject({
      gender: 'FEMALE',
      city: 'Haifa',
      country: 'IL',
      locationLabel: 'Haifa, IL',
      desiredPartnerGenders: ['MALE'],
    });
    expect(typeof postRes.body.birthDate).toBe('string');

    expect(prismaMock.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        birthDate: expect.any(Date),
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
        city: 'Haifa',
        country: 'IL',
        locationLabel: 'Haifa, IL',
      }),
    });
  });

  it('PATCH /api/v1/me/profile clears desiredPartnerGenders with null', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_clr_dpg',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'BASIC',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: null,
      desiredPartnerGenders: ['FEMALE'],
      city: null,
      country: null,
      locationLabel: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce({ ...existing, preference: null })
      .mockResolvedValueOnce({
        ...existing,
        desiredPartnerGenders: null,
        updatedAt: new Date('2026-01-07T00:00:00.000Z'),
        preference: null,
      });
    prismaMock.userProfile.update.mockResolvedValue({
      ...existing,
      desiredPartnerGenders: null,
      updatedAt: new Date('2026-01-07T00:00:00.000Z'),
    });

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ desiredPartnerGenders: null })
      .expect(200);

    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { desiredPartnerGenders: Prisma.DbNull },
    });
  });

  it('GET /api/v1/me/profile returns enriched fields when stored on row', async () => {
    const raw = await loginAndCookie();
    const row = {
      id: 'prof_enriched_get',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
      onboardingStep: 'TEXTS',
      aboutMe: 'About',
      aboutPartner: null,
      aboutRelationship: 'LT',
      birthDate: new Date('1988-03-10T00:00:00.000Z'),
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE', 'NON_BINARY'],
      city: 'Beer Sheva',
      country: 'IL',
      locationLabel: 'Beer Sheva, IL',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique.mockResolvedValue({ ...row, preference: null });

    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'prof_enriched_get',
      onboardingStep: 'TEXTS',
      aboutMe: 'About',
      aboutRelationship: 'LT',
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE', 'NON_BINARY'],
      city: 'Beer Sheva',
      country: 'IL',
      locationLabel: 'Beer Sheva, IL',
    });
    expect(typeof res.body.birthDate).toBe('string');
  });

  it('PATCH /api/v1/me/profile persists enriched fields', async () => {
    const raw = await loginAndCookie();
    const existing = {
      id: 'prof_patch_enr',
      userId: USER_ID,
      status: UserProfileStatus.DRAFT,
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
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const updated = {
      ...existing,
      birthDate: new Date('1992-11-05T00:00:00.000Z'),
      gender: 'NON_BINARY',
      desiredPartnerGenders: ['MALE'],
      city: 'Jerusalem',
      country: 'IL',
      locationLabel: 'Jerusalem, IL',
      aboutMe: 'Patched bio',
      updatedAt: new Date('2026-01-08T00:00:00.000Z'),
    };
    prismaMock.userProfile.findUnique
      .mockResolvedValueOnce({ ...existing, preference: null })
      .mockResolvedValueOnce({ ...updated, preference: null });
    prismaMock.userProfile.update.mockResolvedValue(updated);

    const res = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({
        birthDate: '1992-11-05',
        gender: 'NON_BINARY',
        desiredPartnerGenders: ['MALE'],
        city: 'Jerusalem',
        country: 'IL',
        locationLabel: 'Jerusalem, IL',
        aboutMe: 'Patched bio',
      })
      .expect(200);

    expect(res.body.gender).toBe('NON_BINARY');
    expect(res.body.city).toBe('Jerusalem');
    expect(res.body.desiredPartnerGenders).toEqual(['MALE']);
    expect(prismaMock.userProfile.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: expect.objectContaining({
        birthDate: expect.any(Date),
        gender: 'NON_BINARY',
        desiredPartnerGenders: ['MALE'],
        city: 'Jerusalem',
        country: 'IL',
        locationLabel: 'Jerusalem, IL',
        aboutMe: 'Patched bio',
      }),
    });
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

  describe('observability: request id + structured logs', () => {
    it('echoes x-request-id on unauthenticated GET /api/v1/me/profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/me/profile')
        .set('x-request-id', 'client-req-id-me-1')
        .expect(401);
      expect(res.headers['x-request-id']).toBe('client-req-id-me-1');
    });

    it('emits structured JSON with AUTH_GUARD_UNAUTHORIZED on 401', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await request(app.getHttpServer()).get('/api/v1/me/profile').expect(401);
        const hit = parseStructuredJsonLogs(spy).find(
          (o) =>
            typeof o === 'object' &&
            o !== null &&
            (o as { errorCode?: string }).errorCode === 'AUTH_GUARD_UNAUTHORIZED',
        );
        expect(hit).toBeDefined();
        expect((hit as { level: string }).level).toBe('error');
        expect((hit as { service: string }).service).toBe('dating-api');
      } finally {
        spy.mockRestore();
      }
    });

    it('emits ME_PROFILE_GET_NOT_FOUND trace on GET profile 404', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const raw = await loginAndCookie();
        prismaMock.userProfile.findUnique.mockResolvedValue(null);
        await request(app.getHttpServer())
          .get('/api/v1/me/profile')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .expect(404);
        const hit = parseStructuredJsonLogs(spy).find(
          (o) =>
            (o as { errorCode?: string }).errorCode === 'ME_PROFILE_GET_NOT_FOUND',
        );
        expect(hit).toBeDefined();
        expect((hit as { level: string }).level).toBe('trace');
      } finally {
        spy.mockRestore();
      }
    });

    it('emits ME_PROFILE_VALIDATION_FAILED on invalid POST body', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const raw = await loginAndCookie();
        prismaMock.userProfile.findUnique.mockResolvedValue(null);
        await request(app.getHttpServer())
          .post('/api/v1/me/profile')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ onboardingStep: 'INVALID' })
          .expect(400);
        const hit = parseStructuredJsonLogs(spy).find(
          (o) =>
            (o as { errorCode?: string }).errorCode === 'ME_PROFILE_VALIDATION_FAILED',
        );
        expect(hit).toBeDefined();
        expect((hit as { level: string }).level).toBe('error');
      } finally {
        spy.mockRestore();
      }
    });

    it('emits ME_PROFILE_CREATE_CONFLICT on POST 409', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      try {
        const raw = await loginAndCookie();
        prismaMock.userProfile.findUnique.mockResolvedValue({
          id: 'prof_exists',
          userId: USER_ID,
          status: UserProfileStatus.DRAFT,
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
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        });
        // gender must be present so the gender guard passes and the conflict check runs
        await request(app.getHttpServer())
          .post('/api/v1/me/profile')
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ gender: 'FEMALE', aboutMe: 'y' })
          .expect(409);
        const hit = parseStructuredJsonLogs(spy).find(
          (o) =>
            (o as { errorCode?: string }).errorCode === 'ME_PROFILE_CREATE_CONFLICT',
        );
        expect(hit).toBeDefined();
        expect((hit as { level: string }).level).toBe('error');
      } finally {
        spy.mockRestore();
      }
    });
  });
});
