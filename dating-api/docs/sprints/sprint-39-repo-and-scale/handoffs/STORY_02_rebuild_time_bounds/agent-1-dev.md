# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 implement  
**Story:** [STORY_02_rebuild_time_bounds.md](../../STORY_02_rebuild_time_bounds.md)  
**Sprint:** sprint-39-repo-and-scale  
**Date:** 2026-08-02  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Soft wall budget `MATCH_LIST_REBUILD_BUDGET_MS` (default 10s) on rebuild scoring. Budget stop skips persist + cache invalidate, returns `budget_exceeded`, emits `match.list.rank_rebuild_budget_stop`. Worker requeues once as `rebuild_budget`; does not loop when already that reason.

---

## Files

| Path | Change |
|------|--------|
| `match-list-rebuild-budget.ts` (+ spec) | Env resolver |
| `custom-metrics.ts` | `recordMatchListRankRebuildBudgetStop` |
| `match-list-rank.ports.ts` | `status: 'budget_exceeded'` |
| `me-matches.service.ts` | deadline in scoring loop; rebuild skip persist |
| `match-list-rank.worker.ts` | requeue rules |
| `match-list-rank.budget.spec.ts` | worker requeue tests |
| `match-list-rank-persist.spec.ts` | no-op persist + rebuild skip |

---

## Ops

| Env | Default | Notes |
|-----|---------|--------|
| `MATCH_LIST_REBUILD_BUDGET_MS` | `10000` | Soft rebuild scoring budget |
| `MATCH_LIST_REBUILD_CANDIDATE_CAP` | `5000` | Existing hydrate cap |

If logs show repeated `budget_exceeded again … not requeueing`, raise budget and/or lower candidate cap.

---

## Tests

```bash
npx jest src/me-profile/match-list-rebuild-budget.spec.ts src/me-profile/match-list-rank-persist.spec.ts src/workers/match-list-rank.worker.spec.ts src/workers/match-list-rank.budget.spec.ts src/me-profile/match-list-rebuild-cap.spec.ts --runInBand
# 5 suites, 14 tests — passed

npm run typecheck
# passed
```

Optional full me-matches suite not required for AC (rebuild path covered via persist spy).

---

## Commit

Not committed (Agent 3). Suggested:

```
perf(match-list): bound rank rebuild wall time

Sprint 39 Story 2
```

---

## Next command

```text
--agent 2 sprint 39 story 2
```
