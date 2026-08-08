# Story 01 — Characterization tests for MeMatches list/detail

**Sprint 45 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Dependencies:** None  
**Repo:** `dating-api` only  
**Risk:** Low (tests only)

---

## Objective

Add/extend automated characterization coverage around `MeMatchesService.list()` and `getById()` (and materialized vs legacy list paths if both live) so Sprint 38 Story 03 can extract collaborators with parity confidence.

## Why

`me-matches.service.ts` is ~2k LOC with a ~3k LOC unit spec. Before splitting, lock observable outcomes: ready / not_ready / empty / cursor / hardBlocked / detail fields.

## Scope / tasks

1. Inventory existing specs (`me-matches.service.spec.ts`, HTTP integration, eligibility harness).
2. Fill gaps for: not_ready reasons, empty list, cursor invalid, materialized vs non-materialized (flag-aware), getById not found / ready.
3. Prefer extending existing harnesses over new mega-specs.
4. Document in Architect handoff which cases are locked as “do not drift.”

## Out of scope

- Refactoring production service layout
- Changing scores, HG, or HTTP shapes
- Frontend

## Acceptance criteria

- [x] Characterization cases listed in handoff + covered by green tests
- [x] `npm test` (relevant me-matches suites) green
- [x] No production behavior change

## Suggested commit

```
test(me-matches): characterization coverage for list/detail before split

Sprint 45 Story 1
```
