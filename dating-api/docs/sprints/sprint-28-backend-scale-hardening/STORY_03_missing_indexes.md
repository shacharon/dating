# Story 03 — Missing indexes

**Sprint 28 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 0.5 day  
**Dependencies:** None (can run after 02)

**Handoffs:** [architect](./handoffs/STORY_03_missing_indexes/agent-0-architect.md) · [dev](./handoffs/STORY_03_missing_indexes/agent-1-dev.md) · [cr](./handoffs/STORY_03_missing_indexes/agent-2-cr.md) · [pm](./handoffs/STORY_03_missing_indexes/agent-3-pm.md)

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

- [x] Migration adds the locked indexes
- [x] Schema reflects indexes
- [x] No breaking query semantics
- [x] Documented how to apply on large prod DB if `CONCURRENTLY` needed offline

## Commit message

```
perf(db): add indexes for unread, photo gate, and match feedback

Sprint 28 Story 3
```
