/** Test support only — excluded from Nest dist via tsconfig.build. */

export const PEPPER = 'e2e-eligibility-test-pepper';
export const SESSION_COOKIE = 'dating_session';

export const configStub = {
  googleClientId: 'google-client-id',
  sessionSecretPepper: PEPPER,
  sessionCookieName: SESSION_COOKIE,
  sessionTtlDays: 14,
  cookieDomain: undefined as string | undefined,
  cookieSecure: false,
  corsOrigin: 'http://localhost:3000',
};

export { jwtConfigStub } from '../auth/auth-test.stub';

/** Minimal evaluation JSON that passes the engine's hasNumericSelfSignals check. */
export function makeEvalJson(
  signals: Record<string, number>,
  summary = 'Thoughtful and grounded.',
) {
  return {
    self: { signals },
    partner: { signals: {} },
    relationship: { signals: {} },
    display: { summary },
  };
}

export const DEFAULT_SELF_SIGNALS = {
  ambition: 0.6,
  socialBattery: 0.5,
  emotionalDepth: 0.7,
  attachmentSecurity: 0.6,
};

export const VALID_EVAL_JSON = makeEvalJson(DEFAULT_SELF_SIGNALS);

export interface HarnessIdentity {
  readonly id: string;
  readonly googleId: string;
  readonly email: string;
  readonly displayName: string;
}

/** Deterministic identity for a given short test-local key (e.g. "g1-searcher"). */
export function makeIdentity(key: string): HarnessIdentity {
  return {
    id: `user_${key}`,
    googleId: `g-${key}`,
    email: `${key}@elig.test`,
    displayName: `User ${key}`,
  };
}

export type HarnessPhotoStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FLAGGED_FOR_REVIEW';

export type HarnessPhotoRow = {
  id: string;
  profileId: string;
  status: HarnessPhotoStatus;
  isPrimary: boolean;
  storageKey: string;
  mimeType: string;
};
