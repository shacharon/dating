# ExtractionService coordinator LOC residual (Sprint 58 Story 03)

**Measured:** `extraction.service.ts` ≈ **348** lines (PowerShell `Measure-Object -Line`)  
**Soft target:** ≤ ~250 LOC  
**Date:** 2026-08-21

## Why residual remains

After Story 02–03 splits, the service no longer owns prompts, LLM call, allowlist clean, or usage math. Remaining lines are **orchestration + Nest logging**:

| Residual owner | What stays on `ExtractionService` |
|----------------|-----------------------------------|
| Nest DI | `LLMRouterService`, `SimpleLogger` |
| Public API | `extract`, `extractAllThree` |
| Stage glue | `buildRequestMetadata`, `applyNormalizeAliasKeys` (telemetry), empty-debug note, pipeline trace assembly, provenance |
| Cost finalize | `finalizeUsageAndLogging` (AnalyzeCost log) |

Stage logging inside `extract()` (after_llm / after_normalize / stage diffs / final) dominates LOC. Cutting those would reduce observability without changing behavior ownership — **not done** for Story 03.

## Collaborator ownership (already extracted)

| Module | Owns |
|--------|------|
| `extraction-prompt.builder.ts` | Domain system prompts + `joinExpansion*` |
| `extraction-llm.runner.ts` | First LLM call + `EMPTY_MODEL_TEXT` |
| `extraction-output.cleaner.ts` | `validateAndClean` |
| `extraction-usage.ts` | Token/cost usage helpers |
| `extraction-normalization.ts` | Raw normalize + alias keys |
| `extraction-strict-validation.ts` | Strict evidence validation |
| `pipeline-trace.ts` | Snapshots / stage diffs |

## Acceptance

Story 03 AC allows soft budget **or** documented residual with ownership note — this file satisfies that clause.
