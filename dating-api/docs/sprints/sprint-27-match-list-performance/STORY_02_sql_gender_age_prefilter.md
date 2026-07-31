# Story 02 — SQL gender / age prefilter

**Sprint 27 · Status: PLANNED** (Agent 0 architect lock complete)  
**Priority:** P0  
**Estimated effort:** 1 day  
**Agent:** `generalPurpose`  
**Dependencies:** Story 01 preferred first (independent otherwise)

**Handoffs:** [architect](./handoffs/STORY_02_sql_gender_age_prefilter/agent-0-architect.md)

---

## Objective

Push **viewer gender prefs** and **age / birthDate bounds** into the Prisma/SQL `where` for candidate loading in `buildFullRankedList`, so profiles that fail hard gender/age gates are never hydrated.

## Why

Indexes `(status, gender, birthDate)` exist but gender/age are applied **in memory** after loading full `candidateSelect` rows (including text/signals). Wasted IO and CPU on people who fail immediately.

## Scope / tasks

1. Read how reciprocal / product gender eligibility works today in `me-matches.service.ts` (search `reciprocalProductGenderEligibility`, gender filters).
2. Read viewer preference shape used for age (min/max age → birthDate window).
3. Extend `matchCandidatePhotoEligibleWhere` (or a new helper used only by list rebuild) to include:
   - Candidate `gender` ∈ viewer accepted partner genders (when prefs present)
   - Candidate `birthDate` within viewer age range (when prefs present)
4. Keep “no prefs / open prefs” behavior identical to current in-memory rules (do not over-filter).
5. Leave full HG Layer-3 + `compareWithStatus` as today for remaining candidates.
6. Add/extend unit tests for the where-builder / helper with fixture prefs.
7. Document in a short comment that reciprocal gender may still run in-memory if not expressible cheaply in SQL this sprint.

## Acceptance criteria

- [ ] List rebuild SQL filters gender (and age when configured) before hydrate
- [ ] Existing match-list tests / me-matches specs still pass; add coverage for filter helper
- [ ] Users with empty/missing prefs still see the same broad pool as before
- [ ] No API DTO change

## Notes / gotchas

- Mirror exact age math already used in HG / product code (timezone/birthDate edge cases).
- Soft-deleted users: keep `user.deletedAt: null`.
- Do not remove in-memory gender check until SQL parity is proven; can dual-run then delete dead branch in a follow-up if desired.

## Deliverables

Updated `me-matches.service.ts` (+ specs). Optional pure helper module for building age/gender where clauses (easier to unit test).

## Commit message

```
perf(matches): prefilter match candidates by gender and age in SQL

Apply viewer partner-gender and age/DOB bounds in the candidate
WHERE before hydrating signals/text for match-list rebuild.

Sprint 27 Story 2
```
