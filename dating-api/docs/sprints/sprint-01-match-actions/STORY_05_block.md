# Story 5: Block a match

**Sprint:** 1  
**Status:** Done  
**Depends on:** [Story 1 — Like](./STORY_01_like.md)

---

## Why

Users need a safety control to permanently hide someone. Block is stronger than pass and must remove the person from discovery.

---

## What

**As a** logged-in user  
**I want to** block a match  
**So that** I never see them again in my match list or detail

### Acceptance criteria

- [x] **POST** `{ "action": "BLOCK" }` on actions endpoint
- [x] **Confirmation** — UI asks “Are you sure? This can’t be undone.” before block
- [x] **List filter** — blocked targets excluded from `GET /api/v1/me/matches`
- [x] **Detail guard** — `GET /api/v1/me/matches/:id` returns 404 if viewer blocked target *(MVP: one-way only — viewer→target; reverse block deferred to Phase 2)*
- [x] **No undo** — no DELETE for BLOCK *(404 via visibility guard after block; Story 4 403 guard remains if row visible)*
- [x] After block: redirect to match list; row gone
- [x] **Tests** — block hides from list; detail 404; cannot undo block

### Out of scope (this story)

- Reporting / moderation queue
- Two-way block visibility *(Phase 2: hide if they blocked you)*

---

## Definition of done

- [x] BLOCK action persisted
- [x] Match list query excludes blocked profile IDs
- [x] Detail endpoint respects block
- [x] Block button + confirm dialog on detail
- [x] API + UI tests
- [x] Manual smoke: block → person disappears from list *(documented; browser verification pending user)*

---

## Manual smoke

1. Open match → **Block** → confirm  
2. Back on list — match not shown  
3. Direct URL to detail — not found or friendly “unavailable”
