# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_remove_circular_deps.md](../../STORY_02_remove_circular_deps.md)  
**Sprint:** sprint-38-god-services-split  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** DI / Nest wiring only — **no Bull behavior change**, no rebuild semantics change. Skip Agent 4.

---

## Summary

Break the **service-level** cycle `MeMatchesService` ↔ `MatchListRankQueueService` (both use `forwardRef` today) via a small ports file + Symbol tokens. Resolve rebuild from the queue with `ModuleRef` so the queue constructor does **not** inject `MeMatchesService`. Inject the queue **port** into me-profile callers (no `forwardRef`).

**Keep** module-level `forwardRef(() => MeProfileModule)` / `forwardRef(() => WorkerModule)` this story — `ProfileAnalysisQueueService` still constructor-injects `MeProfileAnalysisService` + `MeMatchesService`, so Worker still needs MeProfile. Document remaining `forwardRef` inventory; do not expand scope to Auth/Messaging/Admin cycles.

---

## Inventory (`forwardRef` under `src/`)

| Location | Edge | This story |
|----------|------|------------|
| `me-matches.service.ts` | → `MatchListRankQueueService` | **Remove** |
| `match-list-rank.worker.ts` | → `MeMatchesService` | **Remove** |
| `me-profile.module.ts` | → `WorkerModule` | **Keep** (document) |
| `worker.module.ts` | → `MeProfileModule` | **Keep** (document) |
| `me-profile.module.ts` | → `AuthModule`, `MessagingRealtimeModule` | Out of scope |
| `messaging-realtime.module.ts` | → `MeProfileModule` | Out of scope |
| `admin.module.ts` | → `WorkerModule`, `AuthModule` | Out of scope |
| `reports.module.ts` / `me-account.module.ts` | → `AuthModule` | Out of scope |

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/workers/match-list-rank.ports.ts` | **New** — ports + Symbol tokens (locked below) |
| `dating-api/src/workers/match-list-rank.worker.ts` | Implement queue port; `ModuleRef` for rebuild; drop `forwardRef`/`MeMatchesService` ctor inject |
| `dating-api/src/workers/worker.module.ts` | Provide/export `MATCH_LIST_RANK_QUEUE_PORT` via `useExisting` |
| `dating-api/src/me-profile/me-matches.service.ts` | Inject queue **port**; drop `forwardRef` |
| `dating-api/src/me-profile/me-profile.service.ts` | Inject queue port (not concrete class) |
| `dating-api/src/me-profile/me-match-actions.service.ts` | Inject queue port |
| `dating-api/src/me-profile/me-conversations.service.ts` | Inject queue port |
| `dating-api/src/workers/profile-analysis.worker.ts` | Inject queue port for enqueue (may keep concrete `MeMatchesService` for invalidate) |
| Specs that `new MatchListRankQueueService(meMatches)` | Construct with `ModuleRef` mock / updated ctor |

**Do not rename** Bull queue string in `match-list-rank.queue.ts` (`export const MATCH_LIST_RANK_QUEUE = 'match-list-rank'`). Port token must be a **different** name.

---

## Decisions (do not reverse without discussion)

### 1. Ports file (locked)

Path: `dating-api/src/workers/match-list-rank.ports.ts`

```ts
import type { /* reuse return type from MeMatchesService.rebuildMatchListRanks */ } from '...';

/** DI token — NOT the Bull queue name string in match-list-rank.queue.ts */
export const MATCH_LIST_RANK_QUEUE_PORT = Symbol('MATCH_LIST_RANK_QUEUE_PORT');

export interface MatchListRankQueuePort {
  enqueueRebuild(viewerUserId: string, reason?: string): Promise<string>;
  isBullEnabled(): boolean;
}

/** DI token for rebuild runner (MeMatchesService via useExisting or ModuleRef.get) */
export const MATCH_LIST_RANK_REBUILD_PORT = Symbol('MATCH_LIST_RANK_REBUILD_PORT');

export interface MatchListRankRebuildPort {
  rebuildMatchListRanks(
    viewerUserId: string,
    reason?: string,
  ): Promise<{
    status: 'ready' | 'not_ready';
    reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
    rowsWritten: number;
    rowsDeleted: number;
    rebuildMs: number;
  }>;
}
```

Return type may be inlined or imported as a named type alias from `me-matches.service.ts` if already exported — Agent 1 may extract a small type alias if needed (no behavior change).

### 2. Break direction (locked)

| Consumer | Depends on | How |
|----------|------------|-----|
| `MeMatchesService` (+ profile/actions/conversations enqueue callers) | `MatchListRankQueuePort` | `@Inject(MATCH_LIST_RANK_QUEUE_PORT)` — **no** `forwardRef` |
| `MatchListRankQueueService` | `MatchListRankRebuildPort` | **`ModuleRef.get(MATCH_LIST_RANK_REBUILD_PORT, { strict: false })`** inside `runJob` / helper — **no** constructor inject of `MeMatchesService` |

Why ModuleRef on the worker side: ensures Nest can construct the queue without waiting on `MeMatchesService`, which is the half that also needs the queue. Call `get` only when a job runs (after app init), not in constructor.

Optional: cache the port after first `get` on a private field.

### 3. Module providers (locked)

**WorkerModule**

```ts
providers: [
  MatchListRankQueueService,
  {
    provide: MATCH_LIST_RANK_QUEUE_PORT,
    useExisting: MatchListRankQueueService,
  },
  // ...other workers
],
exports: [
  MatchListRankQueueService,
  MATCH_LIST_RANK_QUEUE_PORT,
  // ...
],
imports: [
  forwardRef(() => MeProfileModule), // KEEP — ProfileAnalysisQueueService needs MeProfile services
],
```

**MeProfileModule**

```ts
providers: [
  MeMatchesService,
  {
    provide: MATCH_LIST_RANK_REBUILD_PORT,
    useExisting: MeMatchesService,
  },
  // ...
],
exports: [
  MeMatchesService,
  MATCH_LIST_RANK_REBUILD_PORT,
  // existing exports
],
imports: [
  forwardRef(() => WorkerModule), // KEEP this story
  // ...
],
```

`MatchListRankQueueService` must `implements MatchListRankQueuePort`.  
`MeMatchesService` must satisfy `MatchListRankRebuildPort` (structural typing OK; explicit `implements` preferred).

### 4. Callers that enqueue (locked — switch to port)

All must inject `@Inject(MATCH_LIST_RANK_QUEUE_PORT) private readonly matchListRankQueue: MatchListRankQueuePort`:

- `MeMatchesService`
- `MeProfileService`
- `MeMatchActionsService`
- `MeConversationsService`
- `ProfileAnalysisQueueService` (enqueue only; keep `MeMatchesService` for cache invalidate if already used)

Do **not** change enqueue reasons / call sites beyond the type of the dependency.

### 5. Specs (locked)

- `match-list-rank.worker.spec.ts`: stop `new MatchListRankQueueService(meMatches)`. Pass a `ModuleRef` mock whose `get` returns the fake rebuild port; or use Nest `Test.createTestingModule` with tokens.
- Unit tests that `new MeMatchesService(..., matchListRankQueue as never)` keep passing a `{ enqueueRebuild, isBullEnabled? }` stub — no Nest token required for manual `new`.
- Nest testing modules that `overrideProvider(MatchListRankQueueService)` should also override `MATCH_LIST_RANK_QUEUE_PORT` **or** provide `useExisting` — Agent 1 fix any broken integration specs.

### 6. Remaining forwardRef (locked documentation)

Agent 1 must add a short comment block (or 5–10 lines in story handoff / this sprint README) listing leftover module `forwardRef`s and that Story 2 **intentionally** kept MeProfile ↔ Worker module cycle because of `ProfileAnalysisQueueService`. Optional follow-up ticket text: “break Worker→MeProfile via analysis ports + ModuleRef.”

### 7. Non-goals

- No Bull queue rename, attempts, backoff, jobId coalesce changes  
- No Story 03 service split  
- No Auth/Messaging circular cleanup  
- No removing `forwardRef` from Worker↔MeProfile modules  

### 8. Agent 4

- **Skip.**

---

## Acceptance mapping

| AC | How |
|----|-----|
| No `forwardRef` on MeMatches ↔ rank-queue **service** edge | Locked §2–§3 |
| Document remaining `forwardRef` | Locked §6 |
| `typecheck` / `build` | Agent 1 |
| `me-matches*`, `match-list-rank.worker*` specs | Agent 1 |
| App still constructs | smoke / existing HTTP integration |

---

## Agent 1 instructions

1. Add `match-list-rank.ports.ts` per §1.
2. Refactor `MatchListRankQueueService` per §2 (`ModuleRef`, implement port).
3. Wire providers/exports per §3.
4. Switch enqueue injectors per §4; remove `forwardRef` imports from `me-matches.service.ts` and `match-list-rank.worker.ts`.
5. Fix specs per §5; run:

```bash
cd dating-api
npx jest src/workers/match-list-rank.worker.spec.ts src/me-profile/me-matches.service.spec.ts src/me-profile/me-matches-materialized-list.spec.ts src/me-profile/me-match-actions.service.spec.ts --runInBand
npm run typecheck
```

Optional: `npm run smoke:me-profile` if env allows.

6. Write `agent-1-dev.md`. Do not commit (Agent 3).

Suggested commit message:

```
refactor(workers): break MeMatches ↔ rank-queue circular DI

Sprint 38 Story 2
```

---

## Agent 2 CR checklist

- [ ] No `forwardRef` in `me-matches.service.ts` or `match-list-rank.worker.ts`
- [ ] Port token ≠ Bull queue name `MATCH_LIST_RANK_QUEUE` string export
- [ ] Queue uses `ModuleRef.get(MATCH_LIST_RANK_REBUILD_PORT)` (not ctor `MeMatchesService`)
- [ ] Enqueue callers use `MATCH_LIST_RANK_QUEUE_PORT`
- [ ] Module-level MeProfile ↔ Worker `forwardRef` still present and documented
- [ ] No Bull semantics drift
- [ ] Specs + typecheck green

---

## Next command

```text
--agent 1 sprint 38 story 2
```
