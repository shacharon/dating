# Story 01 — Decompose MatchRankingService

**Sprint:** 71  
**Effort:** 2–3 days  
**Risk:** ⚠️ MEDIUM — `/me/matches` list + worker rank rebuild hot path  
**Status:** Done  

**Handoffs:** [preflight](./handoffs/STORY_01_decompose_match_ranking/agent--1-preflight.md) · [architect](./handoffs/STORY_01_decompose_match_ranking/agent-0-architect.md) · [dev](./handoffs/STORY_01_decompose_match_ranking/agent-1-dev.md) · [CR](./handoffs/STORY_01_decompose_match_ranking/agent-2-cr.md) · [PM](./handoffs/STORY_01_decompose_match_ranking/agent-3-pm.md)

---

## Objective

Split `me-profile/matches/list/match-ranking.service.ts` (post–Sprint 70) so `buildFullRankedList` is not a 400-line method inside a 544-line class.

**Public API unchanged:**

- `buildMatchListRankSnapshot(viewerUserId, options?)`
- `persistMatchListRankSnapshot(...)`
- `buildFullRankedList(userId, options?)`

---

## Root cause

Sprint 38 extracted `MatchEligibilityService`, `MatchListQueryService`, etc. from the old `me-matches.service` god class — but the **rank rebuild scoring loop** stayed inside `MatchRankingService.buildFullRankedList`:

1. Load viewer + gate (photo, analyzed)
2. Load candidates (pool or page hydrate)
3. Batch-load evals + actions + mutuals
4. **Score loop** (HG dimensions, dealbreakers, pair policy, hard blocks)
5. Assemble DTOs + sort + telemetry

Steps 1–5 belong in separate collaborators.

---

## Target layout (locked — Agent 0)

```
me-profile/matches/list/ranking/
  match-list-ranking.types.ts
  match-list-candidate-loader.service.ts
  match-list-candidate-scorer.service.ts
  match-list-response-assembler.service.ts
  match-list-rank-telemetry.service.ts
  match-ranking.service.ts              # thin orchestrator ≤200 LOC
  match-ranking.service.spec.ts
  match-list-candidate-scorer.service.spec.ts
  match-ranking-spec-size.policy.spec.ts
```

Cap: orchestrator **200**, collaborators **250** non-empty LOC.

---

## Collaborator responsibilities

| Collaborator | Owns | Injects |
|--------------|------|---------|
| **Loader** | Viewer context, photo gate, candidate SQL/page hydrate, eval batch, action map, mutual set | `IMatchQueryRepository`, `StructuredObservabilityService`, `AnalyticsService` |
| **Scorer** | Per-candidate loop: eligibility, HG/dealbreaker telemetry accumulators, pair policy, deadline/budget | `MatchEligibilityService`, `PairMatchPolicy`, HG extract helpers |
| **Assembler** | `toMeMatchListItem`, sort, `appendPendingHardBlockMatches`, ready/not_ready response shape | mappers, `IMatchRankRepository` (if persist inline) |
| **Telemetry** | `recordMatchList*` metrics, HG/dealbreaker log formatting, `MATCH_LIST_VIEWED` analytics | observability helpers |

---

## Tasks

1. Agent 0: Method ownership map + line-range extract plan for `buildFullRankedList`.
2. Extract collaborators as `@Injectable()`; register in `me-profile.module.ts`.
3. `MatchRankingService` delegates; keep constructor deps minimal (facade pattern).
4. Move private helpers with their collaborator (don't leave orphans in facade).
5. Update `match-ranking.service.spec.ts`; add unit tests for Scorer in isolation (mock loader output).
6. Run: `npm test -- match-ranking`, `npm test -- me-matches`, worker rank rebuild specs.

---

## Out of scope

- Changing scores, HG policy, or candidate cap logic
- New repository methods
- HTTP DTO shape changes

---

## Success

- [x] `match-ranking.service.ts` ≤200 LOC (104 non-empty)
- [x] Each collaborator ≤250 LOC
- [x] `buildFullRankedList` behavior identical (characterization tests green)
- [x] Worker `buildMatchListRankSnapshot` / `persistMatchListRankSnapshot` unchanged externally

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
