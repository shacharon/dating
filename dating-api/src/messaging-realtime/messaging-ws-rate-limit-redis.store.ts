import type { RedisClientType } from 'redis';
import {
  WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  WS_INBOUND_RATE_LIMIT_WINDOW_MS,
  wsRateLimitRedisKey,
} from './messaging-ws-inbound.constants';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';
import type { WsRateLimitStore } from './messaging-ws-rate-limit-store.interface';

/** Fixed-window consume: returns 1 if allowed, 0 if limit exceeded. */
export const WS_RATE_LIMIT_CONSUME_LUA = `
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

export type WsRateLimitRedisDegradedHandler = (ctx: {
  userId: string;
  err: unknown;
}) => void;

export class RedisWsRateLimitStore implements WsRateLimitStore {
  constructor(
    private readonly client: RedisClientType,
    private readonly onDegraded: WsRateLimitRedisDegradedHandler,
  ) {}

  async consumeInboundSlot(sessionUserId: string): Promise<void> {
    const key = wsRateLimitRedisKey(sessionUserId);
    try {
      const result = await this.client.eval(WS_RATE_LIMIT_CONSUME_LUA, {
        keys: [key],
        arguments: [
          String(WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW),
          String(WS_INBOUND_RATE_LIMIT_WINDOW_MS),
        ],
      });
      if (Number(result) === 0) {
        throw new WsRateLimitExceededError();
      }
    } catch (e) {
      if (e instanceof WsRateLimitExceededError) {
        throw e;
      }
      this.onDegraded({ userId: sessionUserId, err: e });
    }
  }

  async resetForTests(): Promise<void> {
    const keys = await this.client.keys('ws:ratelimit:*');
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}
