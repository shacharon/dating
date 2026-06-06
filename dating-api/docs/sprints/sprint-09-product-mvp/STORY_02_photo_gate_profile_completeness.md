# Story 2: Photo gate + profile completeness

**Sprint:** 9  
**Status:** Planned  
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

- [ ] **Photo gate** — viewer must have ≥1 `APPROVED` photo before `GET /api/v1/me/matches` returns `status: ready`
  - New `not_ready` reason: `no_photo` (document in API + UI)
- [ ] **Submit gate** — `POST /api/v1/me/profile/submit` returns **422** when no approved photo (clear error code)
- [ ] **Onboarding nudge** — photo upload section visible in onboarding flow with copy: required for matching
- [ ] **Profile page** — banner when photo missing: "Add a photo to see matches"
- [ ] **Completeness hints** — optional non-blocking checklist (photo ✓, three story sections ✓, basics ✓) on profile or analysis page
- [ ] **Analytics** — emit `profile.photo_gate_blocked` or extend `match.list_viewed` with `blockedReason` property (PII-safe)
- [ ] **Tests** — API returns `not_ready(no_photo)`; submit rejected without photo; UI redirects appropriately

### Out of scope (this story)

- Rejecting low-quality photos (moderation provider)
- Requiring N photos (keep max 3; min 1)
- Blocking candidates without photos from *other* users' lists (optional follow-up)

---

## Technical notes (guidance, not prescriptive)

- Gate in `MeMatchesService.list()` after profile analyzed check; mirror in `submitForUser`.
- UI: `/dating/me-matches` redirect to `/dating/profile` or dedicated nudge when `reason === 'no_photo'`.
- Do not break existing users without photos in dev — document migration: existing analyzed users without photos get `not_ready` until upload.

---

## Definition of done

- [ ] No user reaches match list without ≥1 approved photo
- [ ] Onboarding and profile surfaces explain the requirement
- [ ] API + UI tests green
- [ ] `.env.example` / API contract doc updated for new `not_ready` reason

---

## Manual smoke

1. New user completes onboarding texts but skips photo → submit succeeds or fails per AC → match list shows nudge, not empty "ready".
2. User uploads photo → match list becomes `ready` (when analyzed).
3. User deletes last photo → match list returns to `not_ready(no_photo)`.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Hide photo-less candidates from others' lists | Story or engine follow-up |
| Minimum text length before submit | Product decision |
