# Story 01 — Materialized rank schema

**Sprint 31 · Status: CR PASS → Agent 3 PM**  
**Priority:** P0  
**Estimated effort:** 0.5–1 day  
**Dependencies:** None (opens the sprint)

**Handoff:** [`handoffs/STORY_01_materialized_rank_schema/agent-0-architect.md`](./handoffs/STORY_01_materialized_rank_schema/agent-0-architect.md) · [`agent-1-dev.md`](./handoffs/STORY_01_materialized_rank_schema/agent-1-dev.md) · [`agent-2-cr.md`](./handoffs/STORY_01_materialized_rank_schema/agent-2-cr.md)

---

## Objective

Add a durable **viewer × candidate** rank table (Prisma + migration + indexes) that can hold precomputed match list rows for async rebuild and DB-cursor reads.

## Why

Request-path rebuild + `MATCH_LIST_CANDIDATE_CAP` cannot scale fairly. Persistence is the foundation for Stories 02–05.

## Scope / tasks

1. Architect locks: table/model name, PK/unique, columns (score, rank vs order-by-score, reason/snippet fields?, builtAt), indexes for `(viewerUserId, score DESC, id)`, retention/TTL policy if any. ✅
2. Prisma model + migration. ✅
3. Document relationship to existing Redis match-list cache (cache remains optional accelerator; source of truth becomes table after Story 04/05). ✅
4. Unit/integration: model creates; unique constraint; index presence smoke if team pattern exists. ✅

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| Model | `MatchListRank` |
| Unique | `(viewerUserId, candidateProfileId)` |
| Score | `Float`; unscored → **`-1`** (not SQL null) |
| Bucket | `hardBlocked` boolean (eligible first) |
| Thin row | No nickname/photos/explainability/actions — hydrate later |
| TTL | None; rebuild deletes stale pairs; FK cascade |
| Redis | Unchanged SoT until Story 04/05 |

## Acceptance criteria

- [x] Schema + migration landed  
- [x] Indexes support list-by-viewer ordered reads  
- [x] Architect lock doc lists columns + uniqueness  
- [x] No production cutover yet (empty table OK)

## Commit message

```
feat(matches): add materialized match rank schema

Sprint 31 Story 1
```
