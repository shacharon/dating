import type { RedisClientType } from 'redis';
import {
  FIXED_WINDOW_RATE_LIMIT_CONSUME_LUA,
  RedisFixedWindowRateLimitStore,
  type FixedWindowRateLimitStore,
  type RateLimitRedisDegradedHandler,
} from '../cache/rate-limit';
import {
  WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  WS_INBOUND_RATE_LIMIT_WINDOW_MS,
  wsRateLimitRedisKey,
} from './messaging-ws-inbound.constants';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';
import type { WsRateLimitStore } from './messaging-ws-rate-limit-store.interface';

/** @deprecated Use FIXED_WINDOW_RATE_LIMIT_CONSUME_LUA — kept for existing specs. */
export const WS_RATE_LIMIT_CONSUME_LUA = FIXED_WINDOW_RATE_LIMIT_CONSUME_LUA;

export type WsRateLimitRedisDegradedHandler = RateLimitRedisDegradedHandler;

export class RedisWsRateLimitStore implements WsRateLimitStore {
  private readonly inner: FixedWindowRateLimitStore;

  constructor(
    client: RedisClientType,
    onDegraded: WsRateLimitRedisDegradedHandler,
  ) {
    this.inner = new RedisFixedWindowRateLimitStore(
      client,
      {
        maxPerWindow: WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
        windowMs: WS_INBOUND_RATE_LIMIT_WINDOW_MS,
        redisKeyForUser: wsRateLimitRedisKey,
        redisKeyScanPattern: 'ws:ratelimit:*',
      },
      () => new WsRateLimitExceededError(),
      onDegraded,
      (e) => e instanceof WsRateLimitExceededError,
    );
  }

  consumeInboundSlot(sessionUserId: string): void | Promise<void> {
    return this.inner.consume(sessionUserId);
  }

  resetForTests(): void | Promise<void> {
    return this.inner.resetForTests();
  }
}
