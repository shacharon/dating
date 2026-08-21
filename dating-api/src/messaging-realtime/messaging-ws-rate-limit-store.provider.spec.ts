import type { RedisClientHandle } from '../cache/cache.ports';
import { SimpleLogger } from '../logger/simple-logger.service';
import { WsRateLimitStoreProvider } from './messaging-ws-rate-limit-store.provider';

describe('WsRateLimitStoreProvider', () => {
  const logger = {
    warn: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  } as unknown as SimpleLogger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function make(redis: RedisClientHandle): WsRateLimitStoreProvider {
    return new WsRateLimitStoreProvider(redis, logger);
  }

  it('binds memory when REDIS_CLIENT not configured', async () => {
    const provider = make({
      getClient: () => null,
      isAvailable: () => false,
      isUrlConfigured: () => false,
    });
    await provider.onModuleInit();
    expect(provider.isUsingRedisStore()).toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('binds memory and warns when URL configured but client unavailable', async () => {
    const provider = make({
      getClient: () => null,
      isAvailable: () => false,
      isUrlConfigured: () => true,
    });
    await provider.onModuleInit();
    expect(provider.isUsingRedisStore()).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('ws_rate_limit_redis_connect_failed'),
      WsRateLimitStoreProvider.name,
    );
  });

  it('binds Redis store when shared client is available', async () => {
    const client = { eval: jest.fn() } as never;
    const provider = make({
      getClient: () => client,
      isAvailable: () => true,
      isUrlConfigured: () => true,
    });
    await provider.onModuleInit();
    expect(provider.isUsingRedisStore()).toBe(true);
  });
});
