# Handoff: Agent 3 — PM — Story 5

**Agent:** 3 PM  
**Story:** [STORY_05_cutover_deprecate_rebuild.md](../../STORY_05_cutover_deprecate_rebuild.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  
**Decision:** **ACCEPT**  
**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

Story 5 **accepted**. Architect locked default-on cutover + escape hatch + ops backfill; Dev landed (`82fc81a`); CR **PASS** (`875fd3b`). Materialized path is default; legacy via `MATCH_LIST_MATERIALIZED=0`. Agent 4 skipped.

**Sprint 31 is Done** — all five stories accepted; sprint-level acceptance checklist checked.

---

## Acceptance (story)

| Criterion | PM call |
|-----------|---------|
| Default list path does not O(N)-rebuild on GET | Met |
| Cap stopgap no longer defines browse membership | Met (`MATCH_LIST_CANDIDATE_CAP` legacy-only; rebuild cap still job-bound) |
| Backfill/ops steps documented | Met (`OPS_CUTOVER.md`) |
| Sprint-level checklist | Met (this handoff) |
| CR PASS | Met (Agent 2) |

---

## Docs updated

- `STORY_05_cutover_deprecate_rebuild.md` → **Done** + pm handoff  
- Sprint `README.md` → **Done**; all stories Done; acceptance boxes checked  

---

## Carry-forward (not blocking)

1. Ops: run `npm run match-list:backfill-ranks` after deploy (or rely on triggers + `list_empty`).  
2. Raise `MATCH_LIST_REBUILD_CANDIDATE_CAP` when fairness needs a broader pool.  
3. Candidate→viewer fan-out still deferred.  
4. Optional later: delete legacy Redis full-list path when escape hatch is unused.  
5. Sprint 20 live apply remains parked.

---

## Next

Sprint 31 complete. No further Story 5 agent cmds.
