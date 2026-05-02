# Baseline Lock Report — HG-Ready Data Layer

**Date**: 2026-05-02  
**Scope**: VERIFY_AND_LOCK_HG_READY_BASELINE  
**Reference**: Field migration / HG-ready model as documented in the consolidated plan (`field_migration_to_hg_ready_state` — deliverable name `FIELD_MIGRATION_PLAN.md` was specified; this report locks the **same** SoT contracts). Supporting waves: `RELIGION_VERIFICATION_WAVE_REPORT.md`, `USER_INPUT_FIELDS_WAVE_REPORT.md`.

**Rules respected**: No schema changes, no new tables, no refactors, no backfill runs.

---

## 1. Executive conclusion

The codebase **matches the documented HG-ready architecture** for the scoped paths, with **two explicit, documented exceptions** that must remain in the baseline until a future cutover phase:

1. **Partner genders (HG prefs)**: When `UserProfilePreference` is **missing**, `acceptedPartnerGenders` is read from **`UserProfile.desiredPartnerGenders` JSON** (legacy bridge). All other partner preference scalars/arrays on the active `/me/matches` path are taken from `UserProfilePreference` only when that row is present and non-empty per mapper rules.

2. **Legacy / alternate codepaths** outside the active `me-profile` + `/me/matches` assembly (e.g. `profiles-prisma.service.ts` HG ranking composition) are **not** part of this lock; they do not contradict the **new-model** contracts below.

---

## 2. Source-of-truth mapping (locked)

| Area | Source of truth | Denormalized / cache | Notes |
|------|-----------------|----------------------|--------|
| **Semantic engine scoring** (`ProfileJsonPayload.evaluation`) | `UserProfileEvaluation.evaluationJson` | `UserProfile.interestsTop`, `UserProfile.sig*` (write-only cache) | Engine mapper explicitly does **not** read denorm columns. |
| **HG self facts** (`holyGrailStructuredFacts`) | `UserProfile` columns: `childrenStatus`, `wantsChildren`, `smokingFrequency`, `alcoholUse`, `education`, `religion` (+ `gender`, `birthDate` for facts assembly) | None | Facts built only from profile slice in `buildChildrenUnsureRowFromNewModel`. |
| **HG partner prefs** (structured prefs) | **`UserProfilePreference`** when row exists and not “empty” per mapper | **Exception**: `acceptedPartnerGenders` from **`UserProfile.desiredPartnerGenders`** when preference row is **absent** | See §5.2. |
| **User-input HG facts** | Same as HG self facts columns | N/A | Written only via profile API (`MeProfileService`), not analysis. |

---

## 3. Verification: analysis service does not write user-input HG facts

### Method

- `rg` on [`me-profile-analysis.service.ts`](dating-api/src/me-profile/me-profile-analysis.service.ts) for: `religion`, `childrenStatus`, `wantsChildren`, `smokingFrequency`, `alcoholUse`, `education`  
- **Result**: **No matches** for those identifiers.

### Success-path `userProfile.update` (analysis)

In [`me-profile-analysis.service.ts`](dating-api/src/me-profile/me-profile-analysis.service.ts) (approx. lines 369–377), the transaction updates:

- `status`, `analyzedAt`, `lastAnalysisError`
- `...dbFirstColumns` from `mapDbFirstColumnsFromEvaluation(result)` — **only** `interestsTop` and `sig*`

No HG structured fact columns are included.

### Interim `ANALYZING` update

- Updates **only** `status` to `ANALYZING` (same file, approx. lines 338–341).

### Failure-path update

- Sets `status` + `lastAnalysisError` only (approx. lines 402–408).

**Lock**: **Confirmed** — analysis does **not** write religion / children / lifestyle / education fields.

---

## 4. Verification: engine reads evaluation signals only from `evaluationJson`

### Method

- Read [`me-profile-engine.mapper.ts`](dating-api/src/me-profile/me-profile-engine.mapper.ts) `buildProfilePayloadFromNewModel` and module header.
- Read [`me-profile-engine.mapper.spec.ts`](dating-api/src/me-profile/me-profile-engine.mapper.spec.ts) contract test.

### Evidence

- `buildProfilePayloadFromNewModel` sets `evaluation: evaluation.evaluationJson as unknown as EvaluateBatchResult` — **sole** engine payload for signals/interests (lines 97–112).
- Module documentation states `UserProfile.interestsTop` and `UserProfile.sig*` are **intentionally unused** in this layer (lines 12–15).
- Test: *“feeds compareWithStatus from UserProfileEvaluation.evaluationJson only (no UserProfile interestsTop/sig* dependency)”* (spec approx. lines 94–118).

**Lock**: **Confirmed** for the **new-model** engine path (`/me/matches` read model → `ProfileJsonPayload`).

---

## 5. Verification: HG facts read only from `UserProfile` columns (mapper input)

### Method

- Read [`me-profile-engine.mapper.ts`](dating-api/src/me-profile/me-profile-engine.mapper.ts) `buildChildrenUnsureRowFromNewModel` (approx. lines 181–206).

### Evidence

Facts object is populated **only** from `profile` (`ProfileHgSource`):

- `childrenStatus`, `wantsChildren`, `smokingFrequency` → `facts.smoking`, `alcoholUse`, `education`, `religion`
- Plus `gender` / `birthDate` as required for HG facts assembly.

**No read** of `evaluationJson` for these self-fact fields in this function.

**Lock**: **Confirmed** — HG self facts on the active mapper path come **only** from the `UserProfile` slice passed in (not from evaluation blob).

---

## 6. Verification: partner preferences and the gender legacy bridge

### Method

- Read [`me-profile-engine.mapper.ts`](dating-api/src/me-profile/me-profile-engine.mapper.ts) `buildChildrenUnsureRowFromNewModel` (approx. lines 184–252).
- Cross-check [`me-matches.service.ts`](dating-api/src/me-profile/me-matches.service.ts) comments (partner genders read path).

### 6.1 When `UserProfilePreference` row exists and is not “empty”

`useNormalizedPrefs` is true when `normPref !== null && !isPrefRowEmpty(normPref)`.

Then partner prefs **including** `acceptedPartnerSmoking`, `acceptedPartnerAlcohol`, `acceptedPartnerReligions`, age/distance/education/partner children/similarity are read from **`normPref`** (lines 226–252).

### 6.2 Exception — `acceptedPartnerGenders` without preference row

If `normPref === null`:

- `acceptedPartnerGenders` in prefs may be populated from **`parseAcceptedPartnerGendersFromProductJson(profile.desiredPartnerGenders)`** (lines 216–223).

This is the **documented legacy bridge** (see mapper comments lines 210–211, 69–70).

### 6.3 Strict “ONLY `UserProfilePreference`” wording

**Not fully true** for **partner genders** until every profile has a `UserProfilePreference` row and product JSON is retired. For **other** partner pref fields on the new path, when the preference row is missing or empty, the mapper **does not** re-read dropped `UserProfile` scalar columns — it omits those prefs (lenient behavior).

**Lock**: **Baseline = documented dual path for genders only**; all other prefs follow `UserProfilePreference` when the row is present and non-empty.

---

## 7. Alignment with “FIELD_MIGRATION_PLAN” SoT table

The locked SoT table in §2 matches the intended migration plan:

- Evaluation-derived interests/signals: **`UserProfileEvaluation.evaluationJson`** is semantic SoT for engine; denorm + normalized tables are secondary stores for parity/search/future reads.
- User-input HG facts: **`UserProfile`** columns are SoT.
- Partner prefs: **`UserProfilePreference`** is SoT **with** the **gender JSON fallback** documented above.

No contradictions found between code and that model, **provided** the gender fallback is treated as part of the locked contract until removed in a later phase.

---

## 8. Risks and non-goals (explicit)

| Item | Risk / note |
|------|-------------|
| Gender fallback | Operational profiles without `UserProfilePreference` still depend on `desiredPartnerGenders` JSON for HG genders. |
| DB enum typing | HG facts columns are `String?`; correctness relies on API DTO validation — acceptable per prior waves. |
| Other services | Legacy profile pipelines may still mention interests/signals in other contexts; they are **out of scope** for this lock. |

**Non-goals (this report)**: No engine integration, no eligibility/scoring logic changes, no schema migrations.

---

## 9. Suggested regression checks (optional, not run as part of this lock)

```bash
npm run build
npm test
npx ts-node --project tsconfig.json scripts/validate-signal-interest-drift.ts
npx ts-node --project tsconfig.json scripts/validate-user-input-fields.ts
npx ts-node --project tsconfig.json scripts/validate-religion-consistency.ts
```

---

## 10. Final lock statement

**Locked baseline**: The **active** `/me/matches` + `me-profile-engine.mapper` architecture matches the documented HG-ready contracts:

1. **Analysis** writes **only** analysis state + `interestsTop`/`sig*` denorm cache + evaluation + normalized signal/interest rows — **never** user-input HG facts.  
2. **Engine** consumes signals/interests **only** via **`evaluationJson`** embedded in `ProfileJsonPayload`.  
3. **HG self facts** are assembled **only** from **`UserProfile`** columns on the mapper input.  
4. **Partner prefs** are read from **`UserProfilePreference`** when the row is present and non-empty, with a **documented** **`UserProfile.desiredPartnerGenders` JSON fallback** for **genders** when the preference row is missing.

**System matches documented architecture** with the **gender fallback** called out as an intentional, code-backed exception — not drift.

---

_End of report._
