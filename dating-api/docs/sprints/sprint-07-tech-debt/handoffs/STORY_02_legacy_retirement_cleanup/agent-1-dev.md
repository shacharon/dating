# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_legacy_retirement_cleanup.md](../../STORY_02_legacy_retirement_cleanup.md)  
**Sprint:** sprint-07-tech-debt  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

Implemented architect plan: removed 13 dead npm scripts, deleted broken HG ranking CI workflow, archived 28 MatchmakingProfile-era scripts, updated retirement/docs, added operational script index. No Prisma migration. **1255/1255** tests pass; `npm run build` green.

---

## Changes

| Area | Detail |
|------|--------|
| `package.json` | Removed 13 deprecated script keys (`ci:hg-ranking-guard`, inline DEPRECATED stubs, `lifestyle-v2:db-report`) |
| `.github/workflows/hg-ranking-signal-guard.yml` | **Deleted** |
| `scripts/archive/retired-matchmaking-profile/` | **28** `.ts` files moved via `git mv` + README |
| Archive imports | `from '../src/` → `from '../../../src/` in archived files that import app code |
| `scripts/OPERATIONAL_SCRIPTS.md` | **Created** — smokes, validates, Phase F, dist note |
| `LEGACY_RETIREMENT_PLAN.md` | Status → runtime retired; Slice 9 complete |
| `docs/refactor-changelog.md` | Story 2 checkpoint |
| `docs/MATCH_ENGINE_V1_CONTRACT.md` | MP marked retired |
| `docs/MATCH_ENGINE_DEEP_DIVE.md` | MP marked retired |
| `docs/HOLY_GRAIL_MATCHING.md` | 2026-06 note on legacy tables vs current schema |

**Kept in `scripts/`:** `validate-phase4-matching.ts`, `smoke-ws-preflight.ts`, `phase-f-expand-analyzed-profiles.ts`, `truncate-all-tables.ts`, reanalyze/backfill utilities, etc.

---

## Verification

```text
rg "DEPRECATED.*MatchmakingProfile" package.json     → no matches
rg "matchmakingProfile" scripts/ --glob '!archive/**'  → no matches (prose in validate-phase4 only)
npm test                                               → 1255 passed
npm run build                                          → OK
```

---

## Manual smoke (operator)

1. `npm run smoke:auth` / `smoke:me-profile` / `smoke:matches`
2. `git status` after build — `dist/` should not be tracked

---

## Next agent

```text
--agent 2 sprint 7 story 2
```
