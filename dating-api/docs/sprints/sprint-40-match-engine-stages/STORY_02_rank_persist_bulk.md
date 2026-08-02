# Story 02 — MatchListRank persist transaction tighten

**Sprint 40 · Status: Planned**  
**Priority:** P1  
**Estimated effort:** 1 day  
**Dependencies:** Sprint 38 Story 03 (persist lives in split ranking/persist path)  
**Repo:** `dating-api` only

---

## Objective

Reduce long Prisma transactions in `persistMatchListRankSnapshot` (delete stale + many per-row upserts in one txn). Prefer shorter transactions and/or bulk-friendly writes without changing rank semantics.

## Why

Audit: looping upserts inside `$transaction` holds locks; large rebuilds amplify contention.

## Scope / tasks

1. Architect locks approach: chunked txns vs `createMany` + update strategy vs raw SQL upsert — must be correct under concurrent rebuilds for same viewer.
2. Keep delete-stale + upsert semantics (score / hardBlocked / builtAt).
3. Add/adjust unit tests around persist counts.
4. Timeout / error handling documented.

## Out of scope

- Changing MatchListRank schema
- Changing list cursor encoding

## Acceptance criteria

- [ ] No single unbounded multi-thousand sequential upsert in one open txn (or Architect-approved equivalent with measured improvement)
- [ ] Persist tests green
- [ ] Rebuild still invalidates Redis list cache after persist
- [ ] No list API change

## Suggested commit

```
perf(match-list): tighten MatchListRank persist transactions

Sprint 40 Story 2
```
