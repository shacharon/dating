import type { User, UserStatus } from '@prisma/client';

/** Safe user payload for authenticated HTTP responses (no tokens, no pepper). */
export interface AuthMeResponseDto {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
}

/** POST /api/v1/auth/google request body (no user id from client). */
export interface GoogleIdTokenLoginDto {
  idToken: string;
}

/** POST /api/v1/auth/logout success body. */
export type AuthLogoutResponseDto = { ok: true };

export function toAuthMeResponseDto(user: User): AuthMeResponseDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    status: user.status,
  };
}
