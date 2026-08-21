# Story 02 — Extract PromptBuilder + Normalizer + Validator

**Sprint 58 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 2–3 days  
**Repo:** `dating-api`  
**Extra agents:** none  
**Depends on:** Story 01

---

## Objective

Move logic out of `ExtractionService` into dedicated modules (names flexible; match PIPELINE_MAP):

- `extraction-prompt.builder.ts` — system prompts + `joinExpansion*` usage
- Keep / thin existing `extraction-normalization` + `extraction-strict-validation` as the owned seams (service should call them, not inline)
- Optional: `extraction-llm.runner.ts` for call + empty-debug handling if still inlined in the service

Service still wires Nest deps (`LLMRouterService`, logger) but body shrinks.

## Acceptance criteria

- [x] Prompt strings live in builder (or existing prompt modules), not mixed with HTTP/DI noise
- [x] Normalization / validation not re-implemented in service
- [x] Expansion manifest joins remain the only expansion injection path
- [x] Specs green; behavior parity

## Definition of Done

- [x] Collaborator files + service wired
- [x] Agent 2 approved; Agent 3 close

## Deferred

- Final LOC / facade polish → [Story 03](./STORY_03_thin_coordinator.md)

## Suggested commit

```
refactor(extraction): extract prompt builder and thin LLM/normalize seams

Sprint 58 Story 2
```

## Close tip

`feature/sprint-58-story-2` @ `97c6dc5` (+ Agent 3 close commit)
