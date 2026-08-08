# Story 02 — Matches list → React Query

**Sprint 47 · Status: Planned**  
**Priority:** P1  
**Estimated effort:** 1–1.5 days  
**Dependencies:** Story 01 preferred  
**Repo:** `dating-ui`  
**Risk:** Medium (pagination / cache invalidation on actions)

---

## Objective

Replace hand-rolled matches infinite scroll (`use-infinite-matches` or equivalent) with TanStack Query infinite query pattern aligned with conversations (`query-keys`, invalidate on match actions).

## Why

Two pagination idioms raise learning cost and bug surface (stale list after like/pass).

## Scope / tasks

1. Architect locks query keys + invalidate rules (actions, celebration, photo gate).
2. Implement RQ infinite query; remove duplicate local cursor state where possible.
3. Preserve not_ready redirects / photo gate UX.
4. Specs for hook + page client.

## Out of scope

- Chip enum (Story 03)
- Backend API changes

## Acceptance criteria

- [ ] Matches list uses React Query infinite query
- [ ] Invalidation on match actions works
- [ ] Browse smoke / specs green

## Suggested commit

```
refactor(ui): matches infinite list via React Query

Sprint 47 Story 2
```
