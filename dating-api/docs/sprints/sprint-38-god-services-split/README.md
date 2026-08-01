# Sprint 38 — God Services Split (P0)

**Status:** 📋 Planned  
**Depends on:** Sprint 37 Done (UI profile polish). Backend-only.  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md) · Audit: post–UI stretch backend architecture scan (2026-08-01)

**Context:** UI track finished Sprint 37. Next backend work starts here at **Sprint 38** (do not reuse 34–36 — those are UI sprints).

---

## Goal

Break critical “god” services and kill structural debt that blocks maintainability:

1. Extract magic numbers from match scoring into named constants (quick win)
2. Remove `forwardRef` circular deps between match list + rank queue
3. Split `MeMatchesService` (~2050 LOC) into focused domain services
4. Split `MeProfileService` (~1200 LOC) into focused domain services

**Non-goals:** Repository pattern (Sprint 39), match-engine pipeline rewrite (Sprint 40), API contract changes, UI work.

---

## Stories

| # | Story | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 01 | [Extract matching algorithm constants](./STORY_01_extract_matching_constants.md) | P0 | 0.5d | **Done** |
| 02 | [Remove circular dependencies](./STORY_02_remove_circular_deps.md) | P0 | 1d | **Done** |
| 03 | [Split MeMatchesService](./STORY_03_split_me_matches_service.md) | P0 | 3d | Rejected (re-run Agent 1) |
| 04 | [Split MeProfileService](./STORY_04_split_me_profile_service.md) | P0 | 2d | **Done** |

**Order:** 01 → 02 → 03 → 04 (4 agents each: `--agent 0..3 sprint 38 story N`).  
01 is independent; 02 should land before 03 (queue injection). 03 and 04 can parallel after 02 if two engineers.

### Remaining `forwardRef` after Story 2 (intentional / out of scope)

| Edge | Status |
|------|--------|
| MeMatches ↔ MatchListRankQueue **services** | **Removed** (ports + ModuleRef) |
| MeProfileModule ↔ WorkerModule | **Kept** — ProfileAnalysisQueueService still needs MeProfile services |
| MeProfile ↔ Auth / MessagingRealtime | Unchanged (out of scope) |
| Admin / Reports / MeAccount ↔ Auth (or Worker) | Unchanged (out of scope) |

Follow-up (not this sprint): break Worker→MeProfile via analysis ports + ModuleRef similar to Story 2.

---

## Success metrics

| Metric | Before | Target |
|--------|--------|--------|
| Largest service LOC | ~2051 (`me-matches.service.ts`) | <500 orchestration + focused services |
| `forwardRef` in match path | Present | 0 |
| Magic numbers in `match-engine.ts` thresholds | Embedded literals | Named constants |
| API / DTO contracts | Current | Unchanged |

---

## Roadmap after this sprint

| Next | Focus |
|------|--------|
| **39** | [Repository + scale hardening](../sprint-39-repo-and-scale/README.md) |
| **40** | [Match engine stages + txn/query ops](../sprint-40-match-engine-stages/README.md) |
