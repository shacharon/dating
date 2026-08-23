export const MAX_MESSAGE_TEXT_LENGTH = 2000;
export const MESSAGE_RATE_LIMIT_MAX_PER_WINDOW = 10;
export const MESSAGE_RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Redis fixed-window key for HTTP message send RL (per user).
 * Distinct from `ws:ratelimit:` so HTTP and WS limits do not share counters.
 */
export function httpMessageRateLimitRedisKey(userId: string): string {
  return `http:msg:ratelimit:${userId}`;
}
