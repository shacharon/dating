import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { Server, ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private redisAdapter: ReturnType<typeof createAdapter> | null = null;

  constructor(app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      return;
    }

    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.redisAdapter = createAdapter(pubClient, subClient);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    // Match socket.io-client `path: '/socket.io'` (no slash) — default server adds a trailing slash.
    const server = super.createIOServer(port, {
      ...options,
      addTrailingSlash: false,
    });
    if (this.redisAdapter) {
      server.adapter(this.redisAdapter);
    }
    return server;
  }
}
