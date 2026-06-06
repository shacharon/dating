# Story 2: Photo gate + profile completeness

**Sprint:** 9  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** [Story 1](./STORY_01_photos_in_match_browse.md) (shared photo UX patterns)

---

## Why

Stub moderation auto-approves all uploads, so the only enforceable quality gate is **presence**. Sparse text profiles already get coverage-capped scores; the UI should nudge completeness before users hit an empty or low-quality match list.

---

## What

**As a** new user  
**I want** clear guidance on what's required before I see matches  
**So that** I don't land on a confusing or empty experience

### Acceptance criteria

- [x] **Photo gate** — viewer must have ≥1 `APPROVED` photo before `GET /api/v1/me/matches` returns `status: ready`
  - New `not_ready` reason: `no_photo` (document in API + UI)
- [x] **Submit gate** — `POST /api/v1/me/profile/submit` returns **422** when no approved photo (`error: photo_required`)
- [x] **Onboarding nudge** — photo upload section visible in onboarding flow with copy: required for matching
- [x] **Profile page** — banner when photo missing: "Add a photo to see matches"
- [x] **Completeness hints** — optional non-blocking checklist (photo ✓, three story sections ✓, basics ✓) on profile page
- [x] **Analytics** — `profile.photo_gate_blocked` with `{ surface: 'match_list' | 'submit' }` (PII-safe)
- [x] **Tests** — API returns `not_ready(no_photo)`; submit rejected without photo; UI redirects appropriately *(browser smoke deferred operator)*

### Out of scope (this story)

- Rejecting low-quality photos (moderation provider)
- Requiring N photos (keep max 3; min 1)
- Blocking candidates without photos from *other* users' lists (optional follow-up)

---

## Technical notes (guidance, not prescriptive)

- Gate in `MeMatchesService.list()` after profile analyzed check; mirror in `submitForUser`, `getById`, `assertMatchCandidateVisible`.
- UI: `/dating/me-matches` redirect to `/dating/profile` when `reason === 'no_photo'`.
- No migration: existing `ANALYZED` users without photos get `not_ready(no_photo)` until upload.

---

## Definition of done

- [x] No user reaches match list without ≥1 approved photo (API gate + UI redirect)
- [x] Onboarding and profile surfaces explain the requirement
- [x] API + UI tests green
- [x] API contract doc updated for new `not_ready` reason (`MATCH_ENGINE_V1_CONTRACT.md`, `MATCH_ENGINE_DEEP_DIVE.md`, `PRODUCT_FUNNEL.md`)

---

## Manual smoke

1. New user completes onboarding texts but skips photo → submit **422** → navigate matches → lands on profile with banner. *(operator)*
2. User uploads photo → match list becomes `ready` (when analyzed). *(operator)*
3. User deletes last photo → match list returns to `not_ready(no_photo)`. *(operator)*

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| API helper | `me-profile-photo-gate.ts` — `countApprovedPhotosForProfile`, `viewerHasApprovedPhoto` |
| Match list | `not_ready` reason `no_photo` after `ANALYZED` check |
| Submit | **422** `photo_required` before `SUBMITTED` transition |
| Detail/actions | Viewer without approved photo → **404** |
| Analytics | `profile.photo_gate_blocked` — surfaces `match_list`, `submit` |
| Ops | `ME_PROFILE_PHOTO_REQUIRED` error code |
| UI redirect | `no_photo` → `/dating/profile` |
| UI profile | `PhotoGateBanner`, `ProfileCompletenessHints`, `#profile-photos` anchor |
| UI onboarding | `ProfilePhotoSection requiredForMatching` |
| i18n | `photoGate`, `profileCompleteness` en + es |

**Pipeline:** architect → dev → code review → pm (full handoffs in `handoffs/STORY_02_photo_gate_profile_completeness/`).

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Hide photo-less candidates from others' lists | Story or engine follow-up |
| Minimum text length before submit | Product decision |
| Coalesce duplicate `listMyProfilePhotos` on profile page | Optional polish |
