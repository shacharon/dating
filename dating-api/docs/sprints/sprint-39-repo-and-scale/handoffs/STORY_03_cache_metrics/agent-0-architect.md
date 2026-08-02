# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_cache_metrics.md](../../STORY_03_cache_metrics.md)  
**Sprint:** sprint-39-repo-and-scale  
**Date:** 2026-08-02  
**Status:** complete  

**Mode:** Add Redis transport latency + degraded/fail-open metrics inside `RedisCacheService`. **Do not** change fail-open return semantics, TTLs, or client. Preserve Sprint 27 application-level `cache.hit_rate` at MeMatches. Skip Agent 4.

---

## Summary

Centralize Redis **op latency** and **degraded** signals in `RedisCacheService` via `custom-metrics.ts`. Keep MeMatches `recordCacheHit` / `recordCacheMiss` (usable payload / version gate). Make `setNx` fail-open visible when Redis is down or errors. Structured logs stay; no Prometheus scrape endpoint.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Service | `src/cache/redis-cache.service.ts` — sole Redis JSON cache |
| Callers today | **Only** `MeMatchesService` (`get` / `set` / `del` / `setNx`) |
| Fail-open | Unavailable / errors: `get→null`, `set`/`del` no-op, `setNx→true` |
| Logs today | JSON `event:cache` hit/miss/set/del; warn `match_list_cache_degraded` on errors |
| Product hit/miss | `getOrBuildRankedList` → `recordCacheHit` / `recordCacheMiss` after version check (Sprint 27 Story 5) |
| Product set timing | `recordMatchListCacheSetMs` around ready miss `cache.set` (keep) |
| Specs | No `redis-cache.service.spec.ts` yet; MeMatches spies hit/miss |

---

## Decisions (do not reverse without discussion)

### 1. Where to emit (locked)

| Choice | Lock |
|--------|------|
| New wrapper / interceptor | **No** |
| Emit inside `RedisCacheService` | **Yes** |
| Move MeMatches hit/miss into Redis | **No** — keep app-level hit rate (version-valid payload) |

Rationale: Redis key presence ≠ usable match-list cache. Moving hit/miss would double-count or lie on version mismatch.

### 2. Metrics (locked)

Add next to existing helpers in `custom-metrics.ts`:

| Helper | Metric | When |
|--------|--------|------|
| `recordCacheOpMs(op, ms)` | `cache.op_ms` + tag `op:get\|set\|del\|setNx` | Successful Redis round-trip when available |
| `recordCacheDegraded(op, reason?)` | `cache.degraded` value `1` + tags `op:…`, optional `reason:error\|unavailable` | See §3 |

**Keep unchanged:**

- `recordCacheHit` / `recordCacheMiss` → `cache.hit_rate` (MeMatches only)
- `recordMatchListCacheSetMs` → `match.list.cache_set_ms`

**Do not** emit `cache.op_ms` on unavailable short-circuit (no Redis RTT).

### 3. Degraded / fail-open visibility (locked)

| Situation | Return (unchanged) | Metric |
|-----------|-------------------|--------|
| `get`/`set`/`del` when `!available` | null / void | **No** per-op metric (connect warn already) |
| `setNx` when `!available` | `true` | **`recordCacheDegraded('setNx', 'unavailable')`** — thrash signal |
| Any op when available + Redis/JSON error | same fail-open as today | **`recordCacheDegraded(op, 'error')`** + keep warn log |
| Successful get hit/miss | as today | Logs + `recordCacheOpMs('get', ms)` only (hit/miss stay at MeMatches) |

Log event name: keep **`match_list_cache_degraded`** (Sprint 19 dashboards). Include `reason` in JSON when emitting (`error` vs `unavailable`).

### 4. Latency on get (locked)

On available get success (hit or miss):

1. Keep existing JSON `event:cache` logs.  
2. Call `recordCacheOpMs('get', ms)`.  
3. Do **not** call `recordCacheHit`/`recordCacheMiss` from Redis service.

Same pattern for successful `set` / `del` / `setNx` (setNx: measure only when client runs; record ms whether result OK or key existed).

### 5. Fail-open semantics (locked — do not change)

| Op | Unavailable | Error while available |
|----|-------------|------------------------|
| get | `null` | `null` |
| set | return | return (no throw) |
| del | return | return |
| setNx | `true` | `true` |

No TTL / key shape / client library changes.

### 6. Tests (locked)

Add `src/cache/redis-cache.service.spec.ts`:

1. **Unavailable** (`REDIS_URL` unset / never connected): `get→null`, `setNx→true`, degraded metric for setNx with `unavailable`; no `cache.op_ms`.  
2. **Available mock client**: get hit/miss logs + `recordCacheOpMs('get')`; set/del/setNx emit op ms.  
3. **Error path**: client throws → fail-open return + `recordCacheDegraded(op, 'error')`.  

Mock `redis` `createClient` or inject via test double — Agent 1 pick; keep Nest `onModuleInit` testable.

Update MeMatches Story 5 specs **only if** imports/behavior break — hit/miss call sites stay.

Required:

```bash
cd dating-api
npx jest src/cache/redis-cache.service.spec.ts src/me-profile/me-matches.service.spec.ts --runInBand
# or at least redis-cache + the Story 5 describe block
npm run typecheck
```

### 7. Out of scope

- Prometheus `/metrics` scrape endpoint  
- Changing TTL / key prefixes / Redis client  
- Requiring Redis in local/dev  
- Match-narrative DB cache (not `RedisCacheService`)  
- Rate-limit Redis store (separate client)  
- Removing Sprint 27 MeMatches hit/miss  

### 8. Agent 4

- **Skip.**

---

## Agent 1 instructions

1. Add `recordCacheOpMs` + `recordCacheDegraded` in `custom-metrics.ts`.  
2. Wire them in `RedisCacheService` per §2–§4; extend degraded log JSON with `reason`.  
3. Add `redis-cache.service.spec.ts`; leave MeMatches hit/miss.  
4. Short ops note in `agent-1-dev.md` (what `cache.degraded` + `cache.op_ms` mean). Do not commit.

Suggested commit:

```
observability(cache): record Redis hit/miss and degraded ops

Sprint 39 Story 3
```

(Commit title may say hit/miss historically; implementation is **op latency + degraded** + existing MeMatches hit/miss.)

---

## Agent 2 CR checklist

- [ ] Metrics live in `RedisCacheService` + `custom-metrics` helpers  
- [ ] Fail-open returns unchanged  
- [ ] `setNx` unavailable emits degraded (`reason:unavailable`)  
- [ ] MeMatches `recordCacheHit`/`Miss` still application-level  
- [ ] Specs cover available + unavailable + error; typecheck green  

---

## Next command

```text
--agent 1 sprint 39 story 3
```
