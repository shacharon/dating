import type { RedisClientType } from 'redis';
import { FIXED_WINDOW_RATE_LIMIT_CONSUME_LUA } from './fixed-window-rate-limit.lua';
import type {
  FixedWindowRateLimitConfig,
  FixedWindowRateLimitStore,
  RateLimitExceededFactory,
  RateLimitRedisDegradedHandler,
} from './fixed-window-rate-limit.types';

export class RedisFixedWindowRateLimitStore
  implements FixedWindowRateLimitStore
{
  constructor(
    private readonly client: RedisClientType,
    private readonly config: FixedWindowRateLimitConfig,
    private readonly createExceeded: RateLimitExceededFactory,
    private readonly onDegraded: RateLimitRedisDegradedHandler,
    private readonly isExceededError: (e: unknown) => boolean,
  ) {}

  async consume(userId: string): Promise<void> {
    const key = this.config.redisKeyForUser(userId);
    try {
      const result = await this.client.eval(FIXED_WINDOW_RATE_LIMIT_CONSUME_LUA, {
        keys: [key],
        arguments: [
          String(this.config.maxPerWindow),
          String(this.config.windowMs),
        ],
      });
      if (Number(result) === 0) {
        throw this.createExceeded();
      }
    } catch (e) {
      if (this.isExceededError(e)) {
        throw e;
      }
      this.onDegraded({ userId, err: e });
    }
  }

  async resetForTests(): Promise<void> {
    const keys = await this.client.keys(this.config.redisKeyScanPattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}
