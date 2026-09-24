# Story 4: Photos screen and finish

**Status:** Done  
**Depends on:** Story 3  
**Shipped on main:** `28770205`  
**Feature tip ahead of main:** 0

## Why

Photo is the last thing standing between a new account and the product, and today it
is also the most likely place to get stuck: the finish button requires a photo that
has already passed moderation, so a user who just uploaded has to sit and wait, and
if review is slow they get a 422 telling them to do something they already did.

Uploading is the user's job. Waiting for review is ours.

## What

**As a** new user
**I want** to finish as soon as my photo is uploaded
**So that** I am not held at the door by a background review

- `/onboarding/photos` is screen 3 of 3: upload, up to three, one primary.
- Finish is enabled once at least one photo has uploaded successfully, whatever its
  moderation status. `PENDING` is allowed through.
- Finish sets `onboardingStep: COMPLETED` and lands on the match list.
- Nobody unapproved reaches matching anyway: the match list already returns
  `no_photo` until a photo is `APPROVED`, and `MatchListPhotoGate` already explains
  the pending state. The gate moves from the sign-up wall to the match list.

### Acceptance criteria

- [x] Finish is enabled on successful upload, without waiting for `APPROVED`
- [x] Finish sets `COMPLETED` and routes to the match list
- [x] A user whose only photo is `PENDING` sees the existing photo gate on matches, not an error
- [x] Upload failure keeps the user on the screen with a readable message
- [x] No path through this screen produces `photo_required` in the console

## Out of scope

- Changing photo moderation itself
- Photo cropping or editing tools

## Definition of done

- [x] Sign-up can be completed end to end while a photo is still under review
- [x] `photo_required` no longer appears in UI logs during normal sign-up

## Pipeline

| Agent | Verdict |
|-------|---------|
| -1 preflight | ready |
| 0 architect | ready |
| 1 dev | approved (`53269f5c`) |
| 2 CR | approved (`1786684d`) |
| 3.5 UX | approved (`17933a0c`) |
| 2.5 / 4 | N/A |
| 3 PM | Done |

**Handoffs:** [preflight](./handoffs/STORY_04_photos_screen/agent--1-preflight.md) · [architect](./handoffs/STORY_04_photos_screen/agent-0-architect.md) · [dev](./handoffs/STORY_04_photos_screen/agent-1-dev.md) · [CR](./handoffs/STORY_04_photos_screen/agent-2-cr.md) · [UX](./handoffs/STORY_04_photos_screen/agent-3.5-ux.md) · [PM](./handoffs/STORY_04_photos_screen/agent-3-pm.md)
