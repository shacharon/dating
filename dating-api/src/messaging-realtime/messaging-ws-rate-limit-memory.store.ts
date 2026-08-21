import {
  MemoryFixedWindowRateLimitStore,
  type FixedWindowRateLimitStore,
} from '../cache/rate-limit';
import {
  WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  WS_INBOUND_RATE_LIMIT_WINDOW_MS,
} from './messaging-ws-inbound.constants';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';
import type { WsRateLimitStore } from './messaging-ws-rate-limit-store.interface';

export class MemoryWsRateLimitStore implements WsRateLimitStore {
  private readonly inner: FixedWindowRateLimitStore =
    new MemoryFixedWindowRateLimitStore(
      {
        maxPerWindow: WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
        windowMs: WS_INBOUND_RATE_LIMIT_WINDOW_MS,
      },
      () => new WsRateLimitExceededError(),
    );

  consumeInboundSlot(sessionUserId: string): void {
    this.inner.consume(sessionUserId);
  }

  resetForTests(): void {
    this.inner.resetForTests();
  }
}
