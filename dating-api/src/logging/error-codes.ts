/**
 * Stable application error codes for logs and client payloads where applicable.
 * Do not rename values — CloudWatch queries and dashboards depend on them.
 */
export const ErrorCodes = {
  /** Google OIDC id-token login attempt started */
  AUTH_LOGIN_START: 'AUTH_LOGIN_START',
  /** Google OIDC id-token login completed and session cookie set */
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  /** Google OIDC id-token login did not complete (validation, Google, user rules, etc.) */
  AUTH_LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
  /** Session cookie cleared and server-side revoke attempted */
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  /** {@link AuthGuard}: no valid session or user missing */
  AUTH_GUARD_UNAUTHORIZED: 'AUTH_GUARD_UNAUTHORIZED',

  /** Me profile: session missing or invalid on /api/v1/me/* */
  ME_PROFILE_UNAUTHORIZED: 'ME_PROFILE_UNAUTHORIZED',
  /** Me profile: GET when no row exists */
  ME_PROFILE_GET_NOT_FOUND: 'ME_PROFILE_GET_NOT_FOUND',
  /** Me profile: POST completed and row created */
  ME_PROFILE_CREATE_SUCCESS: 'ME_PROFILE_CREATE_SUCCESS',
  /** Me profile: POST when row already exists */
  ME_PROFILE_CREATE_CONFLICT: 'ME_PROFILE_CREATE_CONFLICT',
  /** Me profile: PATCH persisted */
  ME_PROFILE_PATCH_SUCCESS: 'ME_PROFILE_PATCH_SUCCESS',
  /** Me profile: body failed ValidationPipe */
  ME_PROFILE_VALIDATION_FAILED: 'ME_PROFILE_VALIDATION_FAILED',
  /** Me profile: unexpected persistence/runtime failure on create/patch */
  ME_PROFILE_SAVE_FAILED: 'ME_PROFILE_SAVE_FAILED',
  /** Me profile: POST /submit completed — status set to SUBMITTED */
  ME_PROFILE_SUBMIT_SUCCESS: 'ME_PROFILE_SUBMIT_SUCCESS',
  /** Me profile: POST /submit rejected because profile is in a non-submittable state */
  ME_PROFILE_SUBMIT_INVALID_STATE: 'ME_PROFILE_SUBMIT_INVALID_STATE',
  /** Me profile: POST /submit unexpected persistence failure */
  ME_PROFILE_SUBMIT_FAILED: 'ME_PROFILE_SUBMIT_FAILED',
  /** Me profile: analysis skipped — profile not found or not in SUBMITTED state */
  ME_PROFILE_ANALYSIS_SKIPPED: 'ME_PROFILE_ANALYSIS_SKIPPED',
  /** Me profile: status set to ANALYZING — LLM pipeline about to start */
  ME_PROFILE_ANALYSIS_START: 'ME_PROFILE_ANALYSIS_START',
  /** Me profile: analysis completed — status set to ANALYZED */
  ME_PROFILE_ANALYSIS_SUCCESS: 'ME_PROFILE_ANALYSIS_SUCCESS',
  /** Me profile: analysis failed — status set to FAILED */
  ME_PROFILE_ANALYSIS_FAILED: 'ME_PROFILE_ANALYSIS_FAILED',
  /** Me profile: GET latest UserProfileEvaluation succeeded (may be empty payload) */
  ME_PROFILE_ANALYSIS_LATEST_OK: 'ME_PROFILE_ANALYSIS_LATEST_OK',

  /** Me profile: GET /profile/matches — gender-filtered candidates returned */
  ME_PROFILE_MATCHES_OK: 'ME_PROFILE_MATCHES_OK',
  /** Me profile: GET /profile/matches — no UserProfile row for the authenticated viewer */
  ME_PROFILE_MATCHES_NO_PROFILE: 'ME_PROFILE_MATCHES_NO_PROFILE',

  /** Me matches: GET /me/matches — matches list returned (ready state) */
  ME_MATCHES_LIST_OK: 'ME_MATCHES_LIST_OK',
  /** Me matches: GET /me/matches — viewer profile not ready for matching (not found or not ANALYZED) */
  ME_MATCHES_LIST_NOT_READY: 'ME_MATCHES_LIST_NOT_READY',
  /** Me matches: GET /me/matches/:id — match detail returned */
  ME_MATCHES_DETAIL_OK: 'ME_MATCHES_DETAIL_OK',
  /** Me matches: HG preference sourced from UserProfile legacy columns (UserProfilePreference row absent or hollow) */
  ME_MATCHES_HG_PREF_FALLBACK: 'ME_MATCHES_HG_PREF_FALLBACK',
  /**
   * Me matches: reciprocal partner-gender filter read `UserProfile.desiredPartnerGenders` JSON because
   * no `UserProfilePreference` row exists for that profile (`/api/v1/me/matches` only).
   */
  ME_MATCHES_PARTNER_GENDER_LEGACY_JSON: 'ME_MATCHES_PARTNER_GENDER_LEGACY_JSON',

  /** Generic HTTP layer */
  HTTP_EXCEPTION: 'HTTP_EXCEPTION',
  HTTP_UNHANDLED: 'HTTP_UNHANDLED',
  /** Process-level (no HTTP request) */
  PROCESS_UNCAUGHT_EXCEPTION: 'PROCESS_UNCAUGHT_EXCEPTION',
  PROCESS_UNHANDLED_REJECTION: 'PROCESS_UNHANDLED_REJECTION',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
