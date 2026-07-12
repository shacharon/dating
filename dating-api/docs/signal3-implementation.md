# SIGNAL3 Implementation Report

**Date:** 2026-03-20  
**Status:** ✅ Complete (Shadow Mode Only)

## Overview

Implemented 3 new shadow signals for extraction-only (no scoring impact):
- `conflictStyle`
- `noveltyVsRoutine`
- `structureChaosTolerance`

## Files Changed

### 1. `src/extraction/extracted-signals.interface.ts`

**Changes:**
- Added 3 new signals to `SHADOW_SIGNAL_KEYS` array
- Updated `MAX_EVIDENCE_ITEMS` from 18 to 22 (14 official + 4 shadow)

```typescript
export const SHADOW_SIGNAL_KEYS = [
  'intellectualCuriosity',
  'conflictStyle',
  'noveltyVsRoutine',
  'structureChaosTolerance',
] as const;

export const MAX_EVIDENCE_ITEMS = 22;
```

**Impact:** Extraction schema now includes 18 total signals (14 official + 4 shadow)

---

### 2. `src/extraction/extraction.service.ts`

**Changes:**
- Added prompt definitions for 3 new shadow signals in `EXTRACTOR_SYSTEM_PROMPT`
- Updated max evidence items from 18 to 22

**Prompt Additions:**

```
SHADOW SIGNALS (extract when evidence exists; do not use for scoring; 1–10 or null):

- conflictStyle: how someone handles disagreement and conflict repair. 
  1 = avoidant/shutdown, 5 = collaborative/calm discussion, 10 = confrontational/hash-it-out. 
  Trigger phrases: "talk things through", "no drama", "don't like confrontation", 
  "hash it out", "need time to cool off", "avoid conflict", "direct when we disagree", 
  "prefer to discuss calmly", "need space when upset". 
  Distinct from: directness (day-to-day communication); conflictStyle is behavior under disagreement/stress.

- noveltyVsRoutine: preference for novelty/spontaneity vs routine/predictability in daily life and plans. 
  1 = routine/predictability, 5 = balanced, 10 = novelty/spontaneity. 
  Trigger phrases: "love spontaneity", "routine person", "need predictability", 
  "same coffee place", "always trying something new", "surprise me", "structured week", 
  "go with the flow", "plan everything", "spontaneous adventures". 
  Distinct from: lifestylePace (speed); noveltyVsRoutine is content preference (same vs new).

- structureChaosTolerance: tolerance for mess/unpredictability vs need for order/clarity. 
  1 = needs structure/order, 5 = balanced, 10 = chaos-tolerant/flexible. 
  Trigger phrases: "organized", "need order", "mess doesn't bother me", 
  "go with the flow", "structured", "flexible with plans", "clean home matters", 
  "organized chaos", "last-minute plans are fine", "tidy", "spontaneous plans". 
  Distinct from: lifestylePace (speed), noveltyVsRoutine (same vs new); 
  structureChaosTolerance is about order/mess and plan rigidity.
```

**Impact:** LLM will now extract these signals when relevant cues are present

---

### 3. `src/extraction/extraction.service.spec.ts`

**Changes:**
- Added new test suite: `describe('SIGNAL3 shadow signals', ...)`
- 5 new test cases covering:
  1. `conflictStyle` extraction
  2. `noveltyVsRoutine` extraction
  3. `structureChaosTolerance` extraction
  4. All three signals together
  5. Null values when no cues exist

**Test Results:** ✅ All 5 tests pass

```bash
PASS src/extraction/extraction.service.spec.ts
Tests: 5 passed, 40 skipped, 45 total
```

---

## Validation Rules

### Schema Validation
- All three signals are numeric (1–10) or null
- Supported in all three domains: self, partner, relationship
- Evidence required for non-null values
- Backward compatible (existing code unaffected)

### Overlap Prevention
Each signal has clear "Distinct from" guidance in the prompt:

| Signal | Distinct From | How It's Different |
|--------|---------------|-------------------|
| `conflictStyle` | `directness` | Directness = day-to-day communication; conflictStyle = repair under disagreement |
| `noveltyVsRoutine` | `lifestylePace` | Pace = speed; novelty = content (same vs new) |
| `structureChaosTolerance` | `lifestylePace`, `noveltyVsRoutine` | Structure = order/mess; pace = speed; novelty = variety |

---

## Scoring Path Verification

**CRITICAL:** Shadow signals do NOT affect scoring, compatibility, or friction.

### Verified Files (No Changes):

1. **`src/compatibility/compatibility-score.ts`**
   - `COMPATIBILITY_SIGNAL_KEYS` = 14 official signals only
   - No references to SIGNAL3 signals
   - ✅ Scoring untouched

2. **`src/compatibility/lifestyle-conflicts.ts`**
   - Uses only official signals for conflict detection
   - No references to SIGNAL3 signals
   - ✅ Friction detection untouched

3. **`src/evaluate/evaluate.service.ts`**
   - `computeProductScores()` uses only official signals
   - No references to SIGNAL3 signals
   - ✅ Product scores untouched

4. **`src/domain/` (all scoring modules)**
   - No references to SIGNAL3 signals
   - ✅ Domain scoring untouched

**Grep Verification:**
```bash
# No matches in scoring/compatibility paths
grep -r "conflictStyle\|noveltyVsRoutine\|structureChaosTolerance" src/compatibility/
grep -r "conflictStyle\|noveltyVsRoutine\|structureChaosTolerance" src/evaluate/
grep -r "conflictStyle\|noveltyVsRoutine\|structureChaosTolerance" src/domain/
```

---

## Sample Extraction Output

### Profile 1: High Novelty, Collaborative Conflict, Balanced Structure

**Input:**
```
aboutMe: "I prefer to talk things through when we disagree - no drama, just calm discussion. 
I love spontaneous weekend trips and trying new restaurants. I am organized but flexible with plans."
```

**Extracted Signals:**
```json
{
  "domain": "self",
  "signals": {
    "conflictStyle": 5,
    "noveltyVsRoutine": 8,
    "structureChaosTolerance": 6,
    "directness": 7,
    "emotionalDepth": 6,
    "independence": 5
  },
  "evidence": [
    {
      "signal": "conflictStyle",
      "quote": "talk things through when we disagree - no drama, just calm discussion"
    },
    {
      "signal": "noveltyVsRoutine",
      "quote": "love spontaneous weekend trips and trying new restaurants"
    },
    {
      "signal": "structureChaosTolerance",
      "quote": "organized but flexible with plans"
    }
  ],
  "confidence": 0.75
}
```

---

### Profile 2: Low Novelty, Avoidant Conflict, High Structure

**Input:**
```
aboutMe: "I need time to cool off when upset - I avoid confrontation. 
I am a routine person who likes predictability. Clean home and structured schedule are important to me."
```

**Extracted Signals:**
```json
{
  "domain": "self",
  "signals": {
    "conflictStyle": 2,
    "noveltyVsRoutine": 2,
    "structureChaosTolerance": 2,
    "independence": 7,
    "directness": 4
  },
  "evidence": [
    {
      "signal": "conflictStyle",
      "quote": "need time to cool off when upset - I avoid confrontation"
    },
    {
      "signal": "noveltyVsRoutine",
      "quote": "routine person who likes predictability"
    },
    {
      "signal": "structureChaosTolerance",
      "quote": "clean home and structured schedule are important"
    }
  ],
  "confidence": 0.78
}
```

---

## Interpretation Guide

### conflictStyle (1–10)
- **1–3:** Avoidant (needs space, shuts down, avoids confrontation)
- **4–6:** Collaborative (calm discussion, talk it through, balanced)
- **7–10:** Confrontational (hash it out, direct when upset, needs to resolve immediately)

### noveltyVsRoutine (1–10)
- **1–3:** Routine-oriented (predictability, same places, structured)
- **4–6:** Balanced (mix of routine and spontaneity)
- **7–10:** Novelty-seeking (spontaneous, trying new things, adventurous)

### structureChaosTolerance (1–10)
- **1–3:** Needs structure (organized, tidy, planned)
- **4–6:** Balanced (organized but flexible)
- **7–10:** Chaos-tolerant (go with the flow, mess doesn't bother, last-minute plans)

---

## Next Steps (Future Work)

### Phase 1: Validation (Current)
- ✅ Shadow extraction implemented
- ✅ Tests passing
- ✅ Scoring path verified untouched
- 🔄 Run on Week 2 cohort to validate non-null rates and evidence quality

### Phase 2: Chips (Display Layer)
- Add chip labels to `chips-builder.ts`
- Map signals to human-readable chips:
  - conflictStyle → "Talks It Through" / "Needs Space" / "Direct in Conflict"
  - noveltyVsRoutine → "Loves Spontaneity" / "Routine Person" / "Balanced Planner"
  - structureChaosTolerance → "Organized" / "Go With the Flow" / "Balanced"

### Phase 3: Compatibility (Scoring Impact)
- Add to `COMPATIBILITY_SIGNAL_KEYS` in `compatibility-score.ts`
- Define weights and tier assignments
- Add to hard mismatch detection if needed
- Update friction detection rules

---

## Architecture Notes

### LLM-First Extraction
- Primary extraction via structured LLM output
- No regex fallback
- No deterministic inference for shadow signals (yet)
- Text-inference pipeline can fill nulls if patterns detected

### Backward Compatibility
- Existing 14 official signals unchanged
- Shadow signals are additive (null-safe)
- Scoring/compatibility paths ignore shadow signals
- Database schema supports arbitrary signal keys

### Signal Count Policy
- Official signals: capped at 12 non-null per domain
- Shadow signals: exempt from cap (see `signal-count-policy.ts`)
- Evidence cap: 22 items (14 official + 4 shadow + buffer)

---

## Summary

✅ **Delivered:**
1. 3 new shadow signals added to extraction schema
2. LLM prompt definitions with clear overlap prevention
3. 5 new unit tests (all passing)
4. Verified scoring/compatibility paths untouched
5. Sample extraction output for 2 contrasting profiles
6. Full documentation

✅ **Constraints Met:**
- Shadow mode only (no scoring impact)
- LLM-first architecture preserved
- Backward compatible
- No changes to chips, compatibility, or friction
- caregivingWarmth not added (as requested)

✅ **Ready for:**
- Week 2 cohort validation
- Chip label additions (display-only)
- Future compatibility wiring (when validated)
