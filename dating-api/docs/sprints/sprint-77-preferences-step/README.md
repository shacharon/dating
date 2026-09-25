# Sprint 76 — Skippable preferences on onboarding and Update details

**Status:** Not started
**Commands:** [AGENT_COMMANDS.md](./AGENT_COMMANDS.md)
**Repo:** `dating-ui` (profile fields already exist on the API)
**Follows:** [Sprint 75 — Three-screen onboarding and profile routes](../sprint-75-onboarding-profile/README.md)

## Goal

Age range and max distance show up in two places: a new **Preferences** step during onboarding, and a **Preferences** section on Update details (`/profile/edit`). Both can be left empty. Who the user is open to stays on Facts and stays required.

## When and where

| When | Where | Questions | Skip? |
|------|--------|-----------|-------|
| First time, after Facts | Onboarding step **Preferences** (`/onboarding/preferences`) | Age range, max distance | Yes. Continue with both empty goes to Photos |
| Later, menu **Update details** | `/profile/edit#preferences` | Same two | Yes. Empty is a valid saved state |
| First time and later | Facts / Basic | Who you're open to | No |

Onboarding order becomes Story → Facts → Preferences → Photos.

## Decisions

- **No new profile fields and no matcher change.** `partnerAgeMin`, `partnerAgeMax`, and `maxDistanceKm` already save on `PATCH /api/v1/me/profile`. Empty age skips the age filter. Empty distance skips distance. Distance still does not filter anyone, because profiles have no coordinates.
- **No new `onboardingStep`.** Facts still advances the step the way it does today. Preferences is a screen on the way to Photos, not a gate. Resume rules stay as they are. The stepper still lets someone open Preferences before they finish.
- **One editor.** `/settings/preferences` stops being the place people edit these. It redirects to Update details. Who you're open to is not on this new step; it stays on Facts / Basic.
- **Skip means empty, not a default range.** Do not invent 18–99 or a default kilometer value on skip.

## Story checklist

| # | Story | Status | Size | Depends on |
|---|--------|--------|------|------------|
| 1 | [Onboarding Preferences step](./STORY_01_onboarding_preferences_step.md) | Not started | M | — |
| 2 | [Update details Preferences section](./STORY_02_update_details_preferences.md) | Not started | M | 1 |
| 3 | [Retire `/settings/preferences`](./STORY_03_retire_settings_preferences.md) | Not started | S | 2 |

**Order:** 1 → 2 → 3.

## Out of scope

- Moving "who you're open to" off Facts
- Making age or distance required
- Enforcing kilometers (needs coordinates)
- Turning age or distance into text signals
- Matcher, eligibility, or ranking changes
