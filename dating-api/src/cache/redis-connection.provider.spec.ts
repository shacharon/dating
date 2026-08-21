import { RedisConnectionProvider } from './redis-connection.provider';

const mockQuit = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn();
const mockOn = jest.fn();

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: mockOn,
    connect: mockConnect,
    quit: mockQuit,
  })),
}));

import { createClient } from 'redis';

describe('RedisConnectionProvider', () => {
  const prevRedisUrl = process.env.REDIS_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockQuit.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (prevRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = prevRedisUrl;
  });

  it('leaves client null when REDIS_URL unset', async () => {
    delete process.env.REDIS_URL;
    const conn = new RedisConnectionProvider();
    await conn.onModuleInit();

    expect(createClient).not.toHaveBeenCalled();
    expect(conn.isUrlConfigured()).toBe(false);
    expect(conn.isAvailable()).toBe(false);
    expect(conn.getClient()).toBeNull();
  });

  it('treats whitespace-only REDIS_URL as unset', async () => {
    process.env.REDIS_URL = '   ';
    const conn = new RedisConnectionProvider();
    await conn.onModuleInit();

    expect(createClient).not.toHaveBeenCalled();
    expect(conn.isUrlConfigured()).toBe(false);
    expect(conn.isAvailable()).toBe(false);
  });

  it('connects and exposes client when REDIS_URL set', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const conn = new RedisConnectionProvider();
    await conn.onModuleInit();

    expect(createClient).toHaveBeenCalledWith({
      url: 'redis://localhost:6379',
    });
    expect(mockConnect).toHaveBeenCalled();
    expect(conn.isUrlConfigured()).toBe(true);
    expect(conn.isAvailable()).toBe(true);
    expect(conn.getClient()).not.toBeNull();

    await conn.onModuleDestroy();
    expect(mockQuit).toHaveBeenCalled();
    expect(conn.isAvailable()).toBe(false);
    expect(conn.getClient()).toBeNull();
  });

  it('marks urlConfigured but unavailable when connect fails', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    mockConnect.mockRejectedValue(new Error('boom'));
    const conn = new RedisConnectionProvider();
    await conn.onModuleInit();

    expect(conn.isUrlConfigured()).toBe(true);
    expect(conn.isAvailable()).toBe(false);
    expect(conn.getClient()).toBeNull();
    expect(mockQuit).toHaveBeenCalled();
  });
});
