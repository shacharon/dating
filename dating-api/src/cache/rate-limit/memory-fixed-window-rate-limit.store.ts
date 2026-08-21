import type {
  FixedWindowRateLimitConfig,
  FixedWindowRateLimitStore,
  RateLimitExceededFactory,
} from './fixed-window-rate-limit.types';

export class MemoryFixedWindowRateLimitStore
  implements FixedWindowRateLimitStore
{
  private readonly buckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly config: Pick<
      FixedWindowRateLimitConfig,
      'maxPerWindow' | 'windowMs'
    >,
    private readonly createExceeded: RateLimitExceededFactory,
  ) {}

  consume(userId: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(userId);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(userId, {
        count: 1,
        resetAt: now + this.config.windowMs,
      });
      return;
    }

    if (bucket.count >= this.config.maxPerWindow) {
      throw this.createExceeded();
    }

    bucket.count += 1;
  }

  resetForTests(): void {
    this.buckets.clear();
  }
}
