import type { CacheKvPort, RedisClientHandle } from '../cache/cache.ports';
import { MessageEmailDebounceService } from './message-email-debounce.service';
import type { EmailNotificationConfigService } from './email-notification-config.service';
import { emailMsgDebounceKey } from './email-debounce.keys';

type SharedMemoryRedis = CacheKvPort & RedisClientHandle;

function createSharedMemoryRedis(): SharedMemoryRedis {
  const keys = new Map<string, string>();

  return {
    isAvailable: () => true,
    isUrlConfigured: () => true,
    getClient: () => null,
    async get() {
      return null;
    },
    async set() {},
    async setNx(key: string, value: unknown, _ttl: number) {
      if (keys.has(key)) return false;
      keys.set(key, JSON.stringify(value));
      return true;
    },
    async del(key: string) {
      keys.delete(key);
    },
  };
}

function serviceWithRedis(
  config: EmailNotificationConfigService,
  redis: SharedMemoryRedis,
): MessageEmailDebounceService {
  return new MessageEmailDebounceService(config, redis, redis);
}

describe('MessageEmailDebounceService', () => {
  const config = {
    messageDebounceMinutes: 15,
  } as EmailNotificationConfigService;

  const prevRedis = process.env.REDIS_URL;

  afterEach(() => {
    if (prevRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = prevRedis;
  });

  describe('local (REDIS_URL unset)', () => {
    let service: MessageEmailDebounceService;

    beforeEach(() => {
      delete process.env.REDIS_URL;
      service = new MessageEmailDebounceService(config);
      service.resetForTests();
    });

    it('allows first claim for a conversation recipient pair', async () => {
      expect(await service.tryClaimSend('conv_1', 'user_recipient')).toBe(true);
    });

    it('blocks second claim within debounce window', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      expect(await service.tryClaimSend('conv_1', 'user_recipient')).toBe(true);
      expect(await service.tryClaimSend('conv_1', 'user_recipient')).toBe(false);

      jest.restoreAllMocks();
    });

    it('allows claim after debounce window expires', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      expect(await service.tryClaimSend('conv_1', 'user_recipient')).toBe(true);

      jest.spyOn(Date, 'now').mockReturnValue(now + 15 * 60 * 1000 + 1);
      expect(await service.tryClaimSend('conv_1', 'user_recipient')).toBe(true);

      jest.restoreAllMocks();
    });

    it('tracks debounce independently per conversation and recipient', async () => {
      expect(await service.tryClaimSend('conv_1', 'user_a')).toBe(true);
      expect(await service.tryClaimSend('conv_1', 'user_b')).toBe(true);
      expect(await service.tryClaimSend('conv_2', 'user_a')).toBe(true);
    });

    it('releaseClaim allows re-claim', async () => {
      expect(await service.tryClaimSend('conv_1', 'user_recipient')).toBe(true);
      await service.releaseClaim('conv_1', 'user_recipient');
      expect(await service.tryClaimSend('conv_1', 'user_recipient')).toBe(true);
    });
  });

  describe('cross-process via shared Redis mock', () => {
    it('second node cannot claim within window', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const redis = createSharedMemoryRedis();
      const setNx = jest.spyOn(redis, 'setNx');
      const a = serviceWithRedis(config, redis);
      const b = serviceWithRedis(config, redis);

      expect(await a.tryClaimSend('c1', 'u1')).toBe(true);
      expect(setNx).toHaveBeenCalledWith(
        'email:msgdebounce:c1:u1',
        expect.objectContaining({ at: expect.any(String) }),
        900,
      );
      expect(await b.tryClaimSend('c1', 'u1')).toBe(false);
      expect(emailMsgDebounceKey('c1', 'u1')).toBe('email:msgdebounce:c1:u1');
    });

    it('releaseClaim on peer frees claim for other node', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const redis = createSharedMemoryRedis();
      const a = serviceWithRedis(config, redis);
      const b = serviceWithRedis(config, redis);

      expect(await a.tryClaimSend('c1', 'u1')).toBe(true);
      await a.releaseClaim('c1', 'u1');
      expect(await b.tryClaimSend('c1', 'u1')).toBe(true);
    });

    it('fail-open: Redis unavailable allows send', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const redis = {
        isAvailable: () => false,
        isUrlConfigured: () => true,
        getClient: () => null,
        setNx: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      } as unknown as SharedMemoryRedis;
      const service = serviceWithRedis(config, redis);
      expect(await service.tryClaimSend('c1', 'u1')).toBe(true);
      expect(redis.setNx).not.toHaveBeenCalled();
    });
  });
});
