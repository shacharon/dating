# Story 01 — Extract matching algorithm constants

**Sprint 38 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 0.5 day  
**Dependencies:** None  
**Repo:** `dating-api` only  
**Handoffs:** [architect](./handoffs/STORY_01_extract_matching_constants/agent-0-architect.md) · [dev](./handoffs/STORY_01_extract_matching_constants/agent-1-dev.md) · [cr](./handoffs/STORY_01_extract_matching_constants/agent-2-cr.md) · [pm](./handoffs/STORY_01_extract_matching_constants/agent-3-pm.md)

---

## Objective

Pull embedded scoring thresholds out of `match-engine.ts` into `src/matches/matching-algorithm.constants.ts` so tuning and review are not “magic number hunting.”

## Why

Audit found asymmetry thresholds (`6`/`9`), scale `0.92`, directional/final cap `90`, low-evidence `55`/`5`, and related pipeline knobs as literals. Blend weights already live in `engine/scoring.ts` (`COMPATIBILITY_BLEND_WEIGHTS`) — do not duplicate.

## Scope / tasks

1. Create `src/matches/matching-algorithm.constants.ts` (path **locked** by Architect).
2. Replace locked literals in `match-engine.ts` only (see Architect §2–§4).
3. JSDoc each constant (what it gates + why).
4. Keep numeric results identical — **zero score drift**.
5. Do **not** extract upsert batch `100` (Story 03). Do **not** touch deprecated `matches/scoring.ts`.

## Out of scope

- Changing score formulas or product ranking behavior
- Splitting the engine into stages (Sprint 40)
- UI / API changes

## Acceptance criteria

- [x] Named constants module exists and is imported by match engine path
- [x] No unexplained numeric literals for the audited thresholds in `match-engine.ts` stage helpers
- [x] `npm test` for match-engine / compatibility / scoring specs green
- [x] Smoke: `npm run smoke:matches` green (or documented skip if env-gated)
- [x] No DTO / HTTP contract changes

## Suggested commit

```
refactor(matches): extract matching algorithm constants

Sprint 38 Story 1
```
