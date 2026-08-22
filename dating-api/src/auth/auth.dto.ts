import type { User, UserStatus } from '@prisma/client';

/** Safe user payload for authenticated HTTP responses (no tokens, no pepper). */
export interface AuthMeResponseDto {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
}

/** POST /api/v1/auth/google request body (no user id from client). */
export interface GoogleIdTokenLoginDto {
  idToken: string;
  /** Optional referrer user id captured from landing `?ref=` (validated server-side). */
  referredByUserId?: string;
}

/** POST /api/v1/auth/logout success body. */
export type AuthLogoutResponseDto = { ok: true };

/** POST /api/v1/auth/google success body (mobile + web dual-mode). */
export interface AuthTokenLoginResponseDto {
  user: AuthMeResponseDto;
  accessToken: string;
  refreshToken: string;
}

/** POST /api/v1/auth/refresh success body. */
export interface AuthRefreshResponseDto {
  accessToken: string;
  refreshToken: string;
}

/** POST /api/v1/auth/refresh request body. */
export interface RefreshTokenBodyDto {
  refreshToken: string;
}

/** POST /api/v1/auth/logout optional body (mobile refresh revocation). */
export interface AuthLogoutBodyDto {
  refreshToken?: string;
}

export function toAuthMeResponseDto(user: User): AuthMeResponseDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    status: user.status,
    emailNotificationsEnabled: user.emailNotificationsEnabled ?? true,
    inAppNotificationsEnabled: user.inAppNotificationsEnabled ?? true,
  };
}
