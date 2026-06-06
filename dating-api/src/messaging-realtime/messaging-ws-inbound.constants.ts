/** Per-user inbound socket event rate limit (subscribe / unsubscribe / future). */

function parsePositiveInt(env: string | undefined, fallback: number): number {
  const n = env != null ? parseInt(env, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW = parsePositiveInt(
  process.env.WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  30,
);
export const WS_INBOUND_RATE_LIMIT_WINDOW_MS = parsePositiveInt(
  process.env.WS_INBOUND_RATE_LIMIT_WINDOW_MS,
  60_000,
);

/** Periodic session re-validation interval on open sockets. */
export const WS_SESSION_REVALIDATE_MS = 60_000;

export function wsRateLimitRedisKey(userId: string): string {
  return `ws:ratelimit:${userId}`;
}
