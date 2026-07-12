# Extraction Pipeline: Linear LLM-First Architecture

## Current Pipeline (Strictly Linear)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. runFirstLlmExtractionCall                                    │
│    [PIPELINE] LLM proposal                                      │
│    • Authority: LLM_PROPOSAL                                    │
│    • Returns: { signals, evidence { quote, reason } }           │
│    • Temperature: 0.1, Max tokens: 5000                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. normalizeRawExtraction                                       │
│    [PIPELINE] Technical normalization                           │
│    • Authority: TECHNICAL_COERCION                              │
│    • Parse JSON, default to null                                │
│    • No semantic inference                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. applyNormalizeAliasKeys                                      │
│    [PIPELINE] Technical normalization (continued)               │
│    • Authority: TECHNICAL_COERCION                              │
│    • Map: spiritualOrientation → spirituality                   │
│    • Map: appearancePriority → physicalPriority (non-self)      │
│    • Map: materialAmbition → financialMindset (non-self)        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. validateAndClean                                             │
│    [PIPELINE] Technical normalization (continued)               │
│    • Authority: TECHNICAL_COERCION                              │
│    • Round to integer                                           │
│    • Nullify: NaN, out-of-range (< 1 or > 10)                   │
│    • Filter evidence to official keys                           │
│    • Slice to MAX_EVIDENCE_ITEMS                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. runOptionalRetryWhenEmpty (if triggered)                     │
│    • Authority: LLM_PROPOSAL                                    │
│    • Triggered when: 0 signals OR partner short + ≤2            │
│    • May REPLACE entire extraction with retry result            │
│    • Still LLM authority, not inference                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. validateExtraction                                           │
│    [PIPELINE] Final validation gate (strict quote/reason +      │
│    quality floor)                                               │
│    • Authority: VALIDATION_GATE                                 │
│    • Null signals outside domain allowlist                      │
│    • Null signals lacking valid evidence                        │
│    • Drop invalid evidence (no quote, bad reason, not exact)    │
│    • Recompute confidence from count                            │
│    • Quality gate: if count < 2 → null all signals              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                       Final Output
                (signals = LLM output after validation only)
```

---

## Key Principles

### 1. LLM-Only Semantic Authority
- Every signal value comes from LLM
- Every evidence quote comes from LLM
- Every evidence reason comes from LLM
- Signal counts determined by LLM (floor: 2)

### 2. Post-Processing = Validation Only
- **CAN:** Nullify, drop, filter, validate
- **CANNOT:** Modify, infer, add, cap by policy, rebalance

### 3. Strictly Linear
- No branching (except optional retry)
- No feedback loops
- No parallel modifications
- Sequential validation stages only

---

## Quality Gates

### Technical Gate (`validateAndClean`)
- ✅ Must be integer
- ✅ Must be 1-10 (or null)
- ✅ Must be in official key allowlist

### Evidence Gate (`validateExtraction` - quote/reason check)
- ✅ Quote must be exact substring
- ✅ Quote must not contain: `inferred:`, `suggests:`, `implies:`
- ✅ Reason must be ≤8 words
- ✅ Signal must have matching valid evidence

### Quality Floor (`validateExtraction` - final gate)
- ✅ Must have ≥2 valid signals in domain
- ❌ If count < 2 → null all signals, clear evidence, set confidence = 0

---

## What Was Removed

### ❌ `applySparseTextGuard`
- Text length policy: short text → cap to 2-3 signals
- Confidence cap: 0.45 max for short text

### ❌ `applyTextInference`
- 15 regex rules → fill null signals
- Synthetic evidence generation

### ❌ `enforceSignalCountLimits`
- Max 12 official non-null signals
- Priority-based ranking/dropping

### ❌ `applySparseProfileNullOnlyPatch`
- Hard-coded profile IDs: 8, 16, 18, 21
- Second text-inference pass

---

## Authority Comparison

| Stage | Before | After |
|-------|--------|-------|
| Semantic meaning | LLM (30%) + Policies (60%) | **LLM (90%)** |
| Signal count | Policy-capped | **LLM-determined** (≥2 floor) |
| Out-of-range values | Clamped to 1-10 if evidence | **Always nullified** |
| Short text | Capped to 2-3 signals | **No cap** |
| Missing signals | Inferred from regex | **Stay null** |
| Profile-specific | Hard-coded patches | **No special treatment** |

---

## Verification

✅ All 255 tests passing  
✅ TypeScript compilation clean  
✅ No unused imports or functions  
✅ Pipeline comments added  
✅ Provenance tracking updated  

**Confirmation:** Semantic meaning now comes **ONLY** from LLM output. Post-processing validates and nullifies only—never modifies, infers, or caps by policy.
