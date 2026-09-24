# Story 6: Nickname and dating chapter move to settings

**Status:** Done  
**Depends on:** Story 3  
**Shipped on main:** `cad8a1fa`  
**Feature tip ahead of main:** 0

## Why

Nickname and the dating-chapter question currently occupy a whole onboarding screen.
Neither is needed to match anyone. Nickname is a display preference and dating chapter
only changes how matches are presented, not who is shown — its own helper text says
so. Asking for them before a user has seen the product is pure friction.

## What

**As a** new user
**I want** to be asked only what is needed to match me
**So that** sign-up does not include a screen of optional questions

- Nickname and dating chapter move to the profile settings route
  (`/profile/settings` after Story 07, `/profile?tab=settings` before it).
- Both keep their current behaviour and validation, including the nickname-taken
  check.
- Existing values are untouched; no migration.
- The "Other" onboarding tab is removed along with them.

### Acceptance criteria

- [x] Neither field appears anywhere under `/onboarding`
- [x] Both are editable in profile settings with the same rules as today
- [x] A user with an existing nickname still sees it and can change it
- [x] `nickname_taken` still surfaces as a field error, not a console error
- [x] The "Other" tab is gone

## Out of scope

- Changing what dating chapter does to match presentation
- Any database migration

## Definition of done

- [x] Sign-up never asks for nickname or dating chapter
- [x] Both round-trip correctly from profile settings

## Pipeline

| Agent | Verdict |
|-------|---------|
| -1 preflight | ready |
| 0 architect | ready |
| 1 dev | approved (`42fa2f33`) |
| 2 CR | approved (`0a33d6ad`) |
| 3.5 UX | approved (`9f3e1b4e`) |
| 2.5 / 4 | N/A |
| 3 PM | Done |

**Handoffs:** [preflight](./handoffs/STORY_06_move_extras/agent--1-preflight.md) · [architect](./handoffs/STORY_06_move_extras/agent-0-architect.md) · [dev](./handoffs/STORY_06_move_extras/agent-1-dev.md) · [CR](./handoffs/STORY_06_move_extras/agent-2-cr.md) · [UX](./handoffs/STORY_06_move_extras/agent-3.5-ux.md) · [PM](./handoffs/STORY_06_move_extras/agent-3-pm.md)
