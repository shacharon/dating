# Story 3: One nickname editor

**Status:** Done
**Depends on:** —
**Repo:** `dating-ui`
**Shipped on main:** `a74a378a`
**Feature tip ahead of main:** 0

## Goal

Nickname is edited in **one** place. Facts and Settings must not both own it.

## Why

`OnboardingFactsForm` has nickname. Settings has `NicknameSettingsSection`. Completeness suggestions already point to `/profile/settings#nickname`.

## Scope

- Keep Settings as the editor after first login
- Onboarding Facts: either keep nickname **only there** for first login and hide it on `profileHub`, **or** remove it from Facts and send people to Settings — pick one surface and document it in the spec
- Same PATCH field; no API change

## Acceptance criteria

- [x] Hub Facts pane does not duplicate Settings nickname
- [x] First login still has a way to set nickname before Matches
- [x] Completeness “Add a nickname” still reaches the remaining editor
- [x] Specs for Facts + Settings

## Affected files

- `dating-ui/src/components/onboarding-facts-form.tsx`
- `dating-ui/src/hooks/use-onboarding-facts-form.ts`
- `dating-ui/src/components/nickname-settings-section.tsx`
- Specs next to those files

## Validation

From `dating-ui`:

`npx vitest run src/components/onboarding-facts-form.spec.tsx src/components/nickname-settings-section.spec.tsx src/components/profile/profile-settings-tab.spec.tsx`

## Definition of done

- [x] One editor after first login (Settings). Onboarding Facts keeps nickname for first login
- [x] No matcher change
- [x] Tests passing (facts form, nickname settings, settings tab — 20 passed)
- [x] UX review approved (Agent 3.5)
- [x] Landed on `main` (`a74a378a`). Feature tip ahead of main: 0
