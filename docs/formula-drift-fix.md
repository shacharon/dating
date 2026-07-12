# Formula Drift Fix Report

Date: 2026-03-10

## Source of truth
The active runtime source of truth is `dating-api/src/engine/scoring.ts`.

Why:
- `dating-api/src/matches/match-engine.ts` imports `compatibility` from `../engine/scoring`.
- `dating-api/src/matches/friction-policy.ts` imports `rawScore` and `FRICTION_SCALE` from `../engine/scoring`.
- This is the path used to compute runtime `compatibility`, `rawScore`, and `finalScore` in the match pipeline.

## What was changed
1. Updated `dating-api/src/engine/engine.scoring.spec.ts` to match the real engine formula.
- Compatibility expectation changed from `0.20/0.10` relationship/value weights to `0.25/0.05`.
- Numeric expectation updated accordingly (`74.5` instead of `75` for the tested input).

2. Converted `dating-api/src/matches/scoring.ts` into a legacy shim that delegates to engine formulas.
- Added clear legacy/source-of-truth note.
- `coverageFactorFromPercent` now delegates to `engine/coverage.coverageFactor`.
- `computeCompatibilityFromComponents` now delegates to `engine/scoring.compatibility`.
- `frictionPenalty` delegates to `engine/friction.frictionPenalty`.
- `computeFinalScore` now uses engine semantics via `engine/scoring.rawScore` + `engine/scoring.finalScore`.

3. Updated `dating-api/src/matches/scoring.spec.ts` to assert engine-consistent behavior.
- Adjusted weight and numeric expectations.
- Adjusted coverage behavior expectations to linear engine coverage factor.
- Adjusted final score expectations to scaled friction behavior.
- Added focused consistency test comparing legacy shim outputs directly against engine outputs.

## Status of `src/matches/scoring.ts`
`dating-api/src/matches/scoring.ts` is now **legacy** (not runtime active), explicitly documented and aligned as a delegation shim to the runtime source of truth.

## Before / after formula summary
Before:
- `engine/scoring.ts`: `0.35, 0.35, 0.25, 0.05`
- `engine/engine.scoring.spec.ts`: expected `0.35, 0.35, 0.20, 0.10`
- `matches/scoring.ts`: implemented `0.35, 0.35, 0.20, 0.10` plus other non-runtime assumptions

After:
- Source-of-truth formula everywhere: `0.35*A_to_B + 0.35*B_to_A + 0.25*relationshipFit + 0.05*valuesAlignment`.
- Legacy module delegates to engine formulas; tests verify consistency.

## Scale-conversion bug note
No scale-conversion bug was patched in this step because the audit verdict was `FORMULA_DRIFT_CONFIRMED_ONLY` (scale-conversion bug not confirmed in active runtime path).

## Validation
Executed focused tests:
- `npm test -- --runInBand src/engine/engine.scoring.spec.ts src/matches/scoring.spec.ts`
- Result: 2 passed suites, 38 passed tests.
