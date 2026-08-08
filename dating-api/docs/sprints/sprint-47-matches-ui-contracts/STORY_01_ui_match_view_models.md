# Story 01 — UI match / profile view-models

**Sprint 47 · Status: Planned**  
**Priority:** P1  
**Estimated effort:** 1.5–2 days  
**Dependencies:** Sprint 45 Story 03 (server DTO boundary)  
**Repo:** `dating-ui` (primary)  
**Risk:** Medium (type churn across match browse/detail)

---

## Objective

Introduce a stable UI view-model layer for matches (and profile fields the match UI needs) so components and hooks do not import raw engine-shaped DTOs from `lib/me-matches-api.ts` / `lib/me-profile-api.ts`.

## Why

Fat API modules re-encode scores, priority tiers, HG fields, teasers. Sprint 45 prepared the server edge; UI should consume a product view model.

## Scope / tasks

1. Architect locks view-model shape + mapper from API JSON.
2. Implement mappers + types; migrate me-matches browse/detail (+ related) to use them.
3. Keep `*-api.ts` as thin transport; move product vocabulary out.
4. Specs for mappers; update component specs as needed.

## Out of scope

- React Query migration (Story 02)
- Chip enum (Story 03)
- Visual redesign

## Acceptance criteria

- [ ] View-model module exists; primary match UI uses it
- [ ] No unexplained UI behavior change
- [ ] Specs green

## Suggested commit

```
refactor(ui): match view-models over raw me-matches DTOs

Sprint 47 Story 1
```
