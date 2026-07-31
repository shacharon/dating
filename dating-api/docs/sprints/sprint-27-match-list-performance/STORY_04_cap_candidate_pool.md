# Story 04 — Cap candidate pool (stopgap)

**Sprint 27 · Status: Done**  
**Priority:** P0 (stopgap)  
**Estimated effort:** 0.5 day  
**Agent:** `generalPurpose`  
**Dependencies:** Story 02 preferred (prefilter then cap)

**Handoffs:** [architect](./handoffs/STORY_04_cap_candidate_pool/agent-0-architect.md) · [dev](./handoffs/STORY_04_cap_candidate_pool/agent-1-dev.md) · [CR](./handoffs/STORY_04_cap_candidate_pool/agent-2-cr.md) · [PM](./handoffs/STORY_04_cap_candidate_pool/agent-3-pm.md)

---

## Objective

Bound how many candidates `buildFullRankedList` hydrates on a cache miss with an env-configurable **cap** (default **1000**), ordered by a stable freshness key (prefer `analyzedAt DESC`).

## Why

Even with batch evals + prefilter, an unbounded pool is unsafe at 50k+ users. Cap is a deliberate stopgap until async materialization.

## Scope / tasks

1. Add config, e.g. `MATCH_LIST_CANDIDATE_CAP` (default `1000`; `0` or unset policy: document — prefer default 1000, allow raise via env).
2. Apply `take: cap` (and `orderBy: { analyzedAt: 'desc' }`) on the candidate `findMany` in `buildFullRankedList`.
3. Keep `totalAnalyzedCandidates` count semantics clear in metrics/logs:
   - Either continue counting full eligible set for telemetry, or document that `total` in response still reflects ranked list length after filters — **do not silently lie** to the client. Prefer: response pagination unchanged; optional log field `candidatesHydrated` vs `candidatesEligible`.
4. Document in `dating-api/.env.example` and a one-line comment in service.
5. Tests: when cap=2, only 2 candidates scored (with fixtures).

## Acceptance criteria

- [x] Miss path never hydrates more than `MATCH_LIST_CANDIDATE_CAP` rows
- [x] Default cap = 1000
- [x] Order is deterministic (`analyzedAt DESC`, tie-break `id` if needed)
- [x] Documented as temporary until materialized rankings
- [x] Tests cover cap behavior

## Notes / gotchas

- Cap after SQL prefilter (Story 02), not before — otherwise you waste the cap on wrong genders.
- Redis still caches whatever was ranked — smaller input → smaller ranked list → smaller cache payload (good).

## Deliverables

Config + `me-matches.service.ts` changes + `.env.example` note + tests.

## Commit message

```
perf(matches): cap match-list candidate hydrate on cache miss

Add MATCH_LIST_CANDIDATE_CAP (default 1000) with analyzedAt ordering
as a stopgap until async match materialization.

Sprint 27 Story 4
```
