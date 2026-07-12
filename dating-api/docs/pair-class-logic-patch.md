# Pair-class logic patch: RED friction floor when baseFriction === 0

**Date:** 2026-03-10  
**Scope:** Minimal patch only. No extraction, compatibility, or global scoring changes.

---

## Exact file changed

`src/matches/match-engine.ts`

---

## Exact condition changed

**Before:** RED tier always applied a friction floor of 4.

```ts
const frictionMinimum =
  balance.tier === 'RED' ? 4 : balance.tier === 'YELLOW' ? 2 : 0;
```

**After:** RED friction floor is applied only when there is at least some tension-derived friction.

```ts
const frictionMinimum =
  balance.tier === 'RED' && baseFriction > 0
    ? 4
    : balance.tier === 'YELLOW'
      ? 2
      : 0;
```

So when balance is RED but `baseFriction === 0` (no tension rule fired), friction is no longer forced to 4. The RED **relationship-style** penalty (relationshipFit −10) is unchanged.

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

Pair remains FAIL (expected 78–82); miss size reduced from 27 to 20. Directionals and compatibility were already high; the patch removed the RED friction floor so only the RED relationship penalty applies.

---

## PASS count

- **Before patch:** PASS 5, FAIL 15  
- **After patch:** PASS 5, FAIL 15  

PASS count did **not** improve. Pair 25__merged_5 moved from 53 to 60 but is still below the 78–82 band; no other pair changed status from FAIL to PASS.
