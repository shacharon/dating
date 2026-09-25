# Story 2: Update details Preferences section

**Status:** Done
**Depends on:** Story 1
**Repo:** `dating-ui`
**Shipped on main:** *(pending merge)*
**Feature tip ahead of main:** *(pending)*

## Why

Update details (`/profile/edit`) is where someone changes Story, Basic, and Photos later. Age range and max distance have to be there too, or the only way back is the old settings page.

## What

**As a** returning user
**I want** Preferences on Update details
**So that** I can set or clear age range and max distance after onboarding

- `/profile/edit` section nav gains **Preferences**, after Basic: Story, Basic, Preferences, Photos.
- Hash `#preferences` selects it. `profileEditHash` and `EditSectionId` include it.
- The pane is the same age + distance fields as Story 1, loaded from the profile.
- Save writes `partnerAgeMin`, `partnerAgeMax`, `maxDistanceKm`. Clearing both saves null.
- The section is optional. An empty age and empty distance do not mark the profile incomplete and do not block anything else on the page.
- Completion dot for this section is filled only when at least one of the three values is set. Empty is a normal state, not an error.
- Who you're open to stays on the Basic section.

### Acceptance criteria

- [x] Update details nav shows Preferences
- [x] `/profile/edit#preferences` opens that section
- [x] Saving a range and a distance round-trips after reload
- [x] Clearing both persists null and the section no longer shows as filled
- [x] Basic still edits who you're open to
- [x] Profile completeness does not require this section

## Out of scope

- Redirecting `/settings/preferences` (Story 3)
- Changing onboarding resume
- Matcher changes

## Definition of done

- [x] Someone who skipped Preferences in onboarding can fill it in from Update details
- [x] Someone who set them in onboarding can change or clear them here
