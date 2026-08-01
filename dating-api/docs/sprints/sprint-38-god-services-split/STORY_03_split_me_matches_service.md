# Story 03 — Split MeMatchesService

**Sprint 38 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 3 days  
**Dependencies:** Story 02 preferred; Story 01 helpful  
**Repo:** `dating-api` only  
**Risk:** High (core match list / detail path)

---

## Objective

Decompose `src/me-profile/me-matches.service.ts` (~2050 LOC) into focused services with `MeMatchesService` as a thin orchestrator. **No HTTP/DTO contract changes.**

## Why

Single class owns list pagination, materialized ranks, cache, full rebuild scoring, HG/dealbreaker gates, detail narrative, and photo file reads — SRP failure and review risk.

## Target split (Architect may adjust names)

| Service | Responsibility |
|---------|----------------|
| `MatchListQueryService` | Viewer gate, rank page fetch, candidate SQL where, cursor helpers |
| `MatchEligibilityService` | Reciprocal gender, HG hard-fail, existing hard-block, BLOCK filter |
| `MatchRankingService` | `compareWithStatus` loop, sort, rank snapshot build |
| `MatchListCacheService` | Redis get/set/invalidate + empty-enqueue NX |
| `MatchHydrationService` | DTO assembly, photo URLs, hardBlocked DTO |
| `MeMatchesService` | Public API used by controller/workers: `list`, `getById`, `rebuildMatchListRanks`, etc. |

Optional: keep narrative resolution as private helper or `MatchNarrativeFacade` if it keeps orchestrator thin.

## Scope / tasks

1. Architect locks file layout + public method ownership map.
2. Move code with behavior parity; prefer extract-then-delegate over rewrite.
3. Preserve Sprint 31 materialized path (`listFromMaterializedRanks`) and legacy cache path.
4. Keep worker entrypoints (`buildMatchListRankSnapshot`, `persistMatchListRankSnapshot`, `rebuildMatchListRanks`) working.
5. Update specs / fix imports; add focused unit tests for new services where gaps appear.
6. Feature flag **optional** (`FEATURE_SPLIT_MATCH_SERVICE`) only if Architect requires shadow path; default preference is straight extract with strong tests.

## Out of scope

- Changing match scores / HG policy
- Repository abstraction (Sprint 39)
- Engine stage pipeline (Sprint 40)
- Frontend changes

## Acceptance criteria

- [ ] Orchestrator + collaborators; no single file > ~600 LOC for the former god class (Architect sets hard cap)
- [ ] Controllers still call the same Nest provider API surface (or thin facade with identical method signatures)
- [ ] Unit + integration specs for me-matches green
- [ ] `npm run smoke:me-profile` / match-related smoke green
- [ ] No breaking response shape for `/api/v1/me/matches` list/detail

## Suggested commit

```
refactor(me-matches): split god service into domain collaborators

Sprint 38 Story 3
```
