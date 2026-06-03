# Story 3: Redis-backed WS rate limit

**Sprint:** 7  
**Status:** Not started  
**Depends on:** Sprint 4 Story 6 (hardening)

---

## Why

`MessagingWsRateLimitService` uses in-memory counters per API process. With multiple replicas, a user can exceed the 30 events/60s limit by connecting to different instances. Sprint 4 documented this limitation; Redis adapter already exists for fan-out — rate limits should share the same Redis when available.

---

## What

**As a** platform operator running multiple API replicas  
**I want** WebSocket inbound rate limits enforced globally  
**So that** abuse limits cannot be bypassed by hitting different instances

### Acceptance criteria

- [ ] **Redis sliding window** — when `REDIS_URL` set, rate limit state stored in Redis (key pattern e.g. `ws:ratelimit:<userId>`)
- [ ] **In-memory fallback** — when `REDIS_URL` unset, current behavior preserved (single-instance mode)
- [ ] **Same limits** — 30 inbound events / 60s per user (configurable via env)
- [ ] **Fail mode documented** — architect decides: fail-open (allow) vs fail-closed (reject) on Redis error; default recommended: fail-open with log
- [ ] **Integration test** — two simulated connections or mock Redis verify shared counter
- [ ] **PROD_REALTIME.md updated** — multi-instance section notes shared rate limit
- [ ] **No regression** — single-instance without Redis behaves identically to Sprint 4

### Out of scope (this story)

- HTTP API rate limiting
- Per-IP limits (user-id only, same as Sprint 4)
- Redis Cluster provisioning

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_03_redis_ws_rate_limit/agent-0-architect.md` after architect run.

Current implementation:
- `dating-api/src/messaging-realtime/messaging-ws-rate-limit.service.ts`
- Uses in-memory Map

Reuse existing Redis client from `RedisIoAdapter` if possible (shared connection pool).

---

## Definition of done

- [ ] Redis-backed rate limit implemented
- [ ] Fallback path tested
- [ ] Unit + integration tests pass
- [ ] Docs updated
- [ ] LOAD_SMOKE_WS.md note if flood test applies cross-instance

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
