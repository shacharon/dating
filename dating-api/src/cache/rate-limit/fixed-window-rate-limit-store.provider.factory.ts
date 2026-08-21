import { Inject, Injectable, OnModuleInit, Type } from '@nestjs/common';
import {
  REDIS_CLIENT,
  type RedisClientHandle,
} from '../cache.ports';
import { SimpleLogger } from '../../logger/simple-logger.service';
import { MemoryFixedWindowRateLimitStore } from './memory-fixed-window-rate-limit.store';
import { RedisFixedWindowRateLimitStore } from './redis-fixed-window-rate-limit.store';
import type {
  FixedWindowRateLimitConfig,
  FixedWindowRateLimitStore,
  RateLimitExceededFactory,
} from './fixed-window-rate-limit.types';

export type FixedWindowRateLimitStoreProviderOptions = {
  config: FixedWindowRateLimitConfig;
  createExceeded: RateLimitExceededFactory;
  isExceededError: (e: unknown) => boolean;
  redisDegradedEvent: string;
  redisConnectFailedEvent: string;
  providerName: string;
};

/**
 * Nest provider that binds Memory vs Redis fixed-window store after REDIS_CLIENT init.
 * Does not own Redis connect/quit.
 */
export function createFixedWindowRateLimitStoreProvider(
  options: FixedWindowRateLimitStoreProviderOptions,
): Type<FixedWindowRateLimitStore & { isUsingRedisStore(): boolean }> {
  @Injectable()
  class FixedWindowRateLimitStoreProvider
    implements OnModuleInit, FixedWindowRateLimitStore
  {
    private inner: FixedWindowRateLimitStore =
      new MemoryFixedWindowRateLimitStore(
        options.config,
        options.createExceeded,
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
          options.config,
          options.createExceeded,
          ({ userId, err }) => {
            this.logger.warn(
              JSON.stringify({
                event: options.redisDegradedEvent,
                userId,
                message: err instanceof Error ? err.message : String(err),
              }),
              options.providerName,
            );
          },
          options.isExceededError,
        );
        this.usingRedis = true;
        return;
      }
      this.inner = new MemoryFixedWindowRateLimitStore(
        options.config,
        options.createExceeded,
      );
      this.usingRedis = false;
      if (this.redis.isUrlConfigured()) {
        this.logger.warn(
          JSON.stringify({
            event: options.redisConnectFailedEvent,
            message: 'shared REDIS_CLIENT unavailable — using memory store',
          }),
          options.providerName,
        );
      }
    }

    isUsingRedisStore(): boolean {
      return this.usingRedis;
    }

    consume(userId: string): void | Promise<void> {
      return this.inner.consume(userId);
    }

    resetForTests(): void | Promise<void> {
      return this.inner.resetForTests();
    }
  }

  Object.defineProperty(FixedWindowRateLimitStoreProvider, 'name', {
    value: options.providerName,
  });

  return FixedWindowRateLimitStoreProvider;
}
