import type { Request } from 'express';

/** First hop from X-Forwarded-For when present; else socket remoteAddress; fallback 'unknown'. */
export function resolveClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  } else if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0];
  }
  return req.socket.remoteAddress ?? 'unknown';
}
