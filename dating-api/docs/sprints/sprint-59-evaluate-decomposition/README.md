# Sprint 59 — Evaluate Multi-Inference Decomposition (P0)

**Status:** In Progress  
**Depends on:** Sprint 58 Done (extraction thin); Sprint 57 helpful  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md)  
**Repo:** `dating-api`  
**Round:** 3

---

## Goal

Split `evaluate/evaluate.service.ts` (~695 LOC) into a thin orchestrator that delegates LLM inferences and post-processing:

| Collaborator | Responsibility |
|--------------|----------------|
| Orchestrator | Batch order, parallelism policy, assemble `EvaluateBatchResult` |
| Motivation / attraction / traits / summary runners | One LLM purpose each (prompts already partly extracted) |
| Chips / product-scores / display / enrichment glue | Deterministic post-LLM assembly (prefer existing modules) |

**Non-goals:** Changing product score formulas; chip vocabulary; new LLM purposes.

---

## Stories

| # | Story | Status |
|---|-------|--------|
| 01 | [Characterization + inference map](./STORY_01_characterization_inference_map.md) | Done |
| 02 | [Extract inference runners](./STORY_02_extract_inference_runners.md) | Done |
| 03 | [Thin EvaluateService orchestrator](./STORY_03_thin_orchestrator.md) | Planned |

**Order:** 01 → 02 → 03.

**Preferred merge tip:** `feature/sprint-59-story-3`

---

## Success criteria

- `EvaluateService` soft ≤ ~250 LOC orchestration
- Inference schemas / prompts stay in existing modules (`evaluate-llm-prompts`, `evaluate-inference-schemas`)
- Evaluate + analysis worker path green; display / chips parity
