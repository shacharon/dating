import type { RedisClientType } from 'redis';
import {
  FIXED_WINDOW_RATE_LIMIT_CONSUME_LUA,
  RedisFixedWindowRateLimitStore,
  type FixedWindowRateLimitStore,
  type RateLimitRedisDegradedHandler,
} from '../cache/rate-limit';
import {
  MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
  MESSAGE_RATE_LIMIT_WINDOW_MS,
  httpMessageRateLimitRedisKey,
} from './conversation-message.constants';
import { MessageRateLimitExceededError } from './conversation-message-rate-limit.error';
import type { MessageRateLimitStore } from './conversation-message-rate-limit-store.interface';

/** @deprecated Use FIXED_WINDOW_RATE_LIMIT_CONSUME_LUA — kept for existing specs. */
export const HTTP_MESSAGE_RATE_LIMIT_CONSUME_LUA =
  FIXED_WINDOW_RATE_LIMIT_CONSUME_LUA;

export type MessageRateLimitRedisDegradedHandler =
  RateLimitRedisDegradedHandler;

export class RedisMessageRateLimitStore implements MessageRateLimitStore {
  private readonly inner: FixedWindowRateLimitStore;

  constructor(
    client: RedisClientType,
    onDegraded: MessageRateLimitRedisDegradedHandler,
  ) {
    this.inner = new RedisFixedWindowRateLimitStore(
      client,
      {
        maxPerWindow: MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
        windowMs: MESSAGE_RATE_LIMIT_WINDOW_MS,
        redisKeyForUser: httpMessageRateLimitRedisKey,
        redisKeyScanPattern: 'http:msg:ratelimit:*',
      },
      () => new MessageRateLimitExceededError(),
      onDegraded,
      (e) => e instanceof MessageRateLimitExceededError,
    );
  }

  consumeSendSlot(sessionUserId: string): void | Promise<void> {
    return this.inner.consume(sessionUserId);
  }

  resetForTests(): void | Promise<void> {
    return this.inner.resetForTests();
  }
}
