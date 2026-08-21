export type FixedWindowRateLimitConfig = {
  maxPerWindow: number;
  windowMs: number;
  /** Redis key for userId. */
  redisKeyForUser: (userId: string) => string;
  /** KEYS pattern for resetForTests (e.g. 'http:msg:ratelimit:*'). */
  redisKeyScanPattern: string;
};

export interface FixedWindowRateLimitStore {
  consume(userId: string): void | Promise<void>;
  resetForTests(): void | Promise<void>;
}

export type RateLimitExceededFactory = () => Error;

export type RateLimitRedisDegradedHandler = (ctx: {
  userId: string;
  err: unknown;
}) => void;
