# Story 02 — Admin MatchesService onto shared policy / collaborators

**Sprint 46 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 2 days  
**Dependencies:** Story 01  
**Repo:** `dating-api` only  
**Risk:** Medium–High (admin compare / diagnostics)  
**Agent 4:** Yes if compare/list semantics touch eligibility or ranking order

---

## Objective

Align admin matching façade ([`matches.service.ts`](../../../../src/matches/matches.service.ts) + explainability) with the post-split product collaborators and `PairMatchPolicy`, so admin is not a second bespoke HG+legacy stack.

## Why

Admin and product currently duplicate policy knowledge. Every eligibility/ranking change risks two places.

## Scope / tasks

1. Architect maps which admin paths call policy vs keep admin-only diagnostics (shadow HG metrics, etc.).
2. Extract/reuse collaborators where logic is shared; thin admin façade for lab/diagnostic extras.
3. Preserve admin HTTP contracts unless Architect documents intentional change.
4. Agent 4 when ranking/eligibility shared paths change.

## Out of scope

- Deleting admin tooling
- UI admin pages rewrite
- Story 03 dedupe

## Acceptance criteria

- [ ] Admin pair eval goes through `PairMatchPolicy` (or documented adapter)
- [ ] No unexplained drift in admin compare vs product for same pair fixtures
- [ ] Specs / Agent 4 (if applicable) green

## Suggested commit

```
refactor(matches): route admin compare through PairMatchPolicy

Sprint 46 Story 2
```
