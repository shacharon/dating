# Story 02 — Deprecate/Quarantine Legacy Matches.service

**Sprint:** 64  
**Effort:** 2 days  
**Risk:** ⚡ LOW–MED  
**Status:** Done  
**Branch:** `feature/sprint-64-story-2`  
**Handoffs:** [preflight](./handoffs/story-02-legacy-matches-cleanup/agent--1-preflight.md) · [architect](./handoffs/story-02-legacy-matches-cleanup/agent-0-architect.md) · [dev](./handoffs/story-02-legacy-matches-cleanup/agent-1-dev.md) · [cr](./handoffs/story-02-legacy-matches-cleanup/agent-2-cr.md) · [pm](./handoffs/story-02-legacy-matches-cleanup/agent-3-pm.md)

---

## Objective

Clean up the dual match stacks: product (`MeMatches*`) vs legacy (`matches.service` 503 LOC + Prisma).

---

## Current State (post-close)

| Stack | Path | Status |
|-------|------|--------|
| **Product** | `me-profile/me-matches*.service.ts` → match repos | Clean, used by mobile |
| **Legacy** | `admin-legacy/matches/matches.service.ts` → Prisma | Quarantined; admin/compare/HG diagnostics only |

---

## Implementation (Option A)

- Created `src/admin-legacy/` with README + `AdminLegacyModule`
- Moved legacy runtime closure to `admin-legacy/matches/` (service, controllers, HG helpers)
- Removed `MatchesModule`; deleted unwired `matches-scan` / `matches-analytics`
- Shared match engine remains in `src/matches/`
- `@deprecated` on `MatchesService`, `MatchesController`, `MatchesApiController`

**Commits:** `ce6bb00` (refactor) · `dfb4372` (boundary wiring tests)

---

## Success

- [x] Legacy stack isolated (folder + deprecation markers)
- [x] Product match stack is the obvious choice (`admin-legacy/README.md`)
- [x] No mobile endpoints touch legacy stack (boundary spec enforced)
- [x] Tests green (51 passed — legacy + wiring specs)

---

## Pipeline

| Agent | Verdict |
|-------|---------|
| -1 Pre-flight | ready |
| 0 Architect | ready (Option A) |
| 1 Dev | complete (`ce6bb00`) |
| 2 CR | approved (`dfb4372`) |
| 4 E2E | N/A |
| 3 PM | Done |
