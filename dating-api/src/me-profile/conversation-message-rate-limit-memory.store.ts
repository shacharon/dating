import {
  MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
  MESSAGE_RATE_LIMIT_WINDOW_MS,
} from './conversation-message.constants';
import { MessageRateLimitExceededError } from './conversation-message-rate-limit.error';
import type { MessageRateLimitStore } from './conversation-message-rate-limit-store.interface';

export class MemoryMessageRateLimitStore implements MessageRateLimitStore {
  private readonly buckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  consumeSendSlot(sessionUserId: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(sessionUserId);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(sessionUserId, {
        count: 1,
        resetAt: now + MESSAGE_RATE_LIMIT_WINDOW_MS,
      });
      return;
    }

    if (bucket.count >= MESSAGE_RATE_LIMIT_MAX_PER_WINDOW) {
      throw new MessageRateLimitExceededError();
    }

    bucket.count += 1;
  }

  resetForTests(): void {
    this.buckets.clear();
  }
}
