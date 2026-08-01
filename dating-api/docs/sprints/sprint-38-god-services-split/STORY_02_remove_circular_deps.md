# Story 02 — Remove circular dependencies (`forwardRef`)

**Sprint 38 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Dependencies:** None (prefer before Story 03)  
**Repo:** `dating-api` only  
**Handoffs:** [architect](./handoffs/STORY_02_remove_circular_deps/agent-0-architect.md) · [dev](./handoffs/STORY_02_remove_circular_deps/agent-1-dev.md) · [cr](./handoffs/STORY_02_remove_circular_deps/agent-2-cr.md) · [pm](./handoffs/STORY_02_remove_circular_deps/agent-3-pm.md)

---

## Objective

Eliminate **service-level** `forwardRef` between `MeMatchesService` and `MatchListRankQueueService` via ports + Symbol tokens; resolve rebuild from the queue with `ModuleRef`.

## Why

Constructor `forwardRef` on both sides is a DIP smell. Enqueue callers should depend on `MatchListRankQueuePort`, not a circular concrete pair.

## Scope / tasks

1. Inventory all `forwardRef` (done in Architect handoff).
2. Add `src/workers/match-list-rank.ports.ts` — **do not** reuse Bull name `MATCH_LIST_RANK_QUEUE` string.
3. Queue implements port; rebuild via `ModuleRef.get(MATCH_LIST_RANK_REBUILD_PORT)`.
4. MeMatches (+ other enqueue callers) inject `MATCH_LIST_RANK_QUEUE_PORT` without `forwardRef`.
5. Keep module-level MeProfile ↔ Worker `forwardRef` (ProfileAnalysis still needs MeProfile); document leftovers.
6. Specs + typecheck green.

## Out of scope

- Rewriting Bull queue behavior
- Changing rebuild triggers / reasons
- Breaking Auth/Messaging/Admin `forwardRef` graphs
- Removing Worker↔MeProfile **module** `forwardRef` (follow-up)
- Full repository pattern (Sprint 39)

## Acceptance criteria

- [x] No `forwardRef` on the MeMatches ↔ MatchListRank queue **service** edge
- [x] Remaining `forwardRef` documented (module cycle + other modules)
- [x] `npm run typecheck` clean
- [x] Relevant specs green (`me-matches*`, `match-list-rank.worker*`)
- [x] App module still constructs in existing integration/smoke paths

## Suggested commit

```
refactor(workers): break MeMatches ↔ rank-queue circular DI

Sprint 38 Story 2
```
