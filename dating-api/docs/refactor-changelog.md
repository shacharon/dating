# Refactor changelog

## Sprint 7 Story 1 — frozen legacy runtime deleted

**Date:** 2026-06-03  
**Checkpoint:** `SPRINT7_STORY1_FROZEN_LEGACY_PATHS_DELETED`

### What changed

- Deleted frozen `ProfilesAnalyzeController` cluster (`GET/POST /api/profiles/*analyze*`).
- Deleted V2 extraction chain (`ExtractionModule`, `ExtractionV2*`, interests/negatives extraction, canonical projection, ranking sync).
- Removed global `ExtractionModule` from `AppModule`; product path uses `ExtractionCoreModule` only.
- `POST /api/v1/profiles/evaluate` returns evaluation JSON only (no DB persist).
- Slimmed `ProfilesPrismaService` — removed frozen `save`/`saveToPrisma`.
- Deleted UI POC routes (`dating-ui/src/app/poc/**`).
- Removed `validate:v1-v2` npm script and `scripts/analyze-all-resume.ps1`.

### What remains (Story 2+)

- `legacy/` module (admin DI seam).
- Deprecated npm scripts with `exit(1)`.
- Legacy DB tables/columns (no schema change in Story 1).

---

## Script/tooling cleanup before MatchmakingProfile drop

**Date:** 2026-04-27
**Checkpoint:** `MATCHMAKINGPROFILE_PRE_DROP_SCRIPT_TOOLING_CLEANUP`

### What changed

- `scripts/truncate-all-tables.ts` no longer counts/truncates `MatchmakingProfile`.
- `scripts/validate-phase4-matching.ts` no longer reads `prisma.matchmakingProfile`; Step 5 now asserts runtime contract only.
- Legacy seed/validation/audit npm script commands that depended on MatchmakingProfile tooling are marked unsupported and fail fast with explicit deprecation messages.
- Final hard-deprecation sweep: legacy `MatchmakingProfile` script files were deleted, so direct execution no longer silently runs legacy logic.

### Why

- Runtime code is already detached from `MatchmakingProfile`; remaining migration risk is accidental operational use of legacy scripts.
- This checkpoint narrows "supported scripts" to new-model-safe operational checks before Migration 4.

## Legacy write path frozen — new-model cutover checkpoint

**Date:** 2026-04-18
**Checkpoint:** `MATCH_ENGINE_NEW_MODEL_ACTIVE__LEGACY_WRITES_STILL_DUPLICATED__CUTOVER_NEXT`

### What changed

Marked legacy analyze write path as **frozen**. No production code was deleted and no schema was altered.

### What is frozen

| Entry point | File | Tables written |
|---|---|---|
| `ProfilesAnalyzeController` (`POST /api/profiles/...analyze*`) | `src/profiles/profiles-analyze.controller.ts` | MatchmakingProfile, ProfileEvaluation, ProfileEvaluationRaw, ProfileSignalSnapshot |
| `ProfilesPrismaService.saveToPrisma` | `src/profiles/profiles-prisma.service.ts` | same four tables above |
| `ExtractionV2PersistenceService.save` | `src/extraction/extraction-v2-persistence.service.ts` | ProfileExtractionV2, ProfileSignalSnapshot (via HG sync) |
| `ExtractionV2PersistenceService.saveExtendedSignalsFromEvaluation` | same file | same two tables above |

### Active product path (source of truth)

`POST /api/v1/me/profile/submit`
→ `MeProfileService.submitForUser`
→ `MeProfileAnalysisService.runForUser`
→ `EvaluateService.evaluateBatch` (pure — no DB)
→ `prisma.userProfile.update` + `prisma.userProfileEvaluation.create`

No legacy table is touched on this path. Module-level isolation enforced:
`MeProfileModule` does not import `ProfilesModule`, `ProfilesPrismaService`, or
`ExtractionV2PersistenceService`.

### Regression guards in place

- `me-profile-analysis.service.spec.ts` — `describe('no legacy table writes (contract enforcement)')`:
  Proxy traps on all five legacy table handles; fires on both happy-path and FAILED-path of `runForUser`.
- `me-matches.service.spec.ts` — `describe('no legacy table reads (contract enforcement)')`:
  Same traps; covers `list()` and `getById()` in `MeMatchesService`.
- `me-new-model-e2e.integration.spec.ts` — full two-user HTTP flow with Proxy firewall.

Run all guards:
```powershell
cd src\find\dating\dating-api
npx jest --no-coverage "me-profile-analysis.service.spec|me-matches.service.spec" --testNamePattern="legacy"
npm run validate:new-model-e2e
```

### Runtime visibility

Every call into the frozen path emits a structured `WARN` log:
```
[LEGACY] analyzeAndPersist called for profileId=<id> — legacy write path is frozen; use MeProfileAnalysisService for new users
[LEGACY] saveToPrisma called for profileId=<id> — legacy table write is frozen
[LEGACY] ExtractionV2PersistenceService.save called for profileId=<id> — legacy write path is frozen
[LEGACY] ExtractionV2PersistenceService.saveExtendedSignalsFromEvaluation called for profileId=<id> — legacy write path is frozen
```

Any appearance of `[LEGACY]` in production logs from a new-model user is an anomaly and must be investigated.

### What is NOT done yet

- Legacy tables are **not dropped**.
- Legacy schema is **not altered**.
- `/api/profiles/...analyze*` endpoints are **not removed** (still used for existing synthetic/legacy profile cohort operations).
- Data migration from legacy tables to new tables: **not started**.

### Next step (when ready to cut over)

1. Verify zero `[LEGACY]` warn entries appear in production logs for any user going through `/api/v1/me/profile/submit`.
2. Decide: migrate legacy cohort data to `UserProfile`/`UserProfileEvaluation`, or declare legacy data archived.
3. Remove `ProfilesModule` and `ProfilesAnalyzeController` after migration decision.
4. Drop legacy tables via Prisma migration once no live read paths remain.



## Extraction: remove dead mid-pipeline confidence updates (lowest-risk cleanup)

**Date:** 2025-03-09

- **Change:** Removed confidence updates that were always overwritten by `applyRecomputeConfidence`. Final confidence is and was always `coverage × signalCountFactor`; model confidence never affected the API output.
- **Locations:** (1) `extraction.service.ts` — removed the 0.8 penalty in `validateAndClean` when `corrected` is true. (2) `extraction-sparse-policy.ts` — when sparse guard caps signals/evidence, it no longer sets `confidence = min(data.confidence, 0.45)`; it passes through `data.confidence` (still overwritten by recompute at end).
- **Effect:** No change to public API or final output; fewer redundant writes and clearer single source of truth for confidence.
