# Story 4: UI display of sharedInterestNote

**Sprint:** 21
**Status:** Done
**Depends on:** Story 2

---

## Why

Story 2 already returns `explainability.sharedInterestNote` from the API (e.g. `"You both enjoy hiking, books."`). The dating UI type and match card/detail surfaces do not yet read or render it, so shared-interest explainability is invisible to users.

---

## What

**As a** user
**I want** to see shared interests on a match
**So that** the interestAlignment score has a human-readable “why” in the UI.

### Acceptance criteria

- [x] Extend `MatchExplainabilityDto` in `dating-ui` to include optional `sharedInterestNote?: string`.
- [x] Map the field through list/detail mappers (`me-profile-api.ts` / matches mappers) without breaking when absent.
- [x] Render the note on match card and/or match detail (product choice: detail-first is fine).
- [x] Prefer display labels via existing interest label helpers when available (avoid raw snake_case when a label exists).
- [x] No scoring or API contract changes beyond consuming the existing field.

### Out of scope

- Re-extracting interests or changing Jaccard math.
- Admin-only surfaces (optional nice-to-have).

---

## Definition of done

- [x] Shared interest note visible in UI when API returns it.
- [x] Absent/null note does not break list or detail.
- [x] Covered by unit tests (`formatSharedInterestNote` + detail page).

## Implementation notes

- Types: `dating/_lib/types.ts`, `me-profile-api.ts`
- Mapper: `matches-api-list-mapper.ts` validates optional string
- Display: `formatSharedInterestNote()` in `enrichment-display-v1.ts` (uses `labelInterest`)
- Surfaces: list card + match detail (`data-testid=match-*-shared-interests`)
