# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_reduce_match_preferences_to_core_three.md](../../STORY_01_reduce_match_preferences_to_core_three.md)  
**Sprint:** sprint-15-match-preferences-simplification  
**Date:** 2026-07-11  
**Status:** complete  

---

## Summary

- **Product keep-set (locked):** only `acceptedPartnerGenders` ("open to"), `partnerAgeMin` / `partnerAgeMax`, `maxDistanceKm`.
- **Remove (full delete, not hide):** education, smoking, alcohol, religion, wants/has-children, similarity — from UI, API prefs DTOs, `UserProfilePreference` columns, canonical `MatchingPreferences` / `MatchingSearchOverrides`, HG hard eligibility dimensions, five-signal similarity ranking overlay, and HG structured **preferences** JSON allow-lists.
- **Do not touch:** `UserProfile` self-fact columns/DTOs (`childrenStatus`, `wantsChildren`, `smokingFrequency`, `alcoholUse`, `education`, `religion`) — future engine input surface.
- **Prisma migration required** — drop 7 columns on `UserProfilePreference` (see schema plan below).
- **`children_unsure` left inert this story** — removing `PARTNER_WANTS_CHILDREN` makes the flag always `false`; do **not** rewrite the matches list/detail wire contract in this story (follow-up).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | update — drop 7 prefs columns on `UserProfilePreference` |
| `dating-api/prisma/migrations/<timestamp>_drop_user_profile_preference_lifestyle_fields/` | **CREATE** — `ALTER TABLE` drop columns |
| `dating-api/src/me-profile/dto/me-profile-writable-fields.dto.ts` | update — remove 7 pref writable fields; **keep** self-facts |
| `dating-api/src/me-profile/dto/me-profile-response.dto.ts` | update — remove 7 pref response fields; **keep** self-facts |
| `dating-api/src/me-profile/me-profile.service.ts` | update — trim `PreferenceFields` / `toPreferenceData` / response mapper |
| `dating-api/src/me-profile/me-profile-engine.mapper.ts` | update — stop mapping removed prefs into canonical; **keep** self-fact → `MatchingFacts` |
| `dating-api/src/canonical/matching-canonical.types.ts` | update — trim `MatchingPreferences` + `MatchingSearchOverrides`; delete preference-only enums once unused |
| `dating-api/src/holy-grail-matching/holy-grail-dimensions.ts` | update — `HOLY_GRAIL_DIMENSION_KEYS` → `GENDER`, `AGE`, `PROXIMITY` only |
| `dating-api/src/holy-grail-matching/eligibility.evaluator.ts` | update — delete education/smoking/alcohol/religion/children eval paths + `holyGrailDeterministicHalfPass` |
| `dating-api/src/holy-grail-matching/holy-grail-five-signal-ranking.ts` | update — remove `similarityPreference` overlay path |
| `dating-api/src/holy-grail-matching/holy-grail-structured-contract.ts` | update — trim `HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS` (+ search override keys derived from it); **facts keys unchanged** |
| `dating-api/src/holy-grail-matching/holy-grail-structured-write.merge.ts` | update — remove pref normalize cases for the 7 keys; **keep** fact normalize |
| `dating-api/src/holy-grail-matching/profile-to-canonical.mapper.ts` | update — stop mapping removed structured prefs / overrides |
| `dating-api/src/holy-grail-matching/retrieval/holy-grail-structured-db-json.ts` | update — stop parsing/emitting removed pref keys; **keep** facts parse |
| `dating-api/src/holy-grail-matching/retrieval/holy-grail-retrieval-wire.dto.ts` | update — trim wire prefs/overrides DTOs |
| `dating-api/src/holy-grail-matching/profile-sources.types.ts` | update — prefs field map shrinks with contract keys |
| `dating-api/src/holy-grail-matching/similarity-preference-text.extract.ts` | **DELETE** (+ its `.spec.ts` if present) |
| `dating-api/src/holy-grail-matching/backfill-holy-grail-structured.ts` | update or slim — stop inferring removed prefs / dimensions (script, not product API) |
| `dating-ui/src/components/match-preferences-form.tsx` | update — keep open-to / age / distance sections only |
| `dating-ui/src/lib/match-preferences-form.ts` | update — trim state / patch mapping |
| `dating-ui/src/lib/match-preference-options.ts` | **DELETE** (all exports are removed dims; genders live in `me-profile-api`) |
| `dating-ui/src/lib/me-profile-api.ts` | update — drop 7 fields + related type aliases from DTO/patch types |
| `dating-ui/src/lib/i18n/{types,en,es,he}.ts` | update — remove education/lifestyle/family/similarity `matchPreferences` keys |
| Specs listed in Tests section | update / delete assertions |

**Do not change:**

| Path / surface | Reason |
|----------------|--------|
| `UserProfile` self-fact columns | Future engine discovery input |
| Writable/response self-fact DTO fields | Same |
| `HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS` | Self-facts, not prefs |
| `evalGender` / `evalAge` / `evalProximity` logic | Kept dimensions — behavior unchanged |
| Matches `children_unsure` wire / `hideChildrenUnsure` API | Inert this sprint (Decision 5) |
| Engine/LLM replacement for lifestyle compatibility | Out of scope |

---

## Prisma schema (target)

```prisma
model UserProfilePreference {
  id                     String      @id @default(cuid())
  profileId              String      @unique
  profile                UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  partnerAgeMin          Int?
  partnerAgeMax          Int?
  maxDistanceKm          Int?
  acceptedPartnerGenders String[]    @default([])
  updatedAt              DateTime    @updatedAt
}
```

### Migration plan

**Forward**

```sql
ALTER TABLE "UserProfilePreference"
  DROP COLUMN IF EXISTS "minimumPartnerEducation",
  DROP COLUMN IF EXISTS "acceptedPartnerSmoking",
  DROP COLUMN IF EXISTS "acceptedPartnerAlcohol",
  DROP COLUMN IF EXISTS "acceptedPartnerReligions",
  DROP COLUMN IF EXISTS "partnerWantsChildren",
  DROP COLUMN IF EXISTS "partnerHasChildren",
  DROP COLUMN IF EXISTS "similarityPreference";
```

(Use Prisma-generated SQL if dialect differs; intent is drop-only, no backfill.)

**Rollback:** re-add columns as nullable / empty arrays (data loss accepted — product is removing the feature).

**Deploy gate:** `npx prisma migrate deploy` + regenerate client before/with tests that hit the DB.

**Naming trap:** do **not** drop `UserProfile.education` / `religion` / `smokingFrequency` / `alcoholUse` / `wantsChildren` / `childrenStatus`.

---

## API contracts (copy-paste ready)

No new endpoints. Existing surface:

```
GET  /api/v1/me/profile
PATCH /api/v1/me/profile
```

### Preference fields remaining on GET/PATCH body

| Field | Notes |
|-------|--------|
| `desiredPartnerGenders` | Dual-writes → `UserProfilePreference.acceptedPartnerGenders` (unchanged) |
| `partnerAgeMin` / `partnerAgeMax` | Optional ints; existing min≤max validator stays |
| `maxDistanceKm` | Optional int |

### Preference fields removed from GET/PATCH

`minimumPartnerEducation`, `acceptedPartnerSmoking`, `acceptedPartnerAlcohol`, `acceptedPartnerReligions`, `partnerWantsChildren`, `partnerHasChildren`, `similarityPreference`

### Self-facts (unchanged on GET; writable DTO may still accept — leave as today)

`childrenStatus`, `wantsChildren`, `smokingFrequency`, `alcoholUse`, `education`, `religion`

UI client (`me-profile-api.ts`) already omits self-facts — only strip the 7 prefs there.

---

## Canonical + HG hard eligibility

### `MatchingPreferences` / `MatchingSearchOverrides` (after)

```ts
export interface MatchingPreferences {
  acceptedPartnerGenders?: readonly AcceptedPartnerGender[];
  partnerAgeMin?: number;
  partnerAgeMax?: number;
  maxDistanceKm?: number;
}

export interface MatchingSearchOverrides {
  acceptedPartnerGenders?: readonly AcceptedPartnerGender[];
  partnerAgeMin?: number;
  partnerAgeMax?: number;
  maxDistanceKm?: number;
  validUntil?: string;
}
```

Delete preference-only enums when no remaining importers:  
`MinimumPartnerEducation`, `AcceptedPartnerSmoking`, `AcceptedPartnerAlcohol`, `PartnerWantsChildrenRequirement`, `PartnerHasChildrenAcceptance`, `SimilarityPreference` / `SIMILARITY_PREFERENCE_VALUES`.  
**Keep** self-fact enums (`EducationLevelSelf`, `SmokingFrequencySelf`, …).

### `HOLY_GRAIL_DIMENSION_KEYS` (after)

```ts
export const HOLY_GRAIL_DIMENSION_KEYS = [
  'GENDER',
  'AGE',
  'PROXIMITY',
] as const;
```

### Evaluator deletes

| Delete | Keep |
|--------|------|
| `evalEducation`, `educationRankFact`, `educationMinRank` | `evalGender` |
| `evalSmoking`, `smokingMatrix` | `evalAge` |
| `evalAlcohol`, `alcoholMatrix`, `ALCOHOL_NONE_ONLY_RARE_SOFT_SALT`, `holyGrailDeterministicHalfPass` | `evalProximity` |
| `evalReligion`, `evalPartnerWantsChildren`, `evalPartnerHasChildren` | `mergeEffectiveMatchingPreferences` (genders/age/distance only) |
| Merge branches for the 7 removed prefs | `evaluateHolyGrailDirectional` |

`holyGrailDeterministicHalfPass` — **only** production caller is `evalAlcohol`; delete with alcohol path (update `eligibility.evaluator.spec.ts`).

### `HolyGrailEligibilityFlags`

```ts
export interface HolyGrailEligibilityFlags {
  /** Always false after Story 1 — PARTNER_WANTS_CHILDREN removed. Wire retained for matches contract. */
  readonly children_unsure: boolean;
}
```

`eligibilityFlagsFromDimensions` returns `{ children_unsure: false }` always (or keep the helper but stop reading a deleted dim). Do **not** remove the flag from the matches wire in this story.

### HG structured preferences JSON keys (after)

```ts
export const HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS = [
  'acceptedPartnerGenders',
  'partnerAgeMin',
  'partnerAgeMax',
  'maxDistanceKm',
] as const;
```

`HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS` — **unchanged**.

---

## Ranking (`similarityPreference`)

In `holy-grail-five-signal-ranking.ts`:

- **Delete:** `similarityPreferenceDelta`, `similarityPreferenceRankNote`, breakdown key `'similarityPreference'`, and the `eff.similarityPreference` branch under `includeNonDbRankingOverlays`.
- **Keep:** purity path (`computeHolyGrailRankingPurityRank` / `includeNonDbRankingOverlays: false`); production `rankHolyGrailCandidatesAfterHardFilter` already uses purity only.
- **Keep:** personality / lifestyle / interest **tag** overlays (different from `similarityPreference`).

Delete `similarity-preference-text.extract.ts` (+ specs) and stop calling it from backfill/scripts.

---

## UI

`/settings/preferences` via `MatchPreferencesForm`:

1. **Keep sections:** partner genders ("open to"), age min/max, max distance.
2. **Delete sections:** education, lifestyle (smoking/alcohol/religion), family, similarity.
3. Delete `match-preference-options.ts` after form no longer imports it.
4. Trim i18n `matchPreferences`: drop `sections.education|lifestyle|family|similarity` and related field/enum maps; keep shell + partnerGender + age + distance.

Validation stays: partner genders required; age min ≤ max when both set.

---

## Decisions (do not reverse without discussion)

### 1. Full delete of the 7 preference dimensions

Prefer deletion over feature flags or commented code. Story is a product cut + bug fix (hard FAIL on missing candidate self-facts).

### 2. Self-facts stay

Do not drop `UserProfile` lifestyle/education/family columns or remove them from API DTOs. Naming trap: `education` (fact) ≠ `minimumPartnerEducation` (pref); JSON fact key `smoking` ≠ Prisma `smokingFrequency`.

### 3. Dual store: Prisma columns + HG structured prefs JSON

Both stores currently carry the same pref keys. Story must trim **both**:

1. Drop Prisma columns (migration).
2. Trim HG prefs allow-lists / merge / mapper / wire so leftover JSON cannot re-enter canonical prefs and hard-filter.

Stale JSON in DB may remain until a later cleanup job — inert once allow-lists/mappers ignore those keys.

### 4. Prefer full delete on isolated pref-only modules

| Module | Action |
|--------|--------|
| `similarity-preference-text.extract.ts` | **DELETE** |
| Pref normalize cases in merge / db-json / mapper / wire | **DELETE** keys |
| Entangled fact+pref files | Surgical edit — facts path untouched |

Inert-branch exception (story AC) only if a cut would risk facts ingestion; call out explicitly in `agent-1-dev.md` if used. Default: full delete for prefs keys.

### 5. `children_unsure` — inert, not removed

Removing `PARTNER_WANTS_CHILDREN` makes live `children_unsure` always false. Matches list/detail badges, `hideChildrenUnsure`, analytics, and UI types stay for now.

**Out of scope this story:** stripping `children_unsure` from matches contract/UI (candidate follow-up Story 1.1 / Sprint 15+).

### 6. No engine replacement

Do not add LLM/personality-derived lifestyle soft signals in this story.

### 7. No visual redesign

Delete sections only; keep existing form chrome for remaining fields.

---

## Implementation order (dev)

Run greps first (must be clean for removed **pref** names after work; self-fact names will still hit):

```bash
# Pref names (should trend to zero in src after Story 1, excluding docs):
rg "minimumPartnerEducation|acceptedPartnerSmoking|acceptedPartnerAlcohol|acceptedPartnerReligions|partnerWantsChildren|partnerHasChildren|similarityPreference" dating-api/src dating-ui/src

# Confirm self-facts still present:
rg "smokingFrequency|childrenStatus|wantsChildren|alcoholUse" dating-api/src/me-profile dating-api/prisma/schema.prisma
```

**Tiers (test after each):**

1. **UI** — form + `match-preferences-form.ts` + delete options file + `me-profile-api` + i18n → `dating-ui` `npm test`
2. **API DTOs + service + engine mapper** → targeted me-profile specs
3. **Canonical types + dimensions + evaluator** → `eligibility.evaluator.spec.ts`
4. **Ranking similarity overlay** → five-signal + delete similarity extract specs
5. **HG structured prefs surface** — contract → merge → db-json → mapper → wire → backfill slim
6. **Prisma migration** → `prisma migrate deploy` + regenerate
7. **Full suites** — `dating-api` + `dating-ui` `npm test`

---

## Tests / verification

| Layer | Specs / actions |
|-------|-----------------|
| UI | `match-preferences-form.spec.tsx`, `match-preferences-form.spec.ts`, i18n structural tests |
| API | `me-profile.service.spec.ts`, `me-profile-http.integration.spec.ts`, `me-profile-engine.mapper.spec.ts`, `me-matches.service.spec.ts` (drop smoking/children gate cases that set removed prefs), `me-new-model-e2e.integration.spec.ts`, `me-matches.v1-contract.spec.ts` |
| HG | `eligibility.evaluator.spec.ts`, `holy-grail-five-signal-ranking.spec.ts`, **delete/gut** `similarity-preference.behavior.spec.ts` + extract specs, `holy-grail-structured-write.service.spec.ts`, retrieval wire specs, `profile-to-canonical.mapper.spec.ts`, `holy-grail-ingestion-drift.spec.ts`, layer3-layer4 bridge (children soft-pass cases → remove or expect no soft-pass), `evaluation-to-legacy-dimension-map.spec.ts` |
| Scripts | Fix or archive `scripts/similarity-preference-e2e-verify.ts` and any backfill that assumes removed dims |
| Migration | `prisma migrate deploy` on local DB |

- [ ] Unit/integration: `cd dating-api && npm test` · `cd dating-ui && npm test`
- [ ] Result: not run (architect)
- [ ] `prisma migrate deploy`: **yes** (required)
- [ ] Browser Network smoke: N/A (no realtime/proxy change)
- [ ] Socket transport: N/A

**Manual smoke (operator / agent 3):**

1. `/settings/preferences` shows only open-to, age, distance.
2. Save genders + age + distance → reload persists.
3. Match list still loads; no crash from missing preference columns.
4. Setting only kept prefs does not zero the list via education/smoking hard FAIL (those dims gone).

---

## Runtime topology

N/A — no realtime, cookie, or Next proxy changes.

---

## Open questions / blockers

- None blocking Story 1. Follow-up (not blocking): retire always-false `children_unsure` from matches wire + UI + `hideChildrenUnsure`.

---

## Next agent

```text
--agent 1 sprint 15 story 1
```

**Notes for next agent:**

- Read this handoff + story AC before coding; follow **implementation order** and greps.
- Prefer deleting prefs keys everywhere they feed canonical/eligibility; leave self-facts alone.
- If you must leave an inert prefs branch, document it in `agent-1-dev.md` with the story's retention comment — default is full delete.
- Run migration before DB-backed tests that select dropped columns.
- Do not expand into `children_unsure` API removal or engine soft-signal replacement.
