/**
 * Barrel re-exports for eligibility E2E harness (Sprint 69 Story 04).
 * Test support only — excluded from Nest dist via tsconfig.build.
 */
export {
  configStub,
  DEFAULT_SELF_SIGNALS,
  makeEvalJson,
  makeIdentity,
  PEPPER,
  SESSION_COOKIE,
  VALID_EVAL_JSON,
  type HarnessIdentity,
  type HarnessPhotoRow,
  type HarnessPhotoStatus,
} from './me-matches-eligibility.fixtures';

export { jwtConfigStub } from '../../../auth/auth-test.stub';

export { EligibilityTestHarness } from './me-matches-eligibility.harness';
