/** Options shared by session set/clear so browsers drop the cookie reliably. */
export type HttpOnlyLaxSessionCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  domain?: string;
};

/**
 * HttpOnly session cookie defaults: SameSite=Lax, Path=/, optional Domain, Secure from config.
 * Max-Age is set separately from {@link sessionMaxAgeMsFromTtlDays}.
 */
export function httpOnlyLaxSessionCookieBase(args: {
  secure: boolean;
  domain?: string;
}): HttpOnlyLaxSessionCookieOptions {
  return {
    httpOnly: true,
    secure: args.secure,
    sameSite: 'lax',
    path: '/',
    ...(args.domain ? { domain: args.domain } : {}),
  };
}

/** Milliseconds for Express `res.cookie({ maxAge })` from configured session TTL days. */
export function sessionMaxAgeMsFromTtlDays(sessionTtlDays: number): number {
  const n = Number.isFinite(sessionTtlDays) ? Math.floor(sessionTtlDays) : 0;
  return Math.max(1, n) * 86_400_000;
}

/**
 * Parse `Cookie` header when `req.cookies` is unavailable (e.g. some tests).
 */
export function parseCookieHeader(
  header: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) {
    return out;
  }
  for (const segment of header.split(';')) {
    const trimmed = segment.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}
