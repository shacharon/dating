import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  recordCacheDegraded,
  recordCacheOpMs,
  type CacheOp,
} from '../observability/custom-metrics';
import {
  REDIS_CLIENT,
  type CacheKvPort,
  type CacheSetsPort,
  type CronLockPort,
  type RedisClientHandle,
} from './cache.ports';

/**
 * Redis-backed adapter for cache ISP ports.
 * @deprecated Prefer injecting CACHE_KV / CACHE_SETS / CRON_LOCK tokens.
 */
@Injectable()
export class RedisCacheService
  implements CacheKvPort, CacheSetsPort, CronLockPort
{
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientHandle,
  ) {}

  isAvailable(): boolean {
    return this.redis.isAvailable();
  }

  private get client() {
    return this.redis.getClient();
  }

  private get available(): boolean {
    return this.redis.isAvailable();
  }

  private logDegraded(
    op: CacheOp,
    reason: 'error' | 'unavailable',
    err?: unknown,
  ): void {
    recordCacheDegraded(op, reason);
    this.logger.warn(
      JSON.stringify({
        event: 'match_list_cache_degraded',
        op,
        reason,
        ...(err != null
          ? { err: err instanceof Error ? err.message : String(err) }
          : {}),
      }),
    );
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.available) return null;
    const started = Date.now();
    try {
      const raw = await this.client.get(key);
      const ms = Date.now() - started;
      recordCacheOpMs('get', ms);
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
      this.logDegraded('get', 'error', err);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client || !this.available) return;
    const started = Date.now();
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
      const ms = Date.now() - started;
      recordCacheOpMs('set', ms);
      this.logger.log(
        JSON.stringify({
          event: 'cache',
          cache: {
            event: 'set',
            keyPrefix: key.split(':').slice(0, 2).join(':'),
            ms,
            ttlSeconds,
          },
        }),
      );
    } catch (err) {
      this.logDegraded('set', 'error', err);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.available) return;
    const started = Date.now();
    try {
      await this.client.del(key);
      const ms = Date.now() - started;
      recordCacheOpMs('del', ms);
      this.logger.log(
        JSON.stringify({
          event: 'cache',
          cache: {
            event: 'del',
            keyPrefix: key.split(':').slice(0, 2).join(':'),
            ms,
          },
        }),
      );
    } catch (err) {
      this.logDegraded('del', 'error', err);
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
    if (!this.client || !this.available) {
      this.logDegraded('setNx', 'unavailable');
      return true;
    }
    const started = Date.now();
    try {
      const result = await this.client.set(key, JSON.stringify(value), {
        NX: true,
        EX: ttlSeconds,
      });
      recordCacheOpMs('setNx', Date.now() - started);
      return result === 'OK';
    } catch (err) {
      this.logDegraded('setNx', 'error', err);
      return true;
    }
  }

  /**
   * Cron leader election (Sprint 48 Story 3).
   * - REDIS_URL unset → 'acquired' (single-process local).
   * - Redis up → SET NX EX; 'OK' → acquired, else not_acquired.
   * - REDIS_URL set but client down / error → 'unavailable' (fail-closed).
   * Does **not** reuse setNx fail-open semantics.
   */
  async tryAcquireCronLock(
    key: string,
    ttlSeconds: number,
    value?: unknown,
  ): Promise<'acquired' | 'not_acquired' | 'unavailable'> {
    if (!this.redis.isUrlConfigured()) {
      return 'acquired';
    }
    if (!this.client || !this.available) {
      this.logDegraded('cronLock', 'unavailable');
      return 'unavailable';
    }
    const started = Date.now();
    try {
      const payload =
        value !== undefined
          ? value
          : { at: new Date().toISOString(), pid: process.pid };
      const result = await this.client.set(key, JSON.stringify(payload), {
        NX: true,
        EX: ttlSeconds,
      });
      recordCacheOpMs('cronLock', Date.now() - started);
      return result === 'OK' ? 'acquired' : 'not_acquired';
    } catch (err) {
      this.logDegraded('cronLock', 'error', err);
      return 'unavailable';
    }
  }

  /** Raw string SET EX (presence meta). No-op when Redis down. */
  async setString(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.client || !this.available) return;
    const started = Date.now();
    try {
      await this.client.set(key, value, { EX: ttlSeconds });
      recordCacheOpMs('set', Date.now() - started);
    } catch (err) {
      this.logDegraded('set', 'error', err);
    }
  }

  /** Raw string GET. null on miss / Redis down / error. */
  async getString(key: string): Promise<string | null> {
    if (!this.client || !this.available) return null;
    const started = Date.now();
    try {
      const raw = await this.client.get(key);
      recordCacheOpMs('get', Date.now() - started);
      return raw;
    } catch (err) {
      this.logDegraded('get', 'error', err);
      return null;
    }
  }

  /** SADD + EXPIRE. Returns false when Redis unavailable/error (fail-open callers). */
  async sAdd(
    key: string,
    member: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    if (!this.client || !this.available) {
      this.logDegraded('sAdd', 'unavailable');
      return false;
    }
    const started = Date.now();
    try {
      await this.client.sAdd(key, member);
      await this.client.expire(key, ttlSeconds);
      recordCacheOpMs('sAdd', Date.now() - started);
      return true;
    } catch (err) {
      this.logDegraded('sAdd', 'error', err);
      return false;
    }
  }

  async sRem(key: string, member: string): Promise<boolean> {
    if (!this.client || !this.available) {
      this.logDegraded('sRem', 'unavailable');
      return false;
    }
    const started = Date.now();
    try {
      await this.client.sRem(key, member);
      recordCacheOpMs('sRem', Date.now() - started);
      return true;
    } catch (err) {
      this.logDegraded('sRem', 'error', err);
      return false;
    }
  }

  /** null = Redis unavailable / error. */
  async sCard(key: string): Promise<number | null> {
    if (!this.client || !this.available) {
      this.logDegraded('sCard', 'unavailable');
      return null;
    }
    const started = Date.now();
    try {
      const n = await this.client.sCard(key);
      recordCacheOpMs('sCard', Date.now() - started);
      return n;
    } catch (err) {
      this.logDegraded('sCard', 'error', err);
      return null;
    }
  }

  /** null = Redis unavailable / error. */
  async sMembers(key: string): Promise<string[] | null> {
    if (!this.client || !this.available) {
      this.logDegraded('sMembers', 'unavailable');
      return null;
    }
    const started = Date.now();
    try {
      const members = await this.client.sMembers(key);
      recordCacheOpMs('sMembers', Date.now() - started);
      return members;
    } catch (err) {
      this.logDegraded('sMembers', 'error', err);
      return null;
    }
  }
}
