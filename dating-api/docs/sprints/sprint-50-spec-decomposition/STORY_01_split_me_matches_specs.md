# Story 01 — Split me-matches unit specs

**Sprint 50 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 2 days  
**Repo:** `dating-api`  
**Extra agents:** none (test-only)

---

## Objective

Decompose `me-matches.service.spec.ts` into focused specs per collaborator (`match-ranking`, `match-detail`, `match-eligibility`, `match-list-cache`, thin façade). Keep characterization coverage; move ownership with the code.

## Acceptance criteria

- [x] No single me-matches unit spec remains the sole 3k-LOC owner — split into 6 characterization files + support
- [x] All previous green cases still green — Agent 2: **110 passed** (99 char + 11 materialized)
- [x] Façade spec stays thin relative to mega-spec (~533 LOC; soft-400 residual → Story 03)

## Definition of Done

- [x] Schema / HTTP API / UI / production services: N/A (test-only)
- [x] Shared `me-matches.spec-support.ts`
- [x] Specs: cache, scoring, ranking, detail, eligibility, façade
- [x] Agent 2 CR fixed soft list-cache LOC; suite green
- [x] Agents 2.5 / 3.5 / 4 / 5: N/A
- [x] Agent 3 PM close

## Deferred

- Façade soft ≤400 LOC tightening → [Story 03](./STORY_03_spec_budget.md)
- Eligibility e2e harness relocate → [Story 02](./STORY_02_relocate_eligibility_harness.md)

## Commits

- `d6c8987` — test(me-matches): split mega-spec into collaborator characterization files
- `eeaf1d2` — test: split me-matches list-cache scoring for LOC budget
- (pending) — chore: close sprint 50 story 1

## Suggested commit

```
test(me-matches): split mega-spec into collaborator characterization files

Sprint 50 Story 1
```
