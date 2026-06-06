# Story 3: Match preferences UI

**Sprint:** 9  
**Status:** Done (engineering gate — manual smoke pending operator)  
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

- [x] **Settings page** — replace placeholder at `/settings/preferences` with editable `MatchPreferencesForm`
- [x] **Fields (v1)** — expose at minimum:
  - `partnerAgeMin` / `partnerAgeMax`
  - `maxDistanceKm`
  - `desiredPartnerGenders` (dual-writes → `acceptedPartnerGenders`)
  - `acceptedPartnerSmoking` / `acceptedPartnerAlcohol`
  - `minimumPartnerEducation`
  - `partnerWantsChildren` / `partnerHasChildren`
  - `acceptedPartnerReligions`
  - `similarityPreference`
- [x] **API** — extend existing `GET` + `PATCH /api/v1/me/profile` (no `/preferences` sub-resource); enum validation + optional age-range constraint
- [x] **Persistence** — upserts `UserProfilePreference` row via existing Phase C dual-write (unchanged service path)
- [x] **Stale analysis banner** — **waived** on preference-only save (prefs affect eligibility, not scoring); success hint: “match list updates on next visit” *(architect locked)*
- [x] **i18n** — labels in en + es (`matchPreferences` copy schema)
- [x] **Tests** — API age-range validation; UI unit + component round-trip; list filter integration smoke **deferred operator**

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

- [x] User can view and save all v1 preference fields
- [x] Match list respects updated prefs on next load (no recompute required)
- [x] API + UI tests
- [x] Discovery link from `/dating/profile` → `/settings/preferences` *(no new shell nav item)*

---

## Manual smoke

1. User sets age range 28–35 → list excludes outside ages. *(operator; needs seeded birth dates)*
2. User toggles partner gender prefs → list updates. *(operator)*
3. Invalid combo (min > max) → inline validation error. *(covered by UI tests)*

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Form UI | `MatchPreferencesForm` on `/settings/preferences` |
| State / validation | `match-preferences-form.ts`, `match-preference-options.ts` |
| API types | Extended `MeProfileDto` / `PatchMeProfileBody` in UI |
| API validator | `PartnerAgeRangeConstraint` on DTO (`400` via validation pipe) |
| Navigation | Link on `/dating/profile` (`profile-match-preferences-link`) |
| i18n | `matchPreferences` section en + es |
| Tests | **229/229** UI; API constraint + integration PATCH invalid range |

Handoffs: `handoffs/STORY_03_match_preferences_ui/agent-*.md`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Match-list filter browser smoke | Operator (seeded cohort + birth dates) |
| Profile page matching section i18n | Optional — keys exist, page still English |
| "Why was this person shown?" explain prefs mismatch | Future UX |
| Geo autocomplete for distance | Future |
