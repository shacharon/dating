import {
  WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  WS_INBOUND_RATE_LIMIT_WINDOW_MS,
} from './messaging-ws-inbound.constants';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';
import type { WsRateLimitStore } from './messaging-ws-rate-limit-store.interface';

export class MemoryWsRateLimitStore implements WsRateLimitStore {
  private readonly buckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  consumeInboundSlot(sessionUserId: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(sessionUserId);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(sessionUserId, {
        count: 1,
        resetAt: now + WS_INBOUND_RATE_LIMIT_WINDOW_MS,
      });
      return;
    }

    if (bucket.count >= WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW) {
      throw new WsRateLimitExceededError();
    }

    bucket.count += 1;
  }

  resetForTests(): void {
    this.buckets.clear();
  }
}
