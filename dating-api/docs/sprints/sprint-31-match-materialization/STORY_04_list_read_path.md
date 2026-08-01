# Story 04 — List reads from materialization

**Sprint 31 · Status: CR PASS → Agent 3 PM**  
**Priority:** P0  
**Estimated effort:** 1–1.5 days  
**Dependencies:** Stories 01–03 Done

**Handoff:** [`handoffs/STORY_04_list_read_path/agent-2-cr.md`](./handoffs/STORY_04_list_read_path/agent-2-cr.md)

---

## Objective

Change `GET /api/v1/me/matches` (and detail visibility assumptions as needed) so the **primary** ordered candidate set comes from the materialized table with **DB cursor pagination**, hydrating **only the current page**.

## Why

Serving from Redis-built full lists still implies expensive misses. Materialized rows + page hydrate is the scale read path.

## Scope / tasks

1. Architect locks: feature flag (`MATCH_LIST_MATERIALIZED`), fallback when no rows yet. ✅  
2. Implement list query: filter by `viewerUserId`, order, cursor, limit; join/hydrate profiles/photos for page only. ✅  
3. Preserve client-facing DTO shape where possible (document breaks). ✅  
4. Specs: empty table, flagged on/off, pagination cursor, page hydrate count bounded. ✅

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| Flag | `MATCH_LIST_MATERIALIZED` — **default off** this story |
| Flag on | DB cursor from `MatchListRank`; page hydrate only; **no** sync full rebuild |
| Empty ranks | Enqueue `list_empty` + empty `ready` 200; Redis NX 120s thrash guard |
| Cursor | Same `{ b, s, id }`; **nextCursor from rank rows** |
| Detail / default-on | Out of scope (Story 05 for default) |

## Acceptance criteria

- [x] Flagged/default path reads materialized ranks  
- [x] Page hydrate does not load full pool  
- [x] Cursor pagination stable  
- [x] Fallback behavior locked (no surprise sync O(N) GET)

## Commit message

```
feat(matches): serve match list from materialized ranks

Sprint 31 Story 4
```
