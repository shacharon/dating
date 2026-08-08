# Story 02 — Queue concurrency + metrics

**Sprint 48 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Dependencies:** Story 01 preferred  
**Repo:** `dating-api`

---

## Objective

Cap Bull processor concurrency for analysis/photo (match-list-rank already uses `process(1, …)`). Add enqueue / fail / coalesce / inline-fallback metrics or structured traces.

## Acceptance criteria

- [x] Architect-locked concurrency per queue
- [x] Metrics or ErrorCodes cover degrade/inline path
- [x] Specs / smoke green

## Definition of Done

- [x] Schema: N/A
- [x] API: N/A
- [x] UI: N/A
- [x] `process(N)` default **1** for analysis + photo; env-overridable
- [x] Ready log includes `concurrency=`
- [x] `recordQueueEvent` for enqueued / coalesced / inline / failed / degraded
- [x] ErrorCodes DEGRADED / ENQUEUE_FAILED / PHOTO RUN_FAILED (+ Story 01 traces)
- [x] Specs green (Agent 2: 62 passed)
- [x] Agents 2.5 / 3.5 / 4: N/A
- [ ] Agent 5 post-deploy (after production)
- [ ] Optional: DEPLOY_AWS_DEV concurrency env docs (deferred, non-blocking)

## Commits

- `38707c1` — feat(workers): concurrency caps + queue observability
- `0153afb` — test(workers): harden sprint 48 story 2 queue concurrency coverage

## Suggested commit

```
feat(workers): concurrency caps + queue observability

Sprint 48 Story 2
```
