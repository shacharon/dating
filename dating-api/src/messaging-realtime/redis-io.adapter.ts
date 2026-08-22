import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { Server, ServerOptions } from 'socket.io';
import { isProductionEnv } from '../config/is-production-env';
import { setMessagingRedisAdapterBound } from './messaging-realtime-redis-state';

export class RedisIoAdapter extends IoAdapter {
  private redisAdapter: ReturnType<typeof createAdapter> | null = null;

  constructor(app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    const production = isProductionEnv();

    if (!url) {
      if (production) {
        throw new Error(
          'REDIS_URL is required in production for multi-instance WebSocket support. ' +
            'Without Redis, messages will not be delivered across pods.',
        );
      }
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
      setMessagingRedisAdapterBound(false);
      const message = err instanceof Error ? err.message : String(err);
      if (production) {
        throw new Error(
          `Redis unavailable in production (${message}). ` +
            'Fix REDIS_URL / Redis connectivity before starting the API.',
          { cause: err instanceof Error ? err : undefined },
        );
      }
      console.warn(
        `[RedisIoAdapter] Redis unavailable (${message}) — continuing in single-instance mode. ` +
          'Unset REDIS_URL for local dev or start Redis.',
      );
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
