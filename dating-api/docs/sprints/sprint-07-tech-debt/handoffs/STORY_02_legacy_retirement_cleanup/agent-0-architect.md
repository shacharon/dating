# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_legacy_retirement_cleanup.md](../../STORY_02_legacy_retirement_cleanup.md)  
**Sprint:** sprint-07-tech-debt  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **No Prisma migration in Story 2** — `MatchmakingProfile` and legacy evaluation tables are **already absent** from `prisma/schema.prisma`. Phase F partner-pref columns were dropped by migration `20260502103000_phase_f_drop_user_profile_preference_columns`; product home is `UserProfilePreference` (+ `UserProfile.desiredPartnerGenders` JSON bridge per schema comment).
- **Primary work** — remove dead `package.json` scripts, **retire broken CI workflow**, archive on-disk scripts that still call `prisma.matchmakingProfile`, refresh `LEGACY_RETIREMENT_PLAN.md` and a few active docs.
- **`dist/`** — already in `dating-api/.gitignore` (`/dist`); **not tracked** in git (`git ls-files dating-api/dist` empty). No `.gitignore` change required; optional `git clean -fd dating-api/dist` in dev notes.
- **STRONG_FLAG** — already documented on `Dealbreaker` type and `applyDealbreakerCap`; **no code migration** this story (optional follow-up).
- **CI blocker** — `.github/workflows/hg-ranking-signal-guard.yml` still runs `ci:hg-ranking-guard`, which **throws on every run**. Must delete or disable workflow in Story 2 dev pass.

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/package.json` | Remove 13 deprecated script entries (see table below) |
| `.github/workflows/hg-ranking-signal-guard.yml` | **DELETE** (legacy guard retired; no replacement in this story) |
| `dating-api/scripts/archive/retired-matchmaking-profile/README.md` | **CREATE** — index + “do not run” notice |
| `dating-api/scripts/archive/retired-matchmaking-profile/**` | **MOVE** legacy script files (list below) |
| `dating-api/scripts/OPERATIONAL_SCRIPTS.md` | **CREATE** — supported smokes/validates/backfills |
| `dating-api/LEGACY_RETIREMENT_PLAN.md` | Update status: Gate 0 done, Story 1 runtime deleted, schema has no MP table, Slice 9 complete after archive |
| `dating-api/docs/refactor-changelog.md` | Add Story 2 checkpoint |
| `dating-api/docs/MATCH_ENGINE_V1_CONTRACT.md` | Mark `MatchmakingProfile` as retired (historical) |
| `dating-api/docs/MATCH_ENGINE_DEEP_DIVE.md` | Same — one paragraph / footnote, not full rewrite |
| `docs/HOLY_GRAIL_MATCHING.md` | Optional: note `ProfileSignalSnapshot` legacy table retired from schema if section still implies live DB columns |
| `handoffs/STORY_02_legacy_retirement_cleanup/agent-1-dev.md` | Created by agent 1 |

**KEEP (do not archive/delete):**

| Category | Examples |
|----------|----------|
| Product smokes (Jest) | `smoke:auth`, `smoke:me-profile`, `smoke:matches`, `smoke:ws`, `smoke:ws-preflight` |
| Product validates (Jest) | `validate:new-model-e2e`, `validate:phase2-me-profile` |
| New-model scripts | `scripts/validate-phase4-matching.ts`, `scripts/smoke-ws-preflight.ts`, `scripts/phase-f-expand-analyzed-profiles.ts`, `scripts/personality-traits-e2e-verify.ts`, `scripts/truncate-all-tables.ts`, reanalyze/backfill scripts that use `UserProfile` / HG structured tables only |
| Runtime | `src/legacy/**`, admin `GET /api/matches`, `holy-grail:backfill` |
| Guards | `src/legacy-deletion.guard.spec.ts` |

---

## Decisions (do not reverse without discussion)

### 1. No schema migration

Orphan **DB** tables/columns may still exist in long-lived databases, but the **codegen schema** no longer models `MatchmakingProfile`. Dropping physical tables is a **future** migration with explicit DBA/backup checklist — **out of scope** for Story 2.

### 2. Retire HG ranking CI workflow (do not restore stub guard)

The workflow seeds via `ci-seed-hg-validation-minimal.ts` then runs a guard that **only throws**. Restoring the old guard would reintroduce `MatchmakingProfile` coupling.

**Future (not Story 2):** optional new-model CI guard (e.g. Jest contract on `MeMatchesService` ranking signals) — track in Sprint backlog, not this story.

### 3. Archive vs delete on-disk scripts

**Move** (not delete) files that reference `prisma.matchmakingProfile` into `scripts/archive/retired-matchmaking-profile/` so git history and forensic diffs remain available. **Delete** only the two fail-fast stubs if duplicated after move: `hg-ranking-signal-ci-guard.ts`, `lifestyle-v2-db-report.ts` (or move stubs into archive too — prefer **move all** for consistency).

### 4. Phase F documentation

**Authoritative state:**

```text
UserProfilePreference — partnerAgeMin/Max, education, smoking, alcohol, children, religions, maxDistanceKm, similarityPreference
UserProfile.desiredPartnerGenders — JSON bridge (schema comment: until later phase)
Migration 20260502103000 — dropped duplicate columns from UserProfile
```

Add a short **Phase F** subsection to `OPERATIONAL_SCRIPTS.md` or `LEGACY_RETIREMENT_PLAN.md` header — not a new epic doc.

### 5. STRONG_FLAG

`dealbreakers.ts` already states STRONG_FLAG = PENALTY legacy. Story 2 AC satisfied by **confirming** comment; migrating emit sites to `PENALTY` is **optional follow-up** (no behavior change).

---

## package.json — REMOVE these script keys

| Script key | Current behavior |
|------------|------------------|
| `seed:lifestyle-v2-validation` | inline `node -e` DEPRECATED exit 1 |
| `seed:personality-v2-validation` | inline exit 1 |
| `validate:personality-v2` | inline exit 1 |
| `seed:interest-v2-validation` | inline exit 1 |
| `seed:interest-tags-v2-validation` | inline exit 1 |
| `validate:interest-v2` | inline exit 1 |
| `validate:interest-tags-v2` | inline exit 1 |
| `validate:lifestyle-v2` | inline exit 1 |
| `batch:signal-families` | inline exit 1 |
| `seed:hg-validation-minimal` | inline exit 1 |
| `audit:hg-strong-low-evidence` | inline exit 1 |
| `ci:hg-ranking-guard` | runs stub `hg-ranking-signal-ci-guard.ts` → throw |
| `lifestyle-v2:db-report` | runs stub `lifestyle-v2-db-report.ts` → throw |

**KEEP** (document in `OPERATIONAL_SCRIPTS.md`):

`build`, `start:*`, `db:migrate`, `test*`, `lint`, `smoke:*`, `validate:new-model-e2e`, `validate:phase2-me-profile`, `smoke:ws-preflight`, `holy-grail:backfill`, `phase-f:expand-analyzed`, `verify:personality-traits`

---

## scripts/archive — MOVE these files

All paths relative to `dating-api/scripts/`. Group under `archive/retired-matchmaking-profile/`.

**Core legacy / HG validation (prisma.matchmakingProfile):**

- `analyze-all.ts`
- `backfill-hg-gap-structured.ts`
- `backfill-hg-validation-ranking-signals.ts`
- `backfill-legacy-synthetic-structured.ts`
- `ci-seed-hg-validation-minimal.ts`
- `hg-full-system-validation.ts`
- `hg-hard-filter-audit.ts`
- `hg-ranking-signal-ci-guard.ts`
- `hg-soft-pass-simulation.ts`
- `hg-strong-low-evidence-audit.ts`
- `hg-v2-enrichment-batch-analysis.ts`
- `hg-validation-report.ts`
- `lifestyle-v2-db-report.ts`
- `recompute-soft-pass-audit.ts`
- `seed-interest-tags-v2-validation.ts`
- `seed-interest-v2-validation.ts`
- `seed-lifestyle-v2-validation.ts`
- `seed-personality-v2-validation.ts`
- `seed-profiles.ts`
- `v1-signal-families-batch-analysis.ts`
- `validate-lifestyle-signals-v2.ts`

**V2 validation libs + runners (depend on archived seeds / MP libs):**

- `interest-tags-v2-validation.lib.ts`
- `interest-tags-v2-validation.constants.ts`
- `personality-v2-validation.lib.ts`
- `personality-v2-validation.constants.ts`
- `validate-personality-v2.ts`
- `validate-interest-v2.ts`
- `validate-interest-tags-v2.ts`

**README.md template (agent 1):**

```markdown
# Retired MatchmakingProfile scripts

Archived 2026-06-03 (Sprint 7 Story 2). These files called `prisma.matchmakingProfile`, which is no longer in `schema.prisma`.

Do not run. Use product path: `GET /api/v1/me/matches`, `npm run validate:new-model-e2e`, `scripts/validate-phase4-matching.ts`.
```

---

## CI / workflow

| File | Action |
|------|--------|
| `.github/workflows/hg-ranking-signal-guard.yml` | **DELETE** entire workflow |

After delete, grep repo for `ci:hg-ranking-guard`, `ci-seed-hg-validation-minimal`, `hg-ranking-signal-guard` — update only **active** docs (not sprint handoff history).

---

## dist/

| Check | Result |
|-------|--------|
| `.gitignore` contains `/dist` | Yes |
| Tracked `dating-api/dist/**` | None |
| Story action | Document in `OPERATIONAL_SCRIPTS.md` or story DoD: run `npm run build` then confirm `git status` clean under `dist/` |

---

## Documentation updates (minimal)

| Doc | Change |
|-----|--------|
| `LEGACY_RETIREMENT_PLAN.md` | Top matter: **Status: Runtime retired (2026-06)** — POC deleted (Story 1), MP model removed from schema, Slice 9 script archive complete; link `scripts/archive/.../README.md`; Migration 4 “drop tables” deferred |
| `MATCH_ENGINE_V1_CONTRACT.md` | § legacy tables → “retired / removed from schema (2026)” |
| `MATCH_ENGINE_DEEP_DIVE.md` | Same one-line where `MatchmakingProfile` listed |
| `refactor-changelog.md` | Story 2 bullet list |

**Do not edit** sprint handoff markdown under `docs/sprints/**/handoffs/` except agent-1-dev output.

---

## Import / grep checkpoints (agent 1 before PR)

```bash
cd dating-api

# No deprecated npm stubs left:
rg "DEPRECATED.*MatchmakingProfile" package.json
# expect: no matches

# No live scripts calling matchmakingProfile (exclude archive):
rg "matchmakingProfile" scripts/ --glob '!archive/**'
# expect: no matches (validate-phase4-matching.ts only has prose string — OK if moved path unchanged)

# CI workflow gone:
test ! -f ../.github/workflows/hg-ranking-signal-guard.yml

# Full test suite:
npm test
```

---

## Ordered implementation plan (agent 1)

1. Create `scripts/archive/retired-matchmaking-profile/README.md`.
2. `git mv` (or move) all files in archive list; fix any broken relative imports **within archive only** (prefer none).
3. Remove 13 `package.json` script entries.
4. Delete `.github/workflows/hg-ranking-signal-guard.yml`.
5. Update `LEGACY_RETIREMENT_PLAN.md` + contract/deep-dive docs + `refactor-changelog.md`.
6. Add `scripts/OPERATIONAL_SCRIPTS.md`.
7. Run `npm test` and `npm run build`; confirm `git status` has no `dist/` noise.
8. Write `agent-1-dev.md` handoff.

---

## Risks / edge cases

| Risk | Mitigation |
|------|------------|
| Developer bookmarks old `npm run seed:*` | Removed from package.json; archive README explains replacement |
| CI red on PRs until workflow deleted | Delete workflow in same PR as package.json cleanup |
| `validate-phase4-matching.ts` still mentions MP in log string | Keep file; string is documentation only |
| `docs/HOLY_GRAIL_MATCHING.md` describes `ProfileSignalSnapshot` columns | Optional doc note: legacy snapshot table not in current schema; ranking uses new-model path — do not block Story 2 on full HG doc rewrite |

---

## Story AC mapping

| AC | How satisfied |
|----|----------------|
| Deprecated scripts removed/archived | Remove 13 package.json entries; move 27+ script files to archive |
| Phase F documented | Architect summary + dev adds subsection citing migration + schema |
| LEGACY_RETIREMENT_PLAN updated | Header + Slice 9 complete |
| dist/ gitignore | Already satisfied; verify in DoD |
| STRONG_FLAG note | Already in `dealbreakers.ts`; no code change required |
| Validate scripts list | `OPERATIONAL_SCRIPTS.md` |
| Tests pass | `npm test` after changes |

---

## Manual smoke (post dev)

1. `npm run smoke:auth` && `npm run smoke:me-profile` && `npm run smoke:matches`
2. `npm run build` → `git status` shows no new tracked files under `dating-api/dist/`
3. `rg MatchmakingProfile dating-api/docs/MATCH_ENGINE*.md` → historical/retired wording only

---

## Next agent

```text
--agent 1 sprint 7 story 2
```
