# Match Engine V1 — Runtime Contract

This document defines the **product V1** match pipeline for scored matches. It is descriptive of the code as implemented; scoring weights and DB schema are out of scope.

---

## 1. Active routes

| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/api/v1/me/matches` | `MeProfileController` → `MeMatchesService.list` |
| `GET` | `/api/v1/me/matches/:id` | `MeProfileController` → `MeMatchesService.getById` |

Related (not the scored engine contract): primary photo file for a match candidate may be exposed under a path derived in `MeMatchesService` (photo helper).

---

## 2. Active service / function chain

1. **`MeMatchesService`** (`src/me-profile/me-matches.service.ts`)  
   - Resolves viewer by session `userId`.  
   - Loads `UserProfile` (+ `UserProfilePreference`, `UserProfileSignal`, `UserProfileInterest` where included in query).  
   - Loads **latest** `UserProfileEvaluation` per profile via `latestEvaluationForProfile` / `latestEvaluationsForProfileIds` (`src/me-profile/me-profile-analysis.service.ts`).

2. **`buildMeMatchesParticipantReadModel`** (`src/me-profile/me-profile-engine.mapper.ts`)  
   - **Sole** assembler of match-engine payload + HG row for this path (`MeMatchesService` must not import `buildProfilePayloadFromNewModel` or `buildChildrenUnsureRowFromNewModel` directly — enforced by `me-matches-read-model-policy.spec.ts`).

3. **`buildProductProfileMatchingBridge`** + **`reciprocalProductGenderEligibility`** (`src/me-profile/user-profile-matching-bridge.contract.ts`)  
   - Gender / bridge fields for filtering and display.

4. **`evaluateHolyGrailPairDirections`** (`src/matches/holy-grail-pair-directions.ts`)  
   - HG Layer-3 hard eligibility; pair may be excluded (list) or 404 (detail).

5. **`compareWithStatus`** (`src/matches/match-engine.ts`)  
   - Produces `matchScore`, `explainability`, `recommendation`, or a guard result object.

6. **`buildMatchExplanationTraits`** (`src/matches/match-explanation-traits.ts`)  
   - **Detail route only**: derived from `explainability.positiveChips` + `finalScore` when compare succeeded.

---

## 3. V1 input contract (per participant)

### `UserProfile` (slice loaded by `MeMatchesService`)

Engine text + identity + HG facts + photos + evaluation count — see `candidateSelect` and viewer `include` in `me-matches.service.ts` (e.g. `id`, `name`, `status`, `birthDate`, `gender`, `desiredPartnerGenders`, location fields, `aboutMe` / `aboutPartner` / `aboutRelationship`, `analyzedAt`, `updatedAt`, children-related columns, `photos`, `_count.evaluations`).

**Explicitly not read for engine input:** `UserProfile.interestsTop`, `sig*` cache columns (write-only denormalized cache).

### `UserProfilePreference`

Partner genders and HG preference scalars/arrays when row exists; otherwise legacy JSON on `UserProfile.desiredPartnerGenders` for genders only (mapper behavior).

### Latest `UserProfileEvaluation`

- Resolved by **`latestEvaluationForProfile`** (`ORDER BY createdAt DESC`, `take: 1`).  
- Fields used in V1: `evaluationJson`, `createdAt`, **`version`** (batch type `LatestEvaluationForMatchPick` includes `version`).

### Normalized tables (conditional)

- **`UserProfileSignal`**: `signalKey`, `signalValue`, `evalVersion`.  
- **`UserProfileInterest`**: `tag`, `rank`, `evalVersion`.  
- Selected with profile rows; **merge** applies only under **source mode B** below.

---

## 4. Source modes (engine payload)

### A — `evaluationJson` only (default)

- **`ENGINE_READ_NORMALIZED`** unset or not `'1'` → normalized rows are not merged; engine sees latest evaluation blob only.  
- Or flag on but **no** normalized rows / **all-or-nothing version mismatch** → blob only (`assembleEvaluationPayload` returns base).

### B — Normalized merge

- **`process.env.ENGINE_READ_NORMALIZED === '1'`** and **every** loaded `UserProfileSignal` / `UserProfileInterest` row has **`evalVersion ===`** latest evaluation’s **`version`**.  
- Then `assembleEvaluationPayload` overlays normalized self-signals and top interests onto the blob (`me-profile-engine.mapper.ts`).  
- If **any** row mismatches → **entire** normalized merge skipped for that participant (blob only).

---

## 5. V1 output contract

### `GET /api/v1/me/matches` — `MeMatchesListResponseDto` / `MeMatchItemDto`

**List items must not include detail-only fields:** no `evaluationSummary`, no `matchExplanationTraits`.

Each match row includes: `id`, `gender`, `ageYears`, `locationLabel`, `analyzedAt`, `hasEvaluation`, `matchScore`, `profileAnalysisStale` (optional), `primaryPhotoUrl`, `approvedPhotoCount`, `explainability`, `recommendation`.

Ready payload may include `viewerProfileId`, `viewerGender`, `viewerAcceptedPartnerGenders`, `viewerProfileAnalysisStale` (optional; true when `UserProfile.updatedAt` is after the viewer’s latest evaluation `createdAt`), `totalCandidatesBeforeFilter`, `matches`. Detail route does **not** include `viewerProfileAnalysisStale`.

### `GET /api/v1/me/matches/:id` — `MeMatchDetailDto`

Includes **evaluationSummary** (from read model display summary), same scoring fields as list, and **`matchExplanationTraits` only when** compare succeeded and trait builder returned a non-empty array (otherwise property omitted).

---

## 6. Active guards

| Guard | Behavior (summary) |
|-------|---------------------|
| **Viewer profile missing** | List: `not_ready` / `no_profile`. |
| **Viewer not `ANALYZED`** | List: `not_ready` / `not_analyzed`. |
| **Missing latest evaluation** (viewer or analyzed candidate) | `InternalServerErrorException` (list) or not applicable where candidate skipped. |
| **Reciprocal gender eligibility** | Candidate omitted from list; detail `404` if ineligible. |
| **HG hard eligibility** | Both directions `FAIL` → omit list row; detail `404`. |
| **`compareWithStatus` guard** (`'status' in result`) | `matchScore` null; no explainability/recommendation from engine; no `matchExplanationTraits` on detail. |
| **Normalized `evalVersion` vs `evaluation.version`** | All-or-nothing: mismatch → blob-only merge for that participant (`assembleEvaluationPayload`). |

---

## 7. Explicit non-sources (must not drive V1 engine)

- **`MatchmakingProfile`** and legacy matchmaking tables.  
- **Legacy `ProfilesPrismaService` match / analyze paths** (not used by `MeMatchesService`).  
- **`UserProfile.interestsTop` / `sig*`** — not selected for V1 match reads; not passed into `buildMeMatchesParticipantReadModel`.  
- **`GET /api/v1/me/profile/matches`** (`MeProfileMatchesService`) — candidate-only listing **without** `compareWithStatus` / scored DTO shape; not the V1 scored engine contract.

---

## 8. Known limitation

**`evalVersion`** on normalized rows is a **pipeline version tag** aligned with `UserProfileEvaluation.version`, **not** a foreign key to a specific evaluation row. Same version string on a newer evaluation and stale normalized rows could theoretically align without row-level proof; operations rely on transactional writes from analysis plus this guard.

---

## 9. Contract tests (code)

- `src/me-profile/me-matches-read-model-policy.spec.ts` — static guard on `MeMatchesService` imports.  
- `src/me-profile/me-matches.v1-contract.spec.ts` — V1 list vs detail field presence + policy duplicate / doc path check.

---

## 10. References

| Topic | File |
|-------|------|
| Service | `src/me-profile/me-matches.service.ts` |
| Read model | `src/me-profile/me-profile-engine.mapper.ts` |
| Latest eval | `src/me-profile/me-profile-analysis.service.ts` |
| Engine | `src/matches/match-engine.ts` |
| Traits | `src/matches/match-explanation-traits.ts` |
| Operator audit (CLI, read-only) | `scripts/match-quality-audit.ts`, `src/me-profile/match-quality-audit.ts`, `docs/match-quality-audit-manual-review.md` |
