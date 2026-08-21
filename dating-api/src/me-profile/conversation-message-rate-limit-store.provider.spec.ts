import type { RedisClientHandle } from '../cache/cache.ports';
import { SimpleLogger } from '../logger/simple-logger.service';
import { MessageRateLimitStoreProvider } from './conversation-message-rate-limit-store.provider';

describe('MessageRateLimitStoreProvider', () => {
  const logger = {
    warn: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  } as unknown as SimpleLogger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function make(redis: RedisClientHandle): MessageRateLimitStoreProvider {
    return new MessageRateLimitStoreProvider(redis, logger);
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
    expect(() => provider.consumeSendSlot('u1')).not.toThrow();
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
      expect.stringContaining('http_message_rate_limit_redis_connect_failed'),
      MessageRateLimitStoreProvider.name,
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
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('http_message_rate_limit_redis_connect_failed'),
      expect.anything(),
    );
  });
});
