import type { RedisClientType } from 'redis';
import {
  MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
  MESSAGE_RATE_LIMIT_WINDOW_MS,
  httpMessageRateLimitRedisKey,
} from './conversation-message.constants';
import { MessageRateLimitExceededError } from './conversation-message-rate-limit.error';
import type { MessageRateLimitStore } from './conversation-message-rate-limit-store.interface';

/** Fixed-window consume: returns 1 if allowed, 0 if limit exceeded. */
export const HTTP_MESSAGE_RATE_LIMIT_CONSUME_LUA = `
local c = tonumber(redis.call('GET', KEYS[1]) or '0')
if c >= tonumber(ARGV[1]) then
  return 0
end
c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return 1
`;

export type MessageRateLimitRedisDegradedHandler = (ctx: {
  userId: string;
  err: unknown;
}) => void;

export class RedisMessageRateLimitStore implements MessageRateLimitStore {
  constructor(
    private readonly client: RedisClientType,
    private readonly onDegraded: MessageRateLimitRedisDegradedHandler,
  ) {}

  async consumeSendSlot(sessionUserId: string): Promise<void> {
    const key = httpMessageRateLimitRedisKey(sessionUserId);
    try {
      const result = await this.client.eval(HTTP_MESSAGE_RATE_LIMIT_CONSUME_LUA, {
        keys: [key],
        arguments: [
          String(MESSAGE_RATE_LIMIT_MAX_PER_WINDOW),
          String(MESSAGE_RATE_LIMIT_WINDOW_MS),
        ],
      });
      if (Number(result) === 0) {
        throw new MessageRateLimitExceededError();
      }
    } catch (e) {
      if (e instanceof MessageRateLimitExceededError) {
        throw e;
      }
      this.onDegraded({ userId: sessionUserId, err: e });
    }
  }

  async resetForTests(): Promise<void> {
    const keys = await this.client.keys('http:msg:ratelimit:*');
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}
