# Story 5: Delete dead Basic form

**Status:** Parked
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

- [ ] No `OnboardingBasicForm` in `dating-ui/src`
- [ ] `/onboarding/basics` and `/profile/edit` Facts still work
- [ ] `npx vitest` on profile-edit + facts specs pass

## Affected files

- `dating-ui/src/components/onboarding-basic-form.tsx`
- `dating-ui/src/components/onboarding-basic-form.spec.tsx`
- `dating-ui/src/hooks/use-onboarding-basic-form.ts` (delete or trim if only hub)

## Validation

From `dating-ui`:

`npx vitest run src/components/onboarding-facts-form.spec.tsx src/components/profile/profile-edit-tab.spec.tsx`

## Definition of done

Dead Basic + embedded photos gone.
