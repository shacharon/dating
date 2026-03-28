# Extraction Pipeline Refactor: LLM-First Linear Flow

## Executive Summary

The extraction pipeline has been refactored to be **strictly linear** with **LLM as the sole source of semantic meaning**. All deterministic post-processing stages that could modify, infer, cap, or rebalance signal values have been removed.

---

## Pipeline Architecture

### Linear Flow (Current)

```
1. runFirstLlmExtractionCall     [PIPELINE] LLM proposal
   ↓
2. normalizeRawExtraction         [PIPELINE] Technical normalization
   ↓
3. applyNormalizeAliasKeys        (alias key mapping)
   ↓
4. validateAndClean               (round, null out-of-range)
   ↓
5. runOptionalRetryWhenEmpty      (still LLM authority)
   ↓
6. validateExtraction             [PIPELINE] Final validation gate
   ↓
   Final Output
```

### Authority Model

| Stage | Authority Type | Can Do | Cannot Do |
|-------|---------------|--------|-----------|
| **1. LLM Proposal** | `LLM_PROPOSAL` | Generate signals, evidence, quotes, reasons | N/A (primary authority) |
| **2-4. Technical Normalization** | `TECHNICAL_COERCION` | Parse JSON, map aliases, round values, null invalid technical values (NaN, out-of-range) | Modify valid values, infer meaning, cap by policy, add signals |
| **5. Optional Retry** | `LLM_PROPOSAL` | Replace entire extraction if empty | N/A (still LLM authority) |
| **6. Final Validation Gate** | `VALIDATION_GATE` | Null disallowed signals, null signals missing evidence, drop invalid evidence, apply quality floor | Invent signals, modify values, cap by policy, infer meaning |

---

## Removed Stages (Previously Active)

These stages have been **completely disabled/removed** from the pipeline:

### 1. `applySparseTextGuard`
- **What it did:** Capped non-null signals to 2-3 for short text (<150 chars), capped confidence to 0.45
- **Authority:** `DETERMINISTIC_POLICY`
- **Why removed:** Policy-based capping that overrode LLM judgment

### 2. `applyTextInference`
- **What it did:** 15 regex rules that filled null signals with inferred values and synthetic evidence
- **Authority:** `DETERMINISTIC_POLICY`
- **Why removed:** Added semantic meaning outside LLM; violated "LLM-only" principle

### 3. `enforceSignalCountLimits`
- **What it did:** Capped official non-null signals to max 12 via priority-based ranking
- **Authority:** `DETERMINISTIC_POLICY`
- **Why removed:** Policy-based capping that dropped LLM-proposed signals

### 4. `applySparseProfileNullOnlyPatch`
- **What it did:** Hard-coded profile IDs (8, 16, 18, 21) got second text-inference pass
- **Authority:** `DETERMINISTIC_POLICY`
- **Why removed:** Profile-specific patches that inferred meaning outside LLM

---

## New Quality Gate

Added to `validateExtraction` (final stage):

```typescript
// Quality gate: reject extractions below quality floor
if (nonNullInDomain < 2) {
  // Null all signals, clear evidence, set confidence to 0
}
```

**Rules:**
- Minimum 2 valid signals required per domain
- If fewer than 2 signals after all validation, null everything
- Confidence is recomputed consistently after nulling

---

## Files Changed

### Core Pipeline Files

1. **`src/extraction/extraction.service.ts`**
   - Removed imports for 4 deterministic stages
   - Removed calls to `applySparseTextGuard`, `applyTextInference`, `enforceSignalCountLimits`, `applySparseProfileNullOnlyPatch`
   - Updated `validateAndClean` to strictly nullify out-of-range values (no clamping)
   - Added pipeline stage markers: `[PIPELINE] LLM proposal`, `[PIPELINE] Technical normalization`, `[PIPELINE] Final validation gate`
   - Updated `_provenance.stages` to remove deleted stage names, added `quality_gate`

2. **`src/extraction/extraction-strict-validation.ts`**
   - Added quality gate logic to `validateExtraction`
   - Updated function comment to document quality floor
   - Added file-level comment clarifying validation-only authority

3. **`src/extraction/extraction-normalization.ts`**
   - Added file-level comment clarifying technical coercion only (no semantic inference)

### Test Files

4. **`src/extraction/extraction.service.spec.ts`**
   - Updated all test mocks to include ≥2 valid signals to pass quality gate
   - Tests now validate that LLM output is preserved when valid
   - Tests confirm out-of-range values are nullified (not clamped)
   - Tests confirm no policy-based capping occurs

5. **`src/extraction/extraction-strict-validation.spec.ts`**
   - Updated tests to include ≥2 valid signals to avoid quality gate rejection
   - Tests still validate quote/reason contract enforcement

---

## Behavioral Changes

| Scenario | Before | After |
|----------|--------|-------|
| **Short text (<150 chars) with 4 signals** | Capped to 2-3 signals | **All 4 signals kept** (if valid) |
| **Out-of-range value (e.g., 15) with evidence** | Clamped to 10 | **Nullified** |
| **Text matches regex rule, signal is null** | Inferred value added | **Stays null** (LLM decides) |
| **LLM returns 15 signals** | Capped to 12 | **All 15 kept** (if valid per domain) |
| **Profile ID matches hardcoded list** | Special text-inference applied | **No special treatment** |
| **Extraction has 1 valid signal** | Kept as-is | **All signals nulled** (quality gate) |
| **Confidence calculation** | Multiple policy caps applied | **Only from count/total ratio** |

---

## Confirmation: LLM-Only Semantic Authority

✅ **Semantic meaning comes ONLY from LLM output**
- No regex inference
- No policy-based caps
- No profile-specific patches
- No text-length-based rebalancing

✅ **Post-processing is validation-only**
- Can null invalid/out-of-range values
- Can drop invalid evidence
- Can map alias keys to official keys
- Cannot modify valid values
- Cannot add/infer new signals
- Cannot cap by policy

✅ **Quality gate enforces minimum viable extraction**
- At least 2 grounded signals required
- Below threshold → complete rejection (all null)
- Prevents random/low-quality profile displays

---

## Provenance Tracking

Final `_provenance.stages` array now contains:
1. `llm`
2. `alias_normalization`
3. `validate_and_clean`
4. `retry` (if retry ran)
5. `strict_evidence_validation`
6. `quality_gate`

**Removed stages:**
- `sparse_text_guard`
- `text_inference`
- `signal_count_limits`
- `sparse_profile_null_only_patch`

---

## Test Results

✅ All 51 extraction tests passing  
✅ All 255 total tests passing  
✅ TypeScript compilation clean  

---

## Code Comments Added

All pipeline stages now have clear markers:

```typescript
// [PIPELINE] LLM proposal
const { value, rawText, usage } = await this.runFirstLlmExtractionCall(...);

// [PIPELINE] Technical normalization
const normalized = normalizeRawExtraction(value, domain);
let cleaned = this.applyNormalizeAliasKeys(normalized);
cleaned = this.validateAndClean(cleaned, domain);

// [PIPELINE] Final validation gate (strict quote/reason + quality floor)
cleaned = validateExtraction(text, cleaned);
```

---

## Impact Summary

**Before:** LLM (30%) → Deterministic policies (60%) → Validation (10%)  
**After:** LLM (90%) → Technical normalization (5%) → Validation gate (5%)

The pipeline now strictly implements **"LLM first, LLM last"** — deterministic code serves the LLM, never overrides it.
