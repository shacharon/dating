# Story 05 — Miss-path observability

**Sprint 27 · Status: IN REVIEW** (Agent 2 CR **PASS** → Agent 3 PM)  
**Priority:** P1  
**Estimated effort:** 0.5 day  
**Agent:** `generalPurpose`  
**Dependencies:** None (best after Stories 01–04 so metrics reflect the new path)

**Handoffs:** [architect](./handoffs/STORY_05_miss_path_observability/agent-0-architect.md) · [dev](./handoffs/STORY_05_miss_path_observability/agent-1-dev.md) · [cr](./handoffs/STORY_05_miss_path_observability/agent-2-cr.md)

---

## Objective

Instrument `buildFullRankedList` / list miss path with structured metrics so we can prove Stories 01–04 worked and catch regressions.

## Why

Today we have `match.list.load_time` and cache hit/miss. We cannot see whether time is spent in candidate load, eval batch, or CPU scoring.

## Scope / tasks

1. Read `dating-api/src/observability/custom-metrics.ts` patterns (`emit`, `recordCacheHit`, etc.).
2. Add metrics (names consistent with existing style), e.g.:
   - `match.list.candidates_loaded` (gauge/count of rows hydrated)
   - `match.list.eval_query_ms`
   - `match.list.score_cpu_ms`
   - optional: `match.list.candidates_eligible` if count query remains
3. Emit from `buildFullRankedList` (and/or `getOrBuildRankedList` on miss only — avoid double-count on hit).
4. Include same fields in a single structured log line on miss (request-id friendly) for CloudWatch grep.
5. Light unit test or assert emit helpers are called in an existing service spec if easy; otherwise document manual verify.

## Acceptance criteria

- [ ] Miss path emits candidates_loaded + eval_query_ms + score_cpu_ms (or equivalent names)
- [ ] Cache hit path does not spam rebuild metrics
- [ ] Existing `match.list.load_time` still recorded
- [ ] No PII in metric tags (user ids ok as low-cardinality? **prefer omit userId from metric labels** — use log line only)

## Notes / gotchas

- Keep cardinality low (no per-user metric labels).
- Fail-open: metric emit must never break list responses.

## Deliverables

Updated `custom-metrics.ts` + `me-matches.service.ts` (+ optional docs note in sprint README success metrics).

## Commit message

```
feat(obs): instrument match-list cache-miss rebuild phases

Emit candidates_loaded, eval_query_ms, and score_cpu_ms alongside
existing match.list.load_time for cache-miss diagnosis.

Sprint 27 Story 5
```
