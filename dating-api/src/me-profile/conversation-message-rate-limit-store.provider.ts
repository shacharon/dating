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
  MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
  MESSAGE_RATE_LIMIT_WINDOW_MS,
  httpMessageRateLimitRedisKey,
} from './conversation-message.constants';
import { MessageRateLimitExceededError } from './conversation-message-rate-limit.error';
import type { MessageRateLimitStore } from './conversation-message-rate-limit-store.interface';

/**
 * Binds Memory vs Redis message rate-limit store after shared REDIS_CLIENT init.
 * Does not own Redis connect/quit.
 */
@Injectable()
export class MessageRateLimitStoreProvider
  implements OnModuleInit, MessageRateLimitStore
{
  private inner: FixedWindowRateLimitStore = new MemoryFixedWindowRateLimitStore(
    {
      maxPerWindow: MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
      windowMs: MESSAGE_RATE_LIMIT_WINDOW_MS,
    },
    () => new MessageRateLimitExceededError(),
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
          maxPerWindow: MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
          windowMs: MESSAGE_RATE_LIMIT_WINDOW_MS,
          redisKeyForUser: httpMessageRateLimitRedisKey,
          redisKeyScanPattern: 'http:msg:ratelimit:*',
        },
        () => new MessageRateLimitExceededError(),
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
        (e) => e instanceof MessageRateLimitExceededError,
      );
      this.usingRedis = true;
      return;
    }
    this.inner = new MemoryFixedWindowRateLimitStore(
      {
        maxPerWindow: MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
        windowMs: MESSAGE_RATE_LIMIT_WINDOW_MS,
      },
      () => new MessageRateLimitExceededError(),
    );
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
    return this.inner.consume(sessionUserId);
  }

  resetForTests(): void | Promise<void> {
    return this.inner.resetForTests();
  }
}
