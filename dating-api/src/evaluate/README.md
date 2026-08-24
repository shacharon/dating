# evaluate/

LLM + deterministic enrichment for profile evaluation batches. Nest: `EvaluateModule` / `EvaluateServiceModule` → `EvaluateService` facade. Prefer public types from `evaluate-public-api.ts` (not deep imports into the service).

## Orchestration

| Piece | Role |
|-------|------|
| `evaluate.service.ts` | Nest facade — delegates to runners / batch |
| `evaluate-batch.orchestrator.ts` | **Batch orchestrator** — extraction + LLM runners + enrichment + chips / scores / display |
| `evaluate-*.runner.ts` | Single-concern LLM runners (motivation, attraction, traits, derived context, summary) |
| `evaluate-llm-pipeline.ts` / `evaluate-llm-prompts.ts` | Shared LLM call / prompt helpers |

HTTP: `evaluate.controller.ts`. Wiring: `evaluate.module.ts`, `evaluate-service.module.ts`.

## Enrichment modules

Deterministic closed-code enrichment (no scoring side effects in the mapper):

| File | Role |
|------|------|
| `enrichment-v2.ts` | **Thin facade** — `mapEnrichmentV2FromText` / `buildEnrichmentSignalsV2` |
| `enrichment-keyword-manifest.ts` | Composition registry (Sprint 57) |
| `enrichment-*-keywords.ts` / `enrichment-keyword-helpers.ts` | Domain keyword blocks |
| `enrichment-signals.ts` | Sanitize / wrap for persist |
| `enrichment-canonical-labels.ts` | Label hygiene |

**Keyword freeze still applies** to enrichment-v2 family:

- [`KEYWORD_ENGINE_FREEZE.md`](../../docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md)
- Do **not** paste new regex into the facade — extend via manifest / domain modules **only with RFC** when match sets change.

## Where to add

- New batch step: orchestrator + types in `evaluate-batch.types.ts` (keep `EvaluateService` thin).
- New LLM concern: new `evaluate-*.runner.ts` + wire from service/orchestrator.
- New enrichment domain block: keyword module + manifest entry (freeze/RFC if patterns change).
