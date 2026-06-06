# Story 3: Redis-backed WS rate limit

**Sprint:** 7  
**Status:** **Done** (engineering gate — 2026-06-03)  
**Closeout order:** 8  
**Depends on:** Sprint 4 Story 6 (done)

---

## Why

`MessagingWsRateLimitService` uses in-memory counters per API process. With multiple replicas, a user can exceed the 30 events/60s limit by connecting to different instances. Sprint 4 documented this limitation; Redis adapter already exists for fan-out — rate limits should share the same Redis when available.

---

## What

**As a** platform operator running multiple API replicas  
**I want** WebSocket inbound rate limits enforced globally  
**So that** abuse limits cannot be bypassed by hitting different instances

### Acceptance criteria

- [x] **Redis sliding window** — when `REDIS_URL` set, rate limit state in Redis (`ws:ratelimit:<userId>`)
- [x] **In-memory fallback** — when `REDIS_URL` unset or connect fails, Sprint 4 behavior preserved
- [x] **Same limits** — 30 inbound events / 60s per user (env: `WS_INBOUND_RATE_LIMIT_*`)
- [x] **Fail mode documented** — **fail-open** with `ws_rate_limit_redis_degraded` log
- [x] **Integration test** — mock Redis shared counter across two store instances
- [x] **PROD_REALTIME.md updated** — multi-instance shared rate limit section
- [x] **No regression** — single-instance without Redis unchanged

### Out of scope (this story)

- HTTP API rate limiting
- Per-IP limits (user-id only, same as Sprint 4)
- Redis Cluster provisioning

---

## Shipped (engineering)

| Deliverable | Detail |
|-------------|--------|
| `RedisWsRateLimitStore` | Lua atomic `consumeInboundSlot`; fixed window |
| `MemoryWsRateLimitStore` | Fallback when no Redis |
| `MessagingWsRateLimitService` | Dedicated Redis client; OnModuleInit/Destroy |
| Gateway | `await consumeInboundSlot(userId)` |
| Health | `GET /health/realtime` → `messaging.wsRateLimitRedis` |
| Docs | `PROD_REALTIME.md`, `LOAD_SMOKE_WS.md` |

---

## Definition of done

- [x] Redis-backed rate limit implemented
- [x] Fallback path tested
- [x] Unit + integration tests pass (**1303/1303**)
- [x] Docs updated
- [x] LOAD_SMOKE_WS.md cross-instance flood note

---

## Agent run

```text
--agent 0 sprint 7 story 3   ✅
--agent 1 sprint 7 story 3   ✅
--agent 2 sprint 7 story 3   ✅
--agent 3 sprint 7 story 3   ✅
```

Handoffs: `handoffs/STORY_03_redis_ws_rate_limit/agent-*.md`

---

## Manual smoke

1. Single instance, no Redis → rate limit works as Sprint 4  
2. Two API processes + `REDIS_URL` → flood events on both → limit hit globally  
3. Redis down (if fail-open) → connections still work, warning logged

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Distributed rate limit for REST | future |
| Sentry alert on `ws_rate_limit_redis_degraded` | optional ops |
