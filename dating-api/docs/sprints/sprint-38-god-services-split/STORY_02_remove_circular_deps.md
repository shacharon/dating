# Story 02 — Remove circular dependencies (`forwardRef`)

**Sprint 38 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Dependencies:** None (prefer before Story 03)  
**Repo:** `dating-api` only

---

## Objective

Eliminate `forwardRef` between `MeMatchesService` and `MatchListRankQueueService` by introducing a token/interface for the rank queue and registering it in the Nest module graph without cycles.

## Why

`@Inject(forwardRef(() => MatchListRankQueueService))` is a DIP smell and makes module boot / testing fragile. Match list rebuild enqueue should depend on an abstraction owned by the workers (or a thin ports file), not a circular concrete pair.

## Scope / tasks

1. Inventory all `forwardRef` usages under `src/` (not only matches).
2. For match-list path: define `IMatchListRankQueue` (or injection token) with `enqueueRebuild` / `isBullEnabled` (Architect locks surface).
3. Implement on `MatchListRankQueueService`; provide token in `WorkerModule` / `MeProfileModule` as needed.
4. Inject the token into `MeMatchesService` (and any other consumers) **without** `forwardRef`.
5. Confirm Nest boots and unit/integration tests for match list + workers pass.

## Out of scope

- Rewriting Bull queue behavior
- Changing rebuild triggers semantics
- Full repository pattern (Sprint 39)

## Acceptance criteria

- [ ] No `forwardRef` on the MeMatches ↔ MatchListRank queue edge
- [ ] Document remaining `forwardRef` (if any) with ticket/follow-up or fix in-sprint if small
- [ ] `npm run build` / `typecheck` clean
- [ ] Relevant specs green (`me-matches*`, `match-list-rank.worker*`)
- [ ] App module still constructs in existing integration/smoke paths

## Suggested commit

```
refactor(workers): break MeMatches ↔ rank-queue circular DI

Sprint 38 Story 2
```
