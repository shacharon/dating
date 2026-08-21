# PIPELINE_MAP — Extraction orchestration seams (Sprint 58)

**Sprint:** [sprint-58-extraction-orchestration](./README.md)  
**Story:** [STORY_01](./STORY_01_characterization_pipeline_map.md)  
**Status:** locked for Story 02  
**Date:** 2026-08-21

## 1. Purpose

This map locks the current `ExtractionService.extract` / `extractAllThree` orchestration seams so Story 02 can split collaborators without changing schema, expansion injection, or prompt wording. Story 01 does **not** change production behavior; characterization for AC classes is already covered by existing specs (pointers below).

## 2. End-to-end stage table

| Stage | Current location | Story 02 target |
|-------|------------------|-----------------|
| Domain system prompts + `joinExpansion*` | Module consts `SELF_EXTRACTOR_PROMPT` / `RELATIONSHIP_*` / `PARTNER_*` + `getSystemPromptForDomain` in `extraction.service.ts` | **`extraction-prompt.builder.ts`** |
| Request metadata / user prompt wrap | `ExtractionService.buildRequestMetadata` | **Stay on service** |
| LLM call (`completeJSON`, `modelKey: 'fast'`, timeouts) | `runFirstLlmExtractionCall` | **`extraction-llm.runner.ts`** (recommended) |
| Empty raw / empty-signals debug note | Inline in `extract`: `EMPTY_MODEL_TEXT`, `EXTRACTION_EMPTY_DEBUG` + `debug.rawModelOutput` | Move with LLM runner **or** thin service policy helper |
| `normalizeRawExtraction` / `normalizeKeys` | `extraction-normalization.ts` (called from service; alias via `applyNormalizeAliasKeys`) | **Keep** module; service only calls |
| `validateAndClean` | Private method on `ExtractionService` | **Keep service-private initially** (reduce Story 02 blast radius); optional later: fold beside normalization or `extraction-output.cleaner.ts` |
| `validateExtraction` | `extraction-strict-validation.ts` | **Keep** module; service only calls |
| Snapshot / trace | `pipeline-trace.ts` (`toExtractionSnapshot`, `buildExtractionPipelineTrace`, `buildRawLlmPersistenceLogPayload`) | **Keep** module; service only calls |
| Usage merge / cost finalize | Module helpers (`emptyUsage`, `mergeUsage`, `parseOpenAIUsage`, `estimateCost`) + `finalizeUsageAndLogging` | **Stay on service** (Nest logging) for Story 02 |
| Public API | `extract`, `extractAllThree` | **Stay** on `ExtractionService` |

### Runtime flow (as implemented)

```text
extract(domain, text, profileId?)
  ├─ buildRequestMetadata          → userPrompt, requestId, usage accumulator
  ├─ runFirstLlmExtractionCall     → getSystemPromptForDomain(domain) + llm.completeJSON
  │     └─ prompts: SELF/RELATIONSHIP/PARTNER_* + joinExpansion* (module load)
  ├─ log raw LLM / EMPTY_MODEL_TEXT if raw empty
  ├─ normalizeRawExtraction(value, domain)
  ├─ applyNormalizeAliasKeys → normalizeKeys (+ telemetry)
  ├─ validateAndClean              → allowlist ints, evidence filter, rawInterests
  ├─ EXTRACTION_EMPTY_DEBUG note   → if finalNonNull===0 && text non-empty
  ├─ validateExtraction            → strict evidence (signals preserved)
  ├─ buildExtractionPipelineTrace  → stage snapshots / diffs
  └─ finalizeUsageAndLogging       → _usage, cost log

extractAllThree(aboutMe, aboutPartner, aboutRelationship)
  └─ three extract() calls in parallel + mergeUsage
```

## 3. Collaborator summary (Story 02)

| Target | Owns |
|--------|------|
| `extraction-prompt.builder.ts` | Domain system prompts; must call `joinExpansionSelfShadowBlocks` / `joinExpansionPartnerShadowBlocks` / `joinExpansionInterestGuidanceBlocks` — **only** expansion injection path |
| `extraction-llm.runner.ts` | First LLM call + empty-text logging hooks (recommended) |
| `extraction-normalization.ts` | Existing normalize seams (already external) — do **not** re-inline |
| `extraction-strict-validation.ts` | Existing strict evidence validation (already external) — do **not** re-inline |
| `pipeline-trace.ts` | Existing trace/snapshot helpers |
| `extraction.service.ts` | DI (`LLMRouterService`, `SimpleLogger`), `extract` / `extractAllThree` orchestration, logging/finalize |

**`validateAndClean` recommendation:** leave as service-private for Story 02 unless the move is trivial and characterization stays green; prefer moving prompts + LLM runner first.

## 4. Non-goals / deferred

| Deferred | Where |
|----------|--------|
| Physical file moves / collaborator extraction | [Story 02](./STORY_02_extract_collaborators.md) |
| Thin coordinator LOC polish | [Story 03](./STORY_03_thin_coordinator.md) |
| New expansions | Sprint 51 playbook |
| Schema / prompt wording churn | Out of scope for Sprint 58 |

## 5. Characterization pointer

All AC classes have **EXISTING** locks. No Story 01 gap-fill suite required.

| AC class | Coverage | Status |
|----------|----------|--------|
| Self pass | `extraction.service.spec.ts` — self ambition / domain extracts | **EXISTING** |
| Partner pass | partner `physicalPriority` / rich aboutPartner | **EXISTING** |
| Relationship pass | relationship attachment / `extractAllThree` | **EXISTING** |
| Empty first pass | `4a` / `4b` — single LLM call, `EXTRACTION_EMPTY_DEBUG` | **EXISTING** |
| Strict validation drops | `extraction-strict-validation.spec.ts` + service evidence/unknown-key drops | **EXISTING** |
| Expansion shadow / interest blocks | `expansion-manifest.spec.ts` join parity; expansion-*-rollout specs | **EXISTING** |
| Alias / allowlist clean | alias-only, official-wins, allowlist keys only | **EXISTING** |

### Verification commands

```bash
npx jest --no-coverage --runInBand src/extraction/extraction.service.spec.ts src/extraction/extraction-strict-validation.spec.ts src/extraction/expansion-manifest.spec.ts
```

Optional broader:

```bash
npx jest --no-coverage --runInBand src/extraction/extraction-pipeline-snapshots.spec.ts src/extraction/extraction-normalization.interest.spec.ts
```
