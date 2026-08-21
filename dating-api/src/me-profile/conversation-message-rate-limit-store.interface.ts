import type { FixedWindowRateLimitStore } from '../cache/rate-limit';

/** HTTP message send rate-limit store (consumeSendSlot alias). */
export interface MessageRateLimitStore {
  consumeSendSlot(sessionUserId: string): void | Promise<void>;
  resetForTests(): void | Promise<void>;
}

export function asMessageRateLimitStore(
  store: FixedWindowRateLimitStore,
): MessageRateLimitStore {
  return {
    consumeSendSlot: (userId) => store.consume(userId),
    resetForTests: () => store.resetForTests(),
  };
}
