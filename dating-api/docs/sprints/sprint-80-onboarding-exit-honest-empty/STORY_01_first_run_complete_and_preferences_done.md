# Story 1: Mark first-run complete + Preferences Done

**Status:** Done
**Depends on:** —
**Repo:** `dating-ui`
**Shipped on main:** `2db5b211`
**Feature tip ahead of main:** 0

## Goal

Finishing Photos on first login marks onboarding `COMPLETED`. Preferences is optional and has a **Done** that the user clicks. Next login must not dump them back on Photos.

## Why

`use-onboarding-photos-form.ts`: first-run Finish only `router.push` Preferences. `COMPLETED` is patched only in `?edit=1`. Facts persist `TEXTS` when they can continue. `onboardingResumePath` maps `TEXTS` → `/onboarding/photos`. Preferences has blur-save only — no Done.

## Scope

- First-run Photos Finish: PATCH `onboardingStep: COMPLETED`, then open Preferences (same as today’s next step).
- Preferences: Done button → `/dating/me-matches` (user clicked Done; this is not a Matches-page redirect).
- Empty age/distance stay valid. Done must not require filters.
- Do **not** change `postLoginPath`. Do **not** `replace` on the Matches route.
- After `COMPLETED` and no analysis, login still resumes onboarding (today: Preferences). That is correct.

## Acceptance criteria

- [x] First-run Photos Finish persists `COMPLETED`
- [x] Next login without analysis does **not** open Photos solely because step was left `TEXTS`
- [x] Preferences shows Done; click goes to Matches
- [x] Matches nav still stays on Matches if they skip Done
- [x] Specs cover Finish PATCH + Done click

## Affected files

- `dating-ui/src/hooks/use-onboarding-photos-form.ts`
- `dating-ui/src/components/onboarding/onboarding-preferences-form.tsx`
- `dating-ui/src/app/(authenticated)/onboarding/photos/page.spec.tsx`
- Preferences form spec

## Validation

From `dating-ui`:

`npx vitest run src/hooks/use-onboarding-photos-form.ts src/app/(authenticated)/onboarding/photos/page.spec.tsx src/components/onboarding/onboarding-preferences-form.spec.tsx`

## Definition of done

- [x] First-run can leave Photos without a `TEXTS` trap
- [x] Preferences has an exit
- [x] Tests passing (photos page spec + preferences form spec — 16 passed)
- [x] UX review approved (Agent 3.5)
- [x] Landed on `main` (`2db5b211`). Feature tip ahead of main: 0
