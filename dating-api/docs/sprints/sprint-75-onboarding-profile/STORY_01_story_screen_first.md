# Story 1: Story screen first, delete the duplicate

**Status:** Done (local first-login check pending operator)  
**Shipped on main:** _(set after merge)_  
**Feature tip ahead of main:** _(set after merge)_  
**Depends on:** —

## Why

A new account lands on `/onboarding/basic` with no `tab` param, which defaults to the
story tab — so the first screen is already the story. But the same three fields are
asked again at `/onboarding/texts` at the end of the flow, bound to the same profile
fields. The user answers, walks through two more screens, and is asked the identical
questions a second time. It reads like a bug and it lands at the finish line, which is
the worst possible place to lose trust.

## What

**As a** new user
**I want** to be asked for my story once, on the first screen
**So that** I am not made to repeat myself at the end

- `/onboarding/story` is screen 1 of 3: `aboutMe`, `aboutPartner`, `aboutRelationship`,
  with the existing "Ideas to write about" prompts and word counts kept as-is.
- `/onboarding/texts` is deleted. Everything that pointed at it — the match list story
  gate, the profile story deep-link, `onboardingResumePath` — points at
  `/onboarding/story`.
- Continue saves the texts and goes to `/onboarding/basic` until Story 03 ships
  `/onboarding/basics` (architect interim).
- The story page keeps working as a standalone edit target for an existing user, since
  the match-list gate links people straight to it.
- Skip is allowed: empty texts on Continue are OK; match-list `not_analyzed` remains the net.

### Acceptance criteria

- [x] `/onboarding/story` renders the three texts with prompts and word counts
- [x] `/onboarding/texts` no longer exists; requests to it redirect to `/onboarding/story` (server `redirect`, query preserved)
- [x] The three texts are asked exactly once in the whole sign-up flow (story tab stripped from basic)
- [x] Continue persists the texts and routes to `/onboarding/basic` (interim until Story 03 `/onboarding/basics`)
- [x] The match-list story gate CTA opens `/onboarding/story` (`not_analyzed`)
- [x] An existing user opening `/onboarding/story` sees their saved text and can save without finishing onboarding

## Out of scope

- Voice recording (Story 02)
- Changing the prompts or word-count copy
- Renaming Continue target to `/onboarding/basics` (Story 03)

## Definition of done

- [x] No route in the app asks for `aboutMe` twice
- [x] Onboarding and the match-list gate both resolve to one story route
- [ ] Checked locally on the reset `shacharon@gmail.com` account — **pending operator**
- [x] Landed on `main` (ahead count 0)
