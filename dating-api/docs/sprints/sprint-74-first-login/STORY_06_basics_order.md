# Story 6: Reorder Basics

**Status:** Done (local Basics and profile-edit check pending operator)  
**Shipped on main:** pending merge  
**Feature tip ahead of main:** pending merge  
**Depends on:** Story 5 (city list)

## Why

Step 1 is one long form, and photos sit at the bottom. A new user has to pass nickname, birth date, city, and country before the few fields that matter and before the photo that unlocks matches.

## What

**As a** new user  
**I want** the short required part first, then photos, then the rest  
**So that** the page does not block me with optional fields

### Order on onboarding Basics

1. The three dating-story choices.
2. Required: your gender, who you are open to, and location.
3. Photos.
4. The rest: nickname and birth date.

Location is one city dropdown from Story 5, not a free-text label. Country is chosen only so the city list can be filtered. Cities exist for the US states and countries in Story 5. For any other country, the user picks the country and no city. Continue requires gender, at least one “open to” gender, and a location choice (city when that country has cities, otherwise the country).

Profile edit uses the same field order inside Basics. Photos stay on the Photos tab. Settings keeps the dating-story choices where they already are.

### Acceptance criteria

- [x] Onboarding Basics shows dating-story choices, then gender, open to, and location, then photos, then nickname and birth date
- [x] Location is a dropdown of Story 5 cities, after a country choice
- [x] Israel cities show `name_he` when the UI locale is Hebrew, and `name_en` otherwise
- [x] Continue is blocked until gender, open to, and location are set
- [x] Continue is not blocked by an empty nickname or birth date
- [x] Profile edit Basics uses the same field order
- [x] Profile edit still has Photos as its own section, not inside the Basics form

### Out of scope

- Making `PROXIMITY` compute kilometers from the saved city
- Hebrew translations for non-Israel places
- The Skip/Exit trap (Story 4)
- The photos 404 (Story 3), except that this screen must not regress it

## Definition of done

- [x] Onboarding and profile-edit Basics match the order above
- [x] Chosen city id (or country, when that country has no cities) is what the form saves as location
- [ ] Checked locally on the reset account and on profile edit for an account that already has a profile — **pending operator**
