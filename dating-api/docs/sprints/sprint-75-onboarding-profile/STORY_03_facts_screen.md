# Story 3: One facts screen, four fields

**Status:** Proposed
**Depends on:** —

## Why

The facts the matcher needs are gender, who you are open to, where you are, and how
old you are. Today they are spread across two tabs mixed with nickname and dating
chapter, and the required ones are only validated when you press Continue — so you
find out the city is mandatory after you thought you were done. Sprint 74's beats
experiment went the other way and gave each field its own screen, which was page-
flipping ceremony around four tiny inputs.

Four small fields belong on one screen.

## What

**As a** new user
**I want** the few required facts on a single screen
**So that** I can see everything that is being asked of me at once

- `/onboarding/basics` is screen 2 of 3, in this order:
  1. I am — gender tiles
  2. I'm looking for — Men / Women / Everyone
  3. Where I am — country, then city (US adds state)
  4. Birth date
- Country is pre-selected from the device time zone so most users never open the
  dropdown. The guess is always editable. Reuse
  `dating-ui/src/lib/profile/country-from-timezone.ts` from the Sprint 74 work.
- Continue enables as the four fill in. No error wall on press — the button simply
  stays disabled with the missing items visible.
- "Looking for" writes the full gender set (Everyone = all four choices). Finer
  combinations stay in match preferences, not here.

### Acceptance criteria

- [ ] All four fields are on one screen, in the order above
- [ ] Country is pre-selected from the time zone and can be changed
- [ ] City is a searchable list filtered by country/state, Hebrew names when locale is `he`
- [ ] Continue is disabled until all four are set, and shows which are missing
- [ ] Continue persists and routes to `/onboarding/photos`
- [ ] No nickname and no dating chapter anywhere on this screen

## Out of scope

- Nickname and dating chapter relocation (Story 06)
- Removing the old tabbed form (Story 05)
- Geolocation by IP or GPS — time zone only

## Definition of done

- [ ] A user with a fresh account can complete screen 2 without opening the country dropdown when their time zone is mapped
- [ ] Nothing on this screen can produce a 422 from the API
