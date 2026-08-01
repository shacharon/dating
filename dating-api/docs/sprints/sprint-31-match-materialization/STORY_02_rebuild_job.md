# Story 02 — Rebuild job (Bull)

**Sprint 31 · Status: Architect locked → Agent 1 Dev**  
**Priority:** P0  
**Estimated effort:** 1–1.5 days  
**Dependencies:** Story 01 schema

**Handoff:** [`handoffs/STORY_02_rebuild_job/agent-0-architect.md`](./handoffs/STORY_02_rebuild_job/agent-0-architect.md)

---

## Objective

Implement an async **Bull job** that, for a given `viewerUserId`, scores eligible candidates (reuse Sprint 27 scoring / prefilter helpers) and **upserts** materialized rank rows.

## Why

Ranking must leave the HTTP request path. Jobs are the write path for the table.

## Scope / tasks

1. Architect locks: queue name, job payload, idempotency, concurrency, failure/retry, whether full replace vs upsert-diff, max candidates processed per job (job-internal cap ≠ browse fairness cap). ✅
2. Processor: load viewer + pool → score → write rows; delete stale candidates no longer eligible (Architect locks soft-delete vs delete-many).
3. Metrics/logs: `rebuild_ms`, `candidates_scored`, `rows_written`, job reason.
4. Specs: processor with fixtures; empty pool; error path.

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| Queue | `match-list-rank` · jobId `rebuild:{viewerUserId}` · concurrency **1** |
| Payload | `{ viewerUserId, reason? }` |
| Score path | `buildMatchListRankSnapshot` extract — **not** raw `buildFullRankedList` |
| Cap | `MATCH_LIST_REBUILD_CANDIDATE_CAP` default **5000** (≠ list cap) |
| Persist | Upsert + `deleteMany` stale / clear on not_ready |
| After write | `invalidateMatchListCache` — do **not** enqueue from list GET |

## Acceptance criteria

- [ ] Job can rebuild one viewer end-to-end in tests  
- [ ] Rows appear in materialized table ordered by score  
- [ ] Stale ineligible candidates removed or marked per lock  
- [ ] Does not run on every list GET

## Commit message

```
feat(matches): add Bull job to rebuild materialized ranks

Sprint 31 Story 2
```
