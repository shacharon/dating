/** Sprint 49 Story 1 — Redis messaging presence key helpers. */

/** 1.5 × WS_SESSION_REVALIDATE_MS (60s) so keys outlive one missed refresh. */
export const PRESENCE_TTL_SECONDS = 90;

export function presenceUserKey(userId: string): string {
  return `ws:presence:user:${userId}`;
}

export function presenceSessionKey(sessionId: string): string {
  return `ws:presence:session:${sessionId}`;
}

export function presenceMetaKey(socketId: string): string {
  return `ws:presence:meta:${socketId}`;
}

export function encodePresenceMeta(
  userId: string,
  sessionId: string,
): string {
  return `${userId}|${sessionId}`;
}

export function decodePresenceMeta(
  raw: string | null | undefined,
): { userId: string; sessionId: string } | null {
  if (!raw) return null;
  const idx = raw.indexOf('|');
  if (idx <= 0 || idx === raw.length - 1) return null;
  return {
    userId: raw.slice(0, idx),
    sessionId: raw.slice(idx + 1),
  };
}
