import type { Request } from 'express';
import { parseCookieHeader } from './auth-cookies.util';

/**
 * Exact cookie read path: `req.cookies[sessionCookieName]` (cookie-parser), else parse `Cookie` header.
 */
export function readSessionCookieRaw(
  req: Request,
  sessionCookieName: string,
): string | undefined {
  const fromParser = (req as Request & { cookies?: Record<string, string> })
    .cookies?.[sessionCookieName];
  const raw =
    fromParser ??
    parseCookieHeader(req.headers.cookie)[sessionCookieName] ??
    undefined;
  const t = raw?.trim();
  return t === '' || t == null ? undefined : t;
}
