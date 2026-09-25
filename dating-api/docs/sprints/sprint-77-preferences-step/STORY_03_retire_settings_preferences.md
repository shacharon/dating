# Story 3: Retire `/settings/preferences`

**Status:** Done
**Depends on:** Story 2
**Repo:** `dating-ui`
**Shipped on main:** `a339746a`
**Feature tip ahead of main:** 0

## Why

After Stories 1 and 2, age and distance have a home. Leaving `/settings/preferences` as a second editor means two places, and that page also edits who you're open to, which now belongs only on Facts / Basic.

## What

**As a** user following an old link
**I want** to land on Update details
**So that** there is one place to change age range and distance

- `/settings/preferences` redirects to `/profile/edit#preferences`.
- Point these at that hash instead of the old route:
  - Avatar menu match-preferences link (`nav-auth.tsx`)
  - Settings-tab preview card (`match-preferences-preview-card.tsx`)
  - Match list empty state
  - Match detail hard-block link
- Preview card can still show open-to, age, and distance. Its button opens Update details Preferences, not a form that edits gender.
- Delete the standalone page only if nothing else renders `MatchPreferencesForm` with the gender section. If the gender section's only caller was that page, remove that usage. Do not remove age and distance sections; Stories 1 and 2 use them.

### Acceptance criteria

- [x] Opening `/settings/preferences` lands on `/profile/edit#preferences`
- [x] Avatar, settings preview, empty match list, and hard-block links go to `/profile/edit#preferences`
- [x] No screen still edits partner gender, age, and distance together
- [x] Age and distance remain editable on onboarding Preferences and Update details

## Out of scope

- Notification settings, account, language
- API or matcher changes

## Definition of done

- [x] Search of `dating-ui/src` shows `/settings/preferences` only on the redirect
