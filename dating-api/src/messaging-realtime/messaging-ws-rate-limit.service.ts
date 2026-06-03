import { Injectable } from '@nestjs/common';
import {
  WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  WS_INBOUND_RATE_LIMIT_WINDOW_MS,
} from './messaging-ws-inbound.constants';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';

@Injectable()
export class MessagingWsRateLimitService {
  private readonly buckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  assertCanReceive(sessionUserId: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(sessionUserId);

    if (!bucket || bucket.resetAt <= now) {
      return;
    }

    if (bucket.count >= WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW) {
      throw new WsRateLimitExceededError();
    }
  }

  recordReceive(sessionUserId: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(sessionUserId);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(sessionUserId, {
        count: 1,
        resetAt: now + WS_INBOUND_RATE_LIMIT_WINDOW_MS,
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
