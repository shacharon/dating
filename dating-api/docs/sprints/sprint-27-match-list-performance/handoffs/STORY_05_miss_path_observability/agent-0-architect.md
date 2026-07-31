# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_miss_path_observability.md](../../STORY_05_miss_path_observability.md)  
**Sprint:** sprint-27-match-list-performance  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Greenfield miss-path phase metrics on top of Stories 01–04. Skip Agent 4 (unit asserts on emit helpers; no HTTP/DTO change).

---

## Summary

- Add **miss-only** custom metrics for hydrate counts + phase timings (`candidate_load_ms`, `eval_query_ms`, `score_cpu_ms`, `cache_set_ms`).
- Keep existing `match.list.load_time` and `cache.hit_rate` hit/miss.
- Enrich the existing `ME_MATCHES_LIST_OK` trace with phase ms fields (one greppable line; request context already attached).
- **Do not rename** API field `filteredNoPhotoCandidates` this story.
- Fail-open emit; **no userId/profileId metric tags**.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/observability/custom-metrics.ts` | New `recordMatchList*` helpers |
| `dating-api/src/me-profile/me-matches.service.ts` | Phase timers in `buildFullRankedList` + `cache_set_ms` on miss; enrich list-OK log |
| `me-matches.service.spec.ts` | Light mock: miss emits rebuild metrics; hit does not |
| Sprint README (optional) | One-line success metrics note |

---

## Decisions (do not reverse without discussion)

### 1. Metric names (locked)

| Metric | When | Value |
|--------|------|--------|
| `match.list.load_time` | **Existing** — every `list()` | total ms |
| `cache.hit_rate` | **Existing** — hit/miss | + `result:hit\|miss` |
| `match.list.candidates_loaded` | Miss + **ready** rebuild | hydrated row count |
| `match.list.candidates_eligible` | Miss + ready | uncapped eligible count (Story 4) |
| `match.list.candidate_load_ms` | Miss + ready | ms for parallel base count + eligible count + capped findMany |
| `match.list.eval_query_ms` | Miss + ready | ms for `latestEvaluationsForProfileIds` |
| `match.list.score_cpu_ms` | Miss + ready | ms for score/eligibility loop **including** final product sort |
| `match.list.cache_set_ms` | Miss + ready, around `cache.set` | ms |

Helpers mirror existing style, e.g. `recordMatchListCandidatesLoaded(n)`, `recordMatchListEvalQueryMs(ms)`, … wrapping private `emit`.

**Out of scope this story:** separate gauges for matchAction/mutual/about\* fetches; `viewer_setup_ms`; `candidates_scored` (use log `after=`).

### 2. Emit placement (locked)

| Path | Behavior |
|------|----------|
| Cache **hit** | `recordCacheHit` only (+ `load_time` from `list`) — **no** rebuild metrics |
| Cache **miss** → `not_ready` | No rebuild phase metrics |
| Cache **miss** → `ready` | Emit count + phase metrics from `buildFullRankedList`; emit `cache_set_ms` in `getOrBuildRankedList` around `cache.set` |

Do **not** double-emit rebuild metrics on hit. Prefer timers with `Date.now()`; wrap emits in try/catch only if needed beyond existing `emit` fail-open.

### 3. Tags / cardinality (locked)

- New metrics: **no tags** (especially no `userId` / `profileId`).
- Keep `result:hit|miss` only on existing `cache.hit_rate`.

### 4. Structured log (locked)

Enrich the existing `ME_MATCHES_LIST_OK` message (do not add a second summary line):

Keep: `before`, `after`, `filteredNoPhoto`, `candidatesHydrated`, `candidatesEligible`, `cap`

Add: `candidateLoadMs`, `evalQueryMs`, `scoreCpuMs`

`cacheSetMs` is timed in `getOrBuildRankedList` — either:

- **(preferred)** omit from list-OK line and emit metric only, **or**
- pass timing via a private field / rebuild return bag only if zero API surface change — **do not** add DTO keys.

Lock: **metric for `cache_set_ms`; list-OK line includes the three build-phase ms fields above.** Keep `profileId=` on the log line (existing; request context already has userId).

### 5. `filteredNoPhotoCandidates` (locked)

- **Do not rename** the HTTP/DTO field this story (v1 contract + integration asserts).
- Semantics remain Story 4: `baseCount - candidatesEligible` (photo + gender/age exclusions; not cap).
- Optional: one-line JSDoc clarifying the name is historical — nice-to-have, not required.

### 6. Tests (Agent 1)

- Mock `../observability/custom-metrics` (or spy exported recorders).
- Miss → ready: assert `recordMatchListCandidatesLoaded`, `recordMatchListEvalQueryMs`, `recordMatchListScoreCpuMs` (and load/eligible helpers) called.
- Hit: rebuild recorders **not** called; `recordCacheHit` called.
- Keep existing `match.list.load_time` path intact (no need to assert unless easy).

### 7. Agent 4

- **Skip.**

---

## Out of scope

- DTO / contract changes  
- Datadog dashboard JSON  
- Renaming `filteredNoPhotoCandidates`  
- UI changes  

---

## Agent 1 instructions

1. Add record helpers in `custom-metrics.ts`.
2. Instrument `buildFullRankedList` phases + miss `cache.set`; enrich `ME_MATCHES_LIST_OK`.
3. Specs per §6; `npm run build`.
4. Commit; write `agent-1-dev.md`. Optional README success-metrics bullet.

Suggested commit message:

```
feat(obs): instrument match-list cache-miss rebuild phases

Emit candidates_loaded, eval_query_ms, and score_cpu_ms alongside
existing match.list.load_time for cache-miss diagnosis.

Sprint 27 Story 5
```

---

## Agent 2 instructions

- [ ] Miss-only rebuild metrics; hit does not emit them
- [ ] Required metrics present; no userId tags
- [ ] `match.list.load_time` still recorded
- [ ] Fail-open; no API DTO change
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README (sprint complete if Story 5 Done).
- Write `agent-3-pm.md`.

---

## Open risks

1. Score loop includes hard-block about\* await — `score_cpu_ms` is “post-eval rebuild work,” not pure CPU; name is story-locked; document in helper JSDoc.  
2. Passing `cacheSetMs` into list-OK without DTO noise — metric-only is enough.
