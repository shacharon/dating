/** JSON field / query key for stable auth error codes (`403` bodies, etc.). */
export const AUTH_ERROR_QUERY_PARAM = 'auth_error' as const;

/**
 * Stable auth error codes (e.g. `403` JSON `auth_error`).
 * Frontend may branch on these without parsing free-form messages.
 */
export const AUTH_ERROR_CODES = {
  invalid_state: 'invalid_state',
  oauth_failed: 'oauth_failed',
  email_in_use: 'email_in_use',
  disabled_user: 'disabled_user',
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
