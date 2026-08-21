# Story 01 — Characterization + extraction pipeline map

**Sprint 58 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Repo:** `dating-api`  
**Extra agents:** none

---

## Objective

Confirm / extend characterization around extraction passes (self / partner / relationship), empty first pass, strict validation drops, expansion shadow blocks. Produce `PIPELINE_MAP.md` listing seams for Story 02 collaborators.

## Acceptance criteria

- [x] Pipeline map documents: prompt assembly → LLM call → normalize → validate → snapshot/trace
- [x] Existing `extraction.service.spec` (and related) green; gaps filled only if needed for safe move
- [x] No production behavior change

## Definition of Done

- [x] `PIPELINE_MAP.md` in sprint folder
- [x] Specs green; Agent 2; Agent 3 close
- [x] Optional agents: N/A

## Deferred

- Collaborator extraction → [Story 02](./STORY_02_extract_collaborators.md)

## Suggested commit

```
docs(extraction): pipeline map + characterize seams for sprint 58

Sprint 58 Story 1
```

## Close tip

`feature/sprint-58-story-1` @ `9911b0f` (+ Agent 3 close commit)
