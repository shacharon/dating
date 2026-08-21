import { Injectable } from '@nestjs/common';
import { createFixedWindowRateLimitStoreProvider } from '../cache/rate-limit';
import {
  MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
  MESSAGE_RATE_LIMIT_WINDOW_MS,
  httpMessageRateLimitRedisKey,
} from './conversation-message.constants';
import { MessageRateLimitExceededError } from './conversation-message-rate-limit.error';
import type { MessageRateLimitStore } from './conversation-message-rate-limit-store.interface';

const MessageRateLimitStoreProviderBase =
  createFixedWindowRateLimitStoreProvider({
    config: {
      maxPerWindow: MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
      windowMs: MESSAGE_RATE_LIMIT_WINDOW_MS,
      redisKeyForUser: httpMessageRateLimitRedisKey,
      redisKeyScanPattern: 'http:msg:ratelimit:*',
    },
    createExceeded: () => new MessageRateLimitExceededError(),
    isExceededError: (e) => e instanceof MessageRateLimitExceededError,
    redisDegradedEvent: 'http_message_rate_limit_redis_degraded',
    redisConnectFailedEvent: 'http_message_rate_limit_redis_connect_failed',
    providerName: 'MessageRateLimitStoreProvider',
  });

/**
 * Thin HTTP binder — key prefix + limits only; shared fixed-window under cache/rate-limit.
 */
@Injectable()
export class MessageRateLimitStoreProvider
  extends MessageRateLimitStoreProviderBase
  implements MessageRateLimitStore
{
  consumeSendSlot(sessionUserId: string): void | Promise<void> {
    return this.consume(sessionUserId);
  }
}
