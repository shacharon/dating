import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  REDIS_CLIENT,
  type RedisClientHandle,
} from '../cache/cache.ports';
import {
  MemoryFixedWindowRateLimitStore,
  RedisFixedWindowRateLimitStore,
  type FixedWindowRateLimitStore,
} from '../cache/rate-limit';
import { SimpleLogger } from '../logger/simple-logger.service';
import {
  WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  WS_INBOUND_RATE_LIMIT_WINDOW_MS,
  wsRateLimitRedisKey,
} from './messaging-ws-inbound.constants';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';
import type { WsRateLimitStore } from './messaging-ws-rate-limit-store.interface';

/**
 * Binds Memory vs Redis WS inbound rate-limit store after shared REDIS_CLIENT init.
 * Does not own Redis connect/quit.
 */
@Injectable()
export class WsRateLimitStoreProvider
  implements OnModuleInit, WsRateLimitStore
{
  private inner: FixedWindowRateLimitStore = new MemoryFixedWindowRateLimitStore(
    {
      maxPerWindow: WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
      windowMs: WS_INBOUND_RATE_LIMIT_WINDOW_MS,
    },
    () => new WsRateLimitExceededError(),
  );
  private usingRedis = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientHandle,
    private readonly logger: SimpleLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    const client = this.redis.getClient();
    if (client && this.redis.isAvailable()) {
      this.inner = new RedisFixedWindowRateLimitStore(
        client,
        {
          maxPerWindow: WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
          windowMs: WS_INBOUND_RATE_LIMIT_WINDOW_MS,
          redisKeyForUser: wsRateLimitRedisKey,
          redisKeyScanPattern: 'ws:ratelimit:*',
        },
        () => new WsRateLimitExceededError(),
        ({ userId, err }) => {
          this.logger.warn(
            JSON.stringify({
              event: 'ws_rate_limit_redis_degraded',
              userId,
              message: err instanceof Error ? err.message : String(err),
            }),
            WsRateLimitStoreProvider.name,
          );
        },
        (e) => e instanceof WsRateLimitExceededError,
      );
      this.usingRedis = true;
      return;
    }
    this.inner = new MemoryFixedWindowRateLimitStore(
      {
        maxPerWindow: WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
        windowMs: WS_INBOUND_RATE_LIMIT_WINDOW_MS,
      },
      () => new WsRateLimitExceededError(),
    );
    this.usingRedis = false;
    if (this.redis.isUrlConfigured()) {
      this.logger.warn(
        JSON.stringify({
          event: 'ws_rate_limit_redis_connect_failed',
          message: 'shared REDIS_CLIENT unavailable — using memory store',
        }),
        WsRateLimitStoreProvider.name,
      );
    }
  }

  isUsingRedisStore(): boolean {
    return this.usingRedis;
  }

  consumeInboundSlot(sessionUserId: string): void | Promise<void> {
    return this.inner.consume(sessionUserId);
  }

  resetForTests(): void | Promise<void> {
    return this.inner.resetForTests();
  }
}
