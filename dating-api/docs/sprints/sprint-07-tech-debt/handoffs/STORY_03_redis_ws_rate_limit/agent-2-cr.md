# Handoff: Agent 2 — Code review — Story 3

**Agent:** 2 code-review  
**Story:** [STORY_03_redis_ws_rate_limit.md](../../STORY_03_redis_ws_rate_limit.md)  
**Sprint:** sprint-07-tech-debt  
**Date:** 2026-06-03  
**Status:** complete  
**Verdict:** approved (fixed)

---

## Summary

- Reviewed Agent 1 implementation against architect handoff — **matches spec** (Redis fixed window, memory fallback, fail-open, `consumeInboundSlot`, health field, docs).
- **Fixed:** coerce Lua `eval` result with `Number(result)` — node-redis may return `"0"` string; strict `=== 0` could miss rate limit.
- **Fixed:** test for string `"0"` return; updated Sprint 4 README stale “in-memory only” note.
- Full suite **1303/1303** pass.

---

## Review findings

| Severity | Finding | Resolution |
|----------|---------|------------|
| Medium | `result === 0` misses string `"0"` from Redis | **Fixed** — `Number(result) === 0` |
| Minor | No unit test for boot connect failure → memory fallback | Accepted — integration path covered by `onModuleInit` logic; optional follow-up |
| Minor | `KEYS` in `resetForTests` only | Accepted — test-only |
| Accepted | Sentry on degraded not implemented | Architect optional |
| Accepted | Dedicated Redis client (3 connections with adapter pub/sub) | Per architect |

**Logic verified:**

- Memory store allows 30 `consumeInboundSlot` per window; 31st throws.
- Two Redis store instances share fake counter → 31st throws.
- Redis eval error → fail-open, `onDegraded` called, no throw.
- Gateway `await consumeInboundSlot`; no `assertCanReceive` / `recordReceive` in repo.
- `wsRateLimitRedis` false without `REDIS_URL`; health HTTP integration updated.

---

## Acceptance criteria

| AC | Status |
|----|--------|
| Redis sliding window when `REDIS_URL` set | ✅ |
| In-memory fallback when unset | ✅ |
| Same limits (30/60s, env override) | ✅ |
| Fail-open documented + implemented | ✅ |
| Integration test shared counter | ✅ mock Redis |
| PROD_REALTIME.md updated | ✅ |
| No regression without Redis | ✅ |

---

## Artifacts (CR changes)

| Path | Change |
|------|--------|
| `messaging-ws-rate-limit-redis.store.ts` | `Number(result) === 0` |
| `messaging-ws-rate-limit-redis.spec.ts` | +test string `"0"` |
| `sprint-04-realtime-messaging/README.md` | rate limit note |

---

## Tests / verification

| Command | Result |
|---------|--------|
| `npx jest messaging-ws-rate-limit` | **7/7** pass |
| `npm test` (dating-api) | **1303/1303** pass |

---

## Open questions / blockers

- None blocking Agent 3.

---

## Next agent

```text
--agent 3 sprint 7 story 3
```

**Notes for PM:**

- Mark Story 3 Done → closeout **11/12** (only 7.4 funnel analytics left).
- Operator smoke: two replicas + `REDIS_URL` + shared flood (LOAD_SMOKE_WS.md).
