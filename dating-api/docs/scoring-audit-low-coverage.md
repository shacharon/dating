# Dating match scoring audit: near-perfect scores at low coverage

## Problem

A pair with **~43% coverage** (6/14 signals comparable) received **A→B=100, B→A=100, compatibility=95**, despite partial evidence. The engine allows near-perfect scores when only a subset of signals exist.

---

## 1. Where score ceilings are applied or not

| Location | Ceiling? | Behavior |
|----------|----------|----------|
| **compatibility-score.ts** `computeCompatibility()` | **None** | `overallScore` = weighted average of `pairScore` over **comparable keys only**. No cap by coverage. `coveragePenaltyApplied = 0` (line 207). |
| **match-engine.ts** `aToB` / `bToA` (276–279) | **None** | `clampTo100(toScale100(compatAB.overallScore))`. No use of `coveragePercent`; directional scores can be 100 at any coverage. |
| **match-engine.ts** `compatibilityValue` (294–300) | **None** | Formula blend of aToB, bToA, relationshipFit, valuesAlignment; then `rawCompatibility <= 10` branch ×10. No coverage-based cap. |
| **engine/coverage.ts** `scoreCoverageFactor` | **Soft** | 0.85–1.0 by coverage. At 43%, factor ≈ 0.9145 — reduces score only mildly. |
| **match-engine.ts** sparse calibration (334–338) | **Soft** | When coverage < 50%, multiplier 0.92–1.0. Reduces finalScore but does not cap A→B/B→A or compatibility. |

**Conclusion:** Directional scores (A→B, B→A) and the compatibility blend have **no ceiling** tied to coverage. Only a light multiplier (scoreCoverageFactor and sparse calibration) is applied later.

---

## 2. Does low coverage reduce only confidence, or also max score?

- **Confidence** (`coverageFactor`): 0.7–1.0. Used for `infoFlags` (LOW_CONFIDENCE) and debug; **not** used to cap the numeric score.
- **Score impact:**  
  - `scoreCoverageFactor` (0.85–1.0) multiplies **compatibility** in `rawScore` → small reduction.  
  - Sparse calibration (< 50% coverage) multiplies **finalScore** by 0.92–1.0.

So low coverage **does** reduce the final score a bit, but **does not** limit the **maximum** that A→B, B→A, or compatibility can reach. At 43% they can still be 100, 100, 95.

---

## 3. Missing signals: treated too neutrally?

**Yes.** In `compatibility-score.ts`:

- Loop over `COMPATIBILITY_SIGNAL_KEYS`; when `selfVal == null || partnerVal == null` the key is **skipped** (line 176).
- `weightedSum` and `totalWeight` include **only** comparable keys.
- So the score is “average over present signals” with **no penalty for missing signals**. “We don’t know” is effectively “we didn’t see a mismatch,” so a small set of aligned signals can still yield 100.

**File:** `src/compatibility/compatibility-score.ts`, `computeCompatibility()` (lines 173–200).

---

## 4. Generic vs specific profiles matching too perfectly?

**Yes.** For a generic profile (few signals) vs a specific one (many signals), only the **intersection** of present signals is compared. If that intersection is 6 signals and they align well, A→B and B→A can be 100. The 8 signals present only in the specific profile never contribute and never reduce the score.

---

## 5. Friction = 0 too easily when many fields are missing?

**Yes.** In `compute-friction.ts` and `tension-rules.ts`:

- Each tension rule uses `getSignal(a, key)` / `getSignal(b, key)`; missing → `null` → `num(null) === 0`.
- Many rules require both sides to have a value (e.g. `if (aEmo == null || bEmo == null) return false`) or compare against thresholds; with many nulls, rules often **don’t fire**.
- So **fewer tensions** → `sumPenalties` can be 0 → **friction = 0**.
- Friction floor in match-engine is only RED=4, YELLOW=2, **GREEN=0**. So GREEN + no rule firing = friction 0 even with sparse data.

**Files:**  
`src/engine/compute-friction.ts` `computeFriction()`;  
`src/engine/tension-rules.ts` (all rules use `getSignal` / `num()`).

---

## 6. Signal-level perfect matches over-translated to 95–100?

**Yes.** With 6 comparable signals and small gaps (e.g. gap 0–1), `pairScoreFromValues` gives 10 or ~8.1 (quadratic curve). Weighted average can be 9.5+ → `overallScore` 95–100 in `computeCompatibility`. That becomes A→B and B→A 95–100. The blend in `compatibilityFormula` (0.35×aToB + 0.35×bToA + 0.2×relationshipFit + 0.1×valuesAlignment) then yields compatibility 95+ with no cap. So a **subset** of signals can drive the **overall** score to the top of the scale.

---

## Root cause

**Directional compatibility (A→B, B→A) is the weighted average over only the comparable signals, with no coverage-based ceiling.** Missing signals are omitted, not penalized. So with ~43% coverage (6/14), strong alignment on those 6 can produce A→B=100, B→A=100. That feeds into the compatibility blend and, with high relationshipFit/valuesAlignment, compatibility ≈ 95. Friction is often 0 when many signals are missing (tension rules don’t fire on null). Together, this allows near-perfect scores on partial evidence.

---

## Exact files and functions

| File | Function / place | Role |
|------|-------------------|------|
| `src/compatibility/compatibility-score.ts` | `computeCompatibility()` | Builds A→B/B→A from comparable signals only; no coverage penalty or ceiling. |
| `src/compatibility/compatibility-score.ts` | Lines 173–200, 207 | Skip null signals; `coveragePenaltyApplied = 0`. |
| `src/matches/match-engine.ts` | Lines 276–279 | `aToB` / `bToA` from compat overallScore; no coverage cap. |
| `src/matches/match-engine.ts` | Lines 294–300, 318–322 | `compatibilityValue` and `rawScore`; no coverage-based cap on compatibility. |
| `src/engine/coverage.ts` | `scoreCoverageFactor()` | 0.85–1.0 by coverage; light impact. |
| `src/engine/compute-friction.ts` | `computeFriction()` | Sums rule penalties; many nulls → few rules fire → friction 0. |
| `src/engine/tension-rules.ts` | All rules’ `when` | Use `getSignal`/`num`; nulls prevent firing. |

---

## Recommended guardrails

1. **Cap maximum compatibility (or effective score) when coverage is low**  
   So that even if A→B/B→A are high, the blended compatibility cannot exceed a coverage-dependent ceiling (e.g. 50 + coveragePercent for coverage < 50%).

2. **Optional: cap A→B / B→A by coverage**  
   E.g. when coveragePercent < 50, use `min(aToB, 50 + coveragePercent)` (and same for bToA) before feeding into the blend. Keeps “directional” semantics but limits how much sparse matches can push the score.

3. **Minimum friction when coverage is low**  
   If coveragePercent < 50, apply a small friction floor (e.g. 1) so sparse matches cannot have friction=0.

---

## Minimal fix proposal (2–3 concrete code changes)

### Change 1: Cap compatibility when coverage < 50%  
**File:** `src/matches/match-engine.ts`  
**Place:** After `compatibilityValue` is set (after line 300), before it is used in `rawScore`.

- If `coveragePercentValue < 50`, cap `compatibilityValue` at a deterministic ceiling, e.g.  
  `compatibilityValue = Math.min(compatibilityValue, 50 + coveragePercentValue)`  
  so at 43% the max compatibility is 93; at 30% max 80.  
- This does **not** change A→B or B→A; it only limits how much they can lift the final score when coverage is thin.

### Change 2: Friction floor for low coverage  
**File:** `src/matches/match-engine.ts`  
**Place:** Where `friction` is set (around 269–271).

- After `const friction = Math.max(baseFriction, frictionMinimum);`, add:  
  `if (coveragePercentValue < 50) friction = Math.max(friction, 1);`  
  (or use a small constant like 2 if you want a stronger floor).  
- So low-coverage matches cannot have friction 0.

### Change 3 (optional): Cap directional scores by coverage  
**File:** `src/matches/match-engine.ts`  
**Place:** After `aToB` and `bToA` are computed (276–279).

- If you later want to limit A→B/B→A for display or for the blend when coverage is low:  
  when `coveragePercentValue < 50`, set  
  `aToB = Math.min(aToB, 50 + coveragePercentValue)` and same for `bToA`  
  before they are passed to `compatibilityFormula`.  
- Omit this if you explicitly want to keep A→B/B→A unchanged for now.

---

## Summary

| Issue | Root cause | Fix (minimal) |
|-------|------------|----------------|
| A→B/B→A = 100 at 43% coverage | No coverage-based ceiling on directional scores | Optional: cap aToB/bToA when coverage < 50 (Change 3). |
| Compatibility = 95 at low coverage | Compatibility blend has no cap; scoreCoverageFactor only mild | Cap compatibilityValue when coverage < 50 (Change 1). |
| Friction = 0 with sparse data | Tension rules don’t fire on null; GREEN floor = 0 | Friction floor when coverage < 50 (Change 2). |

Implementing **Change 1** and **Change 2** gives a minimal, non-invasive guardrail set without refactoring compatibility formula, pairScore curve, or GREEN/YELLOW/RED logic.
