/**
 * Stable application error codes for logs and client payloads where applicable.
 * Do not rename values — CloudWatch queries and dashboards depend on them.
 */
export const ErrorCodes = {
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

  /** Generic HTTP layer */
  HTTP_EXCEPTION: 'HTTP_EXCEPTION',
  HTTP_UNHANDLED: 'HTTP_UNHANDLED',
  /** Process-level (no HTTP request) */
  PROCESS_UNCAUGHT_EXCEPTION: 'PROCESS_UNCAUGHT_EXCEPTION',
  PROCESS_UNHANDLED_REJECTION: 'PROCESS_UNHANDLED_REJECTION',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
