# Story 04 — Batch unread counts

**Sprint 28 · Status: IN REVIEW** (Agent 1 implemented → Agent 2 CR)  
**Priority:** P1  
**Estimated effort:** 0.5–1 day  
**Dependencies:** Story 03 helps but is not a hard blocker

**Handoffs:** [architect](./handoffs/STORY_04_batch_unread_counts/agent-0-architect.md) · [dev](./handoffs/STORY_04_batch_unread_counts/agent-1-dev.md)

---

## Objective

Replace per-conversation `message.count` loops on the inbox list with one grouped query (or equivalent batch).

## Why

Scale CR: conversations list issues N COUNT queries — bad under many mutual matches / tab refetches.

## Scope / tasks

1. Find inbox/unread count path in me-conversations (or related) service.
2. Architect locks: single `GROUP BY` / raw SQL / Prisma groupBy — keep response DTO stable.
3. Specs: same unread numbers as before for fixtures; empty inbox OK.
4. **Out of scope:** conversation cursor pagination API (Sprint 29) and denormalized `unreadCount` column (optional later).

## Acceptance criteria

- [ ] Inbox list does not N+1 `message.count` per conversation
- [ ] Unread totals match prior semantics
- [ ] Unit/integration coverage for multi-conversation unread
- [ ] No FE contract break

## Commit message

```
perf(messaging): batch conversation unread counts in one query

Sprint 28 Story 4
```
