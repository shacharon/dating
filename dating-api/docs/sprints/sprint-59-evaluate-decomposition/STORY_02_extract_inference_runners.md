# Story 02 — Extract inference runners

**Sprint 59 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 2–3 days  
**Repo:** `dating-api`  
**Extra agents:** none  
**Depends on:** Story 01

---

## Objective

Pull each LLM inference (motivation, attraction, attraction traits, derived context, summary, etc.) into dedicated runner modules that take router + inputs and return typed results. Keep Zod schemas / prompts where they already live; runners call them.

Deterministic steps (chips, enrichment wrap, product scores, display normalize) should call existing helpers — do not merge them back into runners.

## Acceptance criteria

- [x] One runner per LLM purpose (or tightly coupled pair if map says so)
- [x] `EvaluateService` mostly sequences runners + assembly
- [x] Specs green; parity with Story 01 characterizations
- [x] No scoring / chip formula changes

## Definition of Done

- [x] Runner files + service wired
- [x] Agent 2; Agent 3 close

## Deferred

- Final thin orchestrator polish → [Story 03](./STORY_03_thin_orchestrator.md)

## Suggested commit

```
refactor(evaluate): extract LLM inference runners from EvaluateService

Sprint 59 Story 2
```

## Close tip

`feature/sprint-59-story-2` @ `8c0c165` (+ Agent 3 close commit)
