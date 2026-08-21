import {
  MemoryFixedWindowRateLimitStore,
  type FixedWindowRateLimitStore,
} from '../cache/rate-limit';
import {
  MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
  MESSAGE_RATE_LIMIT_WINDOW_MS,
} from './conversation-message.constants';
import { MessageRateLimitExceededError } from './conversation-message-rate-limit.error';
import type { MessageRateLimitStore } from './conversation-message-rate-limit-store.interface';

export class MemoryMessageRateLimitStore implements MessageRateLimitStore {
  private readonly inner: FixedWindowRateLimitStore =
    new MemoryFixedWindowRateLimitStore(
      {
        maxPerWindow: MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
        windowMs: MESSAGE_RATE_LIMIT_WINDOW_MS,
      },
      () => new MessageRateLimitExceededError(),
    );

  consumeSendSlot(sessionUserId: string): void {
    this.inner.consume(sessionUserId);
  }

  resetForTests(): void {
    this.inner.resetForTests();
  }
}
