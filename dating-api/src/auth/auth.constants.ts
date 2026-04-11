/** Prisma `UserStatus.ACTIVE` DB value — compare with `user.status` without enum imports from `@prisma/client`. */
export const USER_STATUS_ACTIVE = 'ACTIVE' as const;

/** HttpOnly cookie holding the random `state` for Google OAuth CSRF protection. */
export const GOOGLE_OAUTH_STATE_COOKIE_NAME = 'dating_google_oauth_state';

/** OAuth state cookie lifetime (ms). */
export const GOOGLE_OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
