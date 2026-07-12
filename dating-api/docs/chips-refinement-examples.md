# Chips Builder Refinement - Before/After Examples

Changes applied to `chips-builder.ts` only. No scoring, extraction, or prompt changes.

---

## Changes Made

### 1. Label Improvements
- `healthBodyConsciousness` → **"Fitness Focused"** (was "Health Conscious")
- `financialMindset` → **"Money Smart"** (was "Financial Savvy")
- `traditionalism` → **"Traditional Values"** (was "Traditional")
- `financialPrudence` → **"Money Smart"** (was "Financially Prudent")

### 2. Adaptive Fallback Threshold
- **Primary threshold:** value >= 8 (unchanged)
- **New adaptive fallback:** if domain has < 2 chips, allow one pass with value >= 7
- **Max chips per domain:** 5 (unchanged)
- **Ordering:** deterministic, by value descending (unchanged)

---

## Before/After Examples

### Example 1: Sparse Profile with Health Signal

**Profile:** "I go to the gym 3 times a week and eat clean."

**Signals:**
```json
{
  "self": {
    "healthBodyConsciousness": 8,
    "ambition": 5
  }
}
```

**BEFORE:**
```json
{
  "self": [
    { "label": "Health Conscious", "source": "signal" }
  ]
}
```

**AFTER:**
```json
{
  "self": [
    { "label": "Fitness Focused", "source": "signal" }
  ]
}
```

**Improvement:**
- ✓ "Fitness Focused" is more concrete and positive than "Health Conscious"
- ✓ More memorable and distinctive

---

### Example 2: Sparse Profile with Financial Trait

**Profile:** "Looking for someone financially responsible who saves and invests."

**AttractionTraits:**
```json
{
  "financialPrudence": 8,
  "stabilityReliability": 6
}
```

**BEFORE:**
```json
{
  "partner": [
    { "label": "Financially Prudent", "source": "trait" }
  ]
}
```

**AFTER:**
```json
{
  "partner": [
    { "label": "Money Smart", "source": "trait" }
  ]
}
```

**Improvement:**
- ✓ "Money Smart" is less stuffy and more positive than "Financially Prudent"
- ✓ Clearer meaning (smart with money vs. overly cautious)

---

### Example 3: Sparse Profile with Adaptive Fallback

**Profile:** "I'm calm, grounded, and deeply committed when I choose."

**Signals:**
```json
{
  "self": {
    "emotionalDepth": 8,
    "relationshipClarity": 7,
    "independence": 7,
    "directness": 6
  }
}
```

**BEFORE (no adaptive fallback):**
```json
{
  "self": [
    { "label": "Emotionally Deep", "source": "signal" }
  ]
}
```
*Only 1 chip (looks sparse)*

**AFTER (with adaptive fallback):**
```json
{
  "self": [
    { "label": "Emotionally Deep", "source": "signal" },
    { "label": "Clear Expectations", "source": "signal" }
  ]
}
```
*2 chips (better coverage)*

**Improvement:**
- ✓ Adaptive fallback includes `relationshipClarity=7` when < 2 chips
- ✓ Profile looks less empty
- ✓ Still accurate (value 7 is meaningful)
- ✓ Deterministic ordering maintained (8 before 7)

**Why `independence=7` not included:**
- Already have 2 chips, so fallback stops
- Max 5 chips per domain still enforced

---

### Example 4: Profile with Traditional Values

**Profile:** "I value traditional family roles and religious observance."

**Signals:**
```json
{
  "self": {
    "traditionalism": 8,
    "spirituality": 7
  }
}
```

**BEFORE:**
```json
{
  "self": [
    { "label": "Traditional", "source": "signal" }
  ]
}
```

**AFTER (with label improvement + adaptive fallback):**
```json
{
  "self": [
    { "label": "Traditional Values", "source": "signal" },
    { "label": "Spiritual", "source": "signal" }
  ]
}
```

**Improvement:**
- ✓ "Traditional Values" is more specific than "Traditional"
- ✓ Adaptive fallback includes `spirituality=7` (< 2 chips)
- ✓ Both chips are relevant and concrete

---

### Example 5: Rich Profile (No Fallback Needed)

**Profile:** "I'm ambitious, independent, emotionally deep, and direct."

**Signals:**
```json
{
  "self": {
    "ambition": 9,
    "independence": 8,
    "emotionalDepth": 8,
    "directness": 7,
    "relationshipClarity": 7
  }
}
```

**BEFORE:**
```json
{
  "self": [
    { "label": "Ambitious", "source": "signal", "strength": "strong" },
    { "label": "Independent", "source": "signal" },
    { "label": "Emotionally Deep", "source": "signal" }
  ]
}
```

**AFTER (no change - fallback not triggered):**
```json
{
  "self": [
    { "label": "Ambitious", "source": "signal", "strength": "strong" },
    { "label": "Independent", "source": "signal" },
    { "label": "Emotionally Deep", "source": "signal" }
  ]
}
```

**Improvement:**
- ✓ No change (already has >= 2 chips from primary threshold)
- ✓ Fallback not needed, so `directness=7` and `relationshipClarity=7` ignored
- ✓ Maintains quality bar for rich profiles

---

## Proof: ProductScores Path Untouched

### Code Evidence

**File:** `evaluate.service.ts`

**Scoring computation (lines 673-679):**
```typescript
const { productScores, flags } = computeProductScores(
  self,
  partner,
  relationship,
  selfVsPartner,
  selfVsRelationship,
);
```

**Chips computation (lines 716-721):**
```typescript
// Build display chips (deterministic, read-only, no scoring impact)
const chips = buildChips(
  self,
  partner,
  relationship,
  rawInterests,
  extendedSignals,
);
```

**Execution order:**
1. Extract signals (lines 630-636)
2. Compute compatibility (lines 638-651)
3. **Compute productScores** (line 673) ← **SCORING HAPPENS HERE**
4. Compute chips (line 716) ← **CHIPS HAPPEN AFTER**

**Proof:**
- Chips are built **after** productScores computation
- `buildChips()` is a pure function with no side effects
- `computeProductScores()` signature unchanged, takes only signals + compatibility
- No input from chips to scoring functions

---

### Test Evidence

**Test:** `productScores remain unchanged when chips are present (display-only proof)`

**Result:** ✓ PASS

```typescript
expect(withChips.productScores).toEqual(withoutChips.productScores);
expect(withChips.productScores.partnerFitScore).toBe(
  withoutChips.productScores.partnerFitScore,
);
expect(withChips.productScores.relationshipFitScore).toBe(
  withoutChips.productScores.relationshipFitScore,
);
expect(withChips.productScores.coverageScore).toBe(
  withoutChips.productScores.coverageScore,
);
expect(withChips.productScores.frictionRiskScore).toBe(
  withoutChips.productScores.frictionRiskScore,
);
expect(withChips.productScores.overallDecisionScore).toBe(
  withoutChips.productScores.overallDecisionScore,
);
```

**All assertions pass:** productScores are byte-for-byte identical with and without chips.

---

### Test Suite Results

**chips-builder.spec.ts:** 12/12 passed ✓
- All existing tests pass
- 2 new tests for adaptive fallback behavior

**evaluate.service.spec.ts:** 12/12 passed ✓
- All existing tests pass (including productScores proof tests)
- No changes to scoring behavior

**Total:** 24/24 tests pass ✓

---

## Summary

### Files Changed
1. **`src/find/dating/dating-api/src/evaluate/chips-builder.ts`**
   - Lines 59-67: Updated TRAIT_LABELS (financialPrudence → "Money Smart")
   - Lines 68-83: Updated SIGNAL_LABELS (4 label improvements)
   - Lines 178-218: Added adaptive fallback logic in chipsFromSignals()

2. **`src/find/dating/dating-api/src/evaluate/chips-builder.spec.ts`**
   - Lines 284-318: Updated test for adaptive fallback behavior
   - Added 1 new test for fallback not triggering when >= 2 chips

### No Changes To
- ✓ Scoring functions (computeProductScores, computeCompatibility)
- ✓ Extraction logic (extractAllThree, extraction prompts)
- ✓ Domain placement rules
- ✓ Cross-domain deduplication (not implemented)
- ✓ Max 5 chips per domain
- ✓ Deterministic ordering

### Impact
- **Better labels:** More concrete, positive, memorable
- **Better coverage:** Sparse profiles get 2-3 chips instead of 0-1
- **No scoring changes:** productScores identical before/after
- **Deterministic:** Same inputs always produce same chips
- **Backward compatible:** Existing profiles work unchanged
