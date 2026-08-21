import { Injectable } from '@nestjs/common';
import { createFixedWindowRateLimitStoreProvider } from '../cache/rate-limit';
import {
  WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  WS_INBOUND_RATE_LIMIT_WINDOW_MS,
  wsRateLimitRedisKey,
} from './messaging-ws-inbound.constants';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';
import type { WsRateLimitStore } from './messaging-ws-rate-limit-store.interface';

const WsRateLimitStoreProviderBase = createFixedWindowRateLimitStoreProvider({
  config: {
    maxPerWindow: WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
    windowMs: WS_INBOUND_RATE_LIMIT_WINDOW_MS,
    redisKeyForUser: wsRateLimitRedisKey,
    redisKeyScanPattern: 'ws:ratelimit:*',
  },
  createExceeded: () => new WsRateLimitExceededError(),
  isExceededError: (e) => e instanceof WsRateLimitExceededError,
  redisDegradedEvent: 'ws_rate_limit_redis_degraded',
  redisConnectFailedEvent: 'ws_rate_limit_redis_connect_failed',
  providerName: 'WsRateLimitStoreProvider',
});

/**
 * Thin WS binder — key prefix + limits only; shared fixed-window under cache/rate-limit.
 */
@Injectable()
export class WsRateLimitStoreProvider
  extends WsRateLimitStoreProviderBase
  implements WsRateLimitStore
{
  consumeInboundSlot(sessionUserId: string): void | Promise<void> {
    return this.consume(sessionUserId);
  }
}
