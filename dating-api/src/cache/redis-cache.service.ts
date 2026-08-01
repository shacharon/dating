import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: RedisClientType | null = null;
  private available = false;

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.logger.warn('REDIS_URL unset — RedisCacheService disabled (fail-open to DB)');
      return;
    }
    const client = createClient({ url });
    client.on('error', (err) => {
      this.logger.warn(`Redis cache client error: ${String(err)}`);
    });
    try {
      await client.connect();
      this.client = client as RedisClientType;
      this.available = true;
      this.logger.log('Redis cache connected');
    } catch (err) {
      this.logger.warn(
        `Redis cache connect failed — fail-open to DB: ${err instanceof Error ? err.message : String(err)}`,
      );
      try {
        await client.quit();
      } catch {
        /* ignore */
      }
      this.client = null;
      this.available = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      /* ignore */
    }
    this.client = null;
    this.available = false;
  }

  isAvailable(): boolean {
    return this.available && this.client != null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.available) return null;
    const started = Date.now();
    try {
      const raw = await this.client.get(key);
      const ms = Date.now() - started;
      if (raw == null) {
        this.logger.log(
          JSON.stringify({
            event: 'cache',
            cache: { event: 'miss', keyPrefix: key.split(':').slice(0, 2).join(':'), ms },
          }),
        );
        return null;
      }
      this.logger.log(
        JSON.stringify({
          event: 'cache',
          cache: { event: 'hit', keyPrefix: key.split(':').slice(0, 2).join(':'), ms },
        }),
      );
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'match_list_cache_degraded',
          op: 'get',
          err: err instanceof Error ? err.message : String(err),
        }),
      );
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client || !this.available) return;
    const started = Date.now();
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
      this.logger.log(
        JSON.stringify({
          event: 'cache',
          cache: {
            event: 'set',
            keyPrefix: key.split(':').slice(0, 2).join(':'),
            ms: Date.now() - started,
            ttlSeconds,
          },
        }),
      );
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'match_list_cache_degraded',
          op: 'set',
          err: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.available) return;
    const started = Date.now();
    try {
      await this.client.del(key);
      this.logger.log(
        JSON.stringify({
          event: 'cache',
          cache: {
            event: 'del',
            keyPrefix: key.split(':').slice(0, 2).join(':'),
            ms: Date.now() - started,
          },
        }),
      );
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'match_list_cache_degraded',
          op: 'del',
          err: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  /**
   * SET key NX EX. Returns true if the key was set (caller may proceed).
   * Fail-open: when Redis is down, returns true so callers can still enqueue.
   */
  async setNx(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<boolean> {
    if (!this.client || !this.available) return true;
    try {
      const result = await this.client.set(key, JSON.stringify(value), {
        NX: true,
        EX: ttlSeconds,
      });
      return result === 'OK';
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'match_list_cache_degraded',
          op: 'setNx',
          err: err instanceof Error ? err.message : String(err),
        }),
      );
      return true;
    }
  }
}
