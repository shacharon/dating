import { RedisIoAdapter } from './redis-io.adapter';

describe('RedisIoAdapter', () => {
  const originalRedisUrl = process.env.REDIS_URL;

  afterEach(() => {
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
  });

  it('skips Redis wiring when REDIS_URL is unset', async () => {
    delete process.env.REDIS_URL;
    const adapter = new RedisIoAdapter({} as never);

    await adapter.connectToRedis();

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
});
