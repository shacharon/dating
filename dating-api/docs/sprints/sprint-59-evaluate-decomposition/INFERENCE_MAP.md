# INFERENCE_MAP — Evaluate multi-inference seams (Sprint 59)

**Sprint:** [sprint-59-evaluate-decomposition](./README.md)  
**Story:** [STORY_01](./STORY_01_characterization_inference_map.md)  
**Status:** locked for Story 02  
**Date:** 2026-08-21

## 1. Purpose

This map locks the current `EvaluateService.evaluateBatch` (and related public `infer*`) orchestration seams so Story 02 can extract LLM runners without changing product score formulas, chip vocabulary, prompt wording, or Zod schemas. Story 01 does **not** change production behavior; characterization for AC classes is already covered by existing specs (pointers below).

## 2. End-to-end stage table

| Stage | Kind | Current location | Story 02 target |
|-------|------|------------------|-----------------|
| Extraction handoff | call | `extractionService.extractAllThree` | **keep** call on service |
| Summary LLM | LLM `evaluate-summary` | `generateSummaryFromSignals` | `evaluate-summary.runner.ts` |
| Motivation LLM | LLM `evaluate-motivation` | `inferRelationshipMotivation` | `evaluate-motivation.runner.ts` |
| Attraction traits LLM | LLM `evaluate-attraction-traits` | `inferAttractionTraits` | `evaluate-attraction-traits.runner.ts` |
| Attraction profile LLM | LLM `evaluate-attraction` | `inferAttractionProfile` (public; **not** in batch) | optional runner (recommend extract for API parity) |
| Derived context LLM | LLM `evaluate-derived-context` | `inferDerivedContext` | `evaluate-derived-context.runner.ts` |
| Compatibility | deterministic | `computeCompatibility` (self↔partner, self↔relationship) | **keep** `compatibility-score` |
| Display honesty | deterministic | `isLowCoverageOrConfidence` / `applyHonestyFraming` / `normalizeDisplay` | **keep** `evaluate-display-helpers` |
| Product scores | deterministic | `computeProductScores` / `buildProductScoresPresentation` | **keep** `product-scores` |
| Explicit lists | deterministic | `buildExplicitExtendedLists` | **keep** module |
| Chips | deterministic | `buildChips` | **keep** `chips-builder` |
| Enrichment | deterministic | `buildEnrichmentSignalsV4` + sanitize/wrap | **keep** enrichment modules |
| Trace helpers | shared | `evaluate-llm-pipeline` | **keep**; runners may call |
| Prompts / schemas | shared | `evaluate-llm-prompts` / `evaluate-inference-schemas` | **keep**; runners import |
| Batch orchestration | Nest | `evaluateBatch` | stay on `EvaluateService` (thin in Story 03) |
| Lifestyle conflicts | deterministic | `detectLifestyleConflicts` (public façade) | **keep** compatibility module |

### Runtime flow (as implemented)

```text
evaluateBatch(input)
  ├─ extractionService.extractAllThree(aboutMe, aboutRelationship, aboutPartner, profileId)
  ├─ PARALLEL start:
  │     ├─ generateSummaryFromSignals(self, partner, relationship)     → evaluate-summary
  │     ├─ inferDerivedContext(...) [optional, catch → undefined]      → evaluate-derived-context
  │     └─ Promise.all(inferRelationshipMotivation, inferAttractionTraits) [optional]
  │           → evaluate-motivation + evaluate-attraction-traits
  ├─ await summary + computeCompatibility(self↔partner) + computeCompatibility(self↔relationship)
  ├─ applyHonestyFraming(display) via isLowCoverageOrConfidence
  ├─ computeProductScores + buildProductScoresPresentation
  ├─ await optional extended + derived packs
  ├─ buildExplicitExtendedLists → merge into extendedSignals
  ├─ buildChips(...)
  ├─ buildEnrichmentSignalsV4 → sanitize → wrapEnrichmentV1
  └─ assemble EvaluateBatchResult (+ _evaluateLlmTraces)
```

## 3. Collaborator summary (Story 02)

| Target | Owns |
|--------|------|
| `evaluate-summary.runner.ts` | Summary `completeJSON` + normalizeDisplay handoff hooks |
| `evaluate-motivation.runner.ts` | Motivation LLM purpose |
| `evaluate-attraction-traits.runner.ts` | Attraction traits LLM purpose |
| `evaluate-attraction.runner.ts` (optional) | Attraction profile LLM (public API parity) |
| `evaluate-derived-context.runner.ts` | Derived context LLM + sanitize persist |
| `evaluate-llm-prompts.ts` / `evaluate-inference-schemas.ts` | Prompt strings + Zod — **do not duplicate** |
| Deterministic modules (chips, enrichment, product-scores, display helpers, compatibility) | Unchanged ownership — service only calls |
| `evaluate.service.ts` | DI (`ExtractionService`, `LLMRouterService`, `SimpleLogger`), `evaluateBatch` sequencing / parallelism / optional-catch policy, public façades |

**Recommendation:** Extract runners for all batch LLM purposes plus `inferAttractionProfile` for API parity. Keep optional-catch policy on the service for extended/derived packs.

## 4. Non-goals / deferred

| Deferred | Where |
|----------|--------|
| Physical runner extraction | [Story 02](./STORY_02_extract_inference_runners.md) |
| Soft LOC ≤ ~250 orchestrator polish | [Story 03](./STORY_03_thin_orchestrator.md) |
| Scoring / chip / enrichment formula changes | Out of scope |
| New LLM purposes | Out of scope |

## 5. Characterization pointer

All AC classes have **EXISTING** locks. No Story 01 gap-fill suite required.

| AC class | Coverage (examples in `evaluate.service.spec.ts`) | Status |
|----------|-----------------------------------------------------|--------|
| Display honesty / low coverage | `display uses cautious language when coverage and confidence are low`; `rich high-confidence case remains direct` | **EXISTING** |
| Product scores shape / determinism / caps | `response includes … productScores`; `productScores are deterministic`; `low coverage + moderate fit produces capped overallDecisionScore` | **EXISTING** |
| Extended signals (motivation + attraction traits) | `extendedSignals are populated with relationshipMotivation and attractionTraits`; sidecar-only vs scores | **EXISTING** |
| Explicit extended lists | `explicit lists are concrete, deduped … max 5`; recall phrases case | **EXISTING** |
| Chips | `chips are populated…`; `chips respect max 5`; `empty inputs produce empty chips`; display-only vs scores | **EXISTING** |
| Derived context | `derivedContext is populated…`; `evaluateBatch succeeds without derivedContext when derived-context LLM fails` | **EXISTING** |
| Extraction handoff (mocked) | evaluateBatch path mocks `extractAllThree` throughout suite | **EXISTING** |

Also: `evaluate-display-helpers.spec.ts` locks normalize / honesty helpers used after summary LLM.

### Verification commands

```bash
npx jest --no-coverage --runInBand src/evaluate/evaluate.service.spec.ts src/evaluate/evaluate-display-helpers.spec.ts
```
