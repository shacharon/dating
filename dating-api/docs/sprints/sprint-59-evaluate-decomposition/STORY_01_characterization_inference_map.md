# Story 01 — Characterization + inference map

**Sprint 59 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Repo:** `dating-api`  
**Extra agents:** none

---

## Objective

Map `EvaluateService` inference sequence (extraction handoff → enrichment → compatibility → LLM calls → chips / product scores / display). Extend characterization where needed. Write `INFERENCE_MAP.md`.

## Acceptance criteria

- [ ] Map lists each LLM purpose + deterministic step + owning file target
- [ ] Specs green; no behavior change

## Definition of Done

- [ ] `INFERENCE_MAP.md` committed
- [ ] Agent 2; Agent 3 close

## Deferred

- Runner extraction → [Story 02](./STORY_02_extract_inference_runners.md)

## Suggested commit

```
docs(evaluate): inference map + characterize evaluate.service seams

Sprint 59 Story 1
```
