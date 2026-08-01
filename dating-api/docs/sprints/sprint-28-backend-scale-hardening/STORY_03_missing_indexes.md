# Story 03 — Missing indexes

**Sprint 28 · Status: IN REVIEW** (Agent 2 CR **PASS** → Agent 3 PM)  
**Priority:** P1  
**Estimated effort:** 0.5 day  
**Dependencies:** None (can run after 02)

**Handoffs:** [architect](./handoffs/STORY_03_missing_indexes/agent-0-architect.md) · [dev](./handoffs/STORY_03_missing_indexes/agent-1-dev.md) · [cr](./handoffs/STORY_03_missing_indexes/agent-2-cr.md)

---

## Objective

Add indexes for hot paths called out in the scale CR so unread counts, photo gates, and admin feedback stay cheap as data grows.

## Why

Missing compound / partial indexes force sequential scans or expensive filters under load.

## Scope / tasks

1. Architect locks exact index definitions for:
   - Message unread path (`conversationId`, status, `createdAt` or equivalent)
   - Photo gate (`status`, `profileId` — partial if useful)
   - MatchFeedback admin (`sentiment`, `createdAt` or equivalent)
2. Prisma migration; prefer `CONCURRENTLY` where safe (Architect notes Prisma limitations).
3. Confirm no duplicate of existing indexes in `schema.prisma`.

## Acceptance criteria

- [ ] Migration adds the locked indexes
- [ ] Schema reflects indexes
- [ ] No breaking query semantics
- [ ] Documented how to apply on large prod DB if `CONCURRENTLY` needed offline

## Commit message

```
perf(db): add indexes for unread, photo gate, and match feedback

Sprint 28 Story 3
```
