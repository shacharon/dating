# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_match_preferences_ui.md](../../STORY_03_match_preferences_ui.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No new Prisma model or dedicated `/api/v1/me/profile/preferences` route** — preference fields already live on **`GET` / `PATCH /api/v1/me/profile`** via `MeProfileWritableFieldsDto` + Phase C dual-write to `UserProfilePreference`.
- **UI gap** — `MeProfileDto` / `PatchMeProfileBody` in `dating-ui` omit preference fields; `/settings/preferences` is a placeholder with no nav link.
- **New UI** — client `MatchPreferencesForm` on `/settings/preferences`; `patchMyProfile` with preference-only body; i18n en/es labels for enum fields.
- **Match list effect** — prefs apply on **next `GET /api/v1/me/matches`** via HG eligibility (no match recompute job). Gender + age + smoking/etc. filter through existing engine path.
- **Stale analysis banner** — preference-only PATCH does **not** bump `UserProfile.updatedAt`; banner is **not** shown on pref save (documented waiver — prefs affect eligibility, not evaluationJson scoring).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/me-profile-api.ts` | extend `MeProfileDto`, `PatchMeProfileBody` with HG preference fields |
| `dating-ui/src/lib/match-preference-options.ts` | created — enum value arrays + label helpers (mirror `matching-canonical.types.ts`) |
| `dating-ui/src/lib/match-preferences-form.ts` | created — form state, validation (`min ≤ max`, partner genders non-empty), `toPatchBody()` |
| `dating-ui/src/components/match-preferences-form.tsx` | created — editable form + save |
| `dating-ui/src/app/(authenticated)/settings/preferences/page.tsx` | wire form (client section or page wrapper) |
| `dating-ui/src/app/dating/profile/page.tsx` | link → `/settings/preferences` (or nav item — see below) |
| `dating-ui/src/lib/i18n/types.ts` | `matchPreferences` copy keys |
| `dating-ui/src/lib/i18n/en.ts` / `es.ts` | labels |
| `dating-ui/src/lib/match-preferences-form.spec.ts` | validation unit tests |
| `dating-ui/src/components/match-preferences-form.spec.tsx` | save round-trip mock |
| `dating-api/src/me-profile/dto/me-profile-writable-fields.dto.ts` | optional: class-level `@Validate(PartnerAgeRangeConstraint)` |
| `dating-api/src/me-profile/validators/partner-age-range.constraint.ts` | optional — reject `partnerAgeMin > partnerAgeMax` at API |

**No changes required:** `MeMatchesService`, `MeProfileController` routes (unless optional age-range validator added).

---

## Decisions (do not reverse without discussion)

### 1. API — reuse `/api/v1/me/profile` (no sub-resource)

| Approach | Verdict |
|----------|---------|
| New `GET/PATCH /api/v1/me/profile/preferences` | **Rejected** — duplicates existing Phase C contract |
| Extend UI types + PATCH existing endpoint | **Chosen** |

**Read (existing):**

```http
GET /api/v1/me/profile
Auth: session cookie
200: MeProfileResponseDto (includes preference fields from joined UserProfilePreference)
404: profile_not_found
```

**Write (existing):**

```http
PATCH /api/v1/me/profile
Auth: session cookie
Content-Type: application/json
Body: partial PatchMeProfileDto — preference keys only allowed on settings page
200: MeProfileResponseDto
404: profile_not_found
422: class-validator errors
```

**Preference fields on wire** (already validated in `me-profile-writable-fields.dto.ts`):

| Field | Type | Notes |
|-------|------|-------|
| `desiredPartnerGenders` | `ProfileGender[]` | Dual-writes → `acceptedPartnerGenders`; use `ME_PARTNER_GENDER_CHOICES` in UI |
| `partnerAgeMin` | `int \| null` | 18–99 |
| `partnerAgeMax` | `int \| null` | 18–99 |
| `maxDistanceKm` | `int \| null` | 1–500; HG uses when set |
| `minimumPartnerEducation` | enum | `ANY`, `HIGH_SCHOOL`, … |
| `acceptedPartnerSmoking` | enum[] | `NONE_ONLY`, `SOCIAL_OK`, `ANY` |
| `acceptedPartnerAlcohol` | enum[] | `NONE_ONLY`, `MODERATE_OK`, `ANY` |
| `partnerWantsChildren` | enum | `MUST_WANT`, `MUST_NOT_WANT`, `NO_REQUIREMENT` |
| `partnerHasChildren` | enum | `ACCEPT`, `DOES_NOT_ACCEPT`, `NO_REQUIREMENT` |
| `acceptedPartnerReligions` | enum[] | `ReligionSelf` values |
| `similarityPreference` | `'similar' \| 'different' \| 'balanced' \| null` | |

**Partner genders read path:** UI loads `desiredPartnerGenders` from profile JSON (GET). Engine reads `UserProfilePreference.acceptedPartnerGenders` when row exists (synced on PATCH via dual-write). Settings form must PATCH `desiredPartnerGenders` when user edits checkboxes.

**Persistence (unchanged):** `MeProfileService.patchForUser` → transaction → optional `userProfile.update` + `upsertPreference`.

---

### 2. Client validation (before PATCH)

```typescript
// match-preferences-form.ts — locked rules
- if both partnerAgeMin and partnerAgeMax set: min <= max
- desiredPartnerGenders: length >= 1 when user saves gender section (match onboarding)
- empty arrays for multi-select smoking/alcohol/religion: send [] (clears) not omit
- null vs omit: use null to clear scalar nullable fields (partnerWantsChildren, maxDistanceKm, etc.)
```

Optional API `@Validate(PartnerAgeRangeConstraint)` on DTO — recommended if not already present (422 with clear message).

---

### 3. Settings page placement + navigation

| Item | Choice |
|------|--------|
| Primary surface | **`/settings/preferences`** (replace placeholder) |
| Nav discovery | Add link on **`/dating/profile`** below notification section: “Match preferences” → `/settings/preferences` |
| Shell nav | **Do not** add top-level nav item in this story (keep 5-link shell) |
| Auth | Already protected via middleware `/settings/*` |

Page structure:

```tsx
// settings/preferences/page.tsx
export default function SettingsPreferencesPage() {
  return (
    <main>
      <h1>{copy.matchPreferences.title}</h1>
      <MatchPreferencesForm />
    </main>
  );
}
```

`MatchPreferencesForm`: mount → `fetchMyProfile()` → populate state; Save → `patchMyProfile(body)` → success toast/flash.

**No profile?** Redirect to `/onboarding` (same as other settings pages pattern when 404).

---

### 4. Stale analysis banner — waiver

Story AC mentions stale banner after save. **Locked behavior:**

| Save type | `UserProfile.updatedAt` | Match list | Stale banner on `/dating/me-matches` |
|-----------|-------------------------|------------|--------------------------------------|
| Preference fields only | **Unchanged** | Updates on reload (HG reads preference row) | **No** |
| Text / birthDate / facts | Bumped | May need re-analysis for scores | **Yes** (existing) |

Copy on settings page after save (optional one-liner): “Your match list will update on next visit.” — not the amber re-analysis banner.

Do **not** touch `viewerProfileAnalysisStale` logic in this story.

---

### 5. Match list behavior (document for manual smoke)

Filters apply **without** re-running LLM analysis:

- **Gender:** reciprocal eligibility (existing tests in `me-matches.service.spec.ts`)
- **Age / smoking / children / etc.:** HG `overallHardEligibility === 'FAIL'` excludes candidate from list
- **maxDistanceKm:** used in HG mapper when viewer preference set (no map UI)

Manual smoke age test requires **candidates with real `birthDate`** in DB; empty test DB may show no visible change — operator uses seeded profiles.

---

### 6. i18n

Add `matchPreferences` section to `AppCopySchema`:

- Page title, section headings (Who you're open to, Lifestyle, Family, Distance, Similarity)
- Enum labels for each select/checkbox option (en + es)
- Validation errors: `ageRangeInvalid`, `partnerGendersRequired`, `saveError`, `saveSuccess`

Reuse pattern from `profile.notifications` and `nav.*`.

---

### 7. UI components — reuse patterns

| Pattern | Source |
|---------|--------|
| Partner gender checkboxes | `onboarding-basic-form.tsx` — `ME_PARTNER_GENDER_CHOICES` |
| Save / error flash | `notification-preferences-section.tsx` |
| Enum `<select>` | new; options from `match-preference-options.ts` |

**Multi-select arrays** (smoking, alcohol, religion): checkbox group; empty = `[]` meaning “no constraint” per HG semantics (document in help text: “Leave all unchecked for no preference”).

---

## Runtime topology

N/A (REST only). Same as profile PATCH elsewhere:

- Browser → same-origin `/api/v1/me/profile` via Next rewrite
- Session cookie required

---

## Tests / verification (for agents 1–2)

| Layer | Command / scope |
|-------|-----------------|
| UI unit | `match-preferences-form.spec.ts` — age range, gender required |
| UI component | `match-preferences-form.spec.tsx` — load mock profile, save calls `patchMyProfile` |
| API (optional) | Extend `me-profile-http.integration.spec.ts` — PATCH pref fields, GET round-trip |
| API (optional) | PATCH `partnerAgeMin: 40, partnerAgeMax: 30` → 422 if validator added |
| Regression | `npm test` in dating-ui + dating-api |

**Integration smoke (dev):** PATCH age range → reload `/dating/me-matches` → count changes (with seeded data).

---

## Open questions / blockers

- None blocking agent 1.

**Product note:** Religion multi-select may be sparse in cohort — still expose field; empty array is valid.

---

## Next agent

```text
--agent 1 sprint 9 story 3
```

**Notes for next agent:**

1. Extend `MeProfileDto` first — API already returns fields; confirm in Network tab.
2. Do **not** add new controller routes unless age-range validator is extracted to shared PATCH only.
3. Link from `/dating/profile` is required for “settings nav” AC.
4. Manual smoke age filter needs real DB birth dates — document in dev handoff if skipped locally.
