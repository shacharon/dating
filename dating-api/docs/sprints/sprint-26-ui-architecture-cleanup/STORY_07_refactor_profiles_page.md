# Story 7: Refactor 1006-line profiles page

**Priority:** P1  
**Estimated effort:** 2–3 days  
**Agent:** `explore` then `generalPurpose`  
**Dependencies:** Story 5 (profiles-api service exists)

---

## Problem

`dating-ui/src/app/profiles/page.tsx` mixes types, chip/boundary heuristics (regex), fetch orchestration, and full UI in one file (~1000 lines). Hard to test and review.

---

## Goal

Extract:
1. Chip/boundary logic → `lib/profile-chip-extraction.ts` (or similar)
2. Types → `lib/types/profiles.ts` or colocated types file
3. Keep page as UI orchestration using `profiles-api` (Story 5)

Target: page <400 lines (ideally <300).

---

## Acceptance Criteria

- [ ] Chip/boundary extraction module with unit tests
- [ ] Types moved out of page
- [ ] Page uses `profiles-api` only (no domain regex in page)
- [ ] Page <400 lines
- [ ] `/profiles` list/detail/analyze still work
- [ ] No behavior change
- [ ] Commit follows convention

---

## Agent instructions

1. Explore `app/profiles/page.tsx` — map sections (types, chips, fetch, UI)
2. Extract chip/boundary helpers to `lib/profile-chip-extraction.ts` + specs
3. Move types to dedicated module
4. Thin the page to compose UI + call `profiles-api`
5. Run `npm test` in dating-ui
6. Commit:

```
refactor(ui): extract profiles page chip logic and types

Split oversized internal profiles page:
- lib/profile-chip-extraction.ts for boundary/chip heuristics
- types out of page
- page thinned to UI + profiles-api

No behavior change.

Sprint 26 Story 7
```
