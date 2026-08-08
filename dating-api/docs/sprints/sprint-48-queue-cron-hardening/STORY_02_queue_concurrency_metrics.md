# Story 02 — Queue concurrency + metrics

**Sprint 48 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Dependencies:** Story 01 preferred  
**Repo:** `dating-api`

---

## Objective

Cap Bull processor concurrency for analysis/photo (match-list-rank already uses `process(1, …)`). Add enqueue / fail / coalesce / inline-fallback metrics or structured traces.

## Acceptance criteria

- [ ] Architect-locked concurrency per queue
- [ ] Metrics or ErrorCodes cover degrade/inline path
- [ ] Specs / smoke green

## Suggested commit

```
feat(workers): concurrency caps + queue observability

Sprint 48 Story 2
```
