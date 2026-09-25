# Story 5: Delete dead Basic form

**Status:** Done
**Depends on:** —
**Repo:** `dating-ui`

## Goal

Remove `OnboardingBasicForm`. Update details already uses `OnboardingFactsForm`. The old hub form still embeds `ProfilePhotoSection`.

## Why

Sprint 79 story 1 shipped Facts on `/profile/edit`. Nothing mounts `OnboardingBasicForm` except its own spec. Leaving it will resurrect photos-under-Facts if someone wires it again.

## Scope

- Delete `onboarding-basic-form.tsx` + spec (and hub-only hook pieces if unused)
- Keep `OnboardingFactsForm` / onboarding basics route
- Grep: no remaining hub import of the basic form

## Acceptance criteria

- [x] No `OnboardingBasicForm` in `dating-ui/src`
- [x] `/onboarding/basics` and `/profile/edit` Facts still work
- [x] `npx vitest` on profile-edit + facts specs pass

## Affected files

- `dating-ui/src/components/onboarding-basic-form.tsx`
- `dating-ui/src/components/onboarding-basic-form.spec.tsx`
- `dating-ui/src/hooks/use-onboarding-basic-form.ts` (delete or trim if only hub)

## Validation

From `dating-ui`:

`npx vitest run src/components/onboarding-facts-form.spec.tsx src/components/profile/profile-edit-tab.spec.tsx`

## Definition of done

- [x] `OnboardingBasicForm`, its spec, and `use-onboarding-basic-form.ts` are absent. Removal shipped in sprint 79 as `c2b59bbb`, already on `main`.
- [x] Helpers and Facts validation kept
- [x] Tests passing (facts form + profile edit tab — 25 passed)
- [x] UX review approved (Agent 3.5)
- [x] Landed on `main` (SHA recorded after merge)
