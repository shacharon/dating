# Handoff: Agent 1 — Dev — Story 3

**Agent:** 1 dev  
**Story:** [STORY_03_remove_low_info_profile_ids.md](../../STORY_03_remove_low_info_profile_ids.md)  
**Sprint:** sprint-05-prod-stability  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- Removed `LOW_INFO_PROFILE_IDS` / `applyLowInfoCap` from `match-engine.ts`.
- Added **sparse coverage final cap** in `coverage-policy.ts`: `coveragePercent < 50` OR `minPresent <= 5` → `finalScore ≤ 55`.
- `LOW_COVERAGE` flag now uses shared `LOW_COVERAGE_PERCENT_THRESHOLD`.
- Debug `provenance` includes `sparse_final_cap` when policy applies.
- **1280/1280** tests pass; `npm run build` green.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/matches/coverage-policy.ts` | Threshold constants + `shouldApplySparseFinalScoreCap` + `applySparseFinalScoreCap`; refactored LOW_COVERAGE check |
| `src/matches/coverage-policy.spec.ts` | **New** — unit tests for cap triggers |
| `src/matches/match-engine.ts` | Wire sparse cap; remove profile-id hack; provenance via `sparseFinalCapApplied` |
| `src/matches/calibration-policy.ts` | `CapsCalibrationState.sparseFinalCapApplied` optional field |
| `src/matches/match-engine.spec.ts` | Sparse cap assertions; Tier1 vs Tier3 uses full coverage for tier1 pair |
| `docs/match-engine-overview.md` | Replaced LOW_INFO / profile 19 docs with sparse coverage cap |

---

## Policy (locked per architect)

| Constant | Value |
|----------|-------|
| `LOW_COVERAGE_PERCENT_THRESHOLD` | 50 |
| `SPARSE_MIN_PRESENT_SIGNALS` | 5 |
| `SPARSE_FINAL_SCORE_CAP` | 55 |

**Pipeline order:** dealbreakers → `min(90, …)` → sparse final cap → DTO.

---

## Grep hygiene

```text
rg "LOW_INFO_PROFILE_IDS|applyLowInfoCap" src/   → no matches
```

`SPARSE_PATCH_PROFILE_IDS` in extraction remains (out of scope).

---

## Verification

| Command | Result |
|---------|--------|
| `npx jest src/matches/coverage-policy.spec.ts src/matches/match-engine.spec.ts` | pass |
| `npm test` | **1280/1280** |
| `npm run build` | pass |

---

## Test notes

- Tier1 vs Tier3 regression: tier1 pair uses `makeSignals({})` (100% coverage) so not capped at 55; tier3-only pair still sparse-capped.
- Low-coverage tests assert `finalScore <= 55` and `sparse_final_cap` provenance.

---

## Open questions / blockers

- None for Agent 2.
- Golden pairs script not run (`validate:golden-pairs` optional).

---

## Next agent

```text
--agent 2 sprint 5 story 3
```
