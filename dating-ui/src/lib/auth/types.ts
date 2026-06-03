/** Mirrors dating-api `AuthMeResponseDto` (safe fields only). */
export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
};

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  /** API unreachable after retries (not the same as logged out). */
  | "error";
