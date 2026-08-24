import {
  isMessagingRedisAdapterBound,
  resetMessagingRedisAdapterBoundForTests,
} from './messaging-realtime-redis-state';

const mockConnect = jest.fn();
const mockOn = jest.fn();
const mockDuplicate = jest.fn();

const subClient = {
  on: mockOn,
  connect: mockConnect,
};

const pubClient = {
  on: mockOn,
  connect: mockConnect,
  duplicate: mockDuplicate.mockReturnValue(subClient),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => pubClient),
}));

jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn(() => ({})),
}));

import { createClient } from 'redis';
import { RedisIoAdapter } from './redis-io.adapter';

describe('RedisIoAdapter', () => {
  const originalRedisUrl = process.env.REDIS_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    resetMessagingRedisAdapterBoundForTests();
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    resetMessagingRedisAdapterBoundForTests();
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it('skips Redis wiring when REDIS_URL is unset (non-production)', async () => {
    delete process.env.REDIS_URL;
    const adapter = new RedisIoAdapter({} as never);

    await adapter.connectToRedis();

    expect(createClient).not.toHaveBeenCalled();
    expect(isMessagingRedisAdapterBound()).toBe(false);

    const server = { adapter: jest.fn() } as unknown as import('socket.io').Server;
    const createIOServer = jest
      .spyOn(
        Object.getPrototypeOf(RedisIoAdapter.prototype),
        'createIOServer',
      )
      .mockReturnValue(server);

    adapter.createIOServer(0);

    expect(server.adapter).not.toHaveBeenCalled();
    createIOServer.mockRestore();
  });

  it('throws in production when REDIS_URL is unset', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REDIS_URL;
    const adapter = new RedisIoAdapter({} as never);

    await expect(adapter.connectToRedis()).rejects.toThrow(
      /REDIS_URL is required in production/,
    );
    expect(isMessagingRedisAdapterBound()).toBe(false);
  });

  it('binds adapter when connect succeeds', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    const adapter = new RedisIoAdapter({} as never);

    await adapter.connectToRedis();

    expect(createClient).toHaveBeenCalledWith({ url: 'redis://127.0.0.1:6379' });
    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(isMessagingRedisAdapterBound()).toBe(true);
  });

  it('soft-degrades when connect fails in non-production', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    mockConnect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const adapter = new RedisIoAdapter({} as never);

    await adapter.connectToRedis();

    expect(isMessagingRedisAdapterBound()).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('continuing in single-instance mode'),
    );
  });

  it('throws when connect fails in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    mockConnect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const adapter = new RedisIoAdapter({} as never);

    await expect(adapter.connectToRedis()).rejects.toThrow(
      /Redis unavailable in production \(ECONNREFUSED\)/,
    );
    expect(isMessagingRedisAdapterBound()).toBe(false);
  });
});
