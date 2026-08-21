# Story 02 — Extract inference runners

**Sprint 59 · Status: Planned**  
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

- [ ] One runner per LLM purpose (or tightly coupled pair if map says so)
- [ ] `EvaluateService` mostly sequences runners + assembly
- [ ] Specs green; parity with Story 01 characterizations
- [ ] No scoring / chip formula changes

## Definition of Done

- [ ] Runner files + service wired
- [ ] Agent 2; Agent 3 close

## Deferred

- Final thin orchestrator polish → [Story 03](./STORY_03_thin_orchestrator.md)

## Suggested commit

```
refactor(evaluate): extract LLM inference runners from EvaluateService

Sprint 59 Story 2
```
