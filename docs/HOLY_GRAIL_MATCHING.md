# HOLY_GRAIL_MATCHING

Design notes for the matching contract and how it relates to storage.

## Status

| Item | State |
|------|--------|
| Canonical contract | **Done:** `dating-api/src/canonical/matching-canonical.types.ts` — source of truth. **Enum vocabularies** stay stable unless a deliberate contract revision; **`MatchingPreferences`** uses **optional** fields so absent prefs are representable (mapper + evaluator `SKIPPED`). |
| Step 1 | **Done** — canonical types only; no engine in that file. |
| Step 2 | **Locked** — taxonomy + MVP dimensions; see below. |
| Step 3 | **Done (spec + code)** — enum-based dimension outcomes documented below; **implemented** in `dating-api/src/holy-grail-matching/eligibility.evaluator.ts` (PASS / FAIL / SKIPPED / SOFT_PASS). Locked SOFT_PASS rules: [Layer 3 locked policy](#locked-layer-3-policy-implementation-aligned). |
| Step 4 | **Done** — Phase 1 rules + Phase 2 mapper (`profile-to-canonical.mapper.ts`, structured input only). |
| Step 5 | **Partial** — decision/audit + retrieval + post-filter ranking exist; **optional:** broader real-profile audit runs beyond current scripts. **V2 enrichment (personality / lifestyle / interest)** — **approved and locked:** additive-only overlays, no eligibility, no promotion to the five primary signals, caps **2** pts/family, five-signal remains main driver; see [Production-freeze — V2 enrichment](#production-freeze--v2-enrichment-approved-and-locked). |
| Database / Prisma | **Sparse HG JSON columns exist** on `UserProfile` (`holyGrailStructuredFacts` / `holyGrailStructuredPreferences`); contract keys are [documented below](#persisted-holy-grail-structured-json-userprofile-columns). Broader schema/index work remains roadmap. |
| Legacy scoring / dealbreaker / ranking engine | **Out of scope** — legacy `match-engine` untouched. HG **post-filter** ranking is separate (`holy-grail-candidate-ranking.ts`) and does not affect eligibility. |

### Roadmap — actual execution order (next work)

1. ~~**Implement** `profile-to-canonical.mapper.ts`~~ **Done** — structured-input mapper per Step 4 Phase 1/2 (no raw text).  
2. ~~**Implement** `dating-api/src/holy-grail-matching/eligibility.evaluator.ts`~~ **Done** — directional Layer 3 per Step 3 + [locked SOFT_PASS policy](#locked-layer-3-policy-implementation-aligned).  
3. **Run / extend audits** — `buildHolyGrailEligibilityAuditV1`, `buildHolyGrailPairDecisionV1`, scripts such as `dating-api/scripts/hg-soft-pass-simulation.ts` (read-only pool stats); callers build `HolyGrailProfileMappingInput` from DB columns.  
4. **Only later** — discuss and apply **DB / Prisma / persistence** for `structuredFacts` / preferences if desired.

**End-to-end flow (current):** LLM (existing) → load rows → **map** (structured DTO) → merge overrides → **evaluate** (both directions) → **decide / audit** (and optional **post-filter ranking**, which does **not** change eligibility).

---

## Mapping vs search behavior (stored preferences vs `searchOverrides`)

This section clarifies **product semantics** for Layer 2 output and Layer 3 evaluation. It **supersedes** any earlier wording that treated “missing preference” as a **widest default** (e.g. all genders, `ANY`, `NO_REQUIREMENT` injected by the mapper).

### 1. Clarified behavior

| Layer | Concept | Rule |
|-------|---------|------|
| **Stored user preferences** (`MatchingPreferences` as persisted / authored by the user) | **No defaults** | If the user has **not** defined a preference for a dimension, that field is **absent** in storage and in the mapped model (or represented only as **undefined** / omitted—see implementation note below). **Missing does not mean “widest accept.”** It means **no preference defined** for that dimension. |
| **`searchOverrides`** (session / search context) | **Ephemeral filter** | For each field, **missing** on `searchOverrides` means **no extra search-time constraint** for that field: the evaluator does **not** introduce a filter from overrides. Overrides **replace-by-field** only where a key is **present** (same as Step 2). |
| **Effective preference (evaluator input)** | Merge for **one direction** | Start from **stored** preferences (sparse). Overlay **`searchOverrides`** only for keys that are **set** on the override object. After merge, a dimension is **evaluable** only if the **effective** value for that dimension is **defined** per the rules below. |
| **Evaluator** | **Inactive / skipped dimension** | If there is **no** effective preference for a dimension (user never set it and search did not add it), the evaluator **does not** run that dimension’s rule. The outcome is **`SKIPPED`** (see below)—**not** `MATCH`, **not** `NO_MATCH`. |

**Religion (special case):** Treat **religion filter** as **active** only when `acceptedPartnerReligions` is **present and non-empty** after merge. **Omit / not stored** → dimension **SKIPPED** (not “empty list = any” unless product explicitly stores an empty array as a deliberate “any” signal—in that case document the storage convention separately).

**Education / smoking / alcohol / children:** Do **not** inject `ANY`, `NO_REQUIREMENT`, or similar “inactive enums” when the user has not set a preference. **Absent** → **SKIPPED** at evaluation time. (Values like `ANY` or `NO_REQUIREMENT` remain valid **when the user explicitly chooses them** and they are stored.)

**Gender allow-list:** If `acceptedPartnerGenders` is **not** stored and not set via overrides → dimension **SKIPPED**, not “all four genders.”

### 2. Example scenarios (profile vs search)

| Scenario | Stored prefs | `searchOverrides` | Effective behavior (evaluator) |
|----------|--------------|-------------------|--------------------------------|
| **A — Minimal profile** | *(no preference keys stored)* | `{}` | **All** preference-backed dimensions **SKIPPED** for that direction (until user sets prefs). Facts still evaluated only where relevant dimensions exist. |
| **B — User set age only** | `partnerAgeMin` 25, `partnerAgeMax` 40 | `{}` | **Age** dimension **active**; gender, religion, education, smoking, alcohol, children, distance **SKIPPED** unless also stored. |
| **C — Search widens age only** | `partnerAgeMax` 35 | `partnerAgeMax: 45` | Effective max **45**; age **active**; other dimensions follow stored sparsity. |
| **D — Search adds temporary cap** | *(no `maxDistanceKm` in stored JSON)* | `maxDistanceKm: 50` | Distance dimension **active** for this search (subject to Step 3 `NOT_ENFORCEABLE` if geo missing). Stored prefs **may** include `maxDistanceKm` in `holyGrailStructuredPreferences` JSON; it round-trips like other preference keys. |
| **E — Override clears a field** | Product convention must define whether “clear override” is **omit key** or explicit **null** in API | If override **omits** a key, that slice falls back to **stored** value only; if still absent → **SKIPPED**. |

### 3. Evaluator note — inactive dimensions (`SKIPPED`)

**Extended dimension outcome (conceptual):** In addition to `MATCH`, `NO_MATCH`, `UNKNOWN`, and `NOT_ENFORCEABLE`, the evaluator uses **`SKIPPED`** when **no effective preference** exists for that dimension.

- **`SKIPPED`:** Dimension **not applied**; counterparty facts for that slice are **not** used to accept or reject for that preference (for that direction).
- **Strict directional eligibility (revised):** In the **conceptual** enum below, a direction **passes** iff **every dimension that is not `SKIPPED`** resolves to an outcome that **allows** the direction (**`MATCH`**, including cases that map from implementation **`SOFT_PASS`**), and **no** such dimension is **`NO_MATCH`**, **`UNKNOWN`**, or **`NOT_ENFORCEABLE`** (per Step 3 policy). **In code** (`eligibility.evaluator.ts`), the same rule is: **no** dimension **`FAIL`**; **`PASS`** and **`SOFT_PASS`** both allow; **`SKIPPED`** is inert. See [Layer 3 locked policy](#locked-layer-3-policy-implementation-aligned).
- **Audit:** Log `SKIPPED` explicitly so support and debug UIs can distinguish “user did not set this” from “matched.”

**Step 3 doc alignment:** Rows that previously said **inactive → `MATCH`** should be read as **inactive → `SKIPPED`** under this section. `MATCH` is reserved for **active** rules that are **satisfied**.

**Implementation:** `MatchingPreferences` uses **optional** fields; `profile-to-canonical.mapper.ts` **does not** inject widest defaults—omitted `structuredPreferences` keys stay absent on the canonical model (evaluator **`SKIPPED`**).

---

## Step 1 — Canonical matching model (types only)

**Source of truth (TypeScript):** `dating-api/src/canonical/matching-canonical.types.ts`

That file defines the **canonical model**: enums and interfaces for `MatchingCanonicalModel` (layers: `facts`, `preferences`, `searchOverrides`). It is intentionally standalone so the contract is easy to edit in one place.

**Separation:**

1. **Canonical model types** — The `.types.ts` file. Describes the in-memory / API-facing contract only.
2. **Persistence mapping** — Separate code (future or existing mappers/repositories) that converts between the canonical model and whatever is stored (JSON blobs, columns, events).
3. **DB schema** — Prisma schema and migrations. Defines physical tables, columns, indexes, and constraints.

Editing the canonical types **does not** change the database. Aligning the DB is a deliberate follow-up: migration + mapping updates.

**Out of scope for Step 1:** scoring, ranking, dealbreaker engines, and Prisma/schema changes (none required until you choose to persist this shape).

### What would later require DB changes

- Persisting new or renamed fields from `MatchingFacts`, `MatchingPreferences`, or `MatchingSearchOverrides`.
- Storing enum values that need DB-level check constraints or new columns (vs. a single JSON document).
- Adding indexes for query paths (e.g. gender, age, geo) once those filters are served from SQL.
- Splitting one JSON profile into normalized tables for reporting or constraints.

Until then, the canonical file can evolve independently for API and application logic.

### Persisted Holy Grail structured JSON (`UserProfile` columns)

Two nullable JSON columns back the deterministic HG ingestion path:

| Column | Round-trip (write + read) | TypeScript |
|--------|---------------------------|------------|
| `holyGrailStructuredFacts` | Keys: `HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS` in `dating-api/src/holy-grail-matching/holy-grail-structured-contract.ts`. Merge: `mergeHolyGrailStructuredFactsPatch`. Parse: `parseHolyGrailStructuredFactsFromJson`. | Persisted slice: `HolyGrailStructuredFactsPersisted`. Full mapper slice: `HolyGrailStructuredFactsInput` (= persisted ∪ `HolyGrailStructuredFactsMapperOnly`). |
| `holyGrailStructuredPreferences` | Keys: `HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS` (includes `maxDistanceKm`). Merge: `mergeHolyGrailStructuredPreferencesPatch`. Parse: `parseHolyGrailStructuredPreferencesFromJson` (same allow-list and validation as merge; unknown keys or invalid values → throw). | `HolyGrailStructuredPreferencesPersisted` (= `HolyGrailStructuredPreferencesInput` for the mapper `structuredPreferences` slice). |

**Mapper-only facts** (accepted on `HolyGrailProfileMappingInput.structuredFacts` only, not stored in `holyGrailStructuredFacts` JSON): `HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_ONLY_KEYS` — e.g. `sexualOrientation`, `relationshipStatus`, `exerciseLevel`, `politics`, `livingSituation`, `workStudySituation`, `primaryLocationLabel`.

**Retrieval wire DTOs:** `HolyGrailMatchingPreferencesWireDto` mirrors canonical `MatchingPreferences`. `HolyGrailStructuredPreferencesPersistedWireDto` is the same shape for v1 (all those fields may round-trip through the preferences JSON column when set).

**DB JSON read path:** `parseHolyGrailStructuredFactsFromJson` / `parseHolyGrailStructuredPreferencesFromJson` use the same key allow-lists and value rules as merge + write: **unknown keys and invalid values throw** (no silent drops, no ignored extra keys).

---

## Step 2 — Locked MVP dimensions (10–12, fixed at 12)

**Model:** `MatchingCanonicalModel` with `version: 'matching_canonical_v1'` (see Step 1 source file).

**Mutual fit:** Searcher **preferences** (after applying `searchOverrides` where present) are evaluated against **counterparty facts**. No scoring, ranking, or dealbreaker engine.

**`searchOverrides`:** If a row lists preference field(s), the same name(s) may appear on `MatchingSearchOverrides` and **replace** that slice of preferences for the search context when set.

### Behavior categories (final)

Only these three classifications apply at Step 2:

| Category | Meaning |
|----------|---------|
| **hard_block** | Rule-based eligibility: explicit predicates (set membership, inclusive age **range**, distance cap, ordered education floor). Outcomes use the shared [dimension result enum](#step-3--enum-based-matching-contract). No numeric score and no ordering of candidates. |
| **matrix_based** | Rule-based eligibility via a **fixed enum-to-enum compatibility table**: each `(preference enum, fact enum)` maps to a dimension result. No interpolation, weights, or ranking. Smoking and alcohol use this by design. |
| **informational** | Never excludes; UI/context only. |

**Note on education:** `minimumPartnerEducation` is **hard_block** under current naming and semantics (“minimum” = strict floor). If product later wants a **soft** preference, rename or redefine the field in the canonical contract (Step 1 types) rather than overloading “minimum.”

### 1. Locked MVP dimensions (corrected table)

| # | Dimension | Fact field(s) | Preference field(s) | `searchOverrides` mirror | Behavior |
|---|-----------|---------------|---------------------|---------------------------|----------|
| 1 | Gender eligibility | `genderIdentity` | `acceptedPartnerGenders` | `acceptedPartnerGenders` | **hard_block** |
| 2 | Age window | `dateOfBirth` | `partnerAgeMin`, `partnerAgeMax` | `partnerAgeMin`, `partnerAgeMax` | **hard_block** (inclusive range; open-ended side if bound omitted) |
| 3 | Religion acceptance | `religion` | `acceptedPartnerReligions` | `acceptedPartnerReligions` | **hard_block** (only when `acceptedPartnerReligions` is non-empty) |
| 4 | Education floor | `education` | `minimumPartnerEducation` | `minimumPartnerEducation` | **hard_block** (ordinal floor vs counterparty fact; see note above if soft preference is ever desired) |
| 5 | Smoking tolerance | `smoking` | `acceptedPartnerSmoking` | `acceptedPartnerSmoking` | **matrix_based** |
| 6 | Alcohol tolerance | `alcoholUse` | `acceptedPartnerAlcohol` | `acceptedPartnerAlcohol` | **matrix_based** |
| 7 | Partner already has children | `childrenStatus` | `partnerHasChildren` | `partnerHasChildren` | **hard_block** (when preference is not `NO_REQUIREMENT`) |
| 8 | Partner wants (more) children | `wantsChildren` | `partnerWantsChildren` | `partnerWantsChildren` | **hard_block** (when preference is not `NO_REQUIREMENT`) |
| 9 | Proximity cap | *See postponed — no v1 fact for geo anchor* | `maxDistanceKm` | `maxDistanceKm` | **hard_block** (only once both sides have a comparable geo anchor; until then dimension is **not enforceable**) |
| 10 | Sexual orientation (display) | `sexualOrientation` | — | — | **informational** |
| 11 | Relationship status (display) | `relationshipStatus` | — | — | **informational** |
| 12 | Exercise / lifestyle (display) | `exerciseLevel` | — | — | **informational** |

Dimensions **1–8** are the core **filter** set. **9** is a reserved filter dimension tied to `maxDistanceKm` but **blocked on facts**. **10–12** are unchanged: **informational** only.

### Fields whose naming implies strict filtering

These names signal **hard eligibility** in the product language (smoking/alcohol use `matrix_based` tables mapping to the same shared result enum—no scoring):

- `acceptedPartnerGenders` — explicit allow-list for partners.
- `partnerAgeMin`, `partnerAgeMax` — explicit bounds on partner age.
- `minimumPartnerEducation` — explicit floor on partner education (**hard_block** unless renamed for a soft preference).
- `acceptedPartnerReligions` — explicit allow-list when non-empty.
- `acceptedPartnerSmoking`, `acceptedPartnerAlcohol` — tolerance bands via enum compatibility (**matrix_based**).
- `partnerHasChildren`, `partnerWantsChildren` — explicit partner requirements when not `NO_REQUIREMENT`.
- `maxDistanceKm` — hard cap on distance when the dimension is enforceable.

Facts use neutral names (`genderIdentity`, `dateOfBirth`, …) and do not, by themselves, imply filtering; prefs + overrides carry the strict semantics.

### 2. Postponed / not MVP dimensions (canonical fields still exist)

These fields remain on `MatchingFacts` for future use but are **not** part of the locked MVP dimension set above:

| Field | Layer | Note |
|-------|--------|------|
| `interestTags` | facts | Open-ended `string[]`; needs a **closed tag catalog** before any filter dimension. **Postpone.** |
| `primaryLocationLabel` | facts | Free text; **not** a geo anchor. **Postpone** for hard distance until structured place ID or lat/lng (or equivalent) exists on the model + mapping. |
| `politics` | facts | No v1 preference; sensitive. **Postpone** (or keep display-only later). |
| `livingSituation` | facts | No v1 preference. **Postpone.** |
| `workStudySituation` | facts | No v1 preference. **Postpone.** |
| Geo anchor for dimension 9 | facts | **Not in v1 types** — add only with an explicit contract change (Step 1 file) + later DB/migration when you persist it. |

`searchOverrides.validUntil` is **session metadata**, not a matching dimension.

### 3. Validation invariants (contract / write path)

Apply at API validation or ingest—not a scoring or dealbreaker engine.

- **Root:** `version === 'matching_canonical_v1'`; `profileId` non-empty; three layers present (`facts`, `preferences`, `searchOverrides` object allowed empty).
- **Sparse preferences:** Omitted preference fields are valid (see [Mapping vs search](#mapping-vs-search-behavior-stored-preferences-vs-searchoverrides)). Validation applies **when a field is present**.
- **`preferences.acceptedPartnerGenders`:** if **present**, length ≥ 1 and each element valid; **absent** is valid (evaluator **`SKIPPED`**).
- **Age:** if both `partnerAgeMin` and `partnerAgeMax` set, then `partnerAgeMin <= partnerAgeMax`; values within platform global min/max age.
- **`maxDistanceKm`:** if set, must be finite and `> 0`.
- **`acceptedPartnerReligions`:** if **present**, elements unique; each ∈ `ReligionSelf`. Prefer **omit** when no filter (→ **`SKIPPED`**); if product stores empty array as explicit “any,” document that convention (see mapping section).
- **`searchOverrides`:** only preference mirrors + `validUntil`; **no facts**. If `validUntil` set, valid ISO-8601 instant; policy may reject expired overrides on write.
- **Unknown counterparty facts:** single product policy for dimensions 1–8 when a required fact is missing or `PREFER_NOT_TO_SAY` (e.g. exclude vs review queue)—must be consistent across dimensions.
- **hard_block support tables (in app, not in DB):** ordinal rank for `EducationLevelSelf` vs `MinimumPartnerEducation`; inclusive age from `dateOfBirth` vs `partnerAgeMin` / `partnerAgeMax`.
- **matrix_based:** document enum-to-enum compatibility for `(acceptedPartnerSmoking × SmokingFrequencySelf)` and `(acceptedPartnerAlcohol × AlcoholUseSelf)` → shared dimension result enum (Step 3); no scoring.
- **Children intent:** fixed mapping for `childrenStatus` / `wantsChildren` vs `partnerHasChildren` / `partnerWantsChildren`—including **`UNSURE`** handling per [locked Layer 3 policy](#locked-layer-3-policy-implementation-aligned) (`MUST_WANT`×`UNSURE` → **`SOFT_PASS`**; `MUST_NOT_WANT`×`UNSURE` → **`FAIL`** in code).

### 4. Database

**Explicit:** Prisma schema and migrations are **still unchanged** for HOLY_GRAIL_MATCHING. Steps 2–3 are **contract and logic spec** only; persistence and DB alignment remain future work.

---

## Step 3 — Enum-based matching contract

**Scope:** One-direction **evaluation**: **searcher** preferences (merged with `searchOverrides` per field) against **counterparty** facts. **Mutual** fit = run the same contract in both directions. Step 2 taxonomy: `hard_block`, `matrix_based`, `informational` (dimensions 10–12 produce **no dimension result**—display-only).

**Principles:** Outcomes are **enumerated** per dimension (see below). Rules use **enum equality**, **set membership**, **numeric range**, and **ordered rank** comparisons only—no scores, no candidate ordering at Layer 3.

**Implementation status:** **`eligibility.evaluator.ts` implements** Layer 3 with statuses **`PASS`**, **`FAIL`**, **`SKIPPED`**, **`SOFT_PASS`**. The tables below use the **conceptual** Step 3 labels **`MATCH`** / **`NO_MATCH`** / **`UNKNOWN`** / **`NOT_ENFORCEABLE`** / **`SKIPPED`**; see [Locked Layer 3 policy](#locked-layer-3-policy-implementation-aligned) for **`SOFT_PASS`** and the doc↔code mapping. `matching-dimension-result.ts` holds legacy **`MATCH`**-style literals for bridges/audit shapes.

---

### Locked Layer 3 policy (implementation-aligned)

**Source of truth:** `dating-api/src/holy-grail-matching/eligibility.evaluator.ts` (this section documents behavior only; do not treat it as a second implementation).

**Per-dimension statuses in code:** `PASS` \| `FAIL` \| `SKIPPED` \| `SOFT_PASS`. **Directional overall** `overallHardEligibility` is **`PASS`** iff **no** dimension has **`FAIL`** (`SKIPPED`, `PASS`, and `SOFT_PASS` do not block).

**Doc ↔ code (conceptual `MATCH` / `NO_MATCH`):** In this document, **`MATCH`** means “active rule satisfied **or** softly allowed”: implementation **`PASS`** or **`SOFT_PASS`**. **`NO_MATCH`** corresponds to implementation **`FAIL`**. **`UNKNOWN`** / **`NOT_ENFORCEABLE`** map to evaluator outcomes that **block** the direction when the implementation returns **`FAIL`** for that dimension. **`SKIPPED`** is the same in both.

**`SOFT_PASS` is limited to exactly these cases (no other softening):**

| Dimension | Policy |
|-----------|--------|
| **PARTNER_WANTS_CHILDREN** | **`MUST_WANT`** × counterparty **`wantsChildren === UNSURE`** → **`SOFT_PASS`** (`WANTS_CHILDREN_MUST_WANT_UNSURE_SOFT`); sets flag **`children_unsure`**. **`MUST_NOT_WANT`** × **`UNSURE`** → **`FAIL`** (`WANTS_CHILDREN_MUST_NOT_WANT_FAIL`). All other active combinations → **`PASS`** or **`FAIL`** per explicit branches only. |
| **ALCOHOL** | Preference **`NONE_ONLY`** × counterparty **`RARE`**: the static matrix would **`FAIL`**; implementation upgrades to **`SOFT_PASS`** (`ALCOHOL_NONE_ONLY_RARE_SOFT`) for **~50%** of **ordered** `(searcherProfileId, counterpartyProfileId)` pairs, using **`holyGrailDeterministicHalfPass('ALCOHOL_NONE_ONLY_RARE', …)`**; otherwise **`FAIL`**. No other alcohol **`SOFT_PASS`**. |

**AGE** and **RELIGION:** only **`PASS`**, **`FAIL`**, or **`SKIPPED`** — **no** **`SOFT_PASS`**.

**Read-only pool check:** `dating-api/scripts/hg-soft-pass-simulation.ts` calls production **`evaluateHolyGrailDirectional`** and embeds the same policy text in its JSON report.

---

### Shared dimension result enum (conceptual)

All dimensions resolve to one of:

| Value | Meaning |
|-------|---------|
| **`SKIPPED`** | **No effective preference** for this dimension (stored + overrides); dimension is **not** evaluated — **not** `MATCH`, **not** `NO_MATCH`. |
| **`MATCH`** | The rule is **active** and satisfied for this pair. |
| **`NO_MATCH`** | The rule is **active** and fails for this pair. |
| **`UNKNOWN`** | The rule is **active** but disclosure does not allow a definite `MATCH` or `NO_MATCH` (see [policy](#unknown-and-not_enforceable-policies)). |
| **`NOT_ENFORCEABLE`** | The rule cannot be evaluated with the current **v1 contract** (missing primitives—e.g. geo for distance). |

*Implementation note:* This enum is specified here for HOLY_GRAIL_MATCHING; it may later live in TypeScript alongside mappers (not in `matching-canonical.types.ts` until you choose to add it).

---

### hard_block — evaluation table

Use **effective preferences** = stored `MatchingPreferences` merged with `MatchingSearchOverrides` where override keys are **present** (replace-by-field semantics from Step 2). See [Mapping vs search behavior](#mapping-vs-search-behavior-stored-preferences-vs-searchoverrides).

When **no effective preference** exists for a dimension (field absent after merge), the dimension is **`SKIPPED`** — **not** `MATCH`, **not** `NO_MATCH` (see [evaluator note](#3-evaluator-note--inactive-dimensions-skipped)).

| # | Dimension | Fact field(s) | Preference field(s) | Evaluation rule | Result |
|---|-----------|---------------|---------------------|-------------------|--------|
| 1 | Gender eligibility | `genderIdentity` | `acceptedPartnerGenders` | **`SKIPPED`** if effective `acceptedPartnerGenders` absent or empty. Else **active**: **MATCH** iff `genderIdentity` present, not `PREFER_NOT_TO_SAY`, and `genderIdentity ∈ acceptedPartnerGenders`. **NO_MATCH** if in set check fails. **UNKNOWN** if `genderIdentity` absent or `PREFER_NOT_TO_SAY`. | `SKIPPED` \| `MATCH` \| `NO_MATCH` \| `UNKNOWN` |
| 2 | Age window | `dateOfBirth` | `partnerAgeMin`, `partnerAgeMax` | **`SKIPPED`** if **both** effective bounds absent. Else **active**: age `a` = whole years (UTC) from `YYYY-MM-DD`. **MATCH** iff every specified bound holds. **NO_MATCH** if violated. **UNKNOWN** if `dateOfBirth` missing / invalid / future per mapper policy. **No `SOFT_PASS`** (see [locked policy](#locked-layer-3-policy-implementation-aligned)). | `SKIPPED` \| `MATCH` \| `NO_MATCH` \| `UNKNOWN` |
| 3 | Religion acceptance | `religion` | `acceptedPartnerReligions` | **`SKIPPED`** if effective list absent or **empty** (no religion filter defined). Else **active**: **MATCH** iff `religion` present, not `PREFER_NOT_TO_SAY`, and `religion ∈ acceptedPartnerReligions`. **NO_MATCH** / **UNKNOWN** as before. **No `SOFT_PASS`**. | `SKIPPED` \| `MATCH` \| `NO_MATCH` \| `UNKNOWN` |
| 4 | Education floor | `education` | `minimumPartnerEducation` | **`SKIPPED`** if effective `minimumPartnerEducation` **absent**. **`ANY` stored explicitly** → no floor: treat as **`SKIPPED`** (same as “not filtering on education”). **Concrete floor** (`HIGH_SCHOOL` … `GRADUATE`): **active**; rank rules per [table below](#education-rank-mapping-hard_block-4). | `SKIPPED` \| `MATCH` \| `NO_MATCH` \| `UNKNOWN` |
| 7 | Partner already has children | `childrenStatus` | `partnerHasChildren` | **`SKIPPED`** if effective value **absent** or **`NO_REQUIREMENT`** (no constraint). **`ACCEPT`** / **`DOES_NOT_ACCEPT`**: **active**; rules unchanged. | `SKIPPED` \| `MATCH` \| `NO_MATCH` \| `UNKNOWN` |
| 8 | Partner wants (more) children | `wantsChildren` | `partnerWantsChildren` | **`SKIPPED`** if absent or **`NO_REQUIREMENT`**. If **`MUST_WANT`**: **MATCH** iff `YES`; **`SOFT_PASS`** iff **`UNSURE`** (only soft case on this dimension); **NO_MATCH** iff **`NO`**. If **`MUST_NOT_WANT`**: **MATCH** iff **`NO`**; **NO_MATCH** iff **`YES`** or **`UNSURE`**. Missing / `PREFER_NOT_TO_SAY` on fact → **FAIL** path in code when preference active. Full detail: [locked policy](#locked-layer-3-policy-implementation-aligned). | `SKIPPED` \| `MATCH` \| `NO_MATCH` \| `UNKNOWN` \| `SOFT_PASS` *(impl)* |
| 9 | Proximity cap | *(none in v1 for geo)* | `maxDistanceKm` | **`SKIPPED`** if effective `maxDistanceKm` **absent**. If set: v1 → **NOT_ENFORCEABLE** without geo facts. | `SKIPPED` \| `NOT_ENFORCEABLE` \| `MATCH` \| `NO_MATCH` \| `UNKNOWN` *(when geo exists)* |

#### Education rank mapping (hard_block #4)

Map counterparty `EducationLevelSelf` → ordinal rank `R` (integer):

| `education` | R |
|-------------|---|
| `LESS_THAN_HIGH_SCHOOL` | 0 |
| `HIGH_SCHOOL` | 1 |
| `SOME_COLLEGE` | 2 |
| `BACHELORS` | 3 |
| `GRADUATE` | 4 |
| `DOCTORATE` | 5 |
| missing, `PREFER_NOT_TO_SAY`, `OTHER` | *(no rank → **UNKNOWN** for this dimension when rule active)* |

Map `minimumPartnerEducation` → minimum required rank `T`:

| `minimumPartnerEducation` | T |
|---------------------------|---|
| `ANY` | *(dimension **SKIPPED** when stored — do not use T)* |
| `HIGH_SCHOOL` | 1 |
| `SOME_COLLEGE` | 2 |
| `BACHELORS` | 3 |
| `GRADUATE` | 4 |

**Rule (active):** **MATCH** iff `R` and `T` defined and `R ≥ T`; **NO_MATCH** iff both defined and `R < T`.

---

### Smoking — enum compatibility (`matrix_based`)

If effective `acceptedPartnerSmoking` is **absent** after merge → dimension **`SKIPPED`** (do not use the matrix).

**Row** = searcher `AcceptedPartnerSmoking`. **Column** = counterparty `SmokingFrequencySelf`. Cell = dimension result when **active**.

|  | `NEVER` | `FORMER` | `SOCIAL` | `REGULAR` | `PREFER_NOT_TO_SAY` |
|--|---------|----------|----------|-----------|---------------------|
| **`NONE_ONLY`** | MATCH | MATCH | NO_MATCH | NO_MATCH | UNKNOWN |
| **`SOCIAL_OK`** | MATCH | MATCH | MATCH | NO_MATCH | UNKNOWN |
| **`ANY`** | MATCH | MATCH | MATCH | MATCH | UNKNOWN |

**Narrative:** `NONE_ONLY` treats former smokers like non-smokers; `REGULAR` never matches `SOCIAL_OK` or `NONE_ONLY`. Counterparty declined to answer → **UNKNOWN**.

---

### Alcohol — enum compatibility (`matrix_based`)

If effective `acceptedPartnerAlcohol` is **absent** after merge → dimension **`SKIPPED`** (do not use the matrix).

**Row** = searcher `AcceptedPartnerAlcohol`. **Column** = counterparty `AlcoholUseSelf`. Cell = dimension result when **active**.

|  | `NEVER` | `RARE` | `MODERATE` | `FREQUENT` | `PREFER_NOT_TO_SAY` |
|--|-------|--------|------------|------------|---------------------|
| **`NONE_ONLY`** | MATCH | NO_MATCH* | NO_MATCH | NO_MATCH | UNKNOWN |
| **`MODERATE_OK`** | MATCH | MATCH | MATCH | NO_MATCH | UNKNOWN |
| **`ANY`** | MATCH | MATCH | MATCH | MATCH | UNKNOWN |

\* **`NONE_ONLY`** × **`RARE`:** the table cell is **NO_MATCH** for the strict matrix, but the **implementation** turns a subset of those cases into **`SOFT_PASS`** (~50% of ordered pairs via `holyGrailDeterministicHalfPass`); otherwise **`FAIL`**. See [locked policy](#locked-layer-3-policy-implementation-aligned).

**Narrative:** `MODERATE_OK` allows up to `MODERATE`; `FREQUENT` is outside that band. Declined to answer → **UNKNOWN**.

---

### Unknown and `NOT_ENFORCEABLE` policies

**UNKNOWN (single rule across active dimensions):** When a dimension is **not** `SKIPPED`, and an active rule requires a fact or enum value to distinguish `MATCH` vs `NO_MATCH` and that information is missing or withheld (`PREFER_NOT_TO_SAY`, unranked `OTHER` for education, etc.), the dimension result is **`UNKNOWN`**.

**Strict directional eligibility (revised):** Consider only dimensions that are **not** `SKIPPED`. Among those, **every** must **allow** the direction (**`MATCH`** in this doc, including implementation **`SOFT_PASS`** on alcohol / wants-children where applicable). Any **`NO_MATCH`**, **`UNKNOWN`**, or **`NOT_ENFORCEABLE`** (per policy below) fails strict. In **code**, equivalently: **no** **`FAIL`**. **`SKIPPED` dimensions are omitted from the conjunction**—they neither help nor hurt.

**`NOT_ENFORCEABLE`:** When **`maxDistanceKm` is present** in effective prefs but geo is missing → **`NOT_ENFORCEABLE`**. When **`maxDistanceKm` is absent** → dimension **9** is **`SKIPPED`**, not `NOT_ENFORCEABLE`.

**Composition:** No aggregate score: combine dimension results only by **enum logic** and product rules. Dimensions 10–12 (informational facts) do not produce this enum.

---

### Fields pending future contract changes

| Item | Reason |
|------|--------|
| **Proximity evaluation** | Needs geo anchor (lat/lng, place ID, or equivalent) on facts or search context; then dimension 9 can return `MATCH` \| `NO_MATCH` \| `UNKNOWN` instead of `NOT_ENFORCEABLE`. |
| **`maxDistanceKm` + geo** | Until Step 1 types add anchors, keep **`NOT_ENFORCEABLE`** when cap is set. |
| **`interestTags` as a filter** | Closed vocabulary + preference fields; not v1. |
| **`primaryLocationLabel`** | Not sufficient for distance rule. |
| **Prefs for `politics`, `livingSituation`, `workStudySituation`** | New preference surface + Step 2 rows if added. |

**Prisma / DB:** unchanged. **`matching-canonical.types.ts`:** enum sets above are the existing v1 definitions; **`MatchingPreferences`** optional fields support absent dimensions (`SKIPPED`) without new enum values.

---

## Step 4 — Canonical mapping contract (current system → `MatchingCanonicalModel` v1)

**Authority:** Step 3 dimension outcomes are evaluated **after** this mapping produces a `MatchingCanonicalModel` (sparse `preferences` where keys are omitted—**no** widest injected defaults). This section defines **where** each canonical field may come from in the **current** codebase/storage; it does **not** implement mappers or change Prisma.

**Implementation status:** Step 4 **Phase 2** is implemented in `profile-to-canonical.mapper.ts` (deterministic; structured input only). Layer 3 **`eligibility.evaluator.ts`** is implemented; optional follow-up: broader audits ([Roadmap](#roadmap--actual-execution-order-next-work)).

**Current persistence (relevant):**

| Artifact | Prisma / path | Role |
|----------|----------------|------|
| Profile text | `UserProfile.aboutMe`, `aboutPartner?`, `aboutRelationship?` | Free text; no typed enums. |
| Profile identity | `UserProfile.id`, `name` | Ids and display. |
| V2 extraction | `ProfileExtractionV2` — `interests_self`, `interests_partner`, `negatives_self`, `negatives_partner`, `soft_no`, `hard_no`, `interests`, `lifestyleTraits`, `preferences`, `boundaries`, `values` (`String[]`); `extractionJson`, `selfSignals`, `partnerSignals`, `relationshipSignals` (`Json`); `relationship_clarity_*` (`Int?`) | Tags + LLM pipeline output; **not** aligned 1:1 with canonical enums. |
| Evaluate JSON (raw) | `ProfileEvaluationRaw.evaluation` | Persisted evaluate batch (self/partner/relationship blocks, product scores, chips, and other enrichment fields such as `kidsTimeline` / `conflictStyleDetail` where stored). **Not** the runtime source of truth for HG **post-eligibility ranking** inputs (see below). |
| Signal snapshots | `ProfileSignalSnapshot` (per-domain rows) | Per-domain numeric signals from evaluate; the **self** row also holds typed HG ranking columns (`hgRankingDailyRhythm`, `hgRankingAutonomyTogetherness`, `hgRankingInterestsTop`, plus `lifestylePace` and `conflictStyle` used by the five-signal ranker). |

> **2026-06 note:** `MatchmakingProfile`, `ProfileExtractionV2`, and `ProfileSignalSnapshot` are **not** in current `schema.prisma`. Production HG ranking uses the new-model path (`UserProfile` / structured HG fields). Rows above describe the historical evaluate artifact model.

### HG ranking signals (DB-only at runtime)

The five inputs used only for ordering after hard eligibility (`MatchingCanonicalModel.rankingSignals`: `dailyRhythm`, `autonomyTogetherness`, `conflictStyle`, `lifestylePace`, `interestsTop`) are **read exclusively from typed columns on the self `ProfileSignalSnapshot` row** (see `holy-grail-ranking-signals-from-db.ts`, `buildHolyGrailRankingSignalsFromDbSelfRow`, and `HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT`). **Holy Grail retrieval, pair-direction evaluation, and post-filter ranking do not read these values from `ProfileEvaluationRaw.evaluation` or from persisted `enrichment.signals` JSON at runtime.** Enrichment may still be produced in memory during evaluate to populate DB columns on save; profile APIs may still return an enrichment-shaped payload for clients, but that is separate from the ranking source of truth. Other uses of `ProfileEvaluationRaw` / snapshots for legacy evaluate and non-HG flows remain **out of scope** for canonical enum mapping unless a future spec ties a key to a fact.

### Production-freeze — V2 enrichment (approved and locked)

**Locked families:** **personalityTraits v2**, **lifestyleSignals v2**, **interestTags v2** (with their v1 baselines in the same `rankingSignals` keys). Status: **approved for production** and **contract-locked** — changes require an explicit spec revision + evidence, not drive-by edits.

| Family | Canonical `rankingSignals` keys | Taxonomy | Role |
|--------|-----------------------------------|----------|------|
| **Personality traits** | `personalityTraitsSelf`, `personalityTraitsPartner` | v1 (`humor_playful`, `honesty_integrity`) + **v2** additive tags (`PERSONALITY_TRAIT_V2_TAG_SET` in `personality-traits-text.extract.ts`) | Post-eligibility **rank bonus** only; pairwise directional Jaccard-style overlap; **never** read by `eligibility.evaluator.ts`. |
| **Lifestyle signals** | `lifestyleSignalsSelf`, `lifestyleSignalsPartner` | v1 (first four ids) + **v2** additive (`LIFESTYLE_SIGNAL_V2_TAG_SET` in `lifestyle-signals-text.extract.ts`) | Same as personality. |
| **Interest tags** | `interestTagsSelf`, `interestTagsPartner` | v1 (`music`, `film`) + **v2** additive (`INTEREST_TAGS_V2_TAG_SET` in `interest-tags-text.extract.ts`) | Same. |

**Invariants (frozen — all mandatory):**

1. **HG five-signal layer remains the main driver:** Primary rank mass stays the weighted **five** columns (`dailyRhythm`, `autonomyTogetherness`, `conflictStyle`, `lifestylePace`, `interestsTop` — DB-backed self snapshot) plus empty-spread / tie micro in the purity path. V2 tag fields **do not** enter `WEIGHTS` or replace that layer.
2. **Additive-only secondary overlays:** Bonuses are **added** after the five-signal subtotal inside `computeHolyGrailFiveSignalRank` (`holy-grail-five-signal-ranking.ts`); they do **not** replace or rescale the primary five.
3. **No promotion to primary signals:** V2 (and v1) tag arrays **must not** be merged into the five primary keys, copied into eligibility inputs, or reweighted as if they were a sixth “core” signal — they stay **parallel** overlap bonuses only.
4. **No eligibility effect:** Layer-3 **PASS / FAIL / SKIPPED / SOFT_PASS** and `overallHardEligibility` are **unchanged** by these fields; they are not inputs to `evaluateHolyGrailDirectional` dimension matrices.
5. **No cap increases:** Per-family overlay caps stay **`PERSONALITY_RANK_BONUS_MAX` = 2**, **`LIFESTYLE_RANK_BONUS_MAX` = 2**, **`INTEREST_TAGS_RANK_BONUS_MAX` = 2** (same scale family as `SIMILARITY_RANK_BONUS_MAX` / empty spread). Any future raise requires an explicit contract revision and new batch evidence — **not** a silent code tweak.
6. **Production ordering (HG retrieval):** Survivor ordering uses **`computeHolyGrailRankingPurityRank`** (five-signal DB slice + intrinsic spread/tie micro **only**). The three locked families apply only in **`computeHolyGrailFiveSignalRank`** (analysis, batch scripts, and any product surface that intentionally uses the full composite score).

**Batch evidence (observed):** Run `npx ts-node dating-api/scripts/hg-v2-enrichment-batch-analysis.ts` with `DATABASE_URL` set; full JSON is written to `dating-api/scripts/.hg-v2-enrichment-batch-output.json`. Last recorded corpus: **836** mappable profiles, **698,060** ordered pairs (full sweep). See [Rollout PR summary — V2 enrichment freeze](#rollout-pr-summary--v2-enrichment-freeze) for copy-paste metrics.

---

#### Rollout PR summary — V2 enrichment freeze (concise)

**Title:** `docs+code: lock HG V2 enrichment overlays (personality / lifestyle / interest)`  

**Summary:** Locks **personalityTraits v2**, **lifestyleSignals v2**, and **interestTags v2** as **approved** secondary rank overlays: **additive-only**, **no eligibility**, **no promotion to the five primary signals**, **no cap increases** (2 pts max/family), **HG five-signal remains the main driver**. Doc + comments only — **no runtime behavior change**. Evidence: `npx ts-node dating-api/scripts/hg-v2-enrichment-batch-analysis.ts` → `dating-api/scripts/.hg-v2-enrichment-batch-output.json`.

| Metric | Value |
|--------|--------|
| Profiles (DB total / mappable) | 836 / 836 |
| Ordered pairs analyzed | 698,060 (full `n×(n−1)` sweep) |
| V2 taxonomy universe sizes (personality / lifestyle / interest) | 8 / 7 / 8 distinct tag ids |
| Corpus coverage of each v2 universe (≥1 profile emitted tag) | **100%** / **100%** / **100%** |
| % profiles with ≥1 v2 tag (personality / lifestyle / interest) | **41.87%** / **20.22%** / **21.65%** |
| % profiles with ≥1 tag in any of the three families | **58.25%** |
| Profile co-occurrence (marginal P / L / I on diagonal of 3×3) | 350 / 169 / 181 |
| Profiles with all three v2 families | 44 (**5.26%**) |
| Grounded tag hits in rank notes (all vs v2-only) — personality | 28,302 / 22,418 |
| Grounded tag hits — lifestyle | 2,158 / 1,650 |
| Grounded tag hits — interest | 1,720 / 1,454 |
| Rank delta vs HG-only baseline, top 50 (50 searchers): mean fraction of baseline top-50 retained in full top-50 | **0.9564** |
| Same: mean mean abs rank shift among baseline top-50 | **2.7568** |
| Bonus pairs (ordered) — personality / lifestyle / interest overlays | 27,562 / 2,148 / 1,716 |
| Overlay points p50 (personality / lifestyle / interest) | 1 / 2 / 2 |
| Pairs with any of the three tag bonuses (sum > 0) | 30,514; sum p50 / p90 / p99 = **1** / **2** / **4** |

**Note:** “Full” rank in the batch script is `computeHolyGrailFiveSignalRank` (includes **`similarityPreference`** Δ as well as the three tag families); baseline is `computeHolyGrailRankingPurityRank`.

**Mapping class (required label on every row):**

1. **Direct** — Copy or trivial, deterministic transform (no inference).  
2. **Derived** — Requires an explicit, versioned rule set (tag dictionary, parser, or future structured LLM output). If the rule cannot fire with confidence, treat as **missing** for that field.  
3. **Missing / unavailable** — No stable column or agreed derivation; field stays unset (or preferences come from a **non-profile** source such as onboarding defaults—documented separately, not “from extraction”).

**UNKNOWN compatibility (evaluation):** For Step 3, **`UNKNOWN`** arises at **evaluation** when facts are missing, `PREFER_NOT_TO_SAY`, or unranked. At **mapping** time: **omit** optional fact fields you cannot justify → evaluation sees “missing” → **`UNKNOWN`** on active dimensions that need that fact. Emitting canonical **`PREFER_NOT_TO_SAY`** is equivalent to “withheld” and also yields **`UNKNOWN`** where Step 3 says so.

**Preferences (persisted DB):** **No injected defaults** — omitted keys mean **no preference defined** (evaluator **`SKIPPED`** for that dimension). See [Mapping vs search behavior](#mapping-vs-search-behavior-stored-preferences-vs-searchoverrides). **Mapper + types** match this: sparse `MatchingPreferences`, no widest injection.

---

### Phase 1 — Final mapping rules (spec)

**Input DTO:** `HolyGrailProfileMappingInput` (`profile-sources.types.ts`). The mapper **never** reads `aboutMe`, `aboutPartner`, `extractionJson`, or any raw text. **No LLM.** Callers copy Prisma `String[]` columns into `extractionArrays` and pass any future structured enum columns via `structuredFacts` / `structuredPreferences`.

**Target (aligned with mapping vs search):** **Omitted** `structuredPreferences` keys → **omit** those fields on the canonical `MatchingPreferences` output (or `undefined`), **not** widest defaults. **`searchOverrides`:** omitted keys → no override for that field.

#### 1. Full mapping rules table (final)

| Canonical field | Layer | Class | Source on input DTO | Deterministic rule | Fallback / omit | UNKNOWN-related |
|-----------------|-------|-------|---------------------|--------------------|-----------------|-----------------|
| `version` | root | Direct | *(constant)* | Always `matching_canonical_v1`. | — | N/A |
| `profileId` | root | Direct | `profileId` | Trim; must be non-empty string; else throw. | — | N/A |
| `facts.genderIdentity` | facts | Unavailable without structured | `structuredFacts.genderIdentity` | If **absent** → omit. If **present** → must be valid `GenderIdentity` enum value; else throw. | Omit | Omit → eval `UNKNOWN` for gender |
| `facts.sexualOrientation` | facts | Same | `structuredFacts.sexualOrientation` | Same pattern for `SexualOrientationSelf`. | Omit | — |
| `facts.relationshipStatus` | facts | Same | `structuredFacts.relationshipStatus` | Same for `RelationshipStatusSelf`. | Omit | — |
| `facts.childrenStatus` | facts | Same | `structuredFacts.childrenStatus` | Same for `ChildrenStatusSelf`. | Omit | — |
| `facts.wantsChildren` | facts | Same | `structuredFacts.wantsChildren` | Same for `WantsChildrenSelf`. | Omit | — |
| `facts.smoking` | facts | Same | `structuredFacts.smoking` | Same for `SmokingFrequencySelf`. **Never** infer from `negatives_self` / tags. | Omit | — |
| `facts.alcoholUse` | facts | Same | `structuredFacts.alcoholUse` | Same for `AlcoholUseSelf`. | Omit | — |
| `facts.exerciseLevel` | facts | Same | `structuredFacts.exerciseLevel` | Same for `ExerciseLevelSelf`. | Omit | — |
| `facts.religion` | facts | Same | `structuredFacts.religion` | Same for `ReligionSelf`. | Omit | — |
| `facts.politics` | facts | Same | `structuredFacts.politics` | Same for `PoliticsSelf`. | Omit | — |
| `facts.education` | facts | Same | `structuredFacts.education` | Same for `EducationLevelSelf`. | Omit | — |
| `facts.livingSituation` | facts | Same | `structuredFacts.livingSituation` | Same for `LivingSituationSelf`. | Omit | — |
| `facts.workStudySituation` | facts | Same | `structuredFacts.workStudySituation` | Same for `WorkStudySituationSelf`. | Omit | — |
| `facts.dateOfBirth` | facts | Same | `structuredFacts.dateOfBirth` | If absent → omit. If present → must match `YYYY-MM-DD` (regex) and parse as valid calendar date in UTC; else throw. | Omit | — |
| `facts.primaryLocationLabel` | facts | Same | `structuredFacts.primaryLocationLabel` | If absent → omit. If present → non-empty trim; else throw. | Omit | — |
| `facts.interestTags` | facts | Direct + minimal derived | `extractionArrays.interests_self`, `.interests`, `.lifestyleTraits` | Concatenate in that order; each array must be `string[]` or absent; non-string element → throw. Normalize each tag: trim, lowercase, internal whitespace → single space; drop empty. Dedupe by first-seen order. If result length 0 → **omit** property. | Omit | — |
| `preferences.acceptedPartnerGenders` | prefs | Direct / omit | `structuredPreferences.acceptedPartnerGenders` | If provided: non-empty array, each valid `AcceptedPartnerGender`; else throw. If **absent** → **omit** on output (evaluator **`SKIPPED`**). **Do not** inject all four genders. | Omit → `SKIPPED` | — |
| `preferences.partnerAgeMin` / `Max` | prefs | Direct / omit | `structuredPreferences.partnerAgeMin` / `Max` | If present: integer ∈ \[18, 120\]; if both present `min ≤ max`; else throw. If absent → omit (both). | Omit → `SKIPPED` if both absent | — |
| `preferences.minimumPartnerEducation` | prefs | Direct / omit | `structuredPreferences.minimumPartnerEducation` | If present → valid enum (including explicit `ANY` if user chose it). If **absent** → **omit** (evaluator **`SKIPPED`**). **Do not** default to `ANY`. | Omit → `SKIPPED` | Explicit `ANY` → **SKIPPED** per Step 3 |
| `preferences.acceptedPartnerSmoking` | prefs | Direct / omit | `structuredPreferences.acceptedPartnerSmoking` | If present → valid enum. If **absent** → **omit** → **`SKIPPED`**. **Do not** default `ANY`. | Omit → `SKIPPED` | — |
| `preferences.acceptedPartnerAlcohol` | prefs | Direct / omit | `structuredPreferences.acceptedPartnerAlcohol` | Same as smoking. | Omit → `SKIPPED` | — |
| `preferences.partnerWantsChildren` | prefs | Direct / omit | `structuredPreferences.partnerWantsChildren` | If present → valid enum. If **absent** → **omit** → **`SKIPPED`**. **Do not** default `NO_REQUIREMENT`. | Omit → `SKIPPED` | Explicit `NO_REQUIREMENT` → **SKIPPED** per Step 3 |
| `preferences.partnerHasChildren` | prefs | Direct / omit | `structuredPreferences.partnerHasChildren` | Same as wants-children. | Omit → `SKIPPED` | Explicit `NO_REQUIREMENT` → **SKIPPED** |
| `preferences.acceptedPartnerReligions` | prefs | Direct / omit | `structuredPreferences.acceptedPartnerReligions` | If **absent** → **omit** → **`SKIPPED`**. If present: array (may be empty only if product defines “explicit any” — default target: **omit** instead of `[]`). If non-empty: each valid `ReligionSelf`; dedupe; else throw. | Omit → `SKIPPED` | Non-empty → active filter |
| `preferences.maxDistanceKm` | prefs | Direct / omit | `structuredPreferences.maxDistanceKm` | If present: finite number `> 0`; else throw. If absent → omit → **`SKIPPED`**. | Omit → `SKIPPED` | — |
| `searchOverrides` | overrides | Direct passthrough | `searchOverrides` | If absent → `{}`. If present: only known keys; each field validated like preferences; **missing** override key → no search-time constraint for that field. `validUntil` ISO-8601 when present. | `{}` | Missing key ≠ “widest” |

#### 2. Fields that cannot be mapped reliably (without new structured sources)

Anything that currently exists only as **free text** or **ambiguous tags** (e.g. mapping `negatives_self` “smoking” to `facts.smoking`) is **out of scope** for this mapper. Those facts stay **omitted** until `structuredFacts` gains a column or service fills it with **already-validated** enum strings.

#### 3. Fields that must stay undefined for now (typical DB-only load)

When the caller passes **only** `profileId` + `extractionArrays` and no `structuredFacts`: demographic enum **facts** are **omitted** except **`interestTags`** when present. **Preferences:** target is **all preference fields omitted** if `structuredPreferences` absent (evaluator **`SKIPPED`** everywhere prefs matter)—**not** injected defaults.

---

### Phase 2 — Implementation (mapper)

**Code:** `profile-to-canonical.mapper.ts` + tests — behavior matches [Mapping vs search behavior](#mapping-vs-search-behavior-stored-preferences-vs-searchoverrides): **no** widest default prefs; `MatchingPreferences` fields are optional where a key may be absent.

**Example input → output (target semantics)**

*Input* (profile + extraction only, no stored prefs):

```json
{
  "profileId": "  p1  ",
  "extractionArrays": {
    "interests_self": ["  Hiking ", "hiking"],
    "interests": ["books"],
    "lifestyleTraits": ["  Yoga "]
  }
}
```

*Target output* (`MatchingCanonicalModel`, abbreviated):

- `version`: `matching_canonical_v1`
- `profileId`: `p1` (trimmed)
- `facts.interestTags`: `["hiking", "books", "yoga"]`
- `preferences`: **no preference keys set** (sparse object `{}`) → evaluator **`SKIPPED`** on all preference-backed dimensions
- `searchOverrides`: `{}`

**Search example:** same profile + `searchOverrides: { "partnerAgeMax": 40 }` → effective age max **40** for that query only; other prefs still **SKIPPED** if unstored.

**Mapper invariants**

- Strict key allowlists and enum validation (fail-fast) remain.
- `MatchingPreferences` is **sparse** (optional fields); omitted input keys are not filled with `ANY`, `NO_REQUIREMENT`, all genders, or empty religion lists.

---

### Historical note — pre–Phase 1 field table

The earlier exploratory table (raw `UserProfile` / free text) is superseded by **Phase 1** above for **implementation**. It remains directionally useful for **product** sourcing of `structuredFacts` later.

---

### 2. Fields with no current source

| Canonical area | Fields |
|----------------|--------|
| **Facts** | `genderIdentity`, `sexualOrientation`, `relationshipStatus`, `childrenStatus`, `wantsChildren`, `smoking`, `alcoholUse`, `exerciseLevel`, `religion`, `politics`, `education`, `livingSituation`, `workStudySituation`, `dateOfBirth` — **no typed columns**; all need onboarding, import, or a **derived** pipeline (Step 4 §1). |
| **Facts (partial)** | `interestTags` — **only** `interests_self` / related arrays are direct tag sources; still not canonical enum tags for matching. |
| **Preferences (entire layer)** | All `MatchingPreferences` fields — **nothing** in current Prisma models. |
| **searchOverrides** | Entire layer — **not** stored on profile; API/session only. |
| **Geo** | Any fact needed for distance enforcement — **absent** from v1 schema. |

---

### 3. Fields requiring future schema changes (when persisting)

Persisting `MatchingCanonicalModel` without recomputing from text each time typically requires **new** storage (exact shape TBD; Prisma unchanged until you migrate):

- **Structured demographics & prefs:** columns or JSON document on `UserProfile` (or child table) for facts + preferences + optional serialized `searchOverrides` history.  
- **DOB or age** for hard_block age.  
- **Geo anchor** (lat/lng, place id) for `maxDistanceKm` evaluation beyond `NOT_ENFORCEABLE`.  
- **User preference edits** separate from LLM extraction to avoid overwriting with each extract.  
- **Versioning** of stored enum strings when `matching-canonical.types.ts` evolves.

---

### 4. Risks of ambiguous mapping

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Self vs partner domain** | `negatives_partner` / `interests_partner` describe **desired partner**, not counterparty facts. Must never map directly into **`MatchingFacts`** as if they were self. | Map partner-domain tags only to **`MatchingPreferences`** (future), never to facts. |
| **Negatives semantics** | `negatives_self` tag `smoking` often means “I don’t want smokers” or “I hate smoking,” not “I am a smoker.” | Do not infer `facts.smoking` from negatives without quote-level rules. |
| **Signal floats vs enums** | `ProfileSignalSnapshot` / `selfSignals` 1–10 scales (e.g. `spirituality`, `healthBodyConsciousness`) are **not** `ReligionSelf` / `ExerciseLevelSelf`. | No automatic mapping in v1 contract. |
| **Open string arrays** | `preferences`, `values`, `boundaries` are free-form tags/strings. | Treat as **uncontrolled**; do not silently map to strict prefs without a versioned dictionary. |
| **extractionJson drift** | `extractionJson` schema is pipeline-specific. | Any derived mapper must pin **promptVersion** / extractor version per row. |
| **Default preferences** | Inventing `acceptedPartnerGenders` etc. from absence of data can exclude users incorrectly. | Require explicit user input or legally reviewed defaults; document separately from profile extraction. |
| **LLM extraction refresh** | Re-running extract could overwrite user-edited canonical data if stored together. | Split **user-authored** vs **extracted** provenance in future schema. |

**Scoring / ranking:** still out of scope. **Prisma:** unchanged by Step 4. **`matching-canonical.types.ts`:** `MatchingPreferences` fields are **optional** where a dimension may be absent (sparse mapping); **enums** unchanged.

---

## Step 5 — Clean implementation path (new engine above the LLM)

**Architecture decision:** **Keep** the LLM extraction / interpretation layer as-is (`src/extraction/*`, prompts, `ExtractionV2Service`, persistence to `ProfileExtractionV2`). **Rebuild everything above it** as new, deterministic code: canonical mapping → enum evaluator → decision/output. **Do not** reuse or patch the legacy dealbreaker engine, scoring engine, or `match-engine` compatibility path. The old engine stays in place for current product surfaces until an explicit cutover.

### 1. Module structure (four layers)

```
dating-api/src/
  extraction/                            ← Layer 1 — LLM (KEEP; not duplicated here)
    extraction-v2.service.ts
    …

  canonical/
    matching-canonical.types.ts          ← Shared contract: MatchingCanonicalModel v1

  holy-grail-matching/                   ← Layers 2–4 only (deterministic; no Nest module required yet)
    index.ts
    matching-dimension-result.ts
    holy-grail-dimensions.ts
    profile-sources.types.ts             ← Inputs: DB rows + extraction DTOs (post-LLM)
    profile-to-canonical.mapper.ts       ← Layer 2 — **implemented** (structured `HolyGrailProfileMappingInput` only)
    eligibility.evaluator.ts             ← Layer 3 — **implemented** (PASS/FAIL/SKIPPED/SOFT_PASS; see doc § locked policy)
    eligibility-audit.types.ts
    build-eligibility-audit.ts           ← Layer 4 — per-direction audit DTO
    decision/
      holy-grail-decision.types.ts       ← Layer 4 — pair-level decision enum + DTO
      build-holy-grail-pair-decision.ts  ← Layer 4 — MUTUAL_MATCH / NO_MATCH / INDETERMINATE
```

**Intentionally omitted:** imports from **legacy** `match-engine`, dealbreakers, friction, recommendation, and legacy ranking; **`MatchesModule`** wiring to HG is a separate cutover. **HG-only** post-eligibility ranking (`holy-grail-candidate-ranking.ts`) does not use the legacy engine.

### 2. Responsibility of each layer

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **1. LLM extraction / interpretation** | `src/extraction/*` | Turn profile text (and future inputs) into **structured, versioned** artifacts (`ExtractionV2Result`, JSON columns, tags). Probabilistic; prompt- and model-dependent. |
| **2. Canonical mapping** | `profile-to-canonical.mapper.ts` (+ types) | **Deterministic** projection from persisted LLM output + metadata → `MatchingCanonicalModel` (Step 4). No scores; field-level rules only. |
| **3. Enum-based evaluator** | `eligibility.evaluator.ts` | **Deterministic** directional evaluation: merge stored prefs + overrides → **`SKIPPED`** if no effective preference; else **`PASS`** / **`FAIL`** / **`SOFT_PASS`** per Step 3 + [locked SOFT_PASS rules](#locked-layer-3-policy-implementation-aligned) (conceptual doc: `MATCH` / `NO_MATCH` / `UNKNOWN` / `NOT_ENFORCEABLE`; see [Mapping vs search](#mapping-vs-search-behavior-stored-preferences-vs-searchoverrides)). |
| **4. Decision / output** | `decision/*`, `build-eligibility-audit.ts` | **Deterministic** aggregation: pair decision (`MUTUAL_MATCH` / `NO_MATCH` / `INDETERMINATE`), audit payloads for logging and debug UI. |
| **Post-filter ordering (optional)** | `holy-grail-candidate-ranking.ts` | After hard eligibility, **rank survivors only**; does not change PASS/FAIL. Uses `MatchingCanonicalModel.rankingSignals`, which is populated from **self `ProfileSignalSnapshot` DB columns only** — **not** from `ProfileEvaluationRaw` or persisted enrichment JSON at runtime (see [HG ranking signals (DB-only at runtime)](#hg-ranking-signals-db-only-at-runtime)). |

### 3. Boundaries: LLM vs deterministic code

| Boundary | Rule |
|----------|------|
| **LLM → mapper** | Only **serialized** outputs and DB fields cross into Layer 2. The mapper **never** calls `LLMRouterService` or prompts. |
| **Mapper → evaluator** | Only **`MatchingCanonicalModel`** crosses. Evaluator **never** reads raw `aboutMe` or free-form extraction blobs. |
| **Evaluator → decision** | Only **`MatchingDimensionResult` maps** (and ids) cross. No floats, no weights. |
| **Deterministic → legacy** | New packages **do not** write `CompareResultDto`, dealbreakers, or scores. Legacy code **does not** import holy-grail-matching until a dedicated integration task. |

### 4. Execution order

**Pipeline (current):**

1. **LLM (existing)** — Run extraction; persist `ProfileExtractionV2` / JSON as today.  
2. **Load** — Read rows + extraction DTOs (caller).  
3. **Map (Layer 2)** — `mapProfileSourceToMatchingCanonical` → `MatchingCanonicalModel` per user.  
4. **Merge overrides** — Apply `searchOverrides` onto preferences (inside evaluator).  
5. **Evaluate (Layer 3)** — `evaluateHolyGrailDirectional` for A→B and B→A ([locked policy](#locked-layer-3-policy-implementation-aligned)).  
6. **Decide / audit (Layer 4)** — `buildHolyGrailPairDecisionV1`; optional `buildHolyGrailEligibilityAuditV1` per direction.  
7. **Optional** — `rankHolyGrailCandidatesAfterHardFilter` (ordering only; after mutual PASS pool).

**Next steps:** see [Roadmap](#roadmap--actual-execution-order-next-work) (audits / persistence), not greenfield evaluator work.

### 5. Boundary: old engine vs new engine

| Concern | Old engine (unchanged) | New path (HOLY_GRAIL_MATCHING) |
|---------|-------------------------|--------------------------------|
| **Location** | `src/matches/*`, compatibility scoring | `src/holy-grail-matching/*` + `src/canonical/matching-canonical.types.ts` |
| **Role** | Product scores, dealbreakers, recommendations, ranking | Enum dimension outcomes, pair decision, audit |
| **Imports** | Unchanged | No **legacy** `match-engine` / dealbreakers / legacy ranking imports |

**Rule of thumb:** If it computes `finalScore` or applies dealbreaker **engine** rules from the legacy stack, it is **out of bounds** for holy-grail-matching.

---

**Prisma:** unchanged by this architecture note. **`matching-canonical.types.ts`:** shape tweaks (e.g. sparse prefs) do not imply DB migration; new deterministic code lives under `holy-grail-matching/` and existing extraction services.
