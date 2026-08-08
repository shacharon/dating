# Story 02 — Matches list → React Query

**Sprint 47 · Status: Done**  
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

- [x] Matches list uses React Query infinite query
- [x] Invalidation on match actions works
- [x] Browse smoke / specs green

## Definition of Done

- [x] `useInfiniteQuery` + `queryKeys.me.matches.list`; hand-rolled cursor state removed
- [x] LIKE / PASS / BLOCK / undo invalidate matches list
- [x] `no_photo` gate + other `not_ready` redirects preserved
- [x] Analysis refresh refetches list
- [x] Celebration UX still works (mutual LIKE)
- [x] Specs green (hook + page + actions; Agent 2 / 3.5)
- [x] UX: Try again + soft load-more errors (Agent 3.5)
- [x] No Nest/Prisma/wire DTO / chip-enum changes
- [x] Agent 4: N/A (UI cache/pagination only)
- [ ] Agent 5 post-deploy: after production (1–3 days)
- [ ] Browser Network smoke: deferred by Agents 1–2 (REST; unit cursor/invalidate coverage OK — not a Done blocker)

## Suggested commit

```
refactor(ui): matches infinite list via React Query

Sprint 47 Story 2
```
