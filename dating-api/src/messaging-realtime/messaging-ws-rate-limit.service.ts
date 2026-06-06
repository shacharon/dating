import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { SimpleLogger } from '../logger/simple-logger.service';
import { MemoryWsRateLimitStore } from './messaging-ws-rate-limit-memory.store';
import {
  RedisWsRateLimitStore,
  type WsRateLimitRedisDegradedHandler,
} from './messaging-ws-rate-limit-redis.store';
import type { WsRateLimitStore } from './messaging-ws-rate-limit-store.interface';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';

export { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';

@Injectable()
export class MessagingWsRateLimitService
  implements OnModuleInit, OnModuleDestroy
{
  private store: WsRateLimitStore = new MemoryWsRateLimitStore();
  private redisClient: RedisClientType | null = null;
  private usingRedisStore = false;

  constructor(private readonly logger: SimpleLogger) {}

  isUsingRedisStore(): boolean {
    return this.usingRedisStore;
  }

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.store = new MemoryWsRateLimitStore();
      this.usingRedisStore = false;
      return;
    }

    const client = createClient({ url });
    try {
      await client.connect();
      this.redisClient = client;
      this.store = new RedisWsRateLimitStore(
        client,
        this.buildDegradedHandler(),
      );
      this.usingRedisStore = true;
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'ws_rate_limit_redis_connect_failed',
          message: err instanceof Error ? err.message : String(err),
        }),
        MessagingWsRateLimitService.name,
      );
      await client.quit().catch(() => undefined);
      this.store = new MemoryWsRateLimitStore();
      this.usingRedisStore = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit().catch(() => undefined);
      this.redisClient = null;
    }
    this.usingRedisStore = false;
    this.store = new MemoryWsRateLimitStore();
  }

  async consumeInboundSlot(sessionUserId: string): Promise<void> {
    await this.store.consumeInboundSlot(sessionUserId);
  }

  /** Test-only: clear all buckets / Redis keys for rate limit state. */
  async resetForTests(): Promise<void> {
    await this.store.resetForTests();
  }

  private buildDegradedHandler(): WsRateLimitRedisDegradedHandler {
    return ({ userId, err }) => {
      this.logger.warn(
        JSON.stringify({
          event: 'ws_rate_limit_redis_degraded',
          userId,
          message: err instanceof Error ? err.message : String(err),
        }),
        MessagingWsRateLimitService.name,
      );
    };
  }
}
