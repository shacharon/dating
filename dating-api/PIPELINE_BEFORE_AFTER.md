# Extraction pipeline: before vs after

## Architecture comparison

### BEFORE: Deterministic-heavy pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Request                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 1: LLM PROPOSAL                                      │
│  ┌──────────────────────────────────────────┐               │
│  │ runFirstLlmExtractionCall                │               │
│  │ • temp: 0.1, maxTokens: 5000            │               │
│  │ • Returns: { signals, evidence }         │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 2: TECHNICAL NORMALIZATION                           │
│  • normalizeRawExtraction (parse JSON)                      │
│  • normalizeKeys (alias mapping)                            │
│  • validateAndClean (round, clamp w/ evidence, null w/o)    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 2b: OPTIONAL RETRY LLM                               │
│  • Triggered when: 0 signals OR partner short + ≤2          │
│  • May REPLACE entire extraction                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 3: DETERMINISTIC POST-PROCESSING ❌                  │
│  ┌──────────────────────────────────────────┐               │
│  │ 1. applySparseTextGuard                  │               │
│  │    • Cap non-null: 2-3 for short text    │               │
│  │    • Cap confidence: ≤0.45               │               │
│  ├──────────────────────────────────────────┤               │
│  │ 2. applyTextInference                    │               │
│  │    • 15 regex rules → fill null signals  │               │
│  │    • Add synthetic evidence              │               │
│  ├──────────────────────────────────────────┤               │
│  │ 3. enforceSignalCountLimits              │               │
│  │    • Cap official non-null to 12         │               │
│  │    • Priority-based ranking/dropping     │               │
│  ├──────────────────────────────────────────┤               │
│  │ 4. applySparseProfileNullOnlyPatch       │               │
│  │    • Hard-coded IDs: 8, 16, 18, 21       │               │
│  │    • Second text-inference pass          │               │
│  └──────────────────────────────────────────┘               │
│  CAN: modify values, add signals, cap counts, infer meaning │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 4: FINAL VALIDATION GATE                             │
│  • validateExtraction                                       │
│  • Null disallowed signals                                  │
│  • Null signals missing quote+reason                        │
│  • Recompute confidence                                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    Final Output
```

---

### AFTER: LLM-first pipeline (current)

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Request                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 1: LLM PROPOSAL ✅                                   │
│  ┌──────────────────────────────────────────┐               │
│  │ runFirstLlmExtractionCall                │               │
│  │ • temp: 0.1, maxTokens: 5000            │               │
│  │ • Returns: { signals, evidence, reason } │               │
│  └──────────────────────────────────────────┘               │
│  Authority: FIRST AND ONLY semantic proposal                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 2: TECHNICAL NORMALIZATION ✅                        │
│  • normalizeRawExtraction (parse JSON)                      │
│  • normalizeKeys (alias mapping)                            │
│  • validateAndClean (round, null out-of-range)              │
│                                                             │
│  CAN: coerce types, map aliases, null technical violations  │
│  CANNOT: modify values, cap counts, infer meaning           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 2b: OPTIONAL RETRY LLM ✅                            │
│  • Triggered when: 0 signals OR partner short + ≤2          │
│  • May REPLACE entire extraction                            │
│  • Still LLM authority (not inference)                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 3: FINAL VALIDATION GATE ✅                          │
│  • validateExtraction                                       │
│  • Null disallowed-for-domain signals                       │
│  • Null signals missing quote+reason contract               │
│  • Drop invalid evidence rows                               │
│  • Recompute confidence from count                          │
│                                                             │
│  CAN: null, filter, drop                                    │
│  CANNOT: add, modify, cap by policy, infer                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    Final Output
           (signals = LLM output after validation)
```

---

## Key differences

| Aspect | Before | After |
|--------|--------|-------|
| **Semantic authority** | LLM + 4 deterministic layers | **LLM only** |
| **Out-of-range (e.g. 15)** | Clamped to 10 if evidence exists | **Always nullified** |
| **Short text** | Capped to 2–3 signals | **No cap** — LLM decides |
| **Regex inference** | 15 rules fill null signals | **Removed** |
| **Signal count >12** | Dropped to 12 via priority | **No cap** |
| **Profile-specific patches** | Hard-coded IDs → special handling | **Removed** |
| **Pipeline length** | 10 stages | **6 stages** |

---

## Authority flow

### Before
```
LLM (30%) → Deterministic policies (60%) → Validation (10%)
```

### After
```
LLM (80%) → Technical normalization (10%) → Validation gate (10%)
```

---

## Mantra compliance

✅ **"LLM first"** — LLM has primary authority  
✅ **"LLM last"** — No semantic modification after LLM (validation can only null)  
✅ **Deterministic code** serves LLM, not overrides it
