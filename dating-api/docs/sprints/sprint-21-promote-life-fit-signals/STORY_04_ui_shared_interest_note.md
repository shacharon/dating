# Story 4: UI display of sharedInterestNote

**Sprint:** 21
**Status:** Planned
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

- [ ] Extend `MatchExplainabilityDto` in `dating-ui` to include optional `sharedInterestNote?: string`.
- [ ] Map the field through list/detail mappers (`me-profile-api.ts` / matches mappers) without breaking when absent.
- [ ] Render the note on match card and/or match detail (product choice: detail-first is fine).
- [ ] Prefer display labels via existing interest label helpers when available (avoid raw snake_case when a label exists).
- [ ] No scoring or API contract changes beyond consuming the existing field.

### Out of scope

- Re-extracting interests or changing Jaccard math.
- Admin-only surfaces (optional nice-to-have).

---

## Definition of done

- [ ] Shared interest note visible in UI when API returns it.
- [ ] Absent/null note does not break list or detail.
- [ ] Manual check against Sprint 21 fixture pairs (Story 2 seeds).
