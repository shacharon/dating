# Sprint 50 — Characterization / Mega-spec Decomposition (P0)

**Status:** Done  
**Depends on:** MeMatches split (38.3) Done  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md)  
**Repo:** `dating-api`  
**Round:** 2

---

## Goal

1. Split `me-matches.service.spec.ts` (~3k) along collaborators (ranking / detail / eligibility / cache)
2. Move `me-matches-eligibility-harness.ts` out of production `src/` (or into `test/` / `*.spec` support)
3. Budget: no new mega-spec &gt; ~400 LOC without ownership note — see [`SPEC_BUDGET.md`](../../SPEC_BUDGET.md)

**Spec budget:** soft LOC / ownership rules live in [`dating-api/docs/SPEC_BUDGET.md`](../../SPEC_BUDGET.md) (warn-only: `npm run check:spec-budget`).

**Non-goals:** Changing product behavior; PairMatchPolicy (46).

---

## Stories

| # | Story | Status |
|---|-------|--------|
| 01 | [Split me-matches unit specs](./STORY_01_split_me_matches_specs.md) | **Done** |
| 02 | [Relocate eligibility harness](./STORY_02_relocate_eligibility_harness.md) | **Done** |
| 03 | [Spec budget + CI guidance](./STORY_03_spec_budget.md) | **Done** |

**Order:** 01 → 02 → 03.

**Preferred merge tip:** `feature/sprint-50-story-3`
