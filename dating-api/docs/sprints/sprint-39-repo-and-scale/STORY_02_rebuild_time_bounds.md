# Story 02 — Match list rebuild time-bounds

**Sprint 39 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 2 days  
**Dependencies:** Sprint 31 materialization; **does not** require Sprint 38 Story 03  
**Repo:** `dating-api` only  
**Handoffs:** [agent-0-architect.md](./handoffs/STORY_02_rebuild_time_bounds/agent-0-architect.md) · [agent-1-dev.md](./handoffs/STORY_02_rebuild_time_bounds/agent-1-dev.md) · [agent-2-cr.md](./handoffs/STORY_02_rebuild_time_bounds/agent-2-cr.md) · [agent-3-pm.md](./handoffs/STORY_02_rebuild_time_bounds/agent-3-pm.md)

---

## Objective

Prevent unbounded CPU/DB time on `rebuildMatchListRanks` when candidate pools are large: soft wall budget, **no partial persist**, optional one-shot requeue, metrics.

## Why

Caps exist (`MATCH_LIST_REBUILD_CANDIDATE_CAP`) but a full score loop can still dominate a worker. Persist deletes unscored rows — so partial snapshots are unsafe.

## Locked policy (Architect)

| Item | Decision |
|------|----------|
| Env | `MATCH_LIST_REBUILD_BUDGET_MS` (default **10000**) |
| On exceed | Skip persist + cache invalidate; `status: 'budget_exceeded'` |
| Requeue | Once with reason `rebuild_budget`; never when already that reason |
| List API | Unchanged; list builds get no deadline |

## Acceptance criteria

- [x] Documented rebuild budget constant/env
- [x] Budget-exceed path covered by tests (no persist)
- [x] Metrics/logs distinguish complete vs budget-stop
- [x] Existing enqueue coalesce still works
- [x] No list API contract change

## Suggested commit

```
perf(match-list): bound rank rebuild wall time

Sprint 39 Story 2
```
