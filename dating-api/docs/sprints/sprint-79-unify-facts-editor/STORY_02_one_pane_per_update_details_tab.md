# Story 2: One pane per Update details tab

**Status:** Done
**Depends on:** Story 1 (Facts label / Facts pane)
**Repo:** `dating-ui`
**Shipped on main:** `07f77115`
**Feature tip ahead of main:** 0

## Goal

Update details tabs are aligned with onboarding: each tab shows **only** that step. Photos live on the Photos tab. They must not appear under Facts (or any other tab).

## Why

`/profile/edit` already has a Photos tab, but **Basic / Facts still embeds `ProfilePhotoSection`** inside `OnboardingBasicForm`. Clicking Basic info shows Gender + looking-for **and** Photos + Upload on the same screen. Two photo UIs, one leftover inside Facts.

## Scope

- Facts tab: Facts fields only. No photo list, no Upload, no “at least one photo is required…” copy.
- Photos tab: the only place on Update details that mounts `ProfilePhotoSection`.
- Story and Preferences: only their own editors (no photos).
- Remove the hub embed in `onboarding-basic-form.tsx` (`<ProfilePhotoSection requiredForMatching />`). If that form is deleted after story 1, still grep so photos cannot leak back into Facts.
- Stay on `/profile/edit` with hash panes (`#facts` / `#photos` after story 1 rename). Do **not** send the user to `/onboarding/photos`.
- Specs: Facts pane has no photo upload; Photos pane has it; inactive panes are not visible.

## Acceptance criteria

- [x] On Update details **Facts**, there is no Photos heading and no Upload control
- [x] On Update details **Photos**, photos and Upload are visible
- [x] Story and Preferences panes do not render the photo section
- [x] Clicking a tab does not leave another tab’s body on screen
- [x] No `router.replace` / login redirect; stay on Update details

## Affected files

- `dating-ui/src/components/onboarding-basic-form.tsx`
- `dating-ui/src/components/profile/profile-edit-tab.tsx`
- Specs: `profile-edit-tab.spec.tsx`, any hub basic-form spec that expected photos on the basics pane

## Validation

From `dating-ui`:

`npx vitest run src/components/profile/profile-edit-tab.spec.tsx`

## Definition of done

- [x] Each Update details tab shows one editor
- [x] Photos only on the Photos pane
- [x] Hash stays `#basic` for Facts (no rename)
- [x] Tests passing (`profile-edit-tab.spec.tsx` — 11 passed)
- [x] UX review approved (Agent 3.5)
- [x] Landed on `main` (`07f77115`). Feature tip ahead of main: 0
