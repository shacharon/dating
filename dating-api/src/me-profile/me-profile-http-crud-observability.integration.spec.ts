/**
 * Sub-split from me-profile-http-crud.integration.spec.ts (Sprint 69 Story 02).
 * Request id echo + structured JSON logs.
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
  parseStructuredJsonLogs,
} from './me-profile-http.shared-harness';

describe('me profile HTTP — crud observability (integration)', () => {
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
