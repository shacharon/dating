# Story 03 — Thin ExtractionService coordinator

**Sprint 58 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 1–2 days  
**Repo:** `dating-api`  
**Extra agents:** Agent 4 recommended (extraction / evaluate path spot-check)  
**Depends on:** Story 02

---

## Objective

`ExtractionService` becomes a Nest coordinator: inject collaborators, run domain extract methods, emit traces/metrics. Soft target ≤ ~250 LOC. Public API for evaluate / workers unchanged.

## Acceptance criteria

- [x] Soft LOC budget met or documented residual with ownership note
- [x] No duplicate prompt / validate / normalize logic left in service
- [x] Worker / evaluate call sites unchanged
- [x] Specs + tsc green

## Definition of Done

- [x] Agent 2 approved; Agent 4 if run; Agent 3 PM close

## Suggested commit

```
refactor(extraction): thin ExtractionService as coordinator

Sprint 58 Story 3
```

## Close tip

`feature/sprint-58-story-3` @ `a9c14f1` (+ Agent 3 close commit)
