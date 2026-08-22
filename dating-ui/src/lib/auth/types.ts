/** Mirrors dating-api `AuthMeResponseDto` (safe fields only). */
export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
};

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  /** API unreachable after retries (not the same as logged out). */
  | "error";

/** POST /api/v1/auth/google success body (Story FE-01-1). */
export type AuthTokenLoginResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

/** POST /api/v1/auth/refresh success body. */
export type AuthRefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
};
