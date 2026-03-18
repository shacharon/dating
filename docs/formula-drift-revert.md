# Formula Drift Revert Report

Date: 2026-03-10

## Reason for Revert
This revert was performed because validation regressed after the formula-drift unification attempt.

## Exact Files Reverted
Only formula-drift patch files were reverted:
1. `dating-api/src/engine/engine.scoring.spec.ts`
2. `dating-api/src/matches/scoring.ts`
3. `dating-api/src/matches/scoring.spec.ts`

No extraction, low-info, or pair-specific logic files were reverted.

## Runtime Behavior Restored
Restored pre-unification behavior/definitions:
- `dating-api/src/matches/scoring.ts` is back to its pre-unification formulas:
  - compatibility weights: `0.35 / 0.35 / 0.20 / 0.10`
  - coverage factor: sigmoid form
  - final score path subtracts unscaled friction penalty in this legacy module
- `dating-api/src/engine/engine.scoring.spec.ts` expectations were reverted to pre-unification assertions.

Note:
- Active runtime scoring path (`match-engine` using `engine/scoring.ts`) was not tuned in this revert; this action specifically undid the formula-drift unification patch.

## Validation Status (Before vs After Revert)

### Before Revert (formula-drift unification state)
- User-reported overall validation state: **FAIL / regressed**.
- In-session focused scoring tests (`engine.scoring.spec.ts` + `matches/scoring.spec.ts`): **PASS**.

### After Revert (this run)
1. `npm test`: **FAIL**
- Failing suites:
  - `src/engine/engine.scoring.spec.ts` (2 failures)
  - `src/extraction/extraction.service.spec.ts` (1 failure)

2. `npm run recompute-matches`: **PASS**
- Completed recomputation and produced match summary.

3. `npm run validate:golden-pairs`: **FAIL** (quality gate)
- Script completed and wrote report.
- Result summary: `PASS: 5, FAIL: 15, MISSING_PROFILE: 0, MISSING_MATCH: 0`
- Recommendation: `SCORING_PROBLEM`

## Confirmation
Revert was intentionally limited to formula-drift patch artifacts and executed because validation regressed.
