# POST /api/v1/profiles/evaluate — Full pipeline map (after LLM-first refactor)

**Generated**: 2026-03-28  
**Scope**: End-to-end flow from HTTP request to DB persistence

---

## Pipeline table

| # | Stage | Function / File:Line | Input → Output | Authority | Can modify prior? |
|---|-------|---------------------|----------------|-----------|-------------------|
| **1** | HTTP ingress + validation | `ProfilesController.evaluate` <br/> `profiles.controller.ts:41-58` | **In**: `ProfilesEvaluateBodyDto` (raw body) <br/> **Out**: trimmed strings or throws | **DETERMINISTIC_POLICY** | Rejects malformed requests |
| **2** | Generate profile ID | `ProfilesController.evaluate` <br/> `profiles.controller.ts:60` | **In**: `body.id?` <br/> **Out**: string (UUID if omitted) | **PATCH_WIRING** | N/A |
| **3** | Evaluate orchestration | `EvaluateService.evaluateBatch` <br/> `evaluate.service.ts:662-787` | **In**: `EvaluateBatchInput` <br/> **Out**: `{ ok: true, result: EvaluateBatchResult }` | **PATCH_WIRING** | Composes final JSON; delegates |
| **4** | Parallel domain extraction | `ExtractionService.extractAllThree` <br/> `extraction.service.ts:565-606` | **In**: 3 text strings, optional `profileId` <br/> **Out**: `{ self, relationship, partner, _usage }` | **PATCH_WIRING** | Merges usage; each domain runs pipeline below |
| **5** | Per-domain: request metadata | `ExtractionService.buildRequestMetadata` <br/> `extraction.service.ts:226-260` | **In**: domain, text <br/> **Out**: `{ userPrompt, requestId, ... }` | **DETERMINISTIC_POLICY** | No signal mutation |
| **6** | **Primary LLM extraction** | `ExtractionService.runFirstLlmExtractionCall` <br/> `extraction.service.ts:263-286` <br/> → `LLMRouterService.completeJSON` | **In**: system prompt (domain-specific, `92-90`), user prompt <br/> **Out**: `{ value: Record<string, unknown>, rawText, usage }` <br/> Temp: **0.1**, max tokens: **5000** | **🔴 LLM_PROPOSAL** | **First authority** on signal values |
| **7** | Parse raw JSON | `normalizeRawExtraction` <br/> `extraction-normalization.ts:30-103` | **In**: unknown LLM value, domain <br/> **Out**: partial `ExtractedSignals` (signals/evidence/confidence coerced) | **DETERMINISTIC_POLICY** | Coerces types; defaults missing `confidence` to **0.5**; `reason` to `''` |
| **8** | Alias key mapping | `normalizeKeys` <br/> `extraction-normalization.ts:109-131` <br/> + `KEY_ALIASES` **14-20** | **In**: raw signals record <br/> **Out**: `{ normalizedSignals, telemetry }` | **DETERMINISTIC_POLICY** | **Remaps** keys (e.g. `spiritualOrientation` → `spirituality`); **drops** unknown keys |
| **9** | Apply alias normalization | `ExtractionService.applyNormalizeAliasKeys` <br/> `extraction.service.ts:289-301` | **In**: `ExtractedSignals` <br/> **Out**: same with rewritten signal keys | **DETERMINISTIC_POLICY** | Signal keys rewritten |
| **10** | Technical validation | `ExtractionService.validateAndClean` <br/> `extraction.service.ts:151-204` | **In**: `ExtractedSignals`, domain <br/> **Out**: rounded (int), **nullified** if out-of-range (1–10), evidence filtered to known keys | **DETERMINISTIC_POLICY** <br/> (technical only) | **Null** out-of-range (**NO** clamping); round to int; trim evidence |
| **11** | Optional retry LLM | `ExtractionService.runOptionalRetryWhenEmpty` <br/> `extraction.service.ts:304-370` | **In**: domain, text, post-step-10 result <br/> **Out**: replacement if retry non-null > prior; else append notes | **🔴 LLM_PROPOSAL** <br/> (gated by deterministic rules) | **May replace** entire extraction when retry beats non-null count; re-runs steps **7→10** |
| **12** | Empty extraction debug note | `ExtractionService.extract` <br/> `extraction.service.ts:501-509` | **In**: cleaned result, text <br/> **Out**: adds `notes`/`debug` if 0 non-null + non-empty text | **DETERMINISTIC_POLICY** | Metadata only |
| **13** | **Final evidence + domain gate** | `validateExtraction` <br/> `extraction-strict-validation.ts:139-184` | **In**: original text, `ExtractedSignals` <br/> **Out**: filtered signals/evidence; **recomputed** confidence | **DETERMINISTIC_POLICY** <br/> (validation only) | **Null** signals: (a) disallowed for domain, (b) missing valid quote+reason; **drop** invalid evidence; **recompute** confidence from count |
| **14** | Usage finalization | `ExtractionService.finalizeUsageAndLogging` <br/> `extraction.service.ts:373-395` | **In**: final signals, usage, timings <br/> **Out**: `ExtractedSignals` + `_usage` | **PATCH_WIRING** | Adds `_usage` only |
| **15** | Merge extraction usage | `ExtractionService.extractAllThree` <br/> `extraction.service.ts:601-604` | **In**: 3 domain `_usage` <br/> **Out**: single `LLMUsageStats` | **PATCH_WIRING** | Sums usage |
| **16** | **Display summary LLM** | `EvaluateService.generateSummaryFromSignals` <br/> `evaluate.service.ts:425-475` <br/> → `completeJSON` **453-463** | **In**: JSON of 3 `ExtractedSignals` <br/> **Out**: `{ summary, insight }` (temp: **0.3**) | **🔴 LLM_PROPOSAL** | Generates display text (not signals) |
| **17** | Summary fallback | `EvaluateService.fallbackSummaryFromEvidence` <br/> `evaluate.service.ts:478-501` | **In**: 3 `ExtractedSignals` <br/> **Out**: `{ summary, insight }` from evidence quotes | **DETERMINISTIC_POLICY** | Used when LLM returns defaults |
| **18** | **Extended signals LLM** (parallel) | `inferRelationshipMotivation` <br/> `evaluate.service.ts:507-542` <br/> `inferAttractionTraits` <br/> `evaluate.service.ts:592-649` | **In**: raw profile texts <br/> **Out**: `RelationshipMotivationResult` + `AttractionTraitsResult` | **🔴 LLM_PROPOSAL** | Sidecar objects; **clamps** confidence/numbers post-LLM |
| **19** | Extended signals error handling | `evaluateBatch` <br/> `evaluate.service.ts:699-705` | **In**: errors from step 18 <br/> **Out**: omit `extendedSignals` | **DETERMINISTIC_POLICY** | Swallows failures |
| **20** | Honesty framing | `isLowCoverageOrConfidence` <br/> `evaluate.service.ts:60-75` <br/> `applyHonestyFraming` <br/> `evaluate.service.ts:78-95` | **In**: 3 `ExtractedSignals`, summary strings <br/> **Out**: prefixed display text when thresholds hit | **DETERMINISTIC_POLICY** | **Prefixes** summary/insight |
| **21** | **Compatibility scoring (self vs partner)** | `computeCompatibility` <br/> `compatibility-score.ts:157+` <br/> Called: `evaluate.service.ts:712-716` | **In**: `self.signals`, `partner.signals` <br/> **Out**: `CompatibilityResult` (0–100, coverage, hardMismatches, breakdown) | **DETERMINISTIC_SCORING** | Pure function on final signals |
| **22** | **Compatibility scoring (self vs relationship)** | `computeCompatibility` <br/> Called: `evaluate.service.ts:718-722` | **In**: `self.signals`, `relationship.signals` <br/> **Out**: `CompatibilityResult` | **DETERMINISTIC_SCORING** | Pure function |
| **23** | **Product scores** | `computeProductScores` <br/> `evaluate.service.ts:301-374` <br/> Called: **732-738** | **In**: 3 `ExtractedSignals`, 2 `CompatibilityResult` <br/> **Out**: `ProductScores` (0–100 for 5 dimensions) + `EvaluateFlag[]` | **DETERMINISTIC_SCORING** | **Clamp/round**; coverage **caps** `overallDecisionScore` (**348-352**) |
| **24** | Display note from flags | `evaluateBatch` <br/> `evaluate.service.ts:740-743` | **In**: flags <br/> **Out**: optional `display.note` | **DETERMINISTIC_POLICY** | Adds note string |
| **25** | UI chips (display-only) | `buildChips` <br/> `chips-builder.ts:260+` <br/> Called: `evaluate.service.ts:757-763` | **In**: 3 `ExtractedSignals`, optional `rawInterests`, `extendedSignals` <br/> **Out**: `ChipsBundle` | **DETERMINISTIC_POLICY** | Read-only aggregation |
| **26** | Persist to DB | `ProfilesController.evaluate` <br/> `profiles.controller.ts:79-88` <br/> → `ProfilesPrismaService.save` <br/> `profiles-prisma.service.ts:90-182` | **In**: `{ id, name, texts, evaluation }` <br/> **Out**: DB rows (`userProfile`, `profileEvaluation`, `profileSignalSnapshot`, `profileEvaluationRaw`) | **PATCH_WIRING** | Stores evaluation JSON as-is |
| **27** | Signal snapshot denormalization | `takeSignalsByDomain` <br/> `profiles-prisma.service.ts:184-192` <br/> `toSignalSnapshotRow` <br/> `profiles-prisma.service.ts:194-232` | **In**: evaluation JSON <br/> **Out**: typed signal snapshot rows | **PATCH_WIRING** | Coerces non-number → null (**227**) |

---

## Authority summary

### Who has first word
- **Signals (values 1–10)**: **LLM** (step 6 primary or step 11 retry)
- **Evidence (quote + reason)**: **LLM** (step 6 primary or step 11 retry)
- **Confidence**: **LLM** proposes (step 6 or 11)

### Who has last word
- **Signals (which survive)**: **validateExtraction** (step 13) — can **null** but never invents
- **Evidence (which rows survive)**: **validateExtraction** (step 13) — filters invalid rows
- **Confidence**: **validateExtraction** (step 13) — **recomputes** from `nonNullInDomain / totalAllowedForDomain` (or ≤0.3 if <3 non-null)
- **Compatibility scores**: **computeCompatibility** (steps 21–22)
- **Product scores**: **computeProductScores** (step 23) with coverage **caps**

---

## Removed layers (no longer in pipeline)

| Layer | Location | What it did |
|-------|----------|-------------|
| `applySparseTextGuard` | `engine/signal-post-processing/sparse-policy.ts:45-70` | Capped non-null to 2–3 for short text; capped confidence to 0.45 |
| `applyTextInference` | `engine/signal-post-processing/text-inference.ts:282-339` | Regex rules → fill null signals with fixed values; synthetic evidence |
| `enforceSignalCountLimits` | `engine/signal-post-processing/signal-count-policy.ts:24-73` | Capped official non-null to 12; priority-based ranking |
| `applySparseProfileNullOnlyPatch` | `engine/signal-post-processing/sparse-profile-patch.ts:13-22` | Hard-coded profile IDs → second text-inference pass |

---

## Net result

**Before**: LLM proposes → 4 deterministic post-processing layers **modify, cap, infer** → validation gate  
**After**: LLM proposes → validation gate **only** (nullify invalid; never invent or clamp values)

**"LLM first"** is now **"LLM first and LLM last"** for signal semantics.
