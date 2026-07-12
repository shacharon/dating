# Story 1: Delete frozen legacy paths

**Sprint:** 7  
**Status:** Done (engineering gate — manual product smoke pending operator)  
**Depends on:** —

---

## Why

Several code paths were annotated **LEGACY FROZEN** or **LEGACY PATH — FROZEN** but still lived in the codebase. They added maintenance burden, confused new developers, and risked accidental imports. Product flow uses `/api/v1/me/*` and Holy Grail matching — legacy analyze paths are now removed.

---

## What

**As a** codebase maintainer  
**I want** frozen legacy controllers and services removed  
**So that** the repo reflects only active product paths

### Acceptance criteria

- [x] **Audit complete** — import graph in `agent-0-architect.md`; grep checkpoint in agent handoffs
- [x] **Remove frozen analyze path** — `ProfilesAnalyzeController` + cache/failures persistence deleted
- [x] **Remove frozen extraction persistence** — `ExtractionV2PersistenceService` + V2 chain deleted; `ExtractionModule` removed from `AppModule`
- [x] **Audit `profiles-prisma.service.ts`** — slimmed (removed frozen `save`/`saveToPrisma`); stub readers kept for admin/compare
- [x] **Audit `legacy/` module** — **kept** (active imports: admin routes + scripts); documented in architect handoff
- [x] **UI POC routes** — **removed** `dating-ui/src/app/poc/**` (6 files)
- [x] **Build + tests pass** — API + UI build green; **1242/1242** Jest pass
- [x] **No broken imports** — zero runtime references; `legacy-deletion.guard.spec.ts` regression guard

### Out of scope (this story)

- Deprecated npm scripts (Story 2)
- Database column drops (Story 2)
- Match engine logic changes

---

## Technical notes

See `handoffs/STORY_01_delete_frozen_legacy_paths/agent-0-architect.md`.

**Removed API surface:** `GET/POST /api/profiles/*analyze*`  
**Unchanged:** `/api/v1/me/*`, `POST /api/v1/profiles/evaluate` (evaluate-only, no persist), `legacy/` admin routes

---

## Definition of done

- [x] Import audit documented in architect handoff
- [x] Deleted files listed in dev handoff
- [x] All tests pass (1242/1242)
- [x] Docs updated (`refactor-changelog.md`, `PROFILES_EVALUATE_PIPELINE_MAP.md`)

---

## Shipped (2026-06-03)

| Area | Deliverable |
|------|-------------|
| Analyze cluster | Deleted controller + dependents |
| V2 extraction | Deleted `ExtractionModule` + V2 services |
| Profiles evaluate | No DB persist; `ProfilesController` slimmed |
| UI | POC routes removed |
| Tests | `legacy-deletion.guard.spec.ts`, `profiles.controller.spec.ts` |

Handoffs: `handoffs/STORY_01_delete_frozen_legacy_paths/agent-*.md`

---

## Manual smoke

**Pending operator** (build/tests verified in CI/dev):

1. `npm run build` (API + UI)  
2. Core product flow: login → matches → like → conversation → message  
3. `/evaluate` returns JSON; `/poc` returns 404  

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Manual product smoke sign-off | Operator |
| Deprecated npm scripts | Story 2 |
| DB column/table drops | Story 2 |
| `scripts/analyze-all.ts` | Story 2 |
