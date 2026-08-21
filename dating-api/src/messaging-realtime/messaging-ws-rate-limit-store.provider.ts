import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  REDIS_CLIENT,
  type RedisClientHandle,
} from '../cache/cache.ports';
import { SimpleLogger } from '../logger/simple-logger.service';
import { MemoryWsRateLimitStore } from './messaging-ws-rate-limit-memory.store';
import { RedisWsRateLimitStore } from './messaging-ws-rate-limit-redis.store';
import type { WsRateLimitStore } from './messaging-ws-rate-limit-store.interface';

/**
 * Binds Memory vs Redis WS inbound rate-limit store after shared REDIS_CLIENT init.
 * Does not own Redis connect/quit.
 */
@Injectable()
export class WsRateLimitStoreProvider
  implements OnModuleInit, WsRateLimitStore
{
  private inner: WsRateLimitStore = new MemoryWsRateLimitStore();
  private usingRedis = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientHandle,
    private readonly logger: SimpleLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    const client = this.redis.getClient();
    if (client && this.redis.isAvailable()) {
      this.inner = new RedisWsRateLimitStore(client, ({ userId, err }) => {
        this.logger.warn(
          JSON.stringify({
            event: 'ws_rate_limit_redis_degraded',
            userId,
            message: err instanceof Error ? err.message : String(err),
          }),
          WsRateLimitStoreProvider.name,
        );
      });
      this.usingRedis = true;
      return;
    }
    this.inner = new MemoryWsRateLimitStore();
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
    return this.inner.consumeInboundSlot(sessionUserId);
  }

  resetForTests(): void | Promise<void> {
    return this.inner.resetForTests();
  }
}
