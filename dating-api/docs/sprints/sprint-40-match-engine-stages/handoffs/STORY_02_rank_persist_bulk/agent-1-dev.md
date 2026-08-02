# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 implement  
**Story:** [STORY_02_rank_persist_bulk.md](../../STORY_02_rank_persist_bulk.md)  
**Sprint:** sprint-40-match-engine-stages  
**Date:** 2026-08-02  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

`persistMatchListRankSnapshot` now upserts in short chunked transactions (`Promise.all`, chunk 100, timeout 20s / maxWait 10s), then `deleteMany(notIn)` outside those txns. budget_exceeded / not_ready / empty unchanged. Rebuild still persist → invalidate.

---

## Files

| Path | Change |
|------|--------|
| `match-list-rank-persist.constants.ts` | `MATCH_LIST_RANK_PERSIST_CHUNK`, `MATCH_LIST_RANK_PERSIST_TX` |
| `me-matches.service.ts` | Upsert-before-delete chunked persist |
| `match-list-rank-persist.spec.ts` | Order + multi-chunk coverage |

---

## Ops / failure

If a chunk `$transaction` times out or errors, the rebuild fails as before (Bull retry / inline throw). **No** partial resume — next successful rebuild rewrites the full snapshot. Mid-failure may leave extra stale rows until a later successful delete-stale step.

---

## Tests

```bash
npx jest src/me-profile/match-list-rank-persist.spec.ts --runInBand
# 6 passed

npm run typecheck
# passed
```

---

## Commit

Not committed (Agent 3). Suggested:

```
perf(match-list): tighten MatchListRank persist transactions

Sprint 40 Story 2
```

---

## Next command

```text
--agent 2 sprint 40 story 2
```
