const DEFAULT_SESSION_COOKIE = 'dating_session';

export function getSessionCookieName(): string {
  return (
    process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME?.trim() ||
    DEFAULT_SESSION_COOKIE
  );
}

/**
 * Client-only presence check for the session cookie name in `document.cookie`.
 *
 * The real session token is HttpOnly — JS cannot read its value. This only
 * detects that a cookie with the expected name is present (UX failsafe for
 * landing/shell). Auth source of truth remains `GET /api/v1/auth/me` / `useAuth`.
 * Cookie host must match the UI hostname (`localhost` ≠ `127.0.0.1`).
 */
export function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const name = getSessionCookieName();
  return document.cookie.split(';').some((part) => {
    const trimmed = part.trim();
    return trimmed.startsWith(`${name}=`) && trimmed.length > name.length + 1;
  });
}
