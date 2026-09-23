# Story 6: Nickname and dating chapter move to settings

**Status:** Proposed
**Depends on:** Story 3

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

- [ ] Neither field appears anywhere under `/onboarding`
- [ ] Both are editable in profile settings with the same rules as today
- [ ] A user with an existing nickname still sees it and can change it
- [ ] `nickname_taken` still surfaces as a field error, not a console error
- [ ] The "Other" tab is gone

## Out of scope

- Changing what dating chapter does to match presentation
- Any database migration

## Definition of done

- [ ] Sign-up never asks for nickname or dating chapter
- [ ] Both round-trip correctly from profile settings
