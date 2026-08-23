export const AUTH_LOGIN_RATE_LIMIT_MAX_PER_WINDOW = 10;
export const AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = 300_000;

export const AUTH_REFRESH_RATE_LIMIT_MAX_PER_WINDOW = 5;
export const AUTH_REFRESH_RATE_LIMIT_WINDOW_MS = 60_000;

export function authLoginRateLimitRedisKey(clientIp: string): string {
  return `auth:login:ratelimit:${clientIp}`;
}

export function authRefreshRateLimitRedisKey(clientIp: string): string {
  return `auth:refresh:ratelimit:${clientIp}`;
}
