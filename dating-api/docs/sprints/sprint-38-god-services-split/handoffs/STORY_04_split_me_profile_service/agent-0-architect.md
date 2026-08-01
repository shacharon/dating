# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_split_me_profile_service.md](../../STORY_04_split_me_profile_service.md)  
**Sprint:** sprint-38-god-services-split  
**Date:** 2026-08-02  
**Status:** complete  

**Mode:** Extract-then-delegate refactor. **Zero** HTTP/DTO/status-code change. **No** moderation threshold / photo driver / onboarding machine changes. **No** feature flag. Skip Agent 4.

**Parallelism:** May run after Story 02 Done. Independent of Story 03 (do **not** wait on MeMatches split; do **not** commit Story 03 orphan partials with this story).

---

## Summary

Split `me-profile.service.ts` (~1150 LOC) into collaborators under `src/me-profile/profile/`, with `MeProfileService` remaining the **only** Nest type injected by `MeProfileController` and `ProfileQualityService`. Prefer move + thin wrappers. Preserve moderation gates, preference dual-write, photo moderation enqueue, analysis submit enqueue, and match-list invalidate/rebuild side effects.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Public Nest API | Controller + `ProfileQualityService` inject **`MeProfileService` only** |
| Status machine | Submit only from `DRAFT` / `ANALYZED` / `FAILED` → `SUBMITTED`; then queue |
| Onboarding | `assertOnboardingStepCoherent` + `applyOnboardingCompletionToWriteData` unchanged |
| Preference dual-write | `upsertPreference` inside create/patch txn; `desiredPartnerGenders` → `acceptedPartnerGenders` |
| Rank queue | `MATCH_LIST_RANK_QUEUE_PORT.enqueueRebuild(..., 'preferences_changed')` on create + pref-changing patch |
| Submit side effects | `meMatches.invalidateMatchListCache` then `analysisQueue.enqueueOrRunInline` |
| Photo path | Limits/MIME/auto-approve/`photoModerationQueue.enqueueOrRunInline` unchanged |
| Existing sibling | **`MeProfileAnalysisService`** = worker-side analysis runner — **do not merge or rename**. Submit/status live elsewhere |

---

## Artifacts (locked layout)

```text
dating-api/src/me-profile/
  me-profile.service.ts                 # Thin facade (controller-facing)
  profile/
    me-profile-submit.dto.ts            # MeProfileSubmitResponseDto only (or re-export from facade)
    profile-write.helpers.ts            # Pure: toResponse, toPrismaWritableData, onboarding, nickname normalize, preference field extract
    profile-photo.constants.ts          # PHOTO_MAX_COUNT, PHOTO_MAX_BYTES, ALLOWED_PHOTO_MIME_TYPES, UploadedPhotoFile type
    profile-moderation.service.ts
    profile-preference.service.ts
    profile-crud.service.ts
    profile-photo.service.ts
    profile-analysis-submit.service.ts  # submit + analysis status + latest evaluation read
  me-profile.module.ts                  # register new providers
```

Do **not** create `FEATURE_SPLIT_PROFILE_SERVICE`.  
Do **not** invent a second `MeProfileAnalysisService`.

HTTP DTOs stay in existing `me-profile.dto.ts` / `dto/*` (unchanged shapes).

---

## Decisions (do not reverse without discussion)

### 1. LOC caps (locked)

| File | Max LOC (approx) |
|------|------------------|
| `me-profile.service.ts` (facade) | **≤ 250** |
| `profile-crud.service.ts` | **≤ 450** |
| `profile-photo.service.ts` | **≤ 400** |
| `profile-analysis-submit.service.ts` | **≤ 350** |
| `profile-moderation.service.ts` | **≤ 250** |
| `profile-preference.service.ts` | **≤ 150** |
| Pure helpers / constants | no Nest; keep lean |

Former god file ~1150 → facade ≤ 250 satisfies “slimmed under Architect LOC cap.”

### 2. Ownership map (locked)

#### `profile-write.helpers.ts` (pure, exported)

| Symbol | Notes |
|--------|--------|
| `normalizeNicknameValue` | |
| `parseDesiredPartnerGenders` | |
| `acceptedPartnerGendersFromDesiredJson` | |
| `mergedTextForOnboarding` / `mergedDesiredPartnerGendersForOnboarding` / `isNonEmptyTrimmedText` | |
| `assertOnboardingStepCoherent` | Keep observability-marked exceptions identical |
| `applyOnboardingCompletionToWriteData` | |
| `toResponse` | Dealbreaker inference + preference age/distance fields |
| `toPreferenceData` | |
| `toPrismaWritableData` | |
| `SUBMITTABLE_STATUSES` | Used by analysis-submit |

#### `profile-photo.constants.ts`

- `PHOTO_MAX_COUNT`, `PHOTO_MAX_BYTES`, `ALLOWED_PHOTO_MIME_TYPES`, `UploadedPhotoFile`

#### `ProfileModerationService`

- `assertProfileEditAllowed`
- `moderateProfileTextFields`  
Deps: `OpenAIModerationClient`, `ContentViolationService`, `obs`

#### `ProfilePreferenceService`

- `upsertPreference(tx, profileId, body)` (same dual-write semantics)  
Deps: none beyond using passed `tx` (Injectable for Nest cleanliness; no Prisma on ctor required if only uses `tx` — still `@Injectable()`)

#### `ProfileCrudService`

- `requireProfileForUser` (**public** — Photo may call)
- `assertNicknameAvailable`
- `getForUser`
- `createForUser`
- `patchForUser`  
Calls: Moderation (when flag on), Preference upsert in txn, `toResponse` / write helpers, `MATCH_LIST_RANK_QUEUE_PORT` enqueue on create + pref-changing patch  
Deps: prisma, obs, moderation svc, preference svc, match-list rank queue port

#### `ProfilePhotoService`

- `listPhotosForUser`, `uploadPhotoForUser`, `deletePhotoForUser`, `setPrimaryPhotoForUser`, `getPhotoFileForUser`
- Private `toPhotoDto`  
Deps: prisma, obs, `PHOTO_STORAGE`, analytics, `PhotoModerationQueueService`; uses `ProfileCrudService.requireProfileForUser` (or inject Crud)

Avoid Crud↔Photo cycles: **Photo injects Crud** for `requireProfileForUser` only; Crud must **not** inject Photo.

#### `ProfileAnalysisSubmitService`

- `submitForUser` (status guards, gender + approved-photo gates, invalidate match cache, enqueue analysis)
- `getAnalysisStatusForUser`
- `getLatestAnalysisForUser`  
Deps: prisma, obs, analytics, `MeMatchesService` (invalidate only), `ProfileAnalysisQueueService`, write helpers for `toResponse`  
**Not** the LLM runner (`MeProfileAnalysisService`).

#### `MeProfileService` (facade)

Public method **signatures unchanged** (controller contract):

| Method | Delegates to |
|--------|----------------|
| `getForUser` | Crud |
| `createForUser` | Crud |
| `patchForUser` | Crud |
| `listPhotosForUser` / `uploadPhotoForUser` / `deletePhotoForUser` / `setPrimaryPhotoForUser` / `getPhotoFileForUser` | Photo |
| `submitForUser` | AnalysisSubmit |
| `getAnalysisStatusForUser` | AnalysisSubmit |
| `getLatestAnalysisForUser` | AnalysisSubmit |

Constructor: inject the four collaborators (Crud, Photo, AnalysisSubmit) — Moderation/Preference are internal to Crud (not required on facade).

Re-export `MeProfileSubmitResponseDto` from facade or `profile/me-profile-submit.dto.ts` so existing imports keep working.

### 3. Nest wiring (locked)

`MeProfileModule` providers **add** (do **not** export collaborators unless a test module needs them):

```ts
ProfileModerationService,
ProfilePreferenceService,
ProfileCrudService,
ProfilePhotoService,
ProfileAnalysisSubmitService,
MeProfileService, // still the exported controller/quality dependency
```

Exports stay: `MeMatchesService`, `MATCH_LIST_RANK_REBUILD_PORT`, `MeConversationsService`, `MeProfileAnalysisService` — **unchanged**. Do not export the new profile collaborators by default.

### 4. Side-effect matrix (locked — must preserve)

| Action | Side effects |
|--------|----------------|
| `createForUser` success | `matchListRankQueue.enqueueRebuild(userId, 'preferences_changed')` |
| `patchForUser` when pref delta non-empty | same enqueue |
| `submitForUser` after DB SUBMITTED | `meMatches.invalidateMatchListCache` → `analysisQueue.enqueueOrRunInline` |
| `uploadPhotoForUser` PENDING + ml driver | `photoModerationQueue.enqueueOrRunInline` (+ analytics pending event as today) |
| Moderation flag on | edit-blocked check + text moderation before create/patch writes |

### 5. Testing strategy (locked)

1. Add `me-profile.test-harness.ts` → `createMeProfileServiceForTest(deps)` wiring real collaborators from the same mocks as today’s 10-arg ctor.
2. Update `me-profile.service.spec.ts` factory to use harness.
3. HTTP integration (`me-profile-http.integration.spec.ts`) should stay green via Nest module providers (no controller change).
4. Required commands:

```bash
cd dating-api
npx jest src/me-profile/me-profile.service.spec.ts src/me-profile/me-profile-http.integration.spec.ts --runInBand
npm run typecheck
```

Optional: photo/moderation-focused unit specs if extract makes isolation easy (not required for AC).

### 6. Migration style (locked)

1. Create `profile/` files; move code; facade delegates.
2. No parallel old/new implementations; no feature flag.
3. Do not change DTO JSON, status codes, or exception `error` string keys.
4. Do not fold Story 03 incomplete MeMatches WIP into this commit.

### 7. Out of scope

- Sprint 39 repositories  
- Changing moderation thresholds / OpenAI client  
- Changing photo moderation drivers / auto-approve env semantics  
- New profile fields / UI  
- Renaming or splitting `MeProfileAnalysisService` / `ProfileQualityService`  
- Story 03 MeMatches god-service split  

### 8. Agent 4

- **Skip.**

---

## Agent 1 instructions

1. Add `profile/` collaborators + pure helpers/constants per §2–§3.
2. Slim `MeProfileService` to facade ≤ 250 LOC.
3. Add test harness; update unit factory; keep HTTP integration green via module.
4. Run locked Jest + typecheck; note smoke if skipped.
5. Write `agent-1-dev.md`. Do not commit.

Suggested commit message:

```
refactor(me-profile): split profile god service into collaborators

Sprint 38 Story 4
```

---

## Agent 2 CR checklist

- [ ] Layout under `me-profile/profile/` + helpers/constants
- [ ] Facade public signatures unchanged; controller still injects `MeProfileService`
- [ ] LOC caps met; Crud does not inject Photo
- [ ] Side-effect matrix preserved (rank rebuild, invalidate, analysis enqueue, photo ML enqueue)
- [ ] `MeProfileAnalysisService` untouched / not confused with AnalysisSubmit
- [ ] No DTO/HTTP contract drift; onboarding + SUBMITTABLE_STATUSES unchanged
- [ ] Specs + typecheck green

---

## Next command

```text
--agent 1 sprint 38 story 4
```
