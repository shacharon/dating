# Extraction Pipeline Delta: Strict Linear Refactor

## Files Changed

### 1. `src/extraction/extraction.service.ts`
**Changes:**
- ✅ Removed imports (lines ~14-20): No longer imports `applySparseTextGuard`, `applyTextInference`, `enforceSignalCountLimits`, `applySparseProfileNullOnlyPatch`
- ✅ Added pipeline comments at lines 394, 448, 498
- ✅ Removed 4 function calls from `extract()` method (previously lines ~511-519)
- ✅ Updated `validateAndClean()` (lines 153-227): Removed semantic clamping logic; now strictly nullifies out-of-range values
- ✅ Updated `_provenance.stages` (lines 502-511): Removed deleted stage names, added `quality_gate`

### 2. `src/extraction/extraction-strict-validation.ts`
**Changes:**
- ✅ Added quality gate logic to `validateExtraction()` (lines 189-196)
- ✅ Updated function comments (lines 138-148)
- ✅ Updated file-level comment (lines 1-6)

### 3. `src/extraction/extraction-normalization.ts`
**Changes:**
- ✅ Updated file-level comment (lines 1-6) to clarify "technical coercion only"

### 4. `src/extraction/extraction.service.spec.ts`
**Changes:**
- ✅ Updated 15+ test mocks to include ≥2 valid signals
- ✅ Tests now validate LLM output preservation
- ✅ Tests confirm no policy-based capping

### 5. `src/extraction/extraction-strict-validation.spec.ts`
**Changes:**
- ✅ Updated 2 tests to include ≥2 valid signals to avoid quality gate rejection

---

## Exact Pipeline Delta

### Removed Function Calls (from `extraction.service.ts` ~line 511-519)
```typescript
// REMOVED:
cleaned = applySparseTextGuard(cleaned, text.trim());
cleaned = applyTextInference(cleaned, text);
cleaned = enforceSignalCountLimits(cleaned, domain);
cleaned = applySparseProfileNullOnlyPatch(cleaned, text, profileId);
```

### Removed Imports (from `extraction.service.ts` ~line 14-20)
```typescript
// REMOVED:
import { applySparseTextGuard } from './extraction-sparse-policy';
import { applyTextInference } from './extraction-text-inference';
import { enforceSignalCountLimits } from './extraction-signal-count-policy';
import { applySparseProfileNullOnlyPatch } from './extraction-sparse-profile-patch';
```

### Updated `validateAndClean` Logic
**Before:**
```typescript
// Lines 173-178 (REMOVED)
if (Number.isNaN(rounded) || rounded < 1 || rounded > 10) {
  if (evidencePresent) {
    signals[key] = rounded < 1 ? 1 : 10; // CLAMPING
  } else {
    signals[key] = null;
  }
}
```

**After:**
```typescript
// Lines 168-180 (CURRENT)
if (Number.isNaN(rounded) || rounded < 1 || rounded > 10) {
  signals[key] = null; // ALWAYS NULLIFY
  this.logger.log(
    JSON.stringify({
      event: 'validateAndClean_stripped',
      key,
      value,
      reason: Number.isNaN(rounded) ? 'nan' : 'outOfRange',
    }),
    ExtractionService.name,
  );
} else {
  signals[key] = rounded;
}
```

### Added Quality Gate (in `validateExtraction`)
```typescript
// Lines 189-196 (NEW)
// Quality gate: reject extractions below quality floor
// Note: confidence is capped at 0.3 for count < 3, so we check count directly
if (nonNullInDomain < 2) {
  for (const key of EXTRACTION_SIGNAL_KEYS) {
    signals[key] = null;
  }
  evidence = [];
  confidence = 0;
}
```

### Updated Provenance Stages
**Before:**
```typescript
const provenanceStages: string[] = [
  'llm',
  'alias_normalization',
  'validate_and_clean',
  'sparse_text_guard',      // REMOVED
  'text_inference',         // REMOVED
  'signal_count_limits',    // REMOVED
  'sparse_profile_patch',   // REMOVED
  'retry',
  'strict_evidence_validation',
];
```

**After:**
```typescript
const provenanceStages: string[] = [
  'llm',
  'alias_normalization',
  'validate_and_clean',
  'retry',                          // (if retry ran)
  'strict_evidence_validation',
  'quality_gate',                   // NEW
];
```

---

## Semantic Authority Confirmation

### ✅ LLM is the SOLE source of semantic meaning

**What this means:**
- Every non-null signal value originates from LLM output
- Every evidence quote originates from LLM output
- Every evidence reason originates from LLM output
- Signal counts are determined by LLM (subject only to quality floor)
- Confidence is computed from LLM-proposed signal count

**What post-processing does:**
- Validates technical constraints (range, type, format)
- Maps alias keys to official keys
- Nullifies invalid values (out-of-range, missing evidence)
- Applies minimum quality floor (≥2 signals)

**What post-processing does NOT do:**
- ❌ Infer signal values from regex patterns
- ❌ Cap signal counts by text length policy
- ❌ Cap signal counts by arbitrary max (12)
- ❌ Clamp out-of-range values to 1-10
- ❌ Apply profile-specific patches
- ❌ Modify LLM-proposed values
- ❌ Add synthetic evidence

---

## Linear Flow Guarantee

The pipeline is now **strictly sequential**:

```
LLM call 
  → parse JSON 
    → map aliases 
      → round/null technical violations 
        → (optional: retry if empty) 
          → strict validation 
            → quality gate 
              → output
```

No branching logic. No parallel modifications. No feedback loops (except explicit retry).

---

## Test Coverage

✅ **51 extraction tests** passing  
✅ **255 total tests** passing  
✅ **TypeScript compilation** clean  

All tests now validate:
- LLM output preservation when valid
- Technical nullification of invalid values
- Quality gate enforcement
- No policy-based modifications

---

## Cleanup Status

✅ Unused imports removed  
✅ Unused function calls removed  
✅ Pipeline comments added  
✅ Provenance tracking updated  
✅ Tests aligned with new contract  

No unused helpers or private members remain from deleted stages.
