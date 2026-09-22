# Story 3: No profile means no photos, not a 404

**Status:** Proposed  
**Depends on:** Story 1 (local account with no profile, for the check)

## Why

On Basics, the photos box calls `GET /api/v1/me/profile/photos` before a profile exists. The API returns 404 `profile_not_found`. The UI prints `GET /api/v1/me/profile/photos failed: 404` in red. The API answer is correct. The screen should show empty slots.

## What

**As a** new user  
**I want** the photo area to look empty until I have a profile  
**So that** a missing profile is not shown as a broken request

### Acceptance criteria

- [ ] `listMyProfilePhotos` returns `[]` on 404 `profile_not_found`
- [ ] Basics shows the three empty slots and the “at least one photo” hint, with no red 404
- [ ] An account that already has photos still lists them
- [ ] A failed upload is still shown as an error

### Out of scope

- Creating a profile automatically when the photos box loads
- Reordering the page (Story 6)
- The Skip/Exit trap (Story 4)

## Definition of done

- [ ] Change is in `dating-ui/src/lib/api/me-photos-api.ts` and the photos section still renders empty slots
- [ ] Unit coverage for the 404 → empty list path
- [ ] Checked on local Basics with the reset account from Story 1
