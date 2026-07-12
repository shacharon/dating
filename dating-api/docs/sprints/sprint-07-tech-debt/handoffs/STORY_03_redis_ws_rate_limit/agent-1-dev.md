# Handoff: Agent 1 — Senior Dev — Story 3

**Agent:** 1 dev  
**Story:** [STORY_03_redis_ws_rate_limit.md](../../STORY_03_redis_ws_rate_limit.md)  
**Sprint:** sprint-07-tech-debt  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Redis-backed fixed-window rate limit** when `REDIS_URL` connects at module init — key `ws:ratelimit:<userId>`, Lua atomic consume.
- **In-memory fallback** when `REDIS_URL` unset or connect fails (boot warn).
- **Fail-open** on Redis runtime errors — `ws_rate_limit_redis_degraded` log, event allowed.
- **Gateway** uses `await consumeInboundSlot(userId)` (replaces assert + record).
- **Health** snapshot adds `wsRateLimitRedis`.
- **Env:** `WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW`, `WS_INBOUND_RATE_LIMIT_WINDOW_MS`.

---

## Files changed

| Path | Change |
|------|--------|
| `messaging-ws-inbound.constants.ts` | Env parsing + `wsRateLimitRedisKey()` |
| `messaging-ws-rate-limit-store.interface.ts` | **New** |
| `messaging-ws-rate-limit-memory.store.ts` | **New** |
| `messaging-ws-rate-limit-redis.store.ts` | **New** — Lua + fail-open |
| `messaging-ws-rate-limit.service.ts` | Facade, OnModuleInit/Destroy |
| `messaging-ws-rate-limit.service.spec.ts` | Memory path |
| `messaging-ws-rate-limit-redis.spec.ts` | **New** — shared fake Redis |
| `messaging.gateway.ts` | async `consumeInboundSlot` |
| `messaging.gateway.spec.ts` | mock update |
| `messaging-realtime-health.service.ts` | `wsRateLimitRedis` |
| `messaging-realtime-health.service.spec.ts` | updated |
| `messaging-realtime.module.ts` | `SimpleLoggerModule` |
| `health-http.integration.spec.ts` | rate limit stub + snapshot field |
| `health.controller.spec.ts` | snapshot field |
| `messaging-realtime-ws.integration.spec.ts` | consume flood |
| `PROD_REALTIME.md`, `LOAD_SMOKE_WS.md` | multi-instance rate limit |

---

## Verification

```bash
cd dating-api
npx jest src/messaging-realtime/messaging-ws-rate-limit
npm test    # 1302/1302
npm run build
```

---

## Notes for CR

- Dedicated Redis client in `MessagingWsRateLimitService` (not shared with `RedisIoAdapter` pub/sub).
- `PEXPIRE` uses window ms (matches in-memory fixed window from first event).
- No `assertCanReceive` / `recordReceive` left in codebase.

---

## Next agent

```text
--agent 2 sprint 7 story 3
```
