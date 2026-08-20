# Sprint 50 — Characterization / Mega-spec Decomposition (P0)

**Status:** In Progress (Stories 01–02 Done)  
**Depends on:** MeMatches split (38.3) Done  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md)  
**Repo:** `dating-api`  
**Round:** 2

---

## Goal

1. Split `me-matches.service.spec.ts` (~3k) along collaborators (ranking / detail / eligibility / cache)
2. Move `me-matches-eligibility-harness.ts` out of production `src/` (or into `test/` / `*.spec` support)
3. Budget: no new mega-spec &gt; ~400 LOC without ownership note

**Non-goals:** Changing product behavior; PairMatchPolicy (46).

---

## Stories

| # | Story | Status |
|---|-------|--------|
| 01 | [Split me-matches unit specs](./STORY_01_split_me_matches_specs.md) | **Done** |
| 02 | [Relocate eligibility harness](./STORY_02_relocate_eligibility_harness.md) | **Done** |
| 03 | [Spec budget + CI guidance](./STORY_03_spec_budget.md) | Planned |

**Order:** 01 → 02 → 03.

**Preferred merge tip (after Story 02):** `feature/sprint-50-story-2`
