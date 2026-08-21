import { RedisCacheService } from './redis-cache.service';
import type { RedisClientHandle } from './cache.ports';
import * as customMetrics from '../observability/custom-metrics';

type MockRedisClient = {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  sAdd?: jest.Mock;
  sRem?: jest.Mock;
  sCard?: jest.Mock;
  sMembers?: jest.Mock;
  expire?: jest.Mock;
};

function createSvc(opts: {
  client?: MockRedisClient | null;
  available?: boolean;
  urlConfigured?: boolean;
}): RedisCacheService {
  const client = opts.client === undefined ? null : opts.client;
  const available = opts.available ?? client != null;
  const urlConfigured = opts.urlConfigured ?? false;
  const handle: RedisClientHandle = {
    getClient: () => (available && client != null ? (client as never) : null),
    isAvailable: () => Boolean(available && client != null),
    isUrlConfigured: () => urlConfigured,
  };
  return new RedisCacheService(handle);
}

function attachAvailable(client: MockRedisClient, urlConfigured = true): RedisCacheService {
  return createSvc({ client, available: true, urlConfigured });
}

describe('RedisCacheService', () => {
  const prevRedisUrl = process.env.REDIS_URL;

  afterEach(() => {
    jest.restoreAllMocks();
    if (prevRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = prevRedisUrl;
    }
  });

  describe('unavailable', () => {
    it('get returns null without op_ms; setNx fail-opens with degraded unavailable', async () => {
      const svc = createSvc({
        client: null,
        available: false,
        urlConfigured: false,
      });

      const opMs = jest.spyOn(customMetrics, 'recordCacheOpMs');
      const degraded = jest.spyOn(customMetrics, 'recordCacheDegraded');

      expect(await svc.get('match:list:u1')).toBeNull();
      expect(opMs).not.toHaveBeenCalled();
      expect(degraded).not.toHaveBeenCalled();

      expect(await svc.setNx('match:list:empty:u1', { at: 'x' }, 60)).toBe(
        true,
      );
      expect(degraded).toHaveBeenCalledWith('setNx', 'unavailable');
      expect(opMs).not.toHaveBeenCalled();
    });
  });

  describe('available', () => {
    it('get miss and hit record cache.op_ms', async () => {
      const client: MockRedisClient = {
        get: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(JSON.stringify({ v: 1 })),
        set: jest.fn(),
        del: jest.fn(),
      };
      const svc = attachAvailable(client);

      const opMs = jest.spyOn(customMetrics, 'recordCacheOpMs');
      const degraded = jest.spyOn(customMetrics, 'recordCacheDegraded');

      expect(await svc.get('match:list:u1')).toBeNull();
      expect(await svc.get('match:list:u1')).toEqual({ v: 1 });
      expect(opMs).toHaveBeenCalledWith('get', expect.any(Number));
      expect(opMs).toHaveBeenCalledTimes(2);
      expect(degraded).not.toHaveBeenCalled();
    });

    it('set / del / setNx record op_ms', async () => {
      const client: MockRedisClient = {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
      };
      const svc = attachAvailable(client);

      const opMs = jest.spyOn(customMetrics, 'recordCacheOpMs');

      await svc.set('match:list:u1', { a: 1 }, 30);
      await svc.del('match:list:u1');
      expect(await svc.setNx('match:list:empty:u1', { at: 'x' }, 60)).toBe(
        true,
      );

      expect(opMs).toHaveBeenCalledWith('set', expect.any(Number));
      expect(opMs).toHaveBeenCalledWith('del', expect.any(Number));
      expect(opMs).toHaveBeenCalledWith('setNx', expect.any(Number));
    });

    it('get error fail-opens null and records degraded error', async () => {
      const client: MockRedisClient = {
        get: jest.fn().mockRejectedValue(new Error('boom')),
        set: jest.fn(),
        del: jest.fn(),
      };
      const svc = attachAvailable(client);

      const degraded = jest.spyOn(customMetrics, 'recordCacheDegraded');
      const opMs = jest.spyOn(customMetrics, 'recordCacheOpMs');

      expect(await svc.get('match:list:u1')).toBeNull();
      expect(degraded).toHaveBeenCalledWith('get', 'error');
      expect(opMs).not.toHaveBeenCalled();
    });

    it('setNx error fail-opens true and records degraded error', async () => {
      const client: MockRedisClient = {
        get: jest.fn(),
        set: jest.fn().mockRejectedValue(new Error('boom')),
        del: jest.fn(),
      };
      const svc = attachAvailable(client);

      const degraded = jest.spyOn(customMetrics, 'recordCacheDegraded');

      expect(await svc.setNx('k', {}, 10)).toBe(true);
      expect(degraded).toHaveBeenCalledWith('setNx', 'error');
    });

    it('sAdd / sCard / sRem / setString support presence sets', async () => {
      const client: MockRedisClient = {
        get: jest.fn().mockResolvedValue('u1|s1'),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn(),
        sAdd: jest.fn().mockResolvedValue(1),
        sRem: jest.fn().mockResolvedValue(1),
        sCard: jest.fn().mockResolvedValue(2),
        sMembers: jest.fn().mockResolvedValue(['sockA']),
        expire: jest.fn().mockResolvedValue(true),
      };
      const svc = attachAvailable(client);
      const opMs = jest.spyOn(customMetrics, 'recordCacheOpMs');

      expect(await svc.sAdd('ws:presence:user:u1', 'sockA', 90)).toBe(true);
      expect(client.sAdd).toHaveBeenCalledWith('ws:presence:user:u1', 'sockA');
      expect(client.expire).toHaveBeenCalledWith('ws:presence:user:u1', 90);
      expect(await svc.sCard('ws:presence:user:u1')).toBe(2);
      expect(await svc.sMembers('ws:presence:user:u1')).toEqual(['sockA']);
      expect(await svc.sRem('ws:presence:user:u1', 'sockA')).toBe(true);
      await svc.setString('ws:presence:meta:sockA', 'u1|s1', 90);
      expect(await svc.getString('ws:presence:meta:sockA')).toBe('u1|s1');
      expect(opMs).toHaveBeenCalledWith('sAdd', expect.any(Number));
      expect(opMs).toHaveBeenCalledWith('sCard', expect.any(Number));
    });

    it('sAdd unavailable returns false without throwing', async () => {
      const svc = createSvc({
        client: null,
        available: false,
        urlConfigured: false,
      });
      const degraded = jest.spyOn(customMetrics, 'recordCacheDegraded');
      expect(await svc.sAdd('ws:presence:user:u1', 'sock', 90)).toBe(false);
      expect(degraded).toHaveBeenCalledWith('sAdd', 'unavailable');
    });
  });

  describe('tryAcquireCronLock', () => {
    it('returns acquired when REDIS_URL unset (no Redis contact)', async () => {
      const svc = createSvc({
        client: null,
        available: false,
        urlConfigured: false,
      });
      const opMs = jest.spyOn(customMetrics, 'recordCacheOpMs');
      expect(await svc.tryAcquireCronLock('cron:lock:photo-sla', 3300)).toBe(
        'acquired',
      );
      expect(opMs).not.toHaveBeenCalled();
    });

    it('returns acquired when REDIS_URL is whitespace-only', async () => {
      const svc = createSvc({
        client: null,
        available: false,
        urlConfigured: false,
      });
      expect(await svc.tryAcquireCronLock('cron:lock:photo-sla', 60)).toBe(
        'acquired',
      );
    });

    it('only one of two acquire attempts succeeds when Redis NX rejects second', async () => {
      const client: MockRedisClient = {
        get: jest.fn(),
        set: jest
          .fn()
          .mockResolvedValueOnce('OK')
          .mockResolvedValueOnce(null),
        del: jest.fn(),
      };
      const svc = attachAvailable(client);
      const opMs = jest.spyOn(customMetrics, 'recordCacheOpMs');

      expect(await svc.tryAcquireCronLock('cron:lock:photo-sla', 60)).toBe(
        'acquired',
      );
      expect(await svc.tryAcquireCronLock('cron:lock:photo-sla', 60)).toBe(
        'not_acquired',
      );
      expect(client.set).toHaveBeenCalledWith(
        'cron:lock:photo-sla',
        expect.any(String),
        { NX: true, EX: 60 },
      );
      expect(opMs).toHaveBeenCalledWith('cronLock', expect.any(Number));
      expect(opMs).toHaveBeenCalledTimes(2);
    });

    it('returns unavailable when REDIS_URL set but client down', async () => {
      const svc = createSvc({
        client: null,
        available: false,
        urlConfigured: true,
      });
      const degraded = jest.spyOn(customMetrics, 'recordCacheDegraded');
      expect(await svc.tryAcquireCronLock('cron:lock:mute-expiry', 810)).toBe(
        'unavailable',
      );
      expect(degraded).toHaveBeenCalledWith('cronLock', 'unavailable');
    });

    it('returns unavailable on SET error (fail-closed, unlike setNx)', async () => {
      const client: MockRedisClient = {
        get: jest.fn(),
        set: jest.fn().mockRejectedValue(new Error('boom')),
        del: jest.fn(),
      };
      const svc = attachAvailable(client);
      const degraded = jest.spyOn(customMetrics, 'recordCacheDegraded');

      expect(await svc.tryAcquireCronLock('cron:lock:photo-sla', 60)).toBe(
        'unavailable',
      );
      expect(degraded).toHaveBeenCalledWith('cronLock', 'error');
      expect(await svc.setNx('k', {}, 10)).toBe(true);
    });
  });
});
