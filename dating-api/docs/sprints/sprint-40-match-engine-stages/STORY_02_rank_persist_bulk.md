# Story 02 — MatchListRank persist transaction tighten

**Sprint 40 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 1 day  
**Dependencies:** Sprint 38 Story 03 preferred but **not required** (persist still on `MeMatchesService`)  
**Repo:** `dating-api` only  
**Handoffs:** [agent-0-architect.md](./handoffs/STORY_02_rank_persist_bulk/agent-0-architect.md) · [agent-1-dev.md](./handoffs/STORY_02_rank_persist_bulk/agent-1-dev.md) · [agent-2-cr.md](./handoffs/STORY_02_rank_persist_bulk/agent-2-cr.md) · [agent-3-pm.md](./handoffs/STORY_02_rank_persist_bulk/agent-3-pm.md)

---

## Objective

Reduce long Prisma transactions in `persistMatchListRankSnapshot` (delete stale + many per-row upserts in one txn). Prefer shorter transactions and/or bulk-friendly writes without changing rank semantics.

## Why

Audit: looping upserts inside `$transaction` holds locks; large rebuilds amplify contention.

## Locked policy (Architect)

| Item | Decision |
|------|----------|
| Approach | Chunked upserts (`Promise.all` per chunk of 100), **then** `deleteMany(notIn)` |
| Order | Upsert-before-delete (safer mid-failure than delete-first) |
| Raw SQL bulk | Out of scope |
| Chunk constant | `MATCH_LIST_RANK_PERSIST_CHUNK = 100` (not in scoring constants) |
| MeMatches split | Do not wait — implement on current service |

## Scope / tasks

1. Architect locks approach: chunked txns vs `createMany` + update strategy vs raw SQL upsert — must be correct under concurrent rebuilds for same viewer.
2. Keep delete-stale + upsert semantics (score / hardBlocked / builtAt).
3. Add/adjust unit tests around persist counts.
4. Timeout / error handling documented.

## Out of scope

- Changing MatchListRank schema
- Changing list cursor encoding
- Raw SQL `ON CONFLICT` bulk

## Acceptance criteria

- [x] No single unbounded multi-thousand sequential upsert in one open txn (or Architect-approved equivalent with measured improvement)
- [x] Persist tests green
- [x] Rebuild still invalidates Redis list cache after persist
- [x] No list API change

## Suggested commit

```
perf(match-list): tighten MatchListRank persist transactions

Sprint 40 Story 2
```
