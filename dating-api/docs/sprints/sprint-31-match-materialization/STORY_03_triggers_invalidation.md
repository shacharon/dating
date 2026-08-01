# Story 03 — Triggers + invalidation

**Sprint 31 · Status: PLANNED**  
**Priority:** P0  
**Estimated effort:** 0.5–1 day  
**Dependencies:** Story 02 rebuild job

---

## Objective

Enqueue rank rebuilds when match-relevant state changes, and define Redis/list cache invalidation so readers do not serve stale pages forever.

## Why

Without triggers, the table goes stale after analysis, preference edits, blocks, unmatches, etc.

## Scope / tasks

1. Architect locks **minimum** trigger set, e.g.:
   - Viewer or candidate analysis reaches `ANALYZED`  
   - Viewer preference change (gender/age/dealbreakers that affect eligibility)  
   - Block / unmatch / hard-block visibility events that remove a pair  
2. Enqueue with debounce / coalesce (same viewer multiple events → one job) if locked.  
3. Invalidate Redis match-list cache for that viewer when rebuild completes (or on enqueue — Architect chooses).  
4. Specs: trigger sites call enqueue (mocked queue); debounce if locked.

## Acceptance criteria

- [ ] Locked events enqueue rebuild  
- [ ] Coalesce/debounce behavior documented + tested if required  
- [ ] Cache invalidation strategy locked and implemented  
- [ ] No silent “never rebuild” path for analysis-complete

## Commit message

```
feat(matches): enqueue rank rebuilds on analysis and eligibility changes

Sprint 31 Story 3
```
