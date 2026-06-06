import {
  WS_RATE_LIMIT_CONSUME_LUA,
  RedisWsRateLimitStore,
} from './messaging-ws-rate-limit-redis.store';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';
import {
  WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  WS_INBOUND_RATE_LIMIT_WINDOW_MS,
  wsRateLimitRedisKey,
} from './messaging-ws-inbound.constants';

type FakeRedisEntry = { count: number; expireAtMs: number | null };

function runConsumeLua(
  data: Map<string, FakeRedisEntry>,
  key: string,
  max: number,
  windowMs: number,
): number {
  const entry = data.get(key);
  const now = Date.now();
  let c = 0;
  if (entry && (entry.expireAtMs == null || entry.expireAtMs > now)) {
    c = entry.count;
  }
  if (c >= max) {
    return 0;
  }
  c += 1;
  data.set(key, {
    count: c,
    expireAtMs: c === 1 ? now + windowMs : entry?.expireAtMs ?? now + windowMs,
  });
  return 1;
}

function createFakeRedisClient(shared: Map<string, FakeRedisEntry>) {
  return {
    eval: jest.fn(
      async (
        _script: string,
        opts: { keys: string[]; arguments: string[] },
      ) => {
        const max = parseInt(opts.arguments[0] ?? '0', 10);
        const windowMs = parseInt(opts.arguments[1] ?? '0', 10);
        return runConsumeLua(shared, opts.keys[0]!, max, windowMs);
      },
    ),
    keys: jest.fn(async (pattern: string) =>
      [...shared.keys()].filter((k) => {
        const prefix = pattern.replace('*', '');
        return k.startsWith(prefix);
      }),
    ),
    del: jest.fn(async (keys: string[]) => {
      for (const k of keys) {
        shared.delete(k);
      }
    }),
  };
}

describe('RedisWsRateLimitStore', () => {
  const onDegraded = jest.fn();

  beforeEach(() => {
    onDegraded.mockClear();
  });

  it('enforces shared counter across two store instances', async () => {
    const shared = new Map<string, FakeRedisEntry>();
    const clientA = createFakeRedisClient(shared);
    const clientB = createFakeRedisClient(shared);
    const storeA = new RedisWsRateLimitStore(
      clientA as never,
      onDegraded,
    );
    const storeB = new RedisWsRateLimitStore(
      clientB as never,
      onDegraded,
    );
    const userId = 'user_shared';

    for (let i = 0; i < WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      const store = i % 2 === 0 ? storeA : storeB;
      await store.consumeInboundSlot(userId);
    }

    await expect(storeB.consumeInboundSlot(userId)).rejects.toThrow(
      WsRateLimitExceededError,
    );
    expect(clientA.eval).toHaveBeenCalledWith(
      WS_RATE_LIMIT_CONSUME_LUA,
      expect.objectContaining({
        keys: [wsRateLimitRedisKey(userId)],
      }),
    );
  });

  it('throws when eval returns string "0" (node-redis coercion)', async () => {
    const client = {
      eval: jest.fn().mockResolvedValue('0'),
    };
    const store = new RedisWsRateLimitStore(client as never, onDegraded);

    await expect(store.consumeInboundSlot('user_a')).rejects.toThrow(
      WsRateLimitExceededError,
    );
    expect(onDegraded).not.toHaveBeenCalled();
  });

  it('fail-open when Redis eval fails', async () => {
    const client = {
      eval: jest.fn().mockRejectedValue(new Error('Redis down')),
    };
    const store = new RedisWsRateLimitStore(client as never, onDegraded);

    await expect(store.consumeInboundSlot('user_a')).resolves.toBeUndefined();
    expect(onDegraded).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_a' }),
    );
  });
});
