# Sprint 70 — P0 God Directory Organization

**Status:** **Complete** (Story 01 Done · Story 02 Done)  
**Depends on:** Sprint 69 Done (test splits first — avoids merge hell on moved specs)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**Round:** 5 (Post-launch-prep hygiene — **P0 only**)

---

## Goal

Organize the two **god directories** into feature folders so developers can navigate in <3 seconds and merge conflicts drop.

**Not microservices. Not a rewrite.** Move-only refactor + README + import path updates.

---

## Why Now

| Directory | Root files | Existing subdirs | Problem |
|-----------|-----------|------------------|---------|
| `src/matches/` | ~~111~~ → **7** | 11 feature folders + `match-narrative/` | ✅ Story 01 Done |
| `src/me-profile/` | ~~103~~ → **7** | `profile/`, `conversations/`, `integration/`, `e2e/`, `contracts/`, `matches/{core,list,rank,detail,actions,support}/` | ✅ Story 02 Done |

Partial cleanup already happened (Sprint 64 moved ranking into `me-profile/matches/`). Sprint 70 finishes the job.

---

## Principles (mandatory)

- **Feature folders (domain boundaries), not layer folders** — group by *what* (conversations, explainability), not *how* (controllers, services).
- **NestJS module stays at root** — `matches.module.ts`, `me-profile.module.ts`, controllers can stay root or move to `api/` subfolder (architect picks one convention per module).
- **Move-only:** zero behavior changes; same public API paths.
- **README required** per module — folder map + “where to add new code”.
- **Barrel files optional** — prefer explicit imports; add `index.ts` only if it reduces noise without hiding structure.

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Organize matches/ feature folders](./STORY_01_organize_matches_directory.md) | 2–3 days | ⚠️ MEDIUM (wide import graph) | **Done** |
| 02 | [Organize me-profile/ feature folders](./STORY_02_organize_me_profile_directory.md) | 2–3 days | ⚠️ MEDIUM | **Done** |

**Order:** 01 → 02 (matches has fewer cross-module dependents from me-profile).

---

## Success Criteria

- [x] `matches/` root ≤15 files (module, controllers, barrel if any, README)
- [x] `me-profile/` root ≤15 files
- [x] Each `matches/` feature subfolder ≤25 files
- [x] Each `me-profile/` feature subfolder ≤25 files
- [x] `README.md` in `matches/` with folder map
- [x] `README.md` in `me-profile/` with folder map
- [x] `npm test -- matches/` — no new failures vs 756/757 baseline
- [x] `npm test -- me-profile/` — no new failures vs 699/716 baseline
- [ ] `npm run build` green (pre-existing messaging-realtime + harness TS2345 — out of scope)
- [x] No new circular imports

---

## What This Is NOT

- ❌ Not splitting god **services** (P1 — match-ranking 544 LOC stays for now)
- ❌ Not extraction/ or holy-grail-matching/ (P1 backlog)
- ❌ Not microservices — folders are **preparation**, not extraction

---

## Architecture verdict

**אפכבא מסתברא — yes, it makes sense.**

Same modular monolith. Better **cohesion** (files that change together live together). Sets up optional future service extraction without paying microservices cost today.
