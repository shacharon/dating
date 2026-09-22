# Story 4: Skip and Exit leave Basics

**Status:** Proposed  
**Depends on:** Story 1 (local account with no profile, for the check)

## Why

First-time onboarding hides the app header. Skip and Exit both go to `/dating/me-matches`. Matches sees `no_profile` and sends the user back to `/onboarding`, which lands on Basics again. Skip looks dead. Exit returns to the same page.

## What

**As a** new user on Basics  
**I want** Skip and Exit to take me somewhere that stays open  
**So that** I am not stuck on Step 1

### Acceptance criteria

- [ ] Skip goes to Matches and the URL does not return to `/onboarding/basic`
- [ ] Exit, after confirm, does the same
- [ ] Matches for a user with no profile shows an empty / finish-your-profile state instead of replacing the route back to onboarding
- [ ] Continue to Story still works after the required Basics fields are filled
- [ ] Opening Matches directly, without Skip or Exit, does not trap the user either

### Out of scope

- Showing the main app header on first-time onboarding
- Making the Story stepper link work before Basics is done
- Field order (Story 6)

## Definition of done

- [ ] `use-matches.ts` no longer replaces `/onboarding` in a way that undoes Skip and Exit
- [ ] Checked locally: Skip stays, Exit stays, Continue to Story still advances
