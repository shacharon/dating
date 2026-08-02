import { RedisCacheService } from './redis-cache.service';
import * as customMetrics from '../observability/custom-metrics';

type MockRedisClient = {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
};

function attachClient(
  svc: RedisCacheService,
  client: MockRedisClient,
): void {
  const internal = svc as unknown as {
    client: MockRedisClient | null;
    available: boolean;
  };
  internal.client = client;
  internal.available = true;
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
      delete process.env.REDIS_URL;
      const svc = new RedisCacheService();
      await svc.onModuleInit();

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
      const svc = new RedisCacheService();
      const client: MockRedisClient = {
        get: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(JSON.stringify({ v: 1 })),
        set: jest.fn(),
        del: jest.fn(),
      };
      attachClient(svc, client);

      const opMs = jest.spyOn(customMetrics, 'recordCacheOpMs');
      const degraded = jest.spyOn(customMetrics, 'recordCacheDegraded');

      expect(await svc.get('match:list:u1')).toBeNull();
      expect(await svc.get('match:list:u1')).toEqual({ v: 1 });
      expect(opMs).toHaveBeenCalledWith('get', expect.any(Number));
      expect(opMs).toHaveBeenCalledTimes(2);
      expect(degraded).not.toHaveBeenCalled();
    });

    it('set / del / setNx record op_ms', async () => {
      const svc = new RedisCacheService();
      const client: MockRedisClient = {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
      };
      attachClient(svc, client);

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
      const svc = new RedisCacheService();
      const client: MockRedisClient = {
        get: jest.fn().mockRejectedValue(new Error('boom')),
        set: jest.fn(),
        del: jest.fn(),
      };
      attachClient(svc, client);

      const degraded = jest.spyOn(customMetrics, 'recordCacheDegraded');
      const opMs = jest.spyOn(customMetrics, 'recordCacheOpMs');

      expect(await svc.get('match:list:u1')).toBeNull();
      expect(degraded).toHaveBeenCalledWith('get', 'error');
      expect(opMs).not.toHaveBeenCalled();
    });

    it('setNx error fail-opens true and records degraded error', async () => {
      const svc = new RedisCacheService();
      const client: MockRedisClient = {
        get: jest.fn(),
        set: jest.fn().mockRejectedValue(new Error('boom')),
        del: jest.fn(),
      };
      attachClient(svc, client);

      const degraded = jest.spyOn(customMetrics, 'recordCacheDegraded');

      expect(await svc.setNx('k', {}, 10)).toBe(true);
      expect(degraded).toHaveBeenCalledWith('setNx', 'error');
    });
  });
});
