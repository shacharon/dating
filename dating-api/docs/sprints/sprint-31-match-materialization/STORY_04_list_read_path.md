# Story 04 — List reads from materialization

**Sprint 31 · Status: PLANNED → Agent 0 Architect**  
**Priority:** P0  
**Estimated effort:** 1–1.5 days  
**Dependencies:** Stories 01–03 Done

---

## Objective

Change `GET /api/v1/me/matches` (and detail visibility assumptions as needed) so the **primary** ordered candidate set comes from the materialized table with **DB cursor pagination**, hydrating **only the current page**.

## Why

Serving from Redis-built full lists still implies expensive misses. Materialized rows + page hydrate is the scale read path.

## Scope / tasks

1. Architect locks: feature flag (`MATCH_LIST_MATERIALIZED=1` or similar), fallback when no rows yet (empty vs sync rebuild once vs enqueue+202 — **prefer enqueue + empty/stale with clear UX**, avoid sync full rebuild on GET).  
2. Implement list query: filter by `viewerUserId`, order, cursor, limit; join/hydrate profiles/photos for page only.  
3. Preserve client-facing DTO shape where possible (document breaks).  
4. Specs: empty table, flagged on/off, pagination cursor, page hydrate count bounded.

## Acceptance criteria

- [ ] Flagged/default path reads materialized ranks  
- [ ] Page hydrate does not load full pool  
- [ ] Cursor pagination stable  
- [ ] Fallback behavior locked (no surprise sync O(N) GET)

## Commit message

```
feat(matches): serve match list from materialized ranks

Sprint 31 Story 4
```
