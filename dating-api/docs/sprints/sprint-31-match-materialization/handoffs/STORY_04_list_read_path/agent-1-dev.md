# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_list_read_path.md](../../STORY_04_list_read_path.md)  
**Sprint:** sprint-31-match-materialization  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Flagged `GET /me/matches` path reads `MatchListRank` with DB cursor + page hydrate. Empty ranks enqueue `list_empty` with Redis NX thrash guard. Flag default **off**. Legacy Redis+full rebuild unchanged. Agent 4 skipped.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| `MATCH_LIST_MATERIALIZED` default off | Pass |
| Flag on: no full-pool rebuild / no Redis list read | Pass |
| Viewer gate (same not_ready reasons) | Pass |
| DB order + `{ b, s, id }` cursor; nextCursor from ranks | Pass |
| Empty → enqueue `list_empty` + NX 120s; empty 200 | Pass |
| Page hydrate via `candidateProfileIds` (bounded) | Pass |
| Pool meta omitted on materialized path | Pass |
| Specs flag on/off / empty / page / cursor | Pass |

---

## Changes

| Path | Change |
|------|--------|
| `match-list-materialized-flag.ts` (+spec) | Env helper |
| `match-list-cache.ts` / `redis-cache.service.ts` | list-empty key + `setNx` |
| `me-matches.service.ts` | Flagged list path; gate; rank page; page hydrate option |
| `me-matches-materialized-list.spec.ts` | Story 4 cases |
| `match-list-rank.worker.ts` | `forwardRef` for circular DI |
| `.env.example` | Document flag |

**DTO note:** `totalCandidatesBeforeFilter` / `filteredNoPhotoCandidates` omitted on materialized path.

---

## Next

Agent 2 CR → Story 05 cutover.
