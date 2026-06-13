import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { Server, ServerOptions } from 'socket.io';
import { setMessagingRedisAdapterBound } from './messaging-realtime-redis-state';

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

    try {
      const pubClient = createClient({ url });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (err) => {
        console.warn('[RedisIoAdapter] pub client error:', err.message);
      });
      subClient.on('error', (err) => {
        console.warn('[RedisIoAdapter] sub client error:', err.message);
      });
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.redisAdapter = createAdapter(pubClient, subClient);
      setMessagingRedisAdapterBound(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[RedisIoAdapter] Redis unavailable (${message}) — continuing in single-instance mode. ` +
          'Unset REDIS_URL for local dev or start Redis.',
      );
      setMessagingRedisAdapterBound(false);
    }
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
