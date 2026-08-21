import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  REDIS_CLIENT,
  type RedisClientHandle,
} from '../cache/cache.ports';
import { SimpleLogger } from '../logger/simple-logger.service';
import { MemoryMessageRateLimitStore } from './conversation-message-rate-limit-memory.store';
import { RedisMessageRateLimitStore } from './conversation-message-rate-limit-redis.store';
import type { MessageRateLimitStore } from './conversation-message-rate-limit-store.interface';

/**
 * Binds Memory vs Redis message rate-limit store after shared REDIS_CLIENT init.
 * Does not own Redis connect/quit.
 */
@Injectable()
export class MessageRateLimitStoreProvider
  implements OnModuleInit, MessageRateLimitStore
{
  private inner: MessageRateLimitStore = new MemoryMessageRateLimitStore();
  private usingRedis = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientHandle,
    private readonly logger: SimpleLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    const client = this.redis.getClient();
    if (client && this.redis.isAvailable()) {
      this.inner = new RedisMessageRateLimitStore(
        client,
        ({ userId, err }) => {
          this.logger.warn(
            JSON.stringify({
              event: 'http_message_rate_limit_redis_degraded',
              userId,
              message: err instanceof Error ? err.message : String(err),
            }),
            MessageRateLimitStoreProvider.name,
          );
        },
      );
      this.usingRedis = true;
      return;
    }
    this.inner = new MemoryMessageRateLimitStore();
    this.usingRedis = false;
    if (this.redis.isUrlConfigured()) {
      this.logger.warn(
        JSON.stringify({
          event: 'http_message_rate_limit_redis_connect_failed',
          message: 'shared REDIS_CLIENT unavailable — using memory store',
        }),
        MessageRateLimitStoreProvider.name,
      );
    }
  }

  isUsingRedisStore(): boolean {
    return this.usingRedis;
  }

  consumeSendSlot(sessionUserId: string): void | Promise<void> {
    return this.inner.consumeSendSlot(sessionUserId);
  }

  resetForTests(): void | Promise<void> {
    return this.inner.resetForTests();
  }
}
