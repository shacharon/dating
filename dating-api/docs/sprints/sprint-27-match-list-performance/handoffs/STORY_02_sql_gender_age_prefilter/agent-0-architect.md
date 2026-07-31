# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_sql_gender_age_prefilter.md](../../STORY_02_sql_gender_age_prefilter.md)  
**Sprint:** sprint-27-match-list-performance  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Greenfield — today `matchCandidatePhotoEligibleWhere` is photo + base only; gender/age run after hydrate. Skip Agent 4 (unit + existing eligibility e2e sufficient; no HTTP contract change).

---

## Summary

- Push **viewer → candidate** hard filters into the list-rebuild `findMany` `where`: partner-gender allowlist + age→`birthDate` window.
- Keep **reciprocal** product gender, **reciprocal** HG age, full Layer-3, and `compareWithStatus` **in memory** (dual-run gender check stays).
- Mirror open-pool behavior when prefs are empty/missing — **do not over-filter**.
- Prefer a **pure helper** for where fragments + UTC birthDate bounds (unit-testable without Nest).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-matches.service.ts` | Extend list `findMany` where with viewer gender/age clauses; short comment on reciprocal-in-memory |
| New pure helper (preferred): e.g. `me-matches-candidate-sql-prefilter.ts` (+ `.spec.ts`) | Build Prisma `where` fragments + birthDate bounds from viewer prefs / `asOf` |
| `me-matches.service.spec.ts` | Assert `findMany` `where` includes gender/age when prefs set; open prefs omit clauses |
| Prisma / API DTOs | **No change** — use existing `@@index([status, gender, birthDate])` |

---

## Decisions (do not reverse without discussion)

### 1. What goes in SQL this story (locked)

Apply **only** on `buildFullRankedList` → `userProfile.findMany` (photo-eligible path).

| Filter | When | Prisma shape (conceptual) |
|--------|------|---------------------------|
| Viewer → cand **gender** | Viewer product allowlist **non-empty** | `gender: { in: allowlistAsProfileGender }` |
| Viewer → cand **age** | Viewer has usable age prefs (below) | `birthDate: { not: null, gte?, lte? }` |

**Gender source (viewer only):** same product allowlist already on `viewerBridge.acceptedPartnerGenders` after `buildProductProfileMatchingBridge` + `partnerGenderSourceForMeMatchesRow`:

- Preference row **present** → `UserProfilePreference.acceptedPartnerGenders` (even if `[]` = open; **do not** fall back to `desiredPartnerGenders`).
- Preference row **absent** → parsed `UserProfile.desiredPartnerGenders` JSON (legacy).
- Empty / null allowlist → **omit** gender clause (broad pool — matches `candidateMeetsViewerProductPartnerGenders`).

`AcceptedPartnerGender` values map 1:1 onto `ProfileGender` for the `in` list (`MALE|FEMALE|NON_BINARY|OTHER`). `PREFER_NOT_TO_SAY` is never in the allowlist → excluded by `in` (parity with product gate).

**Age prefs (viewer only):** apply SQL age **only when** HG would apply age prefs for the viewer:

- Preference row exists **and** not empty (`isPrefRowEmpty` semantics: any of age min/max, `maxDistanceKm`, or non-empty genders), **and**
- `partnerAgeMin` and/or `partnerAgeMax` is non-null.

If no preference row, or empty row, or neither min nor max set → **omit** age clause (matches HG `AGE_PREF_ABSENT` / no age in prefs).

When age SQL applies: also require `birthDate: { not: null }` (HG `PARTNER_DOB_MISSING` → UNKNOWN → FAIL on match list).

### 2. BirthDate window math (locked — UTC parity with HG)

SOT: `ageWholeYearsUtcFromYmd` in `holy-grail-dob-ymd.ts` (UTC Y-M-D only).

Let `asOf` be the same rebuild clock used in `buildFullRankedList`. Work in UTC calendar dates (store/compare as `Date` at UTC midnight if needed).

- **`partnerAgeMin = min`** → need `age >= min`  
  → `birthDate` **≤** `addUtcCalendarYears(asOfDate, -min)`  
  Example: asOf `2026-08-01`, min `25` → `lte` `2001-08-01`.

- **`partnerAgeMax = max`** → need `age ≤ max`  
  → `birthDate` **≥** `addUtcCalendarYears(asOfDate, -(max + 1)) + 1 calendar day`  
  Example: asOf `2026-08-01`, max `40` → `gte` `1985-08-02`.

Implement `addUtcCalendarYears` (or equivalent) next to DOB helpers **or** in the new prefilter module; **unit-test** bounds against `ageWholeYearsUtcFromYmd` for edge birthdays (day before / on / after).

**Forbidden:** “365.25 days” approximations or local-timezone `getFullYear`/`getMonth`.

### 3. What stays in memory (locked)

| Concern | Why |
|---------|-----|
| **Reciprocal** product gender (`reciprocalProductGenderEligibility`) | Cand prefs may be empty array vs missing row vs legacy JSON — expensive/error-prone in Prisma this sprint |
| Reciprocal HG age (cand prefs vs **viewer** DOB) | Per-candidate preference join |
| Full HG Layer 3 (dealbreakers, UNKNOWN policy, both directions) | Correctness |
| `compareWithStatus` | Ranking only |
| Existing LIKE / mutual hardBlocked paths | Unchanged |

**Dual-run:** keep calling `reciprocalProductGenderEligibility` after hydrate. Comment near the SQL where builder:

> Viewer→cand gender/age may be SQL-prefiltered; reciprocal gender still evaluated in memory.

Do **not** delete the in-memory reciprocal check this story.

### 4. Where API surface (locked)

- Extend list rebuild where via helper used by `matchCandidatePhotoEligibleWhere` **or** a sibling private method that merges photo-eligible base + optional gender/age fragments.
- Signature must receive **viewer context** already known in `buildFullRankedList` (allowlist + age min/max + `asOf`) — not only `viewerUserId`.
- **`matchCandidateBaseWhere` / `count`:** leave unchanged (telemetry `filteredNoPhotoCandidates` semantics stay photo-delta vs base ANALYZED pool). Do **not** push gender/age into the count where this story.

### 5. Empty / open prefs (locked)

| Viewer state | SQL gender | SQL age |
|--------------|------------|---------|
| No pref row, empty/null legacy genders | omit | omit |
| Pref row with `acceptedPartnerGenders: []` and no ages | omit | omit |
| Pref row with genders only | `gender in …` | omit |
| Pref row with ages only (non-empty row) | omit | birthDate bounds |
| Pref row with genders + ages | both | both |

Outcome of list membership for cases that pass SQL but fail reciprocal / HG must remain identical to today.

### 6. Tests (Agent 1)

- Pure helper unit tests: empty prefs → `{}` fragments; gender-only; age min-only; age max-only; both; birthday edge cases vs `ageWholeYearsUtcFromYmd`.
- `me-matches.service.spec.ts`: when viewer has explicit genders / ages, `findMany` called with matching `where.gender` / `where.birthDate`; when open prefs, those keys absent.
- Existing gender exclusion / reciprocal / eligibility e2e scenarios must still pass (harness `findMany` may need to honor gender/age in `where` if it currently ignores them — fix harness if tests break).

### 7. Agent 4

- **Skip.**

---

## Out of scope

- Story 03 slim select / Story 04 pool cap / Story 05 metrics  
- SQL reciprocal gender or cand→viewer age  
- Removing in-memory reciprocal gender check  
- Changing `getById` / non-list paths (optional reuse of helper later — **not required**)  
- Distance / geo prefilter  

---

## Agent 1 instructions

1. Add pure helper(s) for gender `in` clause + UTC birthDate bounds; wire into list `findMany` where in `buildFullRankedList`.
2. Keep reciprocal product gender + HG Layer 3 as today; add the dual-run comment.
3. Specs per §6; run me-matches + analysis-related specs as needed; `npm run build`.
4. Commit with story message; write `agent-1-dev.md`.

Suggested commit message:

```
perf(matches): prefilter match candidates by gender and age in SQL

Apply viewer partner-gender and age/DOB bounds in the candidate
WHERE before hydrating signals/text for match-list rebuild.

Sprint 27 Story 2
```

---

## Agent 2 instructions

- [ ] SQL only viewer→cand gender + age; reciprocal still in memory
- [ ] Empty/open prefs omit clauses (no over-filter)
- [ ] BirthDate math UTC-parity with `ageWholeYearsUtcFromYmd`
- [ ] Count / base where unchanged
- [ ] Index-friendly `(status, gender, birthDate)` usage; no migration
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README.
- Write `agent-3-pm.md`.

---

## Open risks

1. Eligibility harness `findMany` may ignore new `where` fields — update if e2e regresses.  
2. `birthDate` `DateTime` time-of-day: prefer UTC date-only bounds consistent with `toISOString().slice(0, 10)` fact path.  
3. Slight product vs HG gender source divergence on **candidates** remains in-memory only — SQL uses **viewer product** allowlist only.
