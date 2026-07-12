# Story 1: Reduce match preferences to open-to + age range + max distance

**Sprint:** 15  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** —  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-07-11)

---

## Why

Two independent reasons converge on the same fix:

1. **Product decision (locked):** only 3 preference dimensions should remain user-settable: who I'm open to (`acceptedPartnerGenders`), partner age range (`partnerAgeMin`/`partnerAgeMax`), and max distance (`maxDistanceKm`). Education, smoking, alcohol, religion, wants/has-children, and similarity are removed as manual fields — any future reintroduction is engine-discovered (out of scope here).
2. **Live bug in 5 of the 6 removed dimensions:** Holy Grail hard eligibility (`dating-api/src/holy-grail-matching/eligibility.evaluator.ts`) FAILs a candidate whenever *the candidate's own* fact for education/smoking/alcohol/religion/children is missing (`evalEducation`, `evalSmoking`, `evalAlcohol`, `evalReligion`, `evalPartnerWantsChildren`, `evalPartnerHasChildren` all return `FAIL`, not `SKIPPED`, on an absent self-fact). No UI anywhere lets a user set their own `education`/`religion`/`smokingFrequency`/`alcoholUse`/`wantsChildren`/`childrenStatus` — `dating-ui/src/lib/me-profile-api.ts` never reads/writes those self-fact fields. So any user who sets one of these 5 preferences today hard-filters out every candidate on that dimension and can silently go to zero matches. `similarityPreference` is not part of this bug (it's a working ranking overlay in `holy-grail-five-signal-ranking.ts`, not a hard filter) — it's removed purely per the product decision.

---

## What

**As a** user  
**I want** match preferences limited to who I'm open to, age range, and distance  
**So that** I'm not offered broken/duplicated dealbreaker controls, and the product's compatibility signal for lifestyle/education/family comes from the engine later, not a manual form

### Kept (unchanged behavior)

- `acceptedPartnerGenders` / `desiredPartnerGenders` ("open to")
- `partnerAgeMin` / `partnerAgeMax`
- `maxDistanceKm`

### Removed (fields, filters, and copy — not just hidden)

- `minimumPartnerEducation`
- `acceptedPartnerSmoking`, `acceptedPartnerAlcohol`
- `acceptedPartnerReligions`
- `partnerWantsChildren`, `partnerHasChildren`
- `similarityPreference`

### Acceptance criteria

- [x] **UI form** — `match-preferences-form.tsx` renders only the "open to" (gender), age range, and distance sections. Education/lifestyle/family/similarity sections deleted (not disabled/hidden). `match-preferences-form.ts` (form state, validation, patch-body mapping) and `match-preference-options.ts` trimmed to match — remove now-unused option constants (`MINIMUM_PARTNER_EDUCATION_VALUES`, `ACCEPTED_PARTNER_SMOKING_VALUES`, `ACCEPTED_PARTNER_ALCOHOL_VALUES`, `ACCEPTED_PARTNER_RELIGION_VALUES`, `PARTNER_WANTS_CHILDREN_VALUES`, `PARTNER_HAS_CHILDREN_VALUES`, `SIMILARITY_PREFERENCE_VALUES`) if nothing else consumes them after this story.
- [x] **i18n** — remove the corresponding `matchPreferences.*` keys (sections/fields/enum-label maps for education, smoking, alcohol, religion, wantsChildren, hasChildren, similarity) from `types.ts`, `en.ts`, `es.ts`, `he.ts`. Keep `partnerGender`, age, and distance keys. Full i18n structural test must stay green.
- [x] **UI API client** — `dating-ui/src/lib/me-profile-api.ts`: remove the removed-dimension fields from `MeProfileDto` / `PatchMeProfileBody` (and any associated preference-value types).
- [x] **API DTOs** — `me-profile-writable-fields.dto.ts` / `me-profile-response.dto.ts`: remove read/write support for the 6 removed *preference* fields. Do **not** touch the self-fact fields (`education`, `religion`, `smokingFrequency`, `wantsChildren`, `childrenStatus` on `UserProfile`) — those stay exactly as-is (future engine input, not this story's concern).
- [x] **`me-profile.service.ts`** — stop reading/writing the removed preference fields to/from `UserProfilePreference`.
- [x] **Canonical types** — `MatchingPreferences` (`dating-api/src/canonical/matching-canonical.types.ts`) drops the 6 removed fields; keeps `acceptedPartnerGenders`, `partnerAgeMin`, `partnerAgeMax`, `maxDistanceKm`.
- [x] **Hard eligibility evaluator** — `eligibility.evaluator.ts`: delete `evalEducation`, `evalSmoking`/`smokingMatrix`, `evalAlcohol`/`alcoholMatrix`/`holyGrailDeterministicHalfPass` (confirm no other caller first), `evalPartnerWantsChildren`, `evalPartnerHasChildren`, `evalReligion`, and their entries in `mergeEffectiveMatchingPreferences` / `evaluateAll`. Only `GENDER`, `AGE`, `PROXIMITY` remain. `HOLY_GRAIL_DIMENSION_KEYS` (`holy-grail-dimensions.ts`) trimmed to match. `eligibilityFlagsFromDimensions`'s `children_unsure` flag goes away with `PARTNER_WANTS_CHILDREN` — check for downstream readers of that flag before deleting (`HolyGrailEligibilityFlags`).
- [x] **Ranking overlay** — `holy-grail-five-signal-ranking.ts`: remove the `similarityPreference` adjustment path (`similarityPreferenceDelta`, `similarityPreferenceRankNote`, the `eff.similarityPreference` branch, and the `similarityPreference` breakdown key). Purity path (five signals + tag overlap) is unaffected.
- [x] **Holy Grail structured write/backfill/retrieval surface** — audit (architect) `holy-grail-structured-write.merge.ts`, `holy-grail-structured-write.service.ts`, `holy-grail-structured-contract.ts`, `backfill-holy-grail-structured.ts`, `profile-to-canonical.mapper.ts`, `retrieval/holy-grail-retrieval-wire.dto.ts`, `retrieval/holy-grail-structured-db-json.ts`, `similarity-preference-text.extract.ts` for references to the 6 removed *preference* keys and decide the minimal safe cut (these may mix self-fact JSON keys — keep — with preference JSON keys — remove). Do not widen this story into a Holy Grail JSON-contract rewrite; if a given file's removed-preference surface is entangled and risky to fully excise, it's acceptable to leave a narrowly-scoped inert/unused branch as long as it's unreachable from the API and covered by a `// unused: retained pending Sprint 15 follow-up` note — call this out explicitly in the dev handoff rather than silently leaving it.
- [x] **Prisma** — migration on `UserProfilePreference` dropping `minimumPartnerEducation`, `acceptedPartnerSmoking`, `acceptedPartnerAlcohol`, `acceptedPartnerReligions`, `partnerWantsChildren`, `partnerHasChildren`, `similarityPreference` columns. `partnerAgeMin`, `partnerAgeMax`, `maxDistanceKm`, `acceptedPartnerGenders` remain untouched. Regenerate Prisma client.
- [x] **Tests** — update or delete assertions in `match-preferences-form.spec.tsx`, `match-preferences-form.spec.ts` (UI lib), `eligibility.evaluator.spec.ts`, `me-profile.service.spec.ts`, `me-matches.service.spec.ts`, `me-profile-http.integration.spec.ts`, `me-matches.v1-contract.spec.ts`, `me-profile-engine.mapper.spec.ts`, `me-new-model-e2e.integration.spec.ts`, `holy-grail-five-signal-ranking.spec.ts`, `similarity-preference.behavior.spec.ts`, and any other spec that references the 6 removed fields. Full `npm test` green in both `dating-api` and `dating-ui`.

### Out of scope (this story)

- Building any engine/LLM-based replacement for lifestyle/education/family compatibility signal
- Touching `UserProfile` self-fact columns/DTOs (`education`, `religion`, `smokingFrequency`, `wantsChildren`, `childrenStatus`) — leave as inert future input
- Any change to `GENDER`, `AGE`, or `PROXIMITY` eligibility logic itself (kept dimensions are unchanged, only the removed ones go away)
- Redesigning `/settings/preferences` visually beyond deleting the removed sections

---

## Technical notes (guidance, not prescriptive)

- Start with a full-repo grep for each removed field name (`minimumPartnerEducation`, `acceptedPartnerSmoking`, `acceptedPartnerAlcohol`, `acceptedPartnerReligions`, `partnerWantsChildren`, `partnerHasChildren`, `similarityPreference`) across both `dating-api/src` and `dating-ui/src` before starting — the investigation for this story found ~25 files touching these names, several outside the obvious form/evaluator path (Holy Grail structured-write/backfill/retrieval, five-signal ranking).
- `eligibility.evaluator.ts`'s `holyGrailDeterministicHalfPass` is currently only used by `evalAlcohol`'s soft-pass path — confirm before deleting, in case anything else calls it.
- Prefer deleting code over commenting it out or flagging-off; this is a removal story, not a toggle.
- Run `dating-api` and `dating-ui` full test suites after each layer (UI form → API DTOs → evaluator → ranking → Prisma) rather than only at the end, to isolate breakage.

---

## Definition of done

- [x] `/settings/preferences` shows only open-to / age range / distance
- [x] Hard eligibility evaluates only `GENDER`, `AGE`, `PROXIMITY`
- [x] `similarityPreference` ranking overlay removed
- [x] Prisma migration applied; `UserProfilePreference` has only the 4 kept columns (+ id/profileId/updatedAt)
- [x] `UserProfile` self-fact columns untouched
- [x] Full `dating-api` + `dating-ui` test suites green
- [ ] Operator manual smoke — `/settings/preferences` + match list (pending)

---

## Shipped (2026-07-11)

| Area | Deliverable |
|------|-------------|
| UI | 3-section `MatchPreferencesForm`; `match-preference-options.ts` deleted |
| API / Prisma | Prefs DTOs + service trimmed; migration drops 7 columns |
| HG | Dimensions GENDER/AGE/PROXIMITY; similarity overlay removed; prefs JSON keys = 4 |
| Tests | API **1418/1418**, UI **371/371** |

Handoffs: `handoffs/STORY_01_reduce_match_preferences_to_core_three/agent-*.md`
