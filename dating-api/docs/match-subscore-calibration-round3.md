# Match subscore calibration (Round 3)

Focused calibration to reduce inflation of **internal subscores** (A→B, B→A, Compatibility) while keeping final scores reasonable for strong pairs. No schema or architecture changes; patch-only, deterministic.

---

## Observed issue

- Final score is often reasonable, but **A→B / B→A / Compatibility** sit too close to 91–95 for merely strong matches.
- Especially when:
  1. Shared spiritual / simple-life / anti-material vibe
  2. Quiet / stable / low-drama / trust-building pairs
  3. Partial overlap treated like deep alignment
  4. Nuance gaps: flow/ease vs depth/growth, quiet intellectual vs free-flow outdoors

---

## Exact files changed

| File | Change |
|------|--------|
| **src/matches/match-engine.ts** | (1) Directional cap 90 on inputs to compatibility formula. (2) Values-alignment cap 85 for blend. (3) Nuance penalty when relationshipClarity or lifestylePace gap in [3, 5]. |

No other files modified. No changes to `compatibility-score.ts`, `scoring.ts`, or tension-rules.

---

## Exact calibration logic added

### 1. Directional cap (90)

**Where:** After `aToBForCompat` and `bToAForCompat` are set (including asymmetry scale).

**Code:**
```ts
const directionalCap = 90;
aToBForCompat = Math.min(aToBForCompat, directionalCap);
bToAForCompat = Math.min(bToAForCompat, directionalCap);
```

**Reason:** Strong overlap was producing directional scores in the 91–95 range. Capping the values **fed into** the compatibility formula at 90 ensures “strong” does not become “near-perfect” in the blend. Displayed `aToB` / `bToA` in the API are unchanged; only the inputs to the compatibility formula are capped, so the blended compatibility and final score drop slightly for the highest directionals.

---

### 2. Values-alignment cap (85)

**Where:** After `valuesAlignment = computeValuesAlignment(signalsA, signalsB)`; before `compatibilityFormula(...)`.

**Code:**
```ts
const valuesAlignmentCap = 85;
const valuesAlignmentForCompat = Math.min(valuesAlignmentCap, valuesAlignment);
// ... then pass valuesAlignmentForCompat (not valuesAlignment) to compatibilityFormula(..., valuesAlignmentForCompat)
```

**Reason:** When many Tier1/vibe signals align (spirituality, lifestylePace, financialMindset, etc.), `valuesAlignment` can reach 95–100 and over-reward “shared vibe.” Capping at 85 reduces that over-reward while still rewarding strong values overlap.

---

### 3. Nuance penalty (relationshipClarity / lifestylePace gap 3–5)

**Where:** After coverage-based ceiling on `compatibilityValue`; before `scoreCoverageFactorValue` and downstream use of `compatibilityValue`.

**Code:**
```ts
const getSignalGap = (key: string): number | null => {
  const a = signalsA[key], b = signalsB[key];
  if (a == null || b == null) return null;
  const an = Number(a), bn = Number(b);
  if (!Number.isFinite(an) || !Number.isFinite(bn)) return null;
  return Math.abs(an - bn);
};
const clarityGap = getSignalGap('relationshipClarity');
const paceGap = getSignalGap('lifestylePace');
let nuancePenalty = 0;
if (clarityGap != null && clarityGap >= 3 && clarityGap <= 5) nuancePenalty = 2;
else if (paceGap != null && paceGap >= 3 && paceGap <= 5) nuancePenalty = 2;
compatibilityValue = Math.max(0, compatibilityValue - nuancePenalty);
```

**Reason:** Manual review showed meaningful-but-non-failing style gaps (e.g. flow/ease vs depth/growth, quiet intellectual vs free-flow outdoors). Gaps of 3–5 on `relationshipClarity` or `lifestylePace` represent that nuance. A small penalty (2 points on compatibility) slightly reduces internal/compatibility for these pairs without triggering hard mismatches. Only one penalty applied (if both gaps in range, still 2). If either signal is missing, penalty is 0.

---

## Summary

| Change | Effect |
|--------|--------|
| Directional cap 90 | Compatibility blend no longer gets > 90 from A→B/B→A; top directionals (e.g. 92) contribute 90. |
| Values cap 85 | High vibe-overlap (e.g. 95) contributes 85 to the blend. |
| Nuance penalty 2 | Compatibility reduced by 2 when relationshipClarity or lifestylePace gap is 3–5. |

Displayed `aToB`, `bToA`, and `valuesAlignment` in API responses are **unchanged**. Only the values used **inside** the compatibility blend and the final `compatibilityValue` are calibrated, so final score can drop a few points for the most inflated subscores while remaining strong for genuinely aligned pairs.
