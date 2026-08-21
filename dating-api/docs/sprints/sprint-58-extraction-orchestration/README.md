# Sprint 58 — Extraction Orchestration Decomposition (P0)

**Status:** In Progress  
**Depends on:** Sprint 51 (expansion manifest) Done; Sprint 57 helpful  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md)  
**Repo:** `dating-api`  
**Round:** 3

---

## Goal

Split `extraction/extraction.service.ts` (~797 LOC) into focused collaborators so the Nest service is a thin coordinator:

| Collaborator | Responsibility |
|--------------|----------------|
| Prompt builder | Domain system prompts + expansion joins |
| LLM client / runner | Call router, usage, retries, empty-pass policy |
| Validator | Strict validation + debug payloads |
| Normalizer | Key aliases, raw → ExtractedSignals |

**Non-goals:** Changing extraction schemas; new expansions (use Sprint 51 playbook); prompt wording churn beyond moves.

---

## Stories

| # | Story | Status |
|---|-------|--------|
| 01 | [Characterization + extraction pipeline map](./STORY_01_characterization_pipeline_map.md) | Done |
| 02 | [Extract PromptBuilder + Normalizer + Validator](./STORY_02_extract_collaborators.md) | Done |
| 03 | [Thin ExtractionService coordinator](./STORY_03_thin_coordinator.md) | Planned |

**Order:** 01 → 02 → 03.

**Preferred merge tip:** `feature/sprint-58-story-3`

---

## Success criteria

- `ExtractionService` ≤ ~250 LOC soft target (orchestration only)
- Expansion joins stay via `expansion-manifest` (no paste regression)
- Extraction unit + integration specs green; empty-pass / strict validation parity
