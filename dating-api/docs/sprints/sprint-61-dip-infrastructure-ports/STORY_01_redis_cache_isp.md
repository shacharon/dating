# Story 01 — Redis Connection + Cache ISP

**Sprint:** 61  
**Effort:** 2–3 days  
**Risk:** ⚠️ MEDIUM (shared Redis lifecycle; presence + cache + crons)  
**Status:** Done

---

## Objective

Introduce a shared Redis connection provider and segregate the fat `RedisCacheService` surface into focused ports so consumers only depend on what they use (ISP + DIP).

---

## Current offenders

| Consumer | Path | Needs |
|----------|------|-------|
| Match list cache | `me-profile/matches/match-list-cache.service.ts` | KV + `setNx` |
| Socket registry | `messaging-realtime/messaging-socket-registry.service.ts` | sets + string + del |
| Email debounce | `notifications/message-email-debounce.service.ts` | `setNx` / `del` |
| Photo SLA cron | `workers/photo-sla.cron.ts` | cron lock |
| Mute expiry cron | `workers/mute-expiry.cron.ts` | cron lock |
| Owner | `cache/redis-cache.service.ts` | `createClient` in `onModuleInit` |

---

## Design

Implemented per architect handoff (port signatures match live adapter API; story sketch below is historical):

- Tokens: `CACHE_KV`, `CACHE_SETS`, `CRON_LOCK`, `REDIS_CLIENT` (`RedisClientHandle`)
- Adapter: `RedisCacheService` implements all three ports; Nest `useExisting` binds
- Connection: `RedisConnectionProvider` owns `createClient` / connect / quit

```typescript
// cache/cache.ports.ts (names can match repo style)
export const CACHE_KV = Symbol('CACHE_KV');
export const CACHE_SETS = Symbol('CACHE_SETS');
export const CRON_LOCK = Symbol('CRON_LOCK');
export const REDIS_CLIENT = Symbol('REDIS_CLIENT'); // optional shared client

export interface CacheKvPort {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  setNx(key: string, value: string, ttlSeconds: number): Promise<boolean>;
}

export interface CacheSetsPort {
  sAdd(key: string, member: string): Promise<void>;
  sRem(key: string, member: string): Promise<void>;
  sCard(key: string): Promise<number>;
  sMembers(key: string): Promise<string[]>;
  setString(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export interface CronLockPort {
  tryAcquireCronLock(key: string, ttlMs: number): Promise<'acquired' | 'held' | 'unavailable'>;
}
```

**Adapter:** Keep one Redis-backed implementation class (can stay named `RedisCacheService`) that implements all three ports; Nest binds:

```typescript
{ provide: CACHE_KV, useExisting: RedisCacheService },
{ provide: CACHE_SETS, useExisting: RedisCacheService },
{ provide: CRON_LOCK, useExisting: RedisCacheService },
```

**Connection:** Extract Redis URL + `createClient` into a module factory / `RedisConnectionProvider` so rate-limit (Story 02) can share the same client later.

---

## Tasks

1. ~~Add `cache.ports.ts` (+ thin no-op / memory fakes for unit tests if needed).~~
2. ~~Move client creation to Nest provider; `RedisCacheService` receives client (or factory), not env scrape alone.~~
3. ~~Migrate 5 injectors to the narrowest port token.~~
4. ~~Keep `RedisCacheService` export temporarily for backward compat if needed; mark deprecate in comment.~~
5. ~~Specs: match-list-cache, messaging-socket-registry, message-email-debounce, cron lock paths.~~

---

## Success

- [x] No product service depends on full Redis surface unless it needs it
- [x] Shared connection path ready for Story 02
- [x] Fail-open / fail-closed semantics for `setNx` vs cron lock **unchanged** (document in ports)

---

## Follow-up

Story 02 wires rate-limit stores onto the same Redis connection.

---

## Shipped

`feature/sprint-61-story-1` @ `ca41c92` (+ Agent 3 close commit)

- `54b9f06` — feat: redis cache ISP ports + shared connection
- `ca41c92` — test: guard redis ISP wiring

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (no Agent 4 / 2.5 / 3.5)
