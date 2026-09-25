# Story 1: Onboarding Preferences step

**Status:** Done
**Depends on:** —
**Repo:** `dating-ui`
**Shipped on main:** *(pending merge)*
**Feature tip ahead of main:** *(pending)*

## Why

Age range and max distance are optional pool limits. Today they live only on `/settings/preferences`, which a new user never passes through. They should appear once, after the required facts, and be skippable.

## What

**As a** new user
**I want** an optional Preferences step after Facts
**So that** I can set an age range and a max distance, or leave both empty and continue

- New route `/onboarding/preferences`, between Facts and Photos.
- Stepper order: Story, Facts, Preferences, Photos. Same step is reachable with `?edit=1`.
- The screen shows only:
  1. Partner age min / max
  2. Max distance (km)
- Reuse `MatchPreferencesAgeSection` and `MatchPreferencesDistanceSection` in `dating-ui/src/components/match-preferences-sections.tsx`. Do not show partner genders on this screen.
- **Continue** and **Skip** both go to `/onboarding/photos`.
  - Skip saves nothing new (leave stored values as they are; a first visit has them empty).
  - Continue saves `partnerAgeMin`, `partnerAgeMax`, `maxDistanceKm` through the existing profile patch. Empty inputs save null.
- Min greater than max blocks Continue and shows the existing age-range error. Skip stays available.
- Facts still owns gender, who you're open to, location, and birth date. Its Continue routes to `/onboarding/preferences` instead of Photos. Do not add an `onboardingStep` value.
- Copy in en / he / es: step label, short line that these are optional, Skip, Continue.

### Acceptance criteria

- [x] Onboarding stepper is Story → Facts → Preferences → Photos
- [x] Facts Continue opens `/onboarding/preferences`
- [x] The screen has age range and max distance only
- [x] Skip opens Photos and does not write a default age or distance
- [x] Continue with valid numbers persists them and opens Photos
- [x] Continue with min > max stays on the screen with an error
- [x] Who you're open to is unchanged on Facts and still required there
- [x] Resume rules in `onboarding-path.ts` are unchanged

## Out of scope

- Update details section (Story 2)
- Removing `/settings/preferences` (Story 3)
- Matcher changes

## Definition of done

- [x] A new user can finish onboarding without typing an age or a distance
- [x] A new user who fills them sees those values on the profile payload
