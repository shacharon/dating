const DEFAULT_SESSION_COOKIE = 'dating_session';

export function getSessionCookieName(): string {
  return (
    process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME?.trim() ||
    DEFAULT_SESSION_COOKIE
  );
}

/** True when middleware would allow `/dating/*` (HttpOnly cookie visible only as presence in document.cookie). */
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
