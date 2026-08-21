import type { RedisClientType } from 'redis';
import type { CronLockAcquireResult } from '../workers/cron-leader.lock';

export const CACHE_KV = Symbol('CACHE_KV');
export const CACHE_SETS = Symbol('CACHE_SETS');
export const CRON_LOCK = Symbol('CRON_LOCK');
/** Lazy Redis handle for shared lifecycle (Story 02 rate-limit factories). */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export interface RedisClientHandle {
  /** Connected client, or null if REDIS_URL unset / connect failed. */
  getClient(): RedisClientType | null;
  isAvailable(): boolean;
  /** True when REDIS_URL was non-empty at init (even if connect failed). */
  isUrlConfigured(): boolean;
}

export interface CacheKvPort {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  /**
   * SET NX EX. Fail-open: returns true when Redis unavailable/error
   * so callers may still proceed (enqueue / email send).
   */
  setNx(key: string, value: unknown, ttlSeconds: number): Promise<boolean>;
}

export interface CacheSetsPort {
  sAdd(key: string, member: string, ttlSeconds: number): Promise<boolean>;
  sRem(key: string, member: string): Promise<boolean>;
  /** null = Redis unavailable / error */
  sCard(key: string): Promise<number | null>;
  /** null = Redis unavailable / error */
  sMembers(key: string): Promise<string[] | null>;
  setString(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** null on miss / Redis unavailable / error */
  getString(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
}

export interface CronLockPort {
  /**
   * Leader election. Fail-closed when URL set but client down/error → 'unavailable'.
   * REDIS_URL unset → 'acquired' (single-process local).
   * Does **not** reuse CacheKvPort.setNx fail-open semantics.
   */
  tryAcquireCronLock(
    key: string,
    ttlSeconds: number,
    value?: unknown,
  ): Promise<CronLockAcquireResult>;
}
