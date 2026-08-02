# Story 03 — Redis cache metrics

**Sprint 39 · Status: Planned**  
**Priority:** P1  
**Estimated effort:** 1 day  
**Dependencies:** None  
**Repo:** `dating-api` only

---

## Objective

Make Redis cache health visible: hit/miss/latency (and degraded/fail-open events) via existing `custom-metrics` / structured logs — without changing fail-open semantics.

## Why

`RedisCacheService` already logs hit/miss JSON but product metrics (`recordCacheHit` / `recordCacheMiss`) are only on some call sites. Fail-open `setNx → true` can hide thrash.

## Scope / tasks

1. Centralize counters/histograms in cache service or thin wrapper (Architect chooses).
2. Record degraded ops (get/set/del/setNx failures).
3. Align with `src/observability/custom-metrics.ts` patterns already used by match list.
4. Specs: assert metric hooks or log events with mocks.
5. No Prometheus scrape endpoint required unless already present — prefer existing observability stack.

## Out of scope

- Changing TTL policy
- Switching Redis client
- Requiring Redis in local/dev

## Acceptance criteria

- [ ] Hit/miss/latency (or equivalent) recorded for get/set paths
- [ ] Degraded path emits explicit signal
- [ ] Fail-open behavior unchanged
- [ ] Unit tests cover available + unavailable Redis

## Suggested commit

```
observability(cache): record Redis hit/miss and degraded ops

Sprint 39 Story 3
```
