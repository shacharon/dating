import { Injectable } from '@nestjs/common';
import { WsRateLimitStoreProvider } from './messaging-ws-rate-limit-store.provider';

export { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';

@Injectable()
export class MessagingWsRateLimitService {
  constructor(private readonly store: WsRateLimitStoreProvider) {}

  isUsingRedisStore(): boolean {
    return this.store.isUsingRedisStore();
  }

  async consumeInboundSlot(sessionUserId: string): Promise<void> {
    await this.store.consumeInboundSlot(sessionUserId);
  }

  /** Test-only: clear all buckets / Redis keys for rate limit state. */
  async resetForTests(): Promise<void> {
    await this.store.resetForTests();
  }
}
