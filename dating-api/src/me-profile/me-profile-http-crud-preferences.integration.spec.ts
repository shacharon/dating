/**
 * Sub-split from me-profile-http-crud.integration.spec.ts (Sprint 69 Story 02).
 * Validation + preference-field PATCH/POST + enriched profile fields.
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

describe('me profile HTTP — crud preferences (integration)', () => {
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
});
