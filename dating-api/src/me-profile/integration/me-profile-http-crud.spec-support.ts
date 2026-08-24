/** Test support only — excluded from Nest dist via tsconfig.build. */

import type { MeProfileHttpHarness } from './me-profile-http.shared-harness';
import {
  createMeProfileHttpHarness,
  ME_PROFILE_HTTP_PEPPER,
  ME_PROFILE_HTTP_SESSION_COOKIE,
  ME_PROFILE_HTTP_USER_ID,
} from './me-profile-http.shared-harness';

export type CrudHttpIntegrationContext = {
  h: MeProfileHttpHarness;
  app: MeProfileHttpHarness['app'];
  prismaMock: MeProfileHttpHarness['prismaMock'];
  photoStorageMock: MeProfileHttpHarness['photoStorageMock'];
  moderationClientMock: MeProfileHttpHarness['moderationClientMock'];
  contentViolationsMock: MeProfileHttpHarness['contentViolationsMock'];
  matchNarrativeGeneratorStub: MeProfileHttpHarness['matchNarrativeGeneratorStub'];
  usersServiceMock: MeProfileHttpHarness['usersServiceMock'];
  verifyIdToken: MeProfileHttpHarness['verifyIdToken'];
  loginAndCookie: () => Promise<string>;
};

export async function createCrudHttpIntegrationSuite(): Promise<CrudHttpIntegrationContext> {
  const h = await createMeProfileHttpHarness();
  return {
    h,
    app: h.app,
    prismaMock: h.prismaMock,
    photoStorageMock: h.photoStorageMock,
    moderationClientMock: h.moderationClientMock,
    contentViolationsMock: h.contentViolationsMock,
    matchNarrativeGeneratorStub: h.matchNarrativeGeneratorStub,
    usersServiceMock: h.usersServiceMock,
    verifyIdToken: h.verifyIdToken,
    loginAndCookie: h.loginAndCookie,
  };
}

export const ME_PROFILE_HTTP_CRUD_BASELINE_TEST_COUNT = 60;

export const ME_PROFILE_HTTP_CRUD_SPLIT_TEST_COUNTS: Record<string, number> = {
  'me-profile-http-crud-profile.integration.spec.ts': 22,
  'me-profile-http-crud-preferences.integration.spec.ts': 19,
  'me-profile-http-crud-analysis.integration.spec.ts': 14,
  'me-profile-http-crud-observability.integration.spec.ts': 5,
};

export const ME_PROFILE_HTTP_CONVERSATIONS_BASELINE_TEST_COUNT = 53;

export const ME_PROFILE_HTTP_CONVERSATIONS_SPLIT_TEST_COUNTS: Record<string, number> = {
  'me-profile-http-conversations-list.integration.spec.ts': 10,
  'me-profile-http-conversations-detail.integration.spec.ts': 11,
  'me-profile-http-conversations-messages.integration.spec.ts': 25,
  'me-profile-http-conversations-read.integration.spec.ts': 7,
};
