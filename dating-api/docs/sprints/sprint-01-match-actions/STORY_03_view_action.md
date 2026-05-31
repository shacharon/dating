# Story 3: See my action on a match

**Sprint:** 1  
**Status:** Done  
**Depends on:** [Story 1 — Like](./STORY_01_like.md)

---

## Why

Users should know what they already decided so they do not double-submit or feel confused when returning to a profile.

---

## What

**As a** logged-in user  
**I want to** see my current action on a match (liked / passed / blocked)  
**So that** I know where I stand when I revisit the list or detail page

### Acceptance criteria

- [x] **GET** `/api/v1/me/matches/:id/actions` returns `{ action, createdAt }` or `{ action: null }`
- [x] **Match list** — each item includes `yourAction: 'LIKE' | 'PASS' | 'BLOCK' | null` (extend list DTO)
- [x] **Match detail** — shows badge/message from stored action (align with Story 1/2 copy)
- [x] **List badges** — subtle indicator on rows user already acted on (e.g. “Liked” / “Passed”)
- [x] **Buttons** — Like/Pass disabled or hidden when action exists (until undo in Story 4)
- [x] **Tests** — GET endpoint; list includes `yourAction`; UI shows badge after reload

### Out of scope (this story)

- Undo (Story 4)
- “They liked you” (Phase 2)

---

## Definition of done

- [x] GET actions endpoint
- [x] `MeMatchesService.list` joins viewer actions (efficient query, no N+1)
- [x] List + detail UI reflect `yourAction`
- [x] API + UI tests
- [x] Manual smoke: like in one tab, reload list in another — badge visible *(documented; browser verification pending user)*

---

## Manual smoke

1. Like a match  
2. Return to match list — row shows liked state  
3. Open detail again — same state, buttons appropriate
