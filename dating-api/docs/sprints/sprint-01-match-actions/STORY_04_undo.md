# Story 4: Undo like or pass

**Sprint:** 1  
**Status:** Done  
**Depends on:** [Story 1](./STORY_01_like.md), [Story 3 — View action](./STORY_03_view_action.md)

---

## Why

Users change their minds. Undo reduces friction and support burden; block remains irreversible for safety.

---

## What

**As a** logged-in user  
**I want to** undo a like or pass  
**So that** I can reconsider a match

### Acceptance criteria

- [x] **DELETE** `/api/v1/me/matches/:id/actions` removes LIKE or PASS row
- [x] **404** if no action exists
- [x] **Block cannot be undone** via DELETE (403 or 404 with clear message)
- [x] **UI** — “Undo” or “Change mind” on detail when action is LIKE or PASS
- [x] After undo: Like/Pass buttons enabled again; list badge cleared
- [x] **Tests** — DELETE happy path; cannot undo BLOCK; UI undo flow

### Out of scope (this story)

- Undo block
- Notifying the other user (never on undo)

---

## Definition of done

- [x] DELETE endpoint with block guard
- [x] Detail UI undo control + state refresh
- [x] List refreshes `yourAction` after undo *(on next list load)*
- [x] API + UI tests
- [x] Manual smoke: like → undo → like again *(documented; browser verification pending user)*

---

## Manual smoke

1. Like a match → **Undo**  
2. Buttons active again; list no longer shows liked  
3. Pass → undo → pass again works
