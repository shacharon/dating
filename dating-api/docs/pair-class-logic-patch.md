# Pair-class logic patch: low-ratio friction floor when baseFriction === 0

**Date:** 2026-03-10  
**Scope:** Minimal patch only. No extraction, compatibility, or global scoring changes.

---

## Exact file changed

`src/matches/match-engine.ts`

---

## Exact condition changed

**Original issue:** The low-ratio band (formerly labeled RED; `ratio < 2`) always applied friction floor **4**, even when `baseFriction === 0`.

**Patch (still current):** Floor **4** when `ratio < 2` applies only when there is at least some tension-derived friction. Mid band `ratio ∈ [2, 4)` still uses floor **2**. High band `ratio ≥ 4` uses floor **0**.

```ts
const frictionMinimum =
  balance.ratio < 2 && baseFriction > 0
    ? 4
    : balance.ratio >= 2 && balance.ratio < 4
      ? 2
      : 0;
```

So when balance ratio is low but `baseFriction === 0` (no tension rule fired), friction is no longer forced to 4. The low-ratio **relationship-fit** penalty (relationshipFit −10 when `ratio < 2`) is unchanged.

**Note:** The engine uses `balance.ratio` thresholds **4** and **2** directly; there is no separate tier field on `RelationshipBalanceResult`.

---

## Before/after for pair 25__merged_5 (Hila ↔ Tamar)

| Metric            | Before | After |
|-------------------|--------|--------|
| finalScore        | 53     | **60** |
| friction          | 4      | **0**  |
| frictionPenalty   | 12     | **0**  |
| relationshipStyle | 50     | 50 (unchanged) |
| compatibility     | 78     | 78     |
| coveragePercent   | 64     | 64     |

Pair remains FAIL (expected 78–82); miss size reduced from 27 to 20. Directionals and compatibility were already high; the patch removed the low-ratio friction floor when no tensions fire, so only the low-ratio relationship-fit penalty applies.

---

## PASS count

- **Before patch:** PASS 5, FAIL 15  
- **After patch:** PASS 5, FAIL 15  

PASS count did **not** improve. Pair 25__merged_5 moved from 53 to 60 but is still below the 78–82 band; no other pair changed status from FAIL to PASS.
