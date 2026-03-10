# Codex Audit: Scale Conversion and Formula Drift

Date: 2026-03-10

## Scope
Audit target:
1. Scale-conversion behavior in `src/matches/match-engine.ts`.
2. Numeric range continuity from `computeCompatibility` to API `compatibility` and `finalScore`.
3. Formula consistency across:
   - `src/engine/scoring.ts`
   - `src/engine/engine.scoring.spec.ts`
   - `src/matches/scoring.ts`

## 1) End-to-end score range trace

### A. `computeCompatibility` output range
- `pairScoreFromValues` returns `0..10` (`compatibility-score.ts:145-150`).
- Weighted average `avgScore` remains `0..10` (`compatibility-score.ts:199-200`).
- Converted to percent with `(avgScore / 10) * 100`, rounded/clamped to `0..100` (`compatibility-score.ts:205-208`).
- Hard-mismatch penalty subtracts `5` per mismatch, then clamps `0..100` (`compatibility-score.ts:210-215`).

Conclusion: `computeCompatibility(...).overallScore` is already `0..100`.

### B. Match-engine directional handling (`aToB`, `bToA`)
- Directionals are assigned directly as:
  - `aToB = clampTo100(compatAB.overallScore)` (`match-engine.ts:286`)
  - `bToA = clampTo100(compatBA.overallScore)` (`match-engine.ts:287`)
- `clampTo100` is `Math.round` then clamp `0..100` (`match-engine.ts:145-147`).

Conclusion: no 0..10 -> 0..100 multiplication in current code path.

### C. `compatibility` field range in response
- Stage 4 applies asymmetry scaling and directional cap: each directional becomes `<= 90` (`match-engine.ts:344-348`).
- `relationshipFit` is clamped `0..100` (`match-engine.ts:377-384`).
- `valuesAlignmentForCompat` is capped at `85` (`match-engine.ts:387-390`).
- Base compatibility uses `engine/scoring.ts` weighted sum and then `clampTo100` (`match-engine.ts:404-406`, `engine/scoring.ts:18-29`).
- Optional low-coverage ceiling and nuance penalty only reduce score (`match-engine.ts:408-427`).

Conclusion: response `compatibility` is bounded and non-inflating in current path.

### D. `finalScore` formula range in runtime path
Runtime path is not a single raw clamp only; it is:
1. Raw score from `engine/scoring.rawScore`:
   - `raw = compatibility * scoreCoverageFactor - (adjustedFrictionPenalty * FRICTION_SCALE)`
   - via `computeFrictionAndFrictionPenalties` (`friction-policy.ts:51-55`, `engine/scoring.ts:39-46`, `engine/scoring.ts:37`).
2. Then calibration pipeline:
   - score stretch + top-end boost + clamp (`calibration-policy.ts:71-75`)
   - dealbreaker cap (`calibration-policy.ts:75`)
   - sparse multiplier for coverage <= 55 (`calibration-policy.ts:79-86`)
   - final rounded clamp `0..100` (`calibration-policy.ts:87`).

Conclusion: `finalScore` is guaranteed `0..100`, but not just `clamp(round(raw))`; calibration/caps apply.

## 2) Worked example: does true low score `8` become `80`?

Using current code:
- Assume `computeCompatibility(...).overallScore = 8`.
- Directional assignment:
  - `aToB = clampTo100(8) = 8`
  - `bToA = clampTo100(8) = 8`
  (`match-engine.ts:286-287`, `match-engine.ts:145-147`)
- No multiplication by 10 occurs.

Then (example with `relationshipFit = 0`, `valuesAlignmentForCompat = 0`):
- `compatibilityRaw = 0.35*8 + 0.35*8 + 0.25*0 + 0.05*0 = 5.6`
  (`engine/scoring.ts:25-28`)
- `clampTo100(5.6)` rounds to `6` (`match-engine.ts:145-147`, `match-engine.ts:404-407`).

Result: low score remains low (`8` stays `8` directionally, compat around `6` in this example). It does **not** become `80` in current code.

## 3) Formula drift across the 3 definitions

### A. `engine/scoring.ts` vs `engine/engine.scoring.spec.ts`
- Implementation uses:
  - `0.35*A + 0.35*B + 0.25*relationshipFit + 0.05*valuesAlignment`
  (`engine/scoring.ts:11-29`).
- Spec text/expectation claims:
  - `0.35*A + 0.35*B + 0.20*relationshipFit + 0.10*valuesAlignment`
  (`engine/engine.scoring.spec.ts:24-27`).

Mismatch confirmed in weights for relationship/value terms.

### B. `engine/scoring.ts` vs `matches/scoring.ts`
- `engine/scoring.ts` compatibility weights: `0.25 / 0.05` for relationship/values (`engine/scoring.ts:27-28`).
- `matches/scoring.ts` compatibility weights: `0.20 / 0.10` (`matches/scoring.ts:22-36`).

Mismatch confirmed.

### C. Additional assumption drift (`matches/scoring.ts` vs active path)
- `matches/scoring.ts` coverage uses sigmoid (`matches/scoring.ts:13-19`), while active runtime uses linear coverage factors from `engine/coverage.ts` via `coverage-policy.ts` (`engine/coverage.ts:12-25`, `coverage-policy.ts:27-29`).
- `matches/scoring.ts` final score subtracts unscaled friction penalty (`matches/scoring.ts:46-58`), while active runtime applies `FRICTION_SCALE=0.7` through `engine/scoring.rawScore` (`engine/scoring.ts:37,44-45`) and additional friction relief in `friction-policy.ts:44-50`.

Conclusion: `matches/scoring.ts` is formula-divergent from active match-engine path.

## 4) Claim check summary

- Claim 1 ("values <=10 multiplied by 10 in match-engine scale-conversion lines"):
  - **Not true in current code**. No such conversion exists in current `match-engine.ts` path (`match-engine.ts:286-287`, `404-407`) and no matching pattern found under `src`.
- Claim 2 ("computeCompatibility overallScore may already be 0..100"):
  - **True** (`compatibility-score.ts:206-208`).
- Claim 3 (formula drift among 3 files):
  - **True**, with explicit weight and assumption mismatches listed above.

## Final Verdict

FORMULA_DRIFT_CONFIRMED_ONLY
