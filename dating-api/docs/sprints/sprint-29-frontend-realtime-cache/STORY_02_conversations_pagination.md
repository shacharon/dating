# Story 02 — Conversations cursor + unread-total

**Sprint 29 · Status: CR PASS → Agent 3 PM**  
**Priority:** P0  
**Estimated effort:** 1–1.5 days  
**Dependencies:** Sprint 28 Story 4 (batched unread on full list) — pagination replaces “return all”

**Handoff:** [`handoffs/STORY_02_conversations_pagination/agent-0-architect.md`](./handoffs/STORY_02_conversations_pagination/agent-0-architect.md) · [`agent-1-dev.md`](./handoffs/STORY_02_conversations_pagination/agent-1-dev.md) · [`agent-2-cr.md`](./handoffs/STORY_02_conversations_pagination/agent-2-cr.md)

---

## Objective

Paginate `GET /api/v1/me/conversations` with a cursor and add a cheap `unread-total` (or equivalent) so badges/nav do not need the full inbox payload.

## Why

Full inbox + tab-focus refetch scales poorly (SCALE CR). Unread batching helped COUNT cost; payload size remains.

## Scope / tasks

1. Architect locks: cursor shape, page size, sort stability, response DTO (`nextCursor`, items). ✅
2. Implement API + update `dating-ui` conversations list / API client.
3. Add lightweight unread aggregate endpoint for nav badge (Architect names path). ✅ `GET .../conversations/unread-total`
4. Specs: API pagination; FE empty / first page / next page; badge uses total without full list if locked.

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| Strategy | In-memory page after batch unread + sort (unread DESC, matchedAt DESC) |
| Default / max limit | **20** / **50** |
| Response | `{ conversations, nextCursor, hasMore }` |
| Cursor | Opaque `{ unreadCount, matchedAt, id }` |
| Unread total | `GET /api/v1/me/conversations/unread-total` → `{ totalUnread }` |
| Nav badge | Uses unread-total — **not** sum of current page |

## Acceptance criteria

- [x] Conversations list is cursor-paginated (default page size locked)
- [x] Unread-total (or locked equivalent) available without full inbox
- [x] FE list + badge updated; no contract surprise for other clients (document)
- [x] Tests cover API + primary FE paths

## Commit message

```
feat(messaging): paginate conversations and add unread-total

Sprint 29 Story 2
```
