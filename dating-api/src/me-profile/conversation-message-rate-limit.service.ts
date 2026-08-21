import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import { MessageRateLimitExceededError } from './conversation-message-rate-limit.error';
import { MemoryMessageRateLimitStore } from './conversation-message-rate-limit-memory.store';
import {
  RedisMessageRateLimitStore,
  type MessageRateLimitRedisDegradedHandler,
} from './conversation-message-rate-limit-redis.store';
import type { MessageRateLimitStore } from './conversation-message-rate-limit-store.interface';

export { MessageRateLimitExceededError } from './conversation-message-rate-limit.error';

@Injectable()
export class ConversationMessageRateLimitService
  implements OnModuleInit, OnModuleDestroy
{
  private store: MessageRateLimitStore = new MemoryMessageRateLimitStore();
  private redisClient: RedisClientType | null = null;
  private usingRedisStore = false;

  constructor(
    private readonly logger: SimpleLogger,
    private readonly obs: StructuredObservabilityService,
  ) {}

  isUsingRedisStore(): boolean {
    return this.usingRedisStore;
  }

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.store = new MemoryMessageRateLimitStore();
      this.usingRedisStore = false;
      return;
    }

    const client = createClient({ url });
    try {
      await client.connect();
      this.redisClient = client;
      this.store = new RedisMessageRateLimitStore(
        client,
        this.buildDegradedHandler(),
      );
      this.usingRedisStore = true;
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'http_message_rate_limit_redis_connect_failed',
          message: err instanceof Error ? err.message : String(err),
        }),
        ConversationMessageRateLimitService.name,
      );
      await client.quit().catch(() => undefined);
      this.store = new MemoryMessageRateLimitStore();
      this.usingRedisStore = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit().catch(() => undefined);
      this.redisClient = null;
    }
    this.usingRedisStore = false;
    this.store = new MemoryMessageRateLimitStore();
  }

  async consumeSendSlot(sessionUserId: string): Promise<void> {
    try {
      await this.store.consumeSendSlot(sessionUserId);
    } catch (e) {
      if (e instanceof MessageRateLimitExceededError) {
        this.obs.trace(
          `me conversations message rate limited userId=${sessionUserId}`,
          ErrorCodes.ME_CONVERSATIONS_MESSAGE_RATE_LIMITED,
        );
        throw new HttpException(
          { message: 'Too many messages. Please wait.' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw e;
    }
  }

  /** Test-only: clear all buckets / Redis keys for rate limit state. */
  async resetForTests(): Promise<void> {
    await this.store.resetForTests();
  }

  private buildDegradedHandler(): MessageRateLimitRedisDegradedHandler {
    return ({ userId, err }) => {
      this.logger.warn(
        JSON.stringify({
          event: 'http_message_rate_limit_redis_degraded',
          userId,
          message: err instanceof Error ? err.message : String(err),
        }),
        ConversationMessageRateLimitService.name,
      );
    };
  }
}
