# Story 5: Delete beats, tabs and the old stepper

**Status:** Done  
**Depends on:** Stories 1, 3, 4  
**Shipped on main:** _(after merge)_  
**Feature tip ahead of main:** 0

## Why

Once the three screens exist, three older systems are still in the tree and two of
them are visible on screen at the same time. The beats flow from Sprint 74 renders
its own progress bar underneath the onboarding header, which is still drawing a
three-dot "Story → Basic → Other" stepper for tabs that no longer exist. A new user
currently sees two competing progress indicators and stale labels.

## What

**As a** new user
**I want** one progress indicator that matches the screens I am actually walking through
**So that** the app does not look broken before I have done anything

- Delete `onboarding-beats-flow.tsx`, its spec, and
  `onboarding-basic-client.tsx`. Keep `country-from-timezone.ts` — Story 03 uses it.
- Delete the `?tab=story|basic|other` machinery: `onboardingTabFromSearchParams`,
  `onboardingTabHref`, and the tab branches inside `onboarding-basic-form.tsx`.
- `OnboardingStepper` becomes three steps that match the three real routes: Story,
  Facts, Photos.
- `onboardingResumePath` maps `onboardingStep` onto the three routes: `BASIC` →
  story, `TEXTS` → basics, `COMPLETED` → profile. Rename the states in a follow-up if
  the names stop making sense; do not rename the Prisma enum in this story.
- `?edit=1` deep links from the profile keep working and keep their current form.

### Acceptance criteria

- [x] Exactly one progress indicator is visible during onboarding
- [x] The stepper's three labels match the three routes
- [x] No component reads `?tab=` under `/onboarding`
- [x] The beats flow and its spec are gone from the tree
- [x] Resume drops a half-finished user on the screen they stopped at
- [x] `?edit=1` from the profile still opens an editable form

## Out of scope

- Renaming the `UserProfileOnboardingStep` Prisma enum
- The profile-side route split (Story 07)

## Definition of done

- [x] Scoped `rg` for onboarding tab/beats tokens returns nothing under `dating-ui/src` (bare `beats` still hits writing-prompt copy — false positive; architect scoped DoD)
- [x] A fresh account walks screen 1 → 2 → 3 with one honest progress bar

## Pipeline

| Agent | Verdict |
|-------|---------|
| -1 preflight | ready |
| 0 architect | ready |
| 1 dev | approved (`fc2ee19e`) |
| 2 CR | approved (`2f5994bc`) |
| 3.5 UX | approved (`1f1b6753`) |
| 2.5 / 4 | N/A |
| 3 PM | Done |

**Handoffs:** [preflight](./handoffs/STORY_05_remove_old_flow/agent--1-preflight.md) · [architect](./handoffs/STORY_05_remove_old_flow/agent-0-architect.md) · [dev](./handoffs/STORY_05_remove_old_flow/agent-1-dev.md) · [CR](./handoffs/STORY_05_remove_old_flow/agent-2-cr.md) · [UX](./handoffs/STORY_05_remove_old_flow/agent-3.5-ux.md) · [PM](./handoffs/STORY_05_remove_old_flow/agent-3-pm.md)
