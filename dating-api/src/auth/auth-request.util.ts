import type { Request } from 'express';
import { parseCookieHeader } from './auth-cookies.util';

/** Reads `Authorization: Bearer <token>` when present. */
export function readBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string') {
    return undefined;
  }
  const match = /^Bearer\s+(\S+)/i.exec(authHeader.trim());
  const token = match?.[1]?.trim();
  return token === '' || token == null ? undefined : token;
}

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
