import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
  MESSAGE_RATE_LIMIT_WINDOW_MS,
} from './conversation-message.constants';

@Injectable()
export class ConversationMessageRateLimitService {
  private readonly buckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  assertCanSend(sessionUserId: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(sessionUserId);

    if (!bucket || bucket.resetAt <= now) {
      return;
    }

    if (bucket.count >= MESSAGE_RATE_LIMIT_MAX_PER_WINDOW) {
      throw new HttpException(
        { message: 'Too many messages. Please wait.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordSend(sessionUserId: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(sessionUserId);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(sessionUserId, {
        count: 1,
        resetAt: now + MESSAGE_RATE_LIMIT_WINDOW_MS,
      });
      return;
    }

    bucket.count += 1;
  }

  /** Test-only: clear all buckets. */
  resetForTests(): void {
    this.buckets.clear();
  }
}
