import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { MessageRateLimitExceededError } from './conversation-message-rate-limit.error';
import { MessageRateLimitStoreProvider } from './conversation-message-rate-limit-store.provider';

export { MessageRateLimitExceededError } from './conversation-message-rate-limit.error';

@Injectable()
export class ConversationMessageRateLimitService {
  constructor(
    private readonly store: MessageRateLimitStoreProvider,
    private readonly obs: StructuredObservabilityService,
  ) {}

  isUsingRedisStore(): boolean {
    return this.store.isUsingRedisStore();
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
}
