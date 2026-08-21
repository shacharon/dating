import type { FixedWindowRateLimitStore } from '../cache/rate-limit';

export interface WsRateLimitStore {
  consumeInboundSlot(sessionUserId: string): void | Promise<void>;
  resetForTests(): void | Promise<void>;
}

export function asWsRateLimitStore(
  store: FixedWindowRateLimitStore,
): WsRateLimitStore {
  return {
    consumeInboundSlot: (userId) => store.consume(userId),
    resetForTests: () => store.resetForTests(),
  };
}
