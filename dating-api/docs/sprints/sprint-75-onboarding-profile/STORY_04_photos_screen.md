# Story 4: Photos screen and finish

**Status:** Proposed
**Depends on:** Story 3

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

- [ ] Finish is enabled on successful upload, without waiting for `APPROVED`
- [ ] Finish sets `COMPLETED` and routes to the match list
- [ ] A user whose only photo is `PENDING` sees the existing photo gate on matches, not an error
- [ ] Upload failure keeps the user on the screen with a readable message
- [ ] No path through this screen produces `photo_required` in the console

## Out of scope

- Changing photo moderation itself
- Photo cropping or editing tools

## Definition of done

- [ ] Sign-up can be completed end to end while a photo is still under review
- [ ] `photo_required` no longer appears in UI logs during normal sign-up
