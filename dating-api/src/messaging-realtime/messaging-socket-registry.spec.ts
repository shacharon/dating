import type { RedisCacheService } from '../cache/redis-cache.service';
import { MessagingSocketRegistry } from './messaging-socket-registry.service';
import type { Socket } from 'socket.io';
import {
  presenceSessionKey,
  presenceUserKey,
} from './messaging-presence.keys';

function mockSocket(
  sessionId: string,
  id: string,
  userId = 'user_1',
): Socket {
  return {
    id,
    data: { userId, sessionId },
    disconnect: jest.fn(),
  } as unknown as Socket;
}

/** In-memory Redis stand-in shared by two registry "nodes". */
function createSharedMemoryRedis(): RedisCacheService {
  const sets = new Map<string, Set<string>>();
  const strings = new Map<string, string>();

  return {
    isAvailable: () => true,
    async sAdd(key: string, member: string, _ttl: number) {
      let set = sets.get(key);
      if (!set) {
        set = new Set();
        sets.set(key, set);
      }
      set.add(member);
      return true;
    },
    async sRem(key: string, member: string) {
      sets.get(key)?.delete(member);
      return true;
    },
    async sCard(key: string) {
      return sets.get(key)?.size ?? 0;
    },
    async sMembers(key: string) {
      return [...(sets.get(key) ?? [])];
    },
    async setString(key: string, value: string) {
      strings.set(key, value);
    },
    async getString(key: string) {
      return strings.get(key) ?? null;
    },
    async del(key: string) {
      sets.delete(key);
      strings.delete(key);
    },
  } as unknown as RedisCacheService;
}

describe('MessagingSocketRegistry', () => {
  const prevRedis = process.env.REDIS_URL;

  afterEach(() => {
    if (prevRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = prevRedis;
  });

  describe('local (REDIS_URL unset)', () => {
    let registry: MessagingSocketRegistry;

    beforeEach(() => {
      delete process.env.REDIS_URL;
      registry = new MessagingSocketRegistry();
      registry.resetForTests();
    });

    it('hasActiveConnection reflects registered user sockets', async () => {
      const a = mockSocket('sess_1', 'sock_a', 'user_online');
      await registry.registerAsync(a);
      expect(await registry.hasActiveConnection('user_online')).toBe(true);

      await registry.unregisterAsync(a);
      expect(await registry.hasActiveConnection('user_online')).toBe(false);
    });

    it('disconnectBySessionId disconnects all sockets for the session', async () => {
      const a = mockSocket('sess_1', 'sock_a');
      const b = mockSocket('sess_1', 'sock_b');
      const other = mockSocket('sess_2', 'sock_c');

      await registry.registerAsync(a);
      await registry.registerAsync(b);
      await registry.registerAsync(other);

      await registry.disconnectBySessionId('sess_1');

      expect(a.disconnect).toHaveBeenCalledWith(true);
      expect(b.disconnect).toHaveBeenCalledWith(true);
      expect(other.disconnect).not.toHaveBeenCalled();
      expect(registry.activeConnectionCount()).toBe(1);
    });
  });

  describe('cross-process via shared Redis mock', () => {
    it('hasActiveConnection sees peer registry via shared Redis mock', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const redis = createSharedMemoryRedis();
      const nodeA = new MessagingSocketRegistry(redis);
      const nodeB = new MessagingSocketRegistry(redis);
      const sock = mockSocket('sess_1', 'sockA', 'u1');

      await nodeA.registerAsync(sock);
      expect(await nodeB.hasActiveConnection('u1')).toBe(true);
      expect(await redis.sCard(presenceUserKey('u1'))).toBe(1);
      expect(await redis.sMembers(presenceSessionKey('sess_1'))).toEqual([
        'sockA',
      ]);

      await nodeA.unregisterAsync(sock);
      expect(await nodeB.hasActiveConnection('u1')).toBe(false);
    });

    it('disconnectBySessionId clears Redis presence for remote peer', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const redis = createSharedMemoryRedis();
      const nodeA = new MessagingSocketRegistry(redis);
      const nodeB = new MessagingSocketRegistry(redis);
      await nodeA.registerAsync(mockSocket('sess_1', 'sockA', 'u1'));

      await nodeB.disconnectBySessionId('sess_1');
      expect(await nodeA.hasActiveConnection('u1')).toBe(false);
    });

    it('disconnectByUserId clears Redis presence for remote peer', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const redis = createSharedMemoryRedis();
      const nodeA = new MessagingSocketRegistry(redis);
      const nodeB = new MessagingSocketRegistry(redis);
      await nodeA.registerAsync(mockSocket('sess_1', 'sockA', 'u1'));

      await nodeB.disconnectByUserId('u1');
      expect(await nodeA.hasActiveConnection('u1')).toBe(false);
      expect(await redis.sCard(presenceUserKey('u1'))).toBe(0);
    });

    it('refreshPresence re-writes Redis membership with TTL', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const redis = createSharedMemoryRedis();
      const sAdd = jest.spyOn(redis, 'sAdd');
      const registry = new MessagingSocketRegistry(redis);
      const sock = mockSocket('sess_1', 'sockA', 'u1');
      await registry.registerAsync(sock);
      sAdd.mockClear();
      await registry.refreshPresence(sock);
      expect(sAdd).toHaveBeenCalled();
    });

    it('fail-open: Redis unavailable returns false for hasActiveConnection', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const redis = {
        isAvailable: () => false,
        sCard: jest.fn(),
      } as unknown as RedisCacheService;
      const registry = new MessagingSocketRegistry(redis);
      await registry.registerAsync(mockSocket('s', 'id', 'u1'));
      expect(await registry.hasActiveConnection('u1')).toBe(false);
      expect(redis.sCard).not.toHaveBeenCalled();
    });
  });
});
