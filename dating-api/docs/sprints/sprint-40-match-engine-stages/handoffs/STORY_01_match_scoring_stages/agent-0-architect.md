# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_match_scoring_stages.md](../../STORY_01_match_scoring_stages.md)  
**Sprint:** sprint-40-match-engine-stages  
**Date:** 2026-08-02  
**Status:** complete  

**Mode:** Extract already-stage-shaped helpers from `match-engine.ts` into focused modules. Preserve **byte-identical scoring behavior** (same `finalScore`, explainability, debug provenance). **No** feature flag. **No** formula / weight changes. Skip Agent 4.

---

## Summary

Move compare-pipeline stages out of the ~830 LOC god file into `src/matches/compare-stages/`. Keep `compare` / `compareWithStatus` and all public DTO exports on `match-engine.ts` so callers (`me-matches`, `matches.service`, `engine/recompute`, list pipeline) do not change imports. Parity = existing `match-engine.spec.ts` (+ any new stage unit tests) green with **zero unexplained score drift**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| File | `src/matches/match-engine.ts` (~833 LOC) |
| Public API | `compare`, `compareWithStatus`, `hasAnalyzedSignals`, `isEvaluationPending`, `hasNumericSelfSignals` + DTO types |
| Callers | `me-matches.service`, `matches.service`, `matches-list.pipeline`, `engine/recompute`, `matches-api.controller` (types) |
| Constants | Already in `matching-algorithm.constants.ts` (Sprint 38 Story 01) — **do not** retune |
| Already extracted | `coverage-policy`, `friction-policy`, `display-policy`, `calibration-policy`, `interest-alignment`, explainability / recommendation |
| Deprecated | `matches/scoring.ts` — **do not touch** |
| Specs | `match-engine.spec.ts` (~513 LOC) is the golden suite |

---

## Artifacts (locked layout)

```text
dating-api/src/matches/compare-stages/
  util.ts                         # clampTo100, formatSignalKey (private helpers today)
  derive-contexts.ts              # Stage: deriveProfileContextsAndEnrichedSignals
  dealbreakers-balance.ts         # Stage: computeDealbreakersAndBalance
  directional-compatibility.ts    # Stage: computeDirectionalCompatibility
  coverage-asymmetry-friction.ts  # Stage: computeCoverageAsymmetryLowEvidenceAdjustments
  relationship-fit-values.ts      # Stage: computeRelationshipFitAndValuesAlignment
  compatibility-nuance.ts         # Stage: computeCompatibilityAndNuancePenalties
  assemble-result.ts              # buildDebugDto + buildFinalResultDto
  # optional: index.ts barrel for stages only — not required
```

`match-engine.ts` remains the **facade**:

- Guards + `compareWithStatus` / `compare` orchestration (current step order **locked** — see §2)
- Re-exports of public types
- `MATCH_DEBUG` log helper / counter
- Imports stages from `./compare-stages/*`

Do **not** invent `src/matches/stages/` (too vague vs HG/policy modules). Path is **`compare-stages/`**.

---

## Decisions (do not reverse without discussion)

### 1. No dual engine / no feature flag (locked)

| Choice | Lock |
|--------|------|
| Shadow old-vs-new runtime path | **No** |
| Feature flag | **No** |
| Temporary copy of old `compare` | **No** — extract in place |
| Parity proof | Existing + extended unit specs must stay green; scores must not drift |

If Agent 1 needs a safety net: generate **golden JSON fixtures** once from current `main` before extract (check into `compare-stages/__fixtures__/` or `match-engine.parity.spec.ts`), then assert `finalScore` / key DTO fields. Prefer extending current `makeProfile` cases over a second implementation.

### 2. Orchestration order in `compare()` (locked — do not reorder)

Current call order is **intentional** (comment stage numbers ≠ runtime order). Preserve exactly:

1. `deriveProfileContextsAndEnrichedSignals`
2. `computeDealbreakersAndBalance`
3. `computeDirectionalCompatibility`
4. `computeCoverageAsymmetryLowEvidenceAdjustments`
5. `computeRelationshipFitAndValuesAlignment`
6. `computeInterestAlignment` + `sharedInterestTags` (existing `interest-alignment.ts`)
7. `computeCompatibilityAndNuancePenalties`
8. `computeConfidenceAndInfoFlags` (`coverage-policy`)
9. `computeFrictionAndFrictionPenalties` (`friction-policy`)
10. Edge boost (`EDGE_BOOST_*` constants) on raw
11. `applyDealbreakerCap` → hard cap 90 → `applySparseFinalScoreCap`
12. `buildFinalResultDto` (includes display calibration + explainability + recommendation)

Do not “fix” numbering or merge steps for cleanliness.

### 3. What stays outside `compare-stages/` (locked)

| Module | Stay |
|--------|------|
| `coverage-policy.ts` | `computeConfidenceAndInfoFlags`, sparse cap helpers |
| `friction-policy.ts` | `computeFrictionAndFrictionPenalties` |
| `display-policy.ts` | `applyDirectionalDisplayCalibration` (called from assemble) |
| `interest-alignment.ts` | interest helpers |
| `matching-algorithm.constants.ts` | all knobs |
| `domain/dealbreakers`, `relationshipBalance`, `deriveContext` | unchanged |
| `compatibility/*`, `engine/*` | unchanged |

### 4. Export visibility (locked)

| Symbol | Visibility |
|--------|------------|
| Stage functions | **Not** required on public package API — export from stage files for unit tests only |
| DTOs / `compare*` / guards | Stay exported from `match-engine.ts` (import paths unchanged) |
| Moving DTOs to `match-engine.types.ts` | **Optional** — only if it shrinks facade without breaking callers; re-export from `match-engine.ts` |

### 5. Parity / tests (locked)

1. `npx jest src/matches/match-engine.spec.ts --runInBand` must pass.  
2. Add **at least one** focused stage unit test file (e.g. `compatibility-nuance.spec.ts` or `directional-compatibility.spec.ts`) proving a pure stage in isolation — optional but preferred.  
3. Representative pairs already in `match-engine.spec.ts` (sparse / dealbreaker / friction) must remain; if gaps found, add **one** sparse + **one** dealbreaker + **one** high-friction case asserting `finalScore` + `status`.  
4. `npm run typecheck` green.  
5. Do **not** change HTTP / me-matches DTO contracts.

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts src/matches/compare-stages --runInBand
npm run typecheck
# optional if env allows:
npm run smoke:matches
```

### 6. Out of scope

- Formula / weight / constant retuning  
- LLM narrative / HG eligibility gates  
- MeMatches god-split (Sprint 38 Story 03 still open)  
- MatchListRank persist (Story 02)  
- Prisma slow query (Story 03)  
- Touching deprecated `matches/scoring.ts`  

### 7. Agent 4

- **Skip.** Parity suite is the risk gate.

---

## Agent 1 instructions

1. Create `compare-stages/` files by **moving** existing functions (cut/paste; preserve logic).  
2. Slim `match-engine.ts` to guards + orchestration + type exports.  
3. Keep import sites on `./match-engine` (or `../matches/match-engine`) unchanged.  
4. Run parity specs; fix only move/wiring bugs — **no** score “improvements.”  
5. Short note in `agent-1-dev.md` listing files + confirm zero intentional formula change. Do not commit.

Suggested commit:

```
refactor(matches): extract compare pipeline into scoring stages

Sprint 40 Story 1
```

---

## Agent 2 CR checklist

- [ ] Stages under `src/matches/compare-stages/` per layout  
- [ ] `compare` step order unchanged  
- [ ] Callers still import public API from `match-engine`  
- [ ] No constant/formula retune; Sprint 38 constants module untouched numerically  
- [ ] `match-engine.spec.ts` green; typecheck green; no HTTP contract change  

---

## Next command

```text
--agent 1 sprint 40 story 1
```
