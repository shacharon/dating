# Story 03 — Redis cache metrics

**Sprint 39 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 1 day  
**Dependencies:** None  
**Repo:** `dating-api` only  
**Handoffs:** [agent-0-architect.md](./handoffs/STORY_03_cache_metrics/agent-0-architect.md) · [agent-1-dev.md](./handoffs/STORY_03_cache_metrics/agent-1-dev.md) · [agent-2-cr.md](./handoffs/STORY_03_cache_metrics/agent-2-cr.md) · [agent-3-pm.md](./handoffs/STORY_03_cache_metrics/agent-3-pm.md)

---

## Objective

Make Redis cache health visible: hit/miss/latency (and degraded/fail-open events) via existing `custom-metrics` / structured logs — without changing fail-open semantics.

## Why

`RedisCacheService` already logs hit/miss JSON but product metrics (`recordCacheHit` / `recordCacheMiss`) are only on some call sites. Fail-open `setNx → true` can hide thrash.

## Locked policy (Architect)

| Item | Decision |
|------|----------|
| Where | Emit inside `RedisCacheService` (no wrapper) |
| New metrics | `cache.op_ms` (get/set/del/setNx) + `cache.degraded` |
| App hit/miss | Stay on MeMatches (`cache.hit_rate` after version gate) |
| `setNx` unavailable | Still returns `true`; emit degraded `reason:unavailable` |
| Fail-open returns | Unchanged |

## Scope / tasks

1. Centralize latency + degraded in `RedisCacheService` (Architect locked).
2. Record degraded ops (get/set/del/setNx failures; setNx unavailable).
3. Align with `src/observability/custom-metrics.ts` patterns already used by match list.
4. Specs: assert metric hooks with mocks (available + unavailable + error).
5. No Prometheus scrape endpoint — prefer existing observability stack.

## Out of scope

- Changing TTL policy
- Switching Redis client
- Requiring Redis in local/dev
- Moving MeMatches hit/miss into Redis (keeps Sprint 27 semantics)

## Acceptance criteria

- [x] Hit/miss/latency (or equivalent) recorded for get/set paths
- [x] Degraded path emits explicit signal
- [x] Fail-open behavior unchanged
- [x] Unit tests cover available + unavailable Redis

## Suggested commit

```
observability(cache): record Redis hit/miss and degraded ops

Sprint 39 Story 3
```
