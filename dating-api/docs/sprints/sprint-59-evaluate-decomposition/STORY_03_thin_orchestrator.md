# Story 03 — Thin EvaluateService orchestrator

**Sprint 59 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 1–2 days  
**Repo:** `dating-api`  
**Extra agents:** Agent 4 recommended (analysis / evaluate batch path)  
**Depends on:** Story 02

---

## Objective

`EvaluateService` is a thin Nest orchestrator: order of operations, error/trace aggregation, return `EvaluateBatchResult`. Soft ≤ ~250 LOC. Public API for analysis worker / controllers unchanged.

## Acceptance criteria

- [ ] Soft LOC met or residual documented
- [ ] No inlined system prompts or large Zod schemas left in service
- [ ] Worker / HTTP call sites unchanged
- [ ] Specs + tsc green

## Definition of Done

- [ ] Agent 2; Agent 4 if run; Agent 3 PM close

## Suggested commit

```
refactor(evaluate): thin EvaluateService as multi-inference orchestrator

Sprint 59 Story 3
```
