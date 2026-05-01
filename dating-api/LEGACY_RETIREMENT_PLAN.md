# Legacy MatchmakingProfile Cluster Retirement Plan

**Status:** Planning phase — awaiting Decision Gate 0  
**Date:** 2026-04-24  
**Scope:** Four legacy Prisma tables + associated runtime code

---

## Current state

**Active path (production-ready):**  
`GET /api/v1/me/matches` → `MeMatchesService` → `UserProfile` + `UserProfileEvaluation`  
✅ Zero dependencies on legacy cluster (proven via tests + code analysis)

**Legacy surfaces still operational:**

| Route | Controller | Backend |
|-------|------------|---------|
| `GET /api/matches` | `MatchesApiController` | `MatchesService` |
| `GET /api/v1/matches/:id` | `MatchesController` | `MatchesService` + HG helpers |
| `POST /api/v1/matches/compare` | `MatchesController` | `MatchesService` |
| `GET /api/v1/matches/auto` | `MatchesController` | `MatchDaemonService` |
| `POST /api/v1/matches/rebuild` | `MatchesController` | `MatchDaemonService` |
| `GET /api/v1/matches/top` | tombstone only | (no DB) |

**In-repo consumers:**
- POC pages: `/poc/matches`, `/poc/auto-matches`, `app/auto-matches`
- Scripts: `analyze-all-resume.ps1`, `smoke-test.sh`, `matches-api-smoke.mjs`
- Seeds/validation: `seed-*.ts`, `hg-*.ts`, `backfill-*.ts`

---

## Slice 9: Script/tooling cleanup (pre-Migration 4)

**Status:** In progress (2026-04-27)  
**Goal:** no **supported runnable** script depends on `MatchmakingProfile`.

### Classification

**Must remain runnable**
- `scripts/truncate-all-tables.ts` (kept runnable, no `MatchmakingProfile` reference)
- `scripts/validate-phase4-matching.ts` (kept runnable, legacy runtime contract check without DB access to legacy table)

**Archived/deleted (legacy tooling removed; cannot be executed directly)**
- `scripts/analyze-all.ts`
- `scripts/backfill-hg-gap-structured.ts`
- `scripts/backfill-hg-validation-ranking-signals.ts`
- `scripts/backfill-legacy-synthetic-structured.ts`
- `scripts/ci-seed-hg-validation-minimal.ts`
- `scripts/hg-full-system-validation.ts`
- `scripts/hg-hard-filter-audit.ts`
- `scripts/hg-soft-pass-simulation.ts`
- `scripts/hg-strong-low-evidence-audit.ts`
- `scripts/hg-v2-enrichment-batch-analysis.ts`
- `scripts/hg-validation-report.ts`
- `scripts/interest-tags-v2-validation.lib.ts`
- `scripts/personality-v2-validation.lib.ts`
- `scripts/recompute-soft-pass-audit.ts`
- `scripts/seed-interest-tags-v2-validation.ts`
- `scripts/seed-interest-v2-validation.ts`
- `scripts/seed-lifestyle-v2-validation.ts`
- `scripts/seed-personality-v2-validation.ts`
- `scripts/seed-profiles.ts`
- `scripts/v1-signal-families-batch-analysis.ts`
- `scripts/validate-lifestyle-signals-v2.ts`

**Deleted (not part of new-model path)**
- `scripts/fix-auth-userprofile-table.sql`

## Decision Gate 0 (RESOLVED)

**Question:** What is the fate of POC pages + legacy route consumers?

| Option | Impact | Status |
|--------|--------|--------|
| **A. Migrate POC to active API** | POC calls `/api/v1/me/matches`; full retirement possible | ❌ Not chosen |
| **B. Keep POC on legacy stack** | Cluster cannot be retired; partial cleanup only | ❌ Not chosen |
| **C. Delete POC entirely** | Unblocks full retirement immediately | ✅ **CHOSEN** (2026-04-24) |

**Decision: Option C — Delete POC entirely**

**Rationale:**
- POC served its purpose: proof of concept for legacy matching engine is complete
- Active product path (`GET /api/v1/me/matches` → `MeMatchesService`) is proven working and production-ready
- Fastest path to full cluster retirement: 1 PR to delete 5 POC pages vs 3-5 PRs to migrate POC + build admin APIs
- If admin tooling is needed later, rebuild on new stack with clear requirements (not "port the POC")

**Practical consequence:**
- ✅ **COMPLETE (2026-04-24):** POC surfaces deleted (`/poc/` folder, `/app/auto-matches`, `/app/matches`)
- ✅ Smoke/docs updated to remove POC-only test steps
- ➡️ **Next:** Proceed with retirement slices 2-8, then Prisma migrations 1-4
- Full cluster retirement unblocked

**✅ Retirement may now proceed.**

---

## Per-table blocker summary

### 1. MatchmakingProfile (parent table)

**FK children:** `ProfileExtractionV2`, `ProfileSignalSnapshot`  
**Runtime readers:** All 5 legacy routes → `MatchesService` / `ProfilesPrismaService` / HG retrieval  
**Runtime writers:** `ProfilesPrismaService.saveToPrisma`, `HolyGrailStructuredWriteService`  
**Scripts:** `seed-*.ts`, `hg-*.ts`, `analyze-all.ts`, `truncate-all-tables.ts`  
**Retirement phase:** 4 (last)

### 2. ProfileExtractionV2 (FK → MatchmakingProfile)

**Runtime readers:** `MatchesService.compare`, `ProfilesPrismaService` (transaction check), `CanonicalProfileRepository` (SQL), `HolyGrailRankingSignalsSync`  
**Runtime writers:** `ExtractionV2PersistenceService`, `analyze-all.ts`  
**Scripts:** `seed-*.ts`, `ci-seed-hg-validation-minimal.ts`  
**Retirement phase:** 1

### 3. ProfileSignalSnapshot (FK → MatchmakingProfile)

**Runtime readers:** `holy-grail-structured-db-json.ts` (HG ranking signal columns), `HolyGrailRankingSignalsSync`  
**Runtime writers:** `ProfilesPrismaService.saveToPrisma` (batch delete+create), `backfill-hg-validation-ranking-signals.ts`  
**Scripts:** `seed-*.ts`  
**Retirement phase:** 2

### 4. MatchPairHgSnapshot (independent, no FK)

**Runtime readers:** `MatchesService.loadMatchPairHgSnapshotMap` (list/detail/compare), `hg-list-admission-gate.ts`, `match-detail-children-unsure.ts`  
**Runtime writers:** `MatchDaemonService` → `MatchesService.persistMatchPairHgSnapshots`  
**Scripts:** (engine-owned; created by rebuild)  
**Retirement phase:** 3

---

## Retirement sequence

### Pre-migration code slices

#### Slice 1: Stop ProfileExtractionV2 writes

**Goal:** Zero `profileExtractionV2.upsert` in src/ runtime.

**Changes:**
1. Remove `ExtractionV2PersistenceService` from active analyze flow
2. Remove `profileExtractionV2.upsert` from `analyze-all.ts`
3. Guard or delete extraction upserts in seed scripts

**Validation:**
```bash
npm run build          # must pass
npm test               # must pass
rg "profileExtractionV2\.upsert" src/  # zero hits
```

**Exit:** `ProfileExtractionV2` is read-only.

---

#### Slice 2: Stop ProfileExtractionV2 reads

**Goal:** Zero `profileExtractionV2.find*` in src/ runtime.

**Changes:**
1. `matches.service.ts`: remove two `findUnique` from compare
2. `profiles-prisma.service.ts`: remove transaction extraction check
3. `canonical-profile.repository.ts`: drop SQL query or migrate to `UserProfile`
4. `holy-grail-ranking-signals-sync.ts`: remove extraction read

**Validation:**
```bash
npm run build
npm test
curl -X POST http://localhost:3001/api/v1/matches/compare -H "Content-Type: application/json" -d '{"aId":"a","bId":"b"}'  # 200 or expected guard
rg "profileExtractionV2\.find" src/  # zero hits
```

**Exit:** `ProfileExtractionV2` unused in src/.

---

#### Slice 3: Stop ProfileSignalSnapshot writes

**Goal:** Zero snapshot batch writes in runtime.

**Changes:**
1. `profiles-prisma.service.ts`: remove `deleteMany` + `createMany` from `saveToPrisma`
2. `holy-grail-ranking-signals-sync.ts`: remove `updateMany`
3. Guard or delete snapshot upserts in seeds/backfills

**Validation:**
```bash
npm run build
npm test
rg "profileSignalSnapshot\.(deleteMany|createMany|upsert|updateMany)" src/  # zero hits
```

**Exit:** `ProfileSignalSnapshot` is read-only.

---

#### Slice 4: Stop ProfileSignalSnapshot reads

**Goal:** Zero snapshot reads from HG mapping chain.

**Changes:**
1. `holy-grail-structured-db-json.ts`: skip snapshot row in `buildHolyGrailProfileMappingInputFromRankingAwareDbRow` or read from `UserProfileEvaluation`
2. `holy-grail-ranking-signals-sync.ts`: remove read path

**Validation:**
```bash
npm run build
npm test
curl http://localhost:3001/api/matches  # 200, list still works
rg "profileSignalSnapshot\.find" src/  # zero hits
```

**Exit:** `ProfileSignalSnapshot` unused in src/.

---

#### Slice 5: Stop MatchPairHgSnapshot writes

**Goal:** Daemon rebuild no longer persists pair snapshots.

**Changes:**
1. `match-daemon.service.ts`: remove or guard `persistMatchPairHgSnapshots` call
2. `matches.service.ts`: mark `persistMatchPairHgSnapshots` as deprecated no-op

**Validation:**
```bash
npm run build
npm test
curl -X POST http://localhost:3001/api/v1/matches/rebuild  # 201, no upsert
rg "matchPairHgSnapshot\.upsert" src/  # zero hits (except in guarded code)
```

**Exit:** `MatchPairHgSnapshot` is read-only.

---

#### Slice 6: Stop MatchPairHgSnapshot reads

**Goal:** List/detail/compare no longer load snapshot map.

**Changes:**
1. `matches.service.ts`: remove three `loadMatchPairHgSnapshotMap` calls
2. `hg-list-admission-gate.ts`: remove gate logic or always pass
3. `match-detail-children-unsure.ts`: remove `findUnique`

**Validation:**
```bash
npm run build
npm test
curl http://localhost:3001/api/matches  # 200 (no HG gate)
curl http://localhost:3001/api/v1/matches/:id  # 200 (no HG diagnostics in body)
rg "matchPairHgSnapshot\.find" src/  # zero hits
```

**Exit:** `MatchPairHgSnapshot` unused in src/.

---

#### Slice 7: Stop MatchmakingProfile writes

**Goal:** Zero `matchmakingProfile.upsert`/`update` in runtime.

**Changes:**
1. `profiles-prisma.service.ts`: remove `matchmakingProfile.upsert` from `saveToPrisma`
2. `holy-grail-structured-write.service.ts`: remove `update` calls
3. `profiles-analyze.controller.ts`: mark legacy analyze as deprecated

**Validation:**
```bash
npm run build
npm test
rg "matchmakingProfile\.(upsert|update)" src/  # zero hits
```

**Exit:** `MatchmakingProfile` is read-only.

---

#### Slice 8: Stop MatchmakingProfile reads (final route retirement)

**Goal:** Legacy routes deleted; zero `matchmakingProfile.find*` in src/.

**Changes:**
1. Delete or tombstone `MatchesApiController` / `MatchesController`
2. Delete `MatchesService` / `MatchDaemonService` / `ProfilesPrismaService`
3. Delete HG retrieval repo (`prisma-holy-grail-profile-source.repository.ts`)
4. Delete or migrate POC pages (per Decision Gate 0)

**Validation:**
```bash
npm run build
npm test
curl http://localhost:3001/api/v1/me/matches  # 200 (active path still works)
curl http://localhost:3001/api/matches  # 404 or tombstone
rg "matchmakingProfile\.find" src/  # zero hits
```

**Exit:** `MatchmakingProfile` unused in src/.

---

### Final Prisma migration order

**⚠️ Only execute migrations AFTER all code slices are complete and validated.**

#### Migration 1: Drop ProfileExtractionV2

**Prerequisite:** Slices 1 + 2 complete.

```bash
# Remove model ProfileExtractionV2 from schema.prisma
npx prisma migrate dev --name drop_profile_extraction_v2
npx prisma generate
npx prisma migrate status  # verify up to date
npm run build && npm test   # must pass
```

---

#### Migration 2: Drop ProfileSignalSnapshot

**Prerequisite:** Slices 3 + 4 complete.

```bash
# Remove model ProfileSignalSnapshot from schema.prisma
npx prisma migrate dev --name drop_profile_signal_snapshot
npx prisma generate
npx prisma migrate status
npm run build && npm test
```

---

#### Migration 3: Drop MatchPairHgSnapshot

**Prerequisite:** Slices 5 + 6 complete.

```bash
# Remove model MatchPairHgSnapshot from schema.prisma
npx prisma migrate dev --name drop_match_pair_hg_snapshot
npx prisma generate
npx prisma migrate status
npm run build && npm test
```

---

#### Migration 4: Drop MatchmakingProfile

**Prerequisite:** Slices 7 + 8 complete.

```bash
# Remove model MatchmakingProfile from schema.prisma
npx prisma migrate dev --name drop_matchmaking_profile
npx prisma generate
npx prisma migrate status
npm run build && npm test
curl http://localhost:3001/api/v1/me/matches  # active path still 200
```

---

## No-go risks

| ❌ Never do this | Why it breaks | Prevention |
|------------------|---------------|------------|
| Drop tables before removing writers | Active `upsert`/`update` crashes with "relation does not exist" | Complete write-stop slices **before** migrations |
| Drop `MatchmakingProfile` before children | FK constraint violation; migration fails | **Always** drop `ProfileExtractionV2` + `ProfileSignalSnapshot` first (migrations 1+2 before 4) |
| Assume `MatchPairHgSnapshot` is safe (no FK = no risk) | No FK ≠ no runtime dependency; rebuild/list/detail still call it | Complete slices 5+6 **before** migration 3 |
| Delete legacy routes while POC still uses them | POC 404s; smoke scripts fail | Resolve **Decision Gate 0** before slice 8 |
| Skip validation after slices | Broken state propagates; rollback scope explodes | Run build + test + HTTP smoke **after every slice** |
| Run migrations before code deploys | Mismatch: new code expects tables that don't exist (or vice versa) | **Code-first:** deploy slices 1–8, **then** migrations 1–4 |

---

## Deployment strategy

**Principle:** Code changes deploy **before** schema changes.

1. **Local dev:** Complete all 8 code slices + validate locally.
2. **Staging deploy:** Deploy code slices 1–8 (no migrations yet).
3. **Staging validation:** Run full smoke suite on staging with legacy tables still present.
4. **Staging migrations:** Run migrations 1–4 in sequence; verify active path still works.
5. **Production deploy:** Same sequence (code first, then migrations).

---

## Rollback paths

| Phase | Rollback |
|-------|----------|
| **Code slice deployed, migration not run** | Revert code PR; tables still exist |
| **Migration 1 run (ProfileExtractionV2 dropped)** | Cannot rollback; table data lost; **must** keep code slice deployed |
| **Migration 2 run (ProfileSignalSnapshot dropped)** | Same as above |
| **Migration 3 run (MatchPairHgSnapshot dropped)** | Same as above |
| **Migration 4 run (MatchmakingProfile dropped)** | Same as above; **full cluster retirement complete** |

**⚠️ Migrations are one-way.** Do not drop tables unless all code slices are validated in production.

---

## Progress tracking

| Slice | Status | PR | Validated |
|-------|--------|----|-----------| 
| Decision Gate 0 | ✅ Resolved: Option C | — | 2026-04-24 |
| Slice 1: Stop PE2 writes | ✅ Complete | [slice-1] | 2026-04-24 |
| Slice 2: Stop PE2 reads | ⏸️ Not started | — | — |
| Slice 3: Stop PSS writes | ⏸️ Not started | — | — |
| Slice 4: Stop PSS reads | ⏸️ Not started | — | — |
| Slice 5: Stop MPHS writes | ⏸️ Not started | — | — |
| Slice 6: Stop MPHS reads | ⏸️ Not started | — | — |
| Slice 7: Stop MM writes | ⏸️ Not started | — | — |
| Slice 8: Stop MM reads | ⏸️ Not started | — | — |
| Migration 1 | ⏸️ Blocked | — | — |
| Migration 2 | ⏸️ Blocked | — | — |
| Migration 3 | ⏸️ Blocked | — | — |
| Migration 4 | ⏸️ Blocked | — | — |

**Legend:** PE2 = ProfileExtractionV2, PSS = ProfileSignalSnapshot, MPHS = MatchPairHgSnapshot, MM = MatchmakingProfile

---

## Next action

**Immediate:** Proceed with **Slice 2** (stop ProfileExtractionV2 reads) — remove read paths from `matches.service.ts`, `profiles-prisma.service.ts`, `canonical-profile.repository.ts`, and `holy-grail-ranking-signals-sync.ts`.
