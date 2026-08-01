# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_split_me_profile_service.md](../../STORY_04_split_me_profile_service.md)  
**Sprint:** sprint-38-god-services-split  
**Date:** 2026-08-02  
**Status:** complete — Implemented (not committed)

**Architect lock followed:** [agent-0-architect.md](./agent-0-architect.md) — layout, LOC caps, ownership map, Nest wiring, side-effect matrix, testing strategy all per §2–§5. No feature flag. Agent 4 skipped per §8.

---

## What changed

Extract-then-delegate split of `src/me-profile/me-profile.service.ts` (1222 LOC) into collaborators under `src/me-profile/profile/`. Code was **moved**, not rewritten: method bodies, exception `error` keys, observability codes, analytics events, and queue calls are byte-identical to the pre-split source except for `this.<helper>` → module-function / collaborator call sites.

### Files added

| File | LOC | Contents |
|------|-----|----------|
| `profile/profile-write.helpers.ts` | 317 | `normalizeNicknameValue`, `parseDesiredPartnerGenders`, `acceptedPartnerGendersFromDesiredJson`, `mergedTextForOnboarding`, `mergedDesiredPartnerGendersForOnboarding`, `isNonEmptyTrimmedText`, `assertOnboardingStepCoherent`, `applyOnboardingCompletionToWriteData`, `toResponse`, `toPreferenceData`, `toPrismaWritableData`, `SUBMITTABLE_STATUSES`, `PreferenceFields` |
| `profile/profile-photo.constants.ts` | 14 | `PHOTO_MAX_COUNT`, `PHOTO_MAX_BYTES`, `ALLOWED_PHOTO_MIME_TYPES`, `UploadedPhotoFile` |
| `profile/me-profile-submit.dto.ts` | 6 | `MeProfileSubmitResponseDto` |
| `profile/profile-moderation.service.ts` | 138 | `assertProfileEditAllowed`, `moderateProfileTextFields` |
| `profile/profile-preference.service.ts` | 40 | `upsertPreference(tx, profileId, body)` |
| `profile/profile-crud.service.ts` | 294 | `requireProfileForUser` (public), `assertNicknameAvailable`, `getForUser`, `createForUser`, `patchForUser` |
| `profile/profile-photo.service.ts` | 276 | `listPhotosForUser`, `uploadPhotoForUser`, `deletePhotoForUser`, `setPrimaryPhotoForUser`, `getPhotoFileForUser`, private `toPhotoDto` |
| `profile/profile-analysis-submit.service.ts` | 243 | `submitForUser`, `getAnalysisStatusForUser`, `getLatestAnalysisForUser` |
| `me-profile.test-harness.ts` | 68 | `createMeProfileServiceForTest(deps)` |

### Files modified

| File | Before | After | Note |
|------|--------|-------|------|
| `me-profile.service.ts` | 1222 | **95** | Thin facade; injects Crud, Photo, AnalysisSubmit only; re-exports `MeProfileSubmitResponseDto` |
| `me-profile.module.ts` | 83 | 94 | Added 5 providers; **exports unchanged** |
| `me-profile.service.spec.ts` | — | — | `buildService()` factory now calls the harness; no test bodies changed |

### LOC caps (Architect §1)

| File | Cap | Actual | Status |
|------|-----|--------|--------|
| `me-profile.service.ts` (facade) | ≤ 250 | 95 | pass |
| `profile-crud.service.ts` | ≤ 450 | 294 | pass |
| `profile-photo.service.ts` | ≤ 400 | 276 | pass |
| `profile-analysis-submit.service.ts` | ≤ 350 | 243 | pass |
| `profile-moderation.service.ts` | ≤ 250 | 138 | pass |
| `profile-preference.service.ts` | ≤ 150 | 40 | pass |

---

## Contract preservation

- **Public Nest API:** `MeProfileController` and `ProfileQualityService` still inject `MeProfileService` only. Facade method signatures are unchanged (`getForUser`, `createForUser`, `patchForUser`, `listPhotosForUser`, `uploadPhotoForUser`, `deletePhotoForUser`, `setPrimaryPhotoForUser`, `getPhotoFileForUser`, `submitForUser`, `getAnalysisStatusForUser`, `getLatestAnalysisForUser`).
- **Module exports:** still `MeMatchesService`, `MATCH_LIST_RANK_REBUILD_PORT`, `MeConversationsService`, `MeProfileAnalysisService`. New collaborators are providers only.
- **Dependency direction:** `ProfilePhotoService` injects `ProfileCrudService` (for `requireProfileForUser`); Crud does **not** inject Photo. No cycle.
- **`MeProfileAnalysisService` untouched** — the LLM/worker runner is unchanged and is not merged with `ProfileAnalysisSubmitService` (submit path imports only its `latestEvaluationForProfile` helper, as before).
- **Story 03 MeMatches WIP** was not touched and is not part of this work.

### Side-effect matrix (Architect §4)

| Action | Side effect | Where it now lives |
|--------|-------------|--------------------|
| `createForUser` success | `matchListRankQueue.enqueueRebuild(userId, 'preferences_changed')` | `ProfileCrudService.createForUser` |
| `patchForUser` with non-empty pref delta | same enqueue | `ProfileCrudService.patchForUser` |
| `submitForUser` after DB SUBMITTED | `meMatches.invalidateMatchListCache` → `analysisQueue.enqueueOrRunInline` | `ProfileAnalysisSubmitService.submitForUser` |
| `uploadPhotoForUser` PENDING + ml driver | analytics pending event + `photoModerationQueue.enqueueOrRunInline` | `ProfilePhotoService.uploadPhotoForUser` |
| Moderation flag on | `assertProfileEditAllowed` + `moderateProfileTextFields` before create/patch writes | `ProfileCrudService` → `ProfileModerationService` |

`isContentModerationEnabled()` is still called at the Crud call site, so the existing `jest.spyOn(contentModerationTypes, ...)` in the unit spec keeps working unchanged.

---

## Test harness

`createMeProfileServiceForTest(deps)` takes the same ten mocks as the pre-split constructor (`prisma`, `obs`, `photoStorage`, `analytics`, `analysisQueue`, `photoModerationQueue`, `meMatches`, `moderation`, `contentViolations`, `matchListRankQueue`) as a named-property object, builds the **real** collaborators from them, and returns the facade. Unit specs therefore still exercise the whole profile path from leaf mocks with no Nest testing module.

---

## Verification

```
cd c:\dev\piza\dating\dating-api
npx jest src/me-profile/me-profile.service.spec.ts src/me-profile/me-profile-http.integration.spec.ts --runInBand
npm run typecheck
```

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** (exit 0) |
| `npx tsc -p tsconfig.build.json --noEmit` | **PASS** (exit 0) |
| `me-profile.service.spec.ts` | **PASS** — 56/56 |
| `me-profile-http.integration.spec.ts` | 187 passed / 10 failed — **all 10 pre-existing** |
| Locked command total | 243 passed / 10 failed / 253 total |

### Pre-existing failures (not caused by this story)

The 10 `me-profile-http.integration.spec.ts` failures were confirmed against the pre-split baseline: the same three service files were stashed (`git stash push -- me-profile.service.ts me-profile.module.ts me-profile.service.spec.ts`) and the spec re-run, producing an **identical** set of 10 failures (4 profile create/patch mock-sequence 500s, 6 `GET /api/v1/me/matches` `Cannot read properties of undefined (reading 'findMany')`).

Broader regression check on the whole `src/me-profile` folder (excluding `me-conversation-messages-ws.integration.spec.ts`, which crashes the runner intermittently on a `message.new timeout` unrelated to this story):

| Run | Failing tests |
|-----|----------------|
| Baseline (stashed) | 31 |
| With Story 4 split | 31 |

`Compare-Object` on the sorted failing-test-name lists reports **no difference** — no test changed state in either direction.

### Lint

`npx eslint` on the new/changed files reports only violations inherited verbatim from the moved code. Linting the pre-split `me-profile.service.ts` at HEAD yields 18 errors; the same 16 (prettier formatting in `toResponse`, `mergedTextForOnboarding`, photo `findFirst`/analytics call sites, `no-redundant-type-constituents` on `toPhotoDto`, `no-unnecessary-type-assertion` in `parseDesiredPartnerGenders`) now appear across the split files, and 2 disappeared. **No new lint debt**; code was left as a verbatim move rather than reformatted, per the "MOVE code, not rewrite" constraint. Reformatting is available as a follow-up if CR prefers it.

---

## Not done (by instruction)

- No commit. Suggested message: `refactor(me-profile): split profile god service into collaborators` / `Sprint 38 Story 4`.
- No feature flag (`FEATURE_SPLIT_PROFILE_SERVICE` not created).
- No DTO / HTTP / status-code / moderation-threshold / photo-driver changes.
- Optional photo/moderation-focused unit specs not added (Architect §5 marks them non-required).

---

## Next command

```text
--agent 2 sprint 38 story 4
```
