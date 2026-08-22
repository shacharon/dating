/** Test support only — excluded from Nest dist via tsconfig.build (same as *.spec-support.ts elsewhere). */

import type { MeProfileHttpHarness } from './me-profile-http.shared-harness';
import {
  createMeProfileHttpHarness,
  ME_PROFILE_HTTP_PEPPER,
  ME_PROFILE_HTTP_SESSION_COOKIE,
  ME_PROFILE_HTTP_USER_ID,
} from './me-profile-http.shared-harness';

/**
 * Minimal `UserProfilePreference` joined row for /me/matches mocks.
 * Must not set partnerAgeMin/Max (HG age eval FAILs when candidate birthDate is null in fixtures).
 * Use maxDistanceKm and/or acceptedPartnerGenders so the row is non-empty (no pref fallback log).
 */
export function testUserProfilePreference(
  profileId: string,
  opts?: { acceptedPartnerGenders?: string[] },
) {
  return {
    id: `pref_${profileId}`,
    profileId,
    partnerAgeMin: null as number | null,
    partnerAgeMax: null as number | null,
    maxDistanceKm: 100,
    acceptedPartnerGenders: opts?.acceptedPartnerGenders ?? ([] as string[]),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

/** HG fact columns on `UserProfile`. Partner prefs live on `UserProfilePreference` (Phase F). */
export const HG_FIELD_DEFAULTS = {
  childrenStatus: null as string | null,
  wantsChildren: null as string | null,
  smokingFrequency: null as string | null,
  alcoholUse: null as string | null,
  education: null as string | null,
  religion: null as string | null,
};

export type MatchesHttpIntegrationContext = {
  h: MeProfileHttpHarness;
  app: MeProfileHttpHarness['app'];
  prismaMock: MeProfileHttpHarness['prismaMock'];
  narrativeCachePrisma: MeProfileHttpHarness['narrativeCachePrisma'];
  photoStorageMock: MeProfileHttpHarness['photoStorageMock'];
  moderationClientMock: MeProfileHttpHarness['moderationClientMock'];
  contentViolationsMock: MeProfileHttpHarness['contentViolationsMock'];
  matchNarrativeGeneratorStub: MeProfileHttpHarness['matchNarrativeGeneratorStub'];
  usersServiceMock: MeProfileHttpHarness['usersServiceMock'];
  verifyIdToken: MeProfileHttpHarness['verifyIdToken'];
  loginAndCookie: MeProfileHttpHarness['loginAndCookie'];
};

export async function createMatchesHttpIntegrationSuite(): Promise<MatchesHttpIntegrationContext> {
  const h = await createMeProfileHttpHarness();
  return {
    h,
    app: h.app,
    prismaMock: h.prismaMock,
    narrativeCachePrisma: h.narrativeCachePrisma,
    photoStorageMock: h.photoStorageMock,
    moderationClientMock: h.moderationClientMock,
    contentViolationsMock: h.contentViolationsMock,
    matchNarrativeGeneratorStub: h.matchNarrativeGeneratorStub,
    usersServiceMock: h.usersServiceMock,
    verifyIdToken: h.verifyIdToken,
    loginAndCookie: h.loginAndCookie,
  };
}
