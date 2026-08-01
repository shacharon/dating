# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_conversations_pagination.md](../../STORY_02_conversations_pagination.md)  
**Sprint:** sprint-29-frontend-realtime-cache  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Paginate conversations list response + add unread-total for nav badge. Skip Agent 4 if API unit + HTTP list/unread-total coverage lands with FE vitest.

---

## Summary

`GET /api/v1/me/conversations` returns the **full** inbox after batch unread + sort (unread DESC, `matchedAt` DESC). Nav badge [`ConversationUnreadProvider`](../../../../../dating-ui/src/contexts/conversation-unread-context.tsx) refetches that full list and `sumUnreadCounts`. SCALE CR: cut payload + give badge a cheap total. Sort depends on computed unread → **in-memory page after load** (same spirit as match-list ranked cursor), not a pure SQL `createdAt` cursor.

---

## Current semantics (must preserve)

| Item | Behavior |
|------|----------|
| Rows | `MutualMatch` ACTIVE where user is participant |
| Per-row unread | Peer `SENT` + `lastReadAt` (batch helper from Sprint 28) |
| Sort | `unreadCount` DESC, then `matchedAt` DESC |
| Item DTO | `id`, `otherUser`, `matchedAt`, `unreadCount` |

---

## Decisions (do not reverse without discussion)

### 1. Pagination strategy (locked) — in-memory after batch + sort

1. `findMany` all ACTIVE matches for user (same select as today).  
2. Batch unread for **all** rows (existing helper / chunk 200).  
3. Build DTOs + sort (unchanged comparator).  
4. Slice page with opaque cursor + limit.  
5. Hydrate `otherUser` profiles for **page rows only** (optional optimization: today profiles load for all — Agent 1 **should** restrict `userProfile.findMany` to page `otherUserId`s after sort/slice to cut payload work).

**Not this story:** denormalized unread column, DB cursor on `createdAt` only (would break unread-first sort).

### 2. Query + response DTO (locked)

**Query** (`GET /api/v1/me/conversations`):

| Param | Rules |
|-------|--------|
| `limit` | Optional int; default **20**; max **50**; invalid → 400 |
| `cursor` | Optional opaque string; invalid → 400 |

**Response:**

```ts
{
  conversations: ConversationListItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

- Empty inbox: `{ conversations: [], nextCursor: null, hasMore: false }`.  
- **Breaking for “return all”:** product UI is the only client; document in story/ops one-liner. No `?all=1` escape hatch this story.

### 3. Cursor shape (locked)

Opaque **base64url(JSON)** (or existing match-list encode helper pattern if reusable):

```ts
{ unreadCount: number; matchedAt: string; id: string }
```

Comparator for “after cursor”: same as sort — lower unread first fails; equal unread → older/equal `matchedAt` fails; equal both → `id` tiebreak (lexicographic, consistent). Encode from **last item of page**; decode → walk sorted array to first index **strictly after** cursor.

Invalid / malformed cursor → **400** `{ error: 'invalid_cursor', message: '...' }` (mirror matches list style if already used).

### 4. Unread-total endpoint (locked)

```http
GET /api/v1/me/conversations/unread-total
→ { totalUnread: number }
```

- Register **static route before** `GET conversations/:id` so `:id` does not capture `unread-total`.  
- Implementation: same ACTIVE match rows + batch unread + **sum** (reuse `batchUnreadCountsByConversationId`; missing → 0). No profile hydration.  
- Empty → `{ totalUnread: 0 }`.  
- Auth: same `AuthGuard` as other `/me` routes.

### 5. FE (locked)

| Surface | Change |
|---------|--------|
| `conversations-api.ts` | `fetchMyConversations({ cursor?, limit? })`; parse `nextCursor`/`hasMore`; add `fetchConversationsUnreadTotal()` |
| `ConversationUnreadProvider.refresh` | Call **unread-total** (not full list) |
| `reconcileFromList` | Update nickname/`onConversationsFetched` only — **do not** `sumUnreadCounts` into badge total (partial pages would under-count) |
| Conversations list page | First page load; **Load more** (or equivalent) using `nextCursor` while `hasMore`; visibility refetch = first page + `refresh()` for badge |
| Specs | Context refresh mocks unread-total; list page first + second page; API service pagination + unread-total |

Optimistic `bumpFromMessage` / list row increment can stay; after mark-as-read / focus refresh, call `refresh()` (total) and reload list first page as today.

### 6. Tests (locked)

**API**

- Default limit 20; `hasMore` / `nextCursor` when >20 fixtures.  
- Page2 concat order = full sorted list; no dupes.  
- Invalid cursor / limit → 400.  
- `GET unread-total` matches sum of list unread semantics.  
- Update HTTP integration expectations for new response fields.

**UI**

- Unread provider uses unread-total.  
- List load-more appends.  
- Existing mocks return `{ conversations, nextCursor: null, hasMore: false }` where needed.

### 7. Agent 4

- **Skip** if §6 API + UI coverage lands (HTTP integration in Agent 1 is enough).

---

## Artifacts

| Path | Change |
|------|--------|
| `me-conversations.service.ts` (+ query dto / cursor helpers) | Paginate `list`; add `unreadTotal` |
| `me-profile.controller.ts` | Query params; `unread-total` route order |
| Specs (service + HTTP) | §6 |
| `dating-ui` conversations-api, unread context, list page + specs | §5 |

---

## Out of scope

- TanStack Query (Story 3)  
- Denormalized `unreadCount` column  
- Changing unread definition  
- Virtualized list UI polish beyond load-more  

---

## Agent 1 instructions

1. Implement API pagination + unread-total per §1–4.  
2. Wire FE per §5; fix mocks/specs per §6.  
3. `npm run build` (api) + jest conversations + vitest unread/list.  
4. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
feat(messaging): paginate conversations and add unread-total

Sprint 29 Story 2
```

---

## Agent 2 instructions

- [ ] List paginated (default 20 / max 50); sort unchanged  
- [ ] Profiles only needed for returned page (if optimized)  
- [ ] `unread-total` before `:id`; badge does not sum partial list  
- [ ] Cursor invalid → 400; FE load-more works  
- [ ] Specs cover API + FE  
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; sprint README → Story 3 Agent 0.  
- Write `agent-3-pm.md`.

---

## Open risks

1. Server still loads all match rows for sort — OK for typical inbox; true DB unread-first pagination needs denormalization (Sprint 30+).  
2. Many FE mocks assume `{ conversations: [] }` only — add `nextCursor`/`hasMore`.  
3. Route order for `unread-total` is easy to get wrong — test it.
