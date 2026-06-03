# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_delete_frozen_legacy_paths.md](../../STORY_01_delete_frozen_legacy_paths.md)  
**Sprint:** sprint-07-tech-debt  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **No Prisma schema changes** — Story 1 is code deletion only; DB column/table drops are Story 2.
- **Primary delete cluster** — frozen `ProfilesAnalyzeController` (`POST/GET /api/profiles/*analyze*`) and its exclusive dependents (cache, failures persistence, V2 extraction chain).
- **Remove global `ExtractionModule`** from `AppModule` and `ProfilesModule`; product path already uses `ExtractionCoreModule` via `EvaluateServiceModule` → `MeProfileModule`.
- **Slim, do not delete** — `ProfilesPrismaService` (still exported for `MatchesModule` / `LegacyBackendAdapter`); remove frozen `save`/`saveToPrisma` after rewiring `ProfilesController.evaluate`.
- **KEEP `legacy/` module** — active DI seam for admin routes (`/api/evaluate`, `/api/contradiction`, `GET /api/matches`) and reanalyze scripts; not a Story 1 delete target.
- **UI POC routes** — delete `dating-ui/src/app/poc/**` (6 files); isolated from product nav; `/evaluate` product page stays (uses `POST /api/v1/profiles/evaluate`).
- **Safety gate** — dev must run import grep + full build/test after each deletion tier; see ordered plan below.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/profiles/profiles-analyze.controller.ts` | **DELETE** |
| `dating-api/src/profiles/profiles-analyze.controller.spec.ts` | **DELETE** |
| `dating-api/src/profiles/analysis-cache.service.ts` | **DELETE** |
| `dating-api/src/profiles/analyze-failures-persistence.service.ts` | **DELETE** |
| `dating-api/src/extraction/extraction-v2-persistence.service.ts` | **DELETE** |
| `dating-api/src/extraction/extraction-v2.service.ts` | **DELETE** |
| `dating-api/src/extraction/extraction-v2.prompts.ts` | **DELETE** (if present) |
| `dating-api/src/extraction/interests-extraction.service.ts` | **DELETE** |
| `dating-api/src/extraction/interests-extraction.service.spec.ts` | **DELETE** |
| `dating-api/src/extraction/negatives-extraction.service.ts` | **DELETE** |
| `dating-api/src/extraction/extraction.module.ts` | **DELETE** (after rewiring imports) |
| `dating-api/src/evaluate/chips-layer-builder.ts` | **DELETE** |
| `dating-api/src/evaluate/chips-layer-builder.spec.ts` | **DELETE** |
| `dating-api/src/canonical/canonical-projection.ts` | **DELETE** |
| `dating-api/src/canonical/canonical-profile.repository.ts` | **DELETE** (unregistered orphan) |
| `dating-api/src/holy-grail-matching/holy-grail-ranking-signals-sync.ts` | **DELETE** (only importer was V2 persistence) |
| `dating-api/src/validate-v1-v2.ts` | **DELETE** |
| `dating-ui/src/app/poc/**` | **DELETE** (6 route files) |
| `dating-api/src/profiles/profiles.module.ts` | remove analyze controller + cache + failures providers; drop `ExtractionModule` import |
| `dating-api/src/app.module.ts` | remove `ExtractionModule` import |
| `dating-api/src/profiles/profiles.controller.ts` | remove dead `ExtractionV2PersistenceService` DI; stop calling frozen `save()` |
| `dating-api/src/profiles/profiles-prisma.service.ts` | remove `save` / `saveToPrisma` frozen methods |
| `dating-api/package.json` | remove `validate:v1-v2` script (orphaned after file delete) |
| `dating-api/docs/refactor-changelog.md` | add Story 1 deletion checkpoint |
| `dating-api/PROFILES_EVALUATE_PIPELINE_MAP.md` | update: evaluate endpoint no longer persists |
| `handoffs/STORY_01_delete_frozen_legacy_paths/agent-1-dev.md` | created by agent 1 |

**KEEP (Story 1 — do not delete):**

| Path | Reason |
|------|--------|
| `dating-api/src/legacy/legacy-backend.module.ts` | Wired in `AppModule`; admin/tooling DI |
| `dating-api/src/legacy/legacy-backend.adapter.ts` | Used by evaluate/contradiction/matches-api controllers + scripts |
| `dating-api/src/profiles/profiles-prisma.service.ts` (slimmed) | `MatchesService`, read controllers, `LegacyBackendAdapter` |
| `dating-api/src/profiles/profiles-read.controller.ts` | Active route (returns empty/stub lists today) |
| `dating-api/src/profiles/profiles.controller.ts` | `POST /api/v1/profiles/evaluate` — used by `dating-ui/src/app/evaluate/page.tsx` |
| `dating-api/src/profiles/user-profiles-api.*` | `/api/v1/user-profiles` product-adjacent API |
| `dating-api/src/extraction/extraction-core.module.ts` | Active product extraction |
| `dating-api/src/evaluate/enrichment-legacy-phrase-map.ts` | Active enrichment repair — **not** frozen |

---

## Import audit (grep checkpoint)

Run before and after deletion:

```bash
cd dating-api

# Must return ZERO hits after Story 1 (excluding docs/handoffs):
rg -l "profiles-analyze|ProfilesAnalyzeController|ExtractionV2Persistence|ExtractionV2Service|AnalysisCacheService|AnalyzeFailuresPersistence|chips-layer-builder|canonical-projection|canonical-profile\.repository|holy-grail-ranking-signals-sync|validate-v1-v2|InterestsExtractionService|NegativesExtractionService" src/

# Confirm product path untouched:
rg "ExtractionModule" src/me-profile/ src/evaluate/evaluate-service.module.ts
# Expected: evaluate-service.module imports ExtractionCoreModule only

# Confirm legacy seam kept:
rg "LegacyBackendAdapter|LegacyBackendModule" src/app.module.ts src/legacy/
```

---

## Decisions (do not reverse without discussion)

### 1. No schema migration

Story 1 removes **runtime code** only. Frozen tables (`ProfileExtractionV2`, legacy evaluation tables) may still exist in DB — Story 2 handles column/table retirement and script cleanup.

### 2. Delete `ExtractionModule` entirely

`ExtractionCoreModule` is the product extraction surface. After analyze cluster removal, nothing in active modules needs V2 providers.

**Before:**

```typescript
// app.module.ts
imports: [ ..., ExtractionModule, ProfilesModule, MeProfileModule, ... ]

// profiles.module.ts
imports: [ ..., ExtractionModule ]
```

**After:**

```typescript
// app.module.ts — remove ExtractionModule line

// profiles.module.ts
imports: [ SimpleLoggerModule, EvaluateModule ]  // EvaluateModule → ExtractionCoreModule
```

`EvaluateServiceModule` already documents why it uses `ExtractionCoreModule` instead of `ExtractionModule`.

### 3. `ProfilesController.evaluate` — evaluate-only, no persist

Frozen `saveToPrisma` is a noop. Remove persistence call and dead DI:

```typescript
// profiles.controller.ts — AFTER
@Controller('api/v1/profiles')
export class ProfilesController {
  constructor(
    private readonly evaluateService: EvaluateService,
    private readonly logger: SimpleLogger,
    // REMOVED: profilesStorage, extractionV2Persistence
  ) {}

  @Post('evaluate')
  async evaluate(@Body() body: ProfilesEvaluateBodyDto): Promise<ProfilesEvaluateResponseDto> {
    // ... validation unchanged ...
    const evaluation = result.result;
    // REMOVED: profilesStorage.save(...) — legacy persist frozen
    return { ok: true, profileId: id, evaluation };
  }
}
```

Response contract **unchanged** — UI `/evaluate` page unaffected.

### 4. Slim `ProfilesPrismaService` — remove frozen write path only

Delete methods:

- `save(id, payload)` 
- `saveToPrisma(...)` (private, frozen)

**Keep** stub readers used by compare/admin path:

- `getFromPrisma` / `listFromPrisma` (return empty/null per slice 8)
- `loadMatchPairRuntimeBundle` (returns `null`)
- Any methods still referenced by `MatchesService` or `ProfilesReadController`

Do **not** delete the class — `MatchesModule` imports `ProfilesModule` for exports.

### 5. `legacy/` module — KEEP

`LegacyBackendModule` is `@Global()` wiring for:

| Consumer | Usage |
|----------|-------|
| `EvaluateController` | `POST /api/evaluate` |
| `ContradictionController` | `POST /api/contradiction` |
| `MatchesApiController` | `GET /api/matches` |
| Scripts | `reanalyze-*.ts`, `analyze-signal3.ts`, etc. |

Renaming/moving `legacy/` is Story 2+ — not Story 1.

### 6. UI POC routes — DELETE

| File | Route |
|------|-------|
| `dating-ui/src/app/poc/page.tsx` | `/poc` |
| `dating-ui/src/app/poc/evaluate/page.tsx` | `/poc/evaluate` |
| `dating-ui/src/app/poc/profiles/page.tsx` | `/poc/profiles` |
| `dating-ui/src/app/poc/matches/page.tsx` | `/poc/matches` |
| `dating-ui/src/app/poc/matches/matches-page-client.tsx` | (component) |
| `dating-ui/src/app/poc/auto-matches/page.tsx` | `/poc/auto-matches` |

No product nav links to `/poc/*`. Comment in `matches-page-client.tsx` referencing auto-matches prefill is harmless; optional cleanup.

**Out of scope:** `/auto-matches` as top-level product route — grep shows only POC usage.

### 7. Scripts — document, minimal fix only

| Script | Story 1 action |
|--------|----------------|
| `npm run validate:v1-v2` | **Remove** from `package.json` (source file deleted) |
| `scripts/analyze-all-resume.ps1` | Add deprecation comment or delete file (calls frozen HTTP) |
| `scripts/analyze-all.ts` | **Defer** full delete to Story 2 (npm script cleanup epic) |
| Seed scripts with `profileExtractionV2.upsert` | **Defer** to Story 2 |

Do not bulk-edit deprecated `exit(1)` scripts in Story 1 — that's Story 2 scope.

---

## API surface changes

### Removed endpoints (frozen analyze cluster)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/profiles/stats` | none (legacy) |
| POST | `/api/profiles/analyze-all` | none |
| POST | `/api/profiles/analyze-batch` | none |
| POST | `/api/profiles/:id/analyze` | none |
| POST | `/api/profiles/:id/analyze-v2` | none |

### Unchanged endpoints (keep)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/profiles/evaluate` | Returns evaluation JSON; **no DB persist** after slim |
| GET | `/api/v1/user-profiles/*` | Unchanged |
| All | `/api/v1/me/*` | Product path — untouched |
| POST | `/api/evaluate`, `/api/contradiction` | Admin — via `legacy/` |
| GET | `/api/matches` | Admin list — via `LegacyBackendAdapter` |

---

## Prisma schema

**N/A — no migration in Story 1.**

Rollback = git revert deletion commit; no DB rollback needed.

---

## Deletion order (mandatory for Agent 1)

Execute in order; run `npm run build` + targeted jest after each tier.

### Tier 1 — Analyze controller cluster

1. Remove from `profiles.module.ts`: `ProfilesAnalyzeController`, `AnalysisCacheService`, `AnalyzeFailuresPersistenceService`.
2. Delete:
   - `profiles-analyze.controller.ts` + `.spec.ts`
   - `analysis-cache.service.ts`
   - `analyze-failures-persistence.service.ts`
3. Build + test.

### Tier 2 — V2 extraction chain

1. Rewire `profiles.controller.ts` (remove V2 DI + save call).
2. Remove `save`/`saveToPrisma` from `profiles-prisma.service.ts`.
3. Delete V2 extraction files (see Artifacts table).
4. Delete `extraction.module.ts`.
5. Remove `ExtractionModule` from `app.module.ts` and `profiles.module.ts`.
6. Delete `validate-v1-v2.ts`; remove `validate:v1-v2` from `package.json`.
7. Build + test.

### Tier 3 — Orphan canonical/HG sync

1. Delete `canonical-projection.ts`, `canonical-profile.repository.ts`, `holy-grail-ranking-signals-sync.ts`.
2. Delete `chips-layer-builder.ts` + spec.
3. Build + test.

### Tier 4 — UI POC

1. Delete `dating-ui/src/app/poc/**`.
2. `npm run build` in `dating-ui`.
3. Smoke: login → matches → like → message (product flow).

### Tier 5 — Docs

1. Append checkpoint to `docs/refactor-changelog.md`.
2. Update `PROFILES_EVALUATE_PIPELINE_MAP.md` persist step.

---

## Service signatures (post-deletion)

No new services. Removals only.

```typescript
// profiles.module.ts — controllers after Story 1
controllers: [
  ProfilesController,
  ProfilesReadController,
  UserProfilesApiController,
  // REMOVED: ProfilesAnalyzeController
];

// profiles-prisma.service.ts — REMOVED methods
// async save(id, payload): Promise<void>
// private async saveToPrisma(...)
```

---

## Test plan (for Agent 2)

### Static guards (must stay green)

| Spec | Asserts |
|------|---------|
| `me-profile-http.integration.spec.ts` | Me-profile DI excludes V2 persistence |
| `me-profile-analysis.service.spec.ts` | Legacy table proxy traps |
| `match-quality-audit.v1-path.spec.ts` | Me-profile must not import `ProfilesPrismaService` |
| `me-matches.v1-contract.spec.ts` | New-model contract |

### Delete with source

| Spec | Action |
|------|--------|
| `profiles-analyze.controller.spec.ts` | DELETE |
| `chips-layer-builder.spec.ts` | DELETE |
| `interests-extraction.service.spec.ts` | DELETE |

### Add / verify

| Case | Expected |
|------|----------|
| `rg` zero hits for deleted symbols | pass |
| `npm run build` (api + ui) | pass |
| `npx jest --runInBand` story-relevant suites | pass |
| `POST /api/v1/profiles/evaluate` | 200, evaluation JSON, no prisma write |

### Manual smoke

1. `npm run build` (API + UI)  
2. Product flow: login → matches → like → conversation → message  
3. `/evaluate` page still returns evaluation JSON  

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **`POST /api/v1/profiles/evaluate`** — kept for dev/evaluate UI page; if product retires `/evaluate` page later, remove controller in Story 2.
2. **`ProfilesReadController`** — returns empty lists; full removal deferred until admin routes retired.
3. **`scripts/analyze-all.ts`** — still upserts V2; Story 2 script cleanup.

---

## Next agent

```text
--agent 1 sprint 7 story 1
```

**Notes for next agent:**

1. Follow **deletion order** tiers 1→5; do not skip build/test between tiers.
2. Run import grep checkpoint before marking done.
3. Do **not** delete `legacy/` module or bulk-edit deprecated npm scripts (Story 2).
4. Do **not** drop DB columns/tables (Story 2).
5. Update `refactor-changelog.md` with deletion checkpoint.
