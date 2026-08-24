# Story 01 — Inbox DB-Level Pagination

**Sprint:** 68  
**Effort:** 1–2 days  
**Risk:** 🟡 MEDIUM (SQL pagination + cursor parity)  
**Status:** Done  
**GO_LIVE:** Backend #6

**Handoffs:** [architect](./handoffs/STORY_01_inbox_db_pagination/agent-0-architect.md) · [dev](./handoffs/STORY_01_inbox_db_pagination/agent-1-dev.md) · [CR](./handoffs/STORY_01_inbox_db_pagination/agent-2-cr.md) · [PM](./handoffs/STORY_01_inbox_db_pagination/agent-3-pm.md)

---

## Objective

Fix `GET /api/v1/me/conversations` loading **all** ACTIVE matches before cursor pagination — O(n) per page request.

**Deliverable:** DB-level inbox page fetch with unchanged API, cursor encoding, and sort order.

---

## Problem (before)

```typescript
// me-conversations.service.ts (list path)
const rows = await repo.findActiveMatchesForUser(sessionUserId); // ALL matches
const unread = await repo.batchUnreadCounts(unreadSpecs);       // ALL unread
ranked.sort(/* unread DESC, matchedAt DESC, id ASC */);
paginateConversationList(ranked, cursor, limit);                // in-memory slice
```

---

## Solution

- New repository method **`listInboxPage`** — single `$queryRaw` SQL:
  - CTE on ACTIVE `MutualMatch` for session user
  - Per-row unread subcount (same semantics as `batchUnreadCounts`)
  - Composite cursor WHERE + `ORDER BY unread DESC, matchedAt DESC, id ASC`
  - `LIMIT limit+1` for `hasMore`
- **`MeConversationsService.list()`** hydrates profiles + last messages for **page IDs only**
- **No Prisma migration**

---

## Success criteria

- [x] List path does not load all matches / batch-unread for full inbox
- [x] Cursor API unchanged (`{ unreadCount, matchedAt, id }` base64url)
- [x] Sort order unchanged (unread DESC → matchedAt DESC → id ASC)
- [x] `hasMore` / `nextCursor` behavior preserved
- [x] Unit + integration tests (107 tests in story scope)
- [x] Agent 2 CR approved

---

## Deferred (not blocking Done)

| Item | Notes |
|------|-------|
| `GET /api/v1/me/conversations/unread-total` O(n) | Same CTE, no LIMIT — follow-up |
| Denormalized unread/lastMessage columns | Future if SQL too slow |
| Staging perf smoke (large match count) | Ops / manual |

---

## Files changed

**New:**
- `src/me-profile/repositories/inbox-list-page.query.ts`
- `src/me-profile/repositories/inbox-list-page.query.spec.ts`
- `src/me-profile/repositories/inbox-list-page.spec-support.ts`

**Modified:**
- `src/me-profile/repositories/conversation.repository.types.ts`
- `src/me-profile/repositories/conversation.repository.ts`
- `src/me-profile/repositories/prisma-conversation.repository.ts`
- `src/me-profile/me-conversations.service.ts`
- `src/me-profile/me-conversations.service.spec.ts`
- `src/me-profile/me-profile-http.shared-harness.ts`
- `src/me-profile/me-profile-http-conversations.integration.spec.ts`

---

## Branch

`feature/sprint-68-story-1` — ready for PR/merge
