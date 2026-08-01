# Handoff: Agent 1 — Dev — Story 5

**Agent:** 1 dev  
**Story:** [STORY_05_cutover_deprecate_rebuild.md](../../STORY_05_cutover_deprecate_rebuild.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Cut over list reads to **materialized by default** (`MATCH_LIST_MATERIALIZED` unset = on). Escape hatch `0`/`false`/`no` keeps legacy Redis+rebuild. Ops runbook + rate-limited backfill script. Cap comments/docs updated. Agent 4 skipped.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| Default on (unset/blank) | Pass |
| Off only 0/false/no | Pass |
| Legacy path retained | Pass |
| Cap docs: list=legacy, rebuild=membership bound | Pass |
| OPS_CUTOVER + backfill script | Pass |
| Specs default-on + escape hatch | Pass |
| No delete of buildFullRankedList | Pass |

---

## Changes

| Path | Change |
|------|--------|
| `match-list-materialized-flag.ts` (+spec) | Default on |
| `me-matches.service.ts` | Legacy `source=legacy` trace |
| `me-matches-materialized-list.spec.ts` / service specs | Default-on + pin legacy suites to `=0` |
| `match-list-candidate-cap.ts` | Comment cutover |
| `match-list-rank-backfill.ts` (+spec) | Viewer where + delay helper |
| `scripts/enqueue-match-list-rank-backfill.ts` | Enqueue script |
| `OPS_CUTOVER.md` | Ops runbook |
| `.env.example` / package.json / Sprint 27 / SCALE | Docs + npm script |

---

## Next

Agent 2 CR → Agent 3 accept sprint Done.
