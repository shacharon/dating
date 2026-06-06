# Story 3: Match preferences UI

**Sprint:** 9  
**Status:** Planned  
**Depends on:** — (`UserProfilePreference` + dual-write already exist on API)

---

## Why

`/settings/preferences` is a placeholder. The match engine already reads `UserProfilePreference` (age range, distance, partner genders, smoking, alcohol, education, children, religion, similarity). Users cannot control what they're looking for without editing raw profile JSON or onboarding again.

---

## What

**As a** user  
**I want** to edit who I'm open to matching with  
**So that** my match list reflects my actual preferences

### Acceptance criteria

- [ ] **Settings page** — replace placeholder at `/settings/preferences` (or `/dating/profile` prefs tab) with editable form
- [ ] **Fields (v1)** — expose at minimum:
  - `partnerAgeMin` / `partnerAgeMax`
  - `maxDistanceKm` (if location used in engine)
  - `acceptedPartnerGenders`
  - `acceptedPartnerSmoking` / `acceptedPartnerAlcohol`
  - `minimumPartnerEducation`
  - `partnerWantsChildren` / `partnerHasChildren`
  - `acceptedPartnerReligions` (if populated in cohort)
  - `similarityPreference` (if user-facing labels exist)
- [ ] **API** — `GET` + `PATCH /api/v1/me/profile/preferences` (or extend existing PATCH with preference DTO) — validate enums consistent with onboarding
- [ ] **Persistence** — upserts `UserProfilePreference` row (reuse Phase C dual-write patterns)
- [ ] **Stale analysis banner** — after save, show existing "refresh analysis" pattern if profile prefs affect viewer scoring
- [ ] **i18n** — labels in en + es (match existing shell copy pattern)
- [ ] **Tests** — API validation; UI round-trip; list filters change when prefs change (integration smoke)

### Out of scope (this story)

- Map-based distance picker
- Search overrides / session filters
- Changing engine weights or HG eligibility rules

---

## Technical notes (guidance, not prescriptive)

- Read `UserProfilePreference` schema in `prisma/schema.prisma` — do not invent new columns in this story.
- Reuse onboarding basic form controls where possible (gender checkboxes, enum selects).
- `MeMatchesService` already prefers preference row over legacy JSON — no engine changes expected unless GET endpoint missing.

---

## Definition of done

- [ ] User can view and save all v1 preference fields
- [ ] Match list respects updated prefs on next load (no recompute required unless documented)
- [ ] API + UI tests
- [ ] Settings nav link works from authenticated shell

---

## Manual smoke

1. User sets age range 28–35 → list excludes outside ages.
2. User toggles partner gender prefs → list updates.
3. Invalid combo (min > max) → inline validation error.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| "Why was this person shown?" explain prefs mismatch | Future UX |
| Geo autocomplete for distance | Future |
