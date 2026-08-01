# Handoff: Agent 3 — PM — Story 2

**Agent:** 3 PM  
**Story:** [STORY_02_rebuild_job.md](../../STORY_02_rebuild_job.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  
**Decision:** **ACCEPT**  
**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

Story 2 **accepted**. Architect locked Bull `match-list-rank` rebuild; Dev landed (`0b0211c`); CR **PASS** with coalesce harden (`640efd7`). All acceptance criteria met. Agent 4 skipped. Triggers not wired yet (Story 03).

---

## Acceptance

| Criterion | PM call |
|-----------|---------|
| Job rebuilds one viewer end-to-end in tests | Met |
| Rows upserted; stale deleted | Met |
| Does not run on every list GET | Met |
| CR PASS | Met (Agent 2) |

---

## Docs updated

- `STORY_02_rebuild_job.md` → **Done** + pm handoff  
- Sprint `README.md` → Story 02 Done; next Story 3 Agent 0  

---

## Carry-forward (not blocking)

1. Story 03: enqueue on analysis / prefs / block (+ debounce on jobId).  
2. Snapshot still builds full list DTOs internally — optional thin-path refactor later.  
3. Rebuild cap 5000 still fairness-bounded until Story 05.

---

## Next cmd

```text
--agent 0 sprint 31 story 3
```
