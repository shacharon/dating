# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 implement  
**Story:** [STORY_02_remove_circular_deps.md](../../STORY_02_remove_circular_deps.md)  
**Sprint:** sprint-38-god-services-split  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Broke service-level `forwardRef` between `MeMatchesService` and `MatchListRankQueueService` using ports + Symbol tokens. Queue resolves rebuild via `ModuleRef.get(MATCH_LIST_RANK_REBUILD_PORT)`. Enqueue callers inject `MATCH_LIST_RANK_QUEUE_PORT`. Module-level MeProfile ↔ Worker `forwardRef` kept and documented (ProfileAnalysis still needs MeProfile).

---

## Files touched

| Path | Change |
|------|--------|
| `src/workers/match-list-rank.ports.ts` | **New** — ports + tokens |
| `src/workers/match-list-rank.worker.ts` | Port impl; ModuleRef rebuild; no `forwardRef` |
| `src/workers/worker.module.ts` | Export `MATCH_LIST_RANK_QUEUE_PORT`; doc comment |
| `src/me-profile/me-profile.module.ts` | Provide/export `MATCH_LIST_RANK_REBUILD_PORT` |
| `src/me-profile/me-matches.service.ts` | Inject queue port; `implements MatchListRankRebuildPort` |
| `src/me-profile/me-profile.service.ts` | Inject queue port |
| `src/me-profile/me-match-actions.service.ts` | Inject queue port |
| `src/me-profile/me-conversations.service.ts` | Inject queue port |
| `src/workers/profile-analysis.worker.ts` | Inject queue port |
| `src/workers/match-list-rank.worker.spec.ts` | ModuleRef mock |
| `src/workers/profile-analysis.worker.spec.ts` | Port type |
| `docs/.../sprint-38.../README.md` | Remaining `forwardRef` table |

Bull queue string `MATCH_LIST_RANK_QUEUE = 'match-list-rank'` untouched.

---

## Tests run

```bash
cd dating-api
npx jest src/workers/match-list-rank.worker.spec.ts src/workers/profile-analysis.worker.spec.ts src/me-profile/me-matches.service.spec.ts src/me-profile/me-matches-materialized-list.spec.ts src/me-profile/me-match-actions.service.spec.ts --runInBand
# 5 suites, 125 tests — passed

npm run typecheck
# passed
```

Smoke `me-profile` not run this turn (optional).

---

## Remaining forwardRef (documented)

- MeProfileModule ↔ WorkerModule (intentional)
- Auth / MessagingRealtime / Admin / Reports / MeAccount — out of scope

---

## Commit

Not committed (Agent 3). Suggested:

```
refactor(workers): break MeMatches ↔ rank-queue circular DI

Sprint 38 Story 2
```

---

## Next command

```text
--agent 2 sprint 38 story 2
```
