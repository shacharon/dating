# Story 1: Reuse Facts UI on Update details

**Status:** Done
**Depends on:** —
**Repo:** `dating-ui`

## Goal

Update details Facts looks like onboarding Facts. One editor. Label is Facts, not Basic.

## Scope

- `/profile/edit` Facts pane uses the same gender / looking-for / location / birth date UI as `/onboarding/basics`.
- Nav order stays Story → Facts → Photos → Preferences (only the Basic label changes).
- Hub: persist without navigating to Photos. Autosave-on-blur or the existing hub Save is fine if it matches Facts behavior as closely as possible without stranding the user.
- i18n `en` / `es` / `he` for the renamed nav label.
- Specs: onboarding Facts tiles still work; Update details Facts shows tiles, not the old checkbox legend “Open to matching with (required to continue)”.

## Acceptance criteria

- [x] Onboarding `/onboarding/basics` still shows I am / I'm looking for / country / birth date
- [x] `/profile/edit` Facts pane shows that same control set (tiles, not gender `<select>` + partner checkboxes)
- [x] Update details section nav says **Facts**, not **Basic**
- [x] Saving from Update details does not push `/onboarding/photos`
- [x] `desiredPartnerGenders` still comes from looking-for tiles (Men / Women / Everyone), not a second checkbox group
- [x] Tests cover both surfaces

## Affected files

- `dating-ui/src/components/onboarding-facts-form.tsx` (shared, or a extracted fields component)
- `dating-ui/src/components/profile/profile-edit-tab.tsx`
- `dating-ui/src/components/profile/profile-edit-section-nav.tsx`
- `dating-ui/src/components/onboarding-basic-form.tsx` / `onboarding-basic-fields.tsx` (stop using for this pane, or delete dead path)
- `dating-ui/src/lib/i18n/en.ts` / `es.ts` / `he.ts`
- Specs next to those files

## Validation

From `dating-ui`:

`npx vitest run src/components/onboarding-facts-form.spec.tsx src/components/profile/profile-edit-tab.spec.tsx`

## Definition of done

- [x] One Facts UI on onboarding and Update details
- [x] No matching or API field changes
- [x] Tests passing (`onboarding-facts-form.spec.tsx`, `profile-edit-tab.spec.tsx` — 23 passed)
- [x] UX review approved (Agent 3.5)
- [x] Landed on `main` (SHA recorded after merge)
