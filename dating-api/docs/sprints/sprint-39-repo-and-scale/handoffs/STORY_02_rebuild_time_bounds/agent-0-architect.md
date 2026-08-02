# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_rebuild_time_bounds.md](../../STORY_02_rebuild_time_bounds.md)  
**Sprint:** sprint-39-repo-and-scale  
**Date:** 2026-08-02  
**Status:** complete  

**Mode:** Soft wall-clock budget on MatchListRank rebuild scoring. **Do not** persist partial snapshots (would delete unscored rows). Prefer budget-stop → skip persist → optional one-shot requeue. **No** list API / scoring formula changes. Skip Agent 4.

---

## Summary

Add `MATCH_LIST_REBUILD_BUDGET_MS` and check a deadline inside the rebuild scoring loop (`buildFullRankedList` when used for snapshot rebuild). On budget exceed: **abort without persist / without cache invalidate**, return `status: 'budget_exceeded'`, emit metric, log clearly. Worker may re-enqueue once with reason `rebuild_budget` (not when already that reason). Candidate cap env stays; this is an additional time guardrail.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Rebuild entry | `MeMatchesService.rebuildMatchListRanks` via `MATCH_LIST_RANK_REBUILD_PORT` |
| Snapshot | `buildMatchListRankSnapshot` → `buildFullRankedList` with `resolveMatchListRebuildCandidateCap()` |
| Persist | Upsert rows + **delete** `candidateProfileId notIn` snapshot — **unsafe for partial** |
| Queue | Bull jobId `rebuild:{viewerUserId}` coalesce; concurrency 1; inline if no Redis |
| Metrics today | `recordMatchListRankRebuildMs` |
| Sprint 38 Story 03 | **Not done** — implement on current `MeMatchesService`; do not wait for matches split |

---

## Decisions (do not reverse without discussion)

### 1. Policy (locked) — budget stop, no partial persist

| Choice | Lock |
|--------|------|
| Hard-fail job (throw) | **No** — treat as successful job completion with `budget_exceeded` outcome |
| Persist partial ranked set | **No** — would delete unscored `MatchListRank` rows |
| Merge/upsert-only persist | **Out of scope** this story |
| Soft wall budget | **Yes** |
| Requeue | **Yes, once** — see §4 |

When budget exceeded mid-score:

1. Stop scoring remaining candidates.  
2. **Do not** call `persistMatchListRankSnapshot`.  
3. **Do not** call `invalidateMatchListCache` (leave prior ranks + Redis as-is).  
4. Return rebuild result with `status: 'budget_exceeded'`, `rowsWritten: 0`, `rowsDeleted: 0`, `rebuildMs` as usual.  
5. Emit budget-stop metric + obs/trace distinguishing complete vs budget-stop.

### 2. Env / constant (locked)

| Item | Value |
|------|--------|
| Env | `MATCH_LIST_REBUILD_BUDGET_MS` |
| Default | **10000** (10s) |
| Invalid / unset / &lt; 1 | → default 10000 |
| Resolver | `resolveMatchListRebuildBudgetMs(env?)` in `match-list-candidate-cap.ts` **or** sibling `match-list-rebuild-budget.ts` (Agent 1 pick one file; prefer sibling if cap file is crowded) |

Ops note in Agent 1 handoff: raise budget and/or lower `MATCH_LIST_REBUILD_CANDIDATE_CAP` if `rebuild_budget` loops appear in logs.

### 3. Where to check deadline (locked)

- Pass into rebuild path only:

```ts
buildFullRankedList(viewerUserId, {
  candidateCap: resolveMatchListRebuildCandidateCap(),
  emitListAnalytics: false,
  deadlineAtMs: started + resolveMatchListRebuildBudgetMs(), // or nowFn
});
```

- Check **at the start of each candidate iteration** in the scoring loop (and optionally before heavy batch loads if cheap).  
- List / page-hydrate / legacy cache-miss paths: **no deadline** unless they call rebuild options (default undefined = unlimited).  
- `buildMatchListRankSnapshot` accepts optional deadline (from `rebuildMatchListRanks`).

Clock for tests: options `now?: () => number` default `Date.now` **or** inject `deadlineAtMs` already computed by caller with fake clock in unit tests.

### 4. Requeue rules (locked)

In `MatchListRankQueueService.runJob` after rebuild returns:

| Result | Action |
|--------|--------|
| `ready` / `not_ready` | Log as today; no special requeue |
| `budget_exceeded` and `reason !== 'rebuild_budget'` | `enqueueRebuild(viewerUserId, 'rebuild_budget')` (coalesce OK) |
| `budget_exceeded` and `reason === 'rebuild_budget'` | **Do not** requeue — log warn; ops must tune env |

Inline mode: same rules (fire-and-forget enqueue/rebuild). Avoid infinite inline recursion: if already `rebuild_budget`, stop.

### 5. Port / result type (locked)

Extend `MatchListRankRebuildResult` in `match-list-rank.ports.ts`:

```ts
export type MatchListRankRebuildResult = {
  status: 'ready' | 'not_ready' | 'budget_exceeded';
  reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
  rowsWritten: number;
  rowsDeleted: number;
  rebuildMs: number;
};
```

Update worker log line to include `status=budget_exceeded`. Update worker specs.

### 6. Metrics (locked)

| Metric | When |
|--------|------|
| `recordMatchListRankRebuildMs(ms)` | Always (including budget stop) |
| `recordMatchListRankRebuildBudgetStop()` → emit `match.list.rank_rebuild_budget_stop` count/1 | On budget exceed only |

Add helper next to existing rebuild metric in `custom-metrics.ts`.

### 7. Tests (locked)

1. Unit: rebuild / `buildFullRankedList` with injected past `deadlineAtMs` (or `now` advancing) → `budget_exceeded`, **persist not called** (spy).  
2. Worker: on `budget_exceeded` + reason `preferences_changed` → `enqueueRebuild(..., 'rebuild_budget')` once.  
3. Worker: on `budget_exceeded` + reason `rebuild_budget` → **no** second enqueue.  
4. Coalesce behavior unchanged for normal enqueue.  
5. Required:

```bash
cd dating-api
npx jest src/me-profile/me-matches.service.spec.ts src/workers/match-list-rank.worker.spec.ts src/me-profile/match-list-rebuild-cap.spec.ts --runInBand
# plus new budget resolver spec if split file
npm run typecheck
```

(If adding `match-list-rebuild-budget.spec.ts`, include it.)

### 8. Out of scope

- Checkpoint cursor / multi-chunk resume across jobs  
- Changing HG / score formulas  
- Partial persist / upsert-without-delete  
- Sprint 38 Story 03 MeMatches split  
- List HTTP contract  
- Separate worker process  

### 9. Agent 4

- **Skip.**

---

## Agent 1 instructions

1. Add budget env resolver + custom metric.  
2. Thread `deadlineAtMs` through rebuild → snapshot → `buildFullRankedList` loop.  
3. `rebuildMatchListRanks` skips persist/invalidate on budget exceed; returns new status.  
4. Worker requeue rules §4; update ports + specs.  
5. Short ops note in `agent-1-dev.md`. Do not commit.

Suggested commit:

```
perf(match-list): bound rank rebuild wall time

Sprint 39 Story 2
```

---

## Agent 2 CR checklist

- [ ] Budget env documented + default 10s  
- [ ] No partial persist on budget stop  
- [ ] List paths unaffected (no deadline by default)  
- [ ] Worker one-shot requeue rules correct  
- [ ] Metrics distinguish budget stop  
- [ ] Specs + typecheck green; coalesce preserved  

---

## Next command

```text
--agent 1 sprint 39 story 2
```
