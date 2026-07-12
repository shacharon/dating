# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_live_unread_badges.md](../../STORY_05_live_unread_badges.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **No API changes** — reuse Story 2 **`message.new`** emit (recipient already in `user:<recipientId>` room).
- **No new server event** — full `MessageDto` is enough; list only needs `conversationId`, `senderId`, and dedupe by message `id` if needed.
- **List page** (`/dating/conversations`) — subscribe via `useMessagingSocket` when `NEXT_PUBLIC_REALTIME=ws`; optimistic `unreadCount++` + unread-first re-sort.
- **Authoritative reconcile** — keep existing `fetchMyConversations()` on mount + `visibilitychange` (Sprint 3 Story 5).
- **Open conversation excluded** — module-level `activeConversationId` set by detail route; list skips increment when `message.conversationId` matches.
- **`poll` mode** — no list socket; visibility refetch only (unchanged).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/conversation-focus.ts` | created — `setActiveConversationId` / `getActiveConversationId` |
| `dating-ui/src/lib/conversation-list-unread.ts` | created — `incrementUnreadForConversation`, `sortConversationsUnreadFirst` |
| `dating-ui/src/app/dating/conversations/page.tsx` | `useMessagingSocket` + live unread bump |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | set/clear `activeConversationId` on mount/unmount |
| `dating-ui/src/app/dating/conversations/page.spec.tsx` | ws event → badge; active conversation skip; reconcile |
| `dating-ui/src/hooks/use-messaging-socket.ts` | optional: allow list-only usage without catch-up (pass no-op callbacks) |

**No changes:** `dating-api/*`, `RealtimePublisher`, `message.new` payload.

---

## Decisions (do not reverse without discussion)

### 1. Reuse `message.new` — do not add `conversation.unread`

Story 2 already emits `message.new` to **both** participants. The recipient's list can listen on the same event.

| Approach | Verdict |
|----------|---------|
| New `conversation.unread` event | Rejected — extra server surface, duplicate emit |
| Reuse `message.new` | **Chosen** — list filters client-side |

List handler rules:

```typescript
function shouldBumpListUnread(msg: MessageDto, sessionUserId: string): boolean {
  if (msg.senderId === sessionUserId) return false; // peer only
  if (msg.conversationId === getActiveConversationId()) return false; // reading thread
  return true;
}
```

Ignore messages for conversations not in the current list array (unknown id) — optional no-op or trigger full `load()`; prefer **no-op** until next refetch.

### 2. No shared layout / second socket in Story 5 (minimal scope)

- **Detail page** keeps its existing `useMessagingSocket` (thread append + catch-up).
- **List page** adds a **separate** `useMessagingSocket` instance when mounted.

Two sockets per user is acceptable in dev; socket.io multiplexes. Story 6 may consolidate later.

When user is on **detail**, list is **unmounted** — list handler not running. Live list badge updates only while user sits on `/dating/conversations`. Returning from detail relies on **visibility refetch** for authoritative counts (Sprint 3) — correct.

### 3. `conversation-focus.ts` — active conversation id

Detail route sets focus so list (when mounted) does not bump unread for the thread being read (edge: fast navigation list → detail before unmount).

```typescript
let activeConversationId: string | null = null;

export function setActiveConversationId(id: string | null): void {
  activeConversationId = id;
}

export function getActiveConversationId(): string | null {
  return activeConversationId;
}
```

**Detail page:**

```typescript
useEffect(() => {
  if (!id) return;
  setActiveConversationId(id);
  return () => setActiveConversationId(null);
}, [id]);
```

### 4. Optimistic unread increment + sort

Mirror server sort in `me-conversations.service.ts`:

```typescript
export function sortConversationsUnreadFirst(
  items: ConversationListItemDto[],
): ConversationListItemDto[] {
  return [...items].sort((a, b) => {
    if (b.unreadCount !== a.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    return b.matchedAt.localeCompare(a.matchedAt);
  });
}

export function incrementUnreadForConversation(
  items: ConversationListItemDto[],
  conversationId: string,
): ConversationListItemDto[] {
  const found = items.some((c) => c.id === conversationId);
  if (!found) return items;

  const updated = items.map((c) =>
    c.id === conversationId
      ? { ...c, unreadCount: c.unreadCount + 1 }
      : c,
  );
  return sortConversationsUnreadFirst(updated);
}
```

Cap display at **99+** in UI only (existing); store true count until refetch.

**Do not** increment above server truth on duplicate `message.new` for same `id` — optional guard with `Set` of last seen message ids per conversation (Story 5 minimum: rely on single emit per message; if duplicate events, refetch reconciles).

### 5. List page wiring

```typescript
import { getRealtimeMode } from '@/lib/realtime-mode';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';
import { useAuth } from '@/contexts/auth-context';
import { incrementUnreadForConversation } from '@/lib/conversation-list-unread';
import { getActiveConversationId } from '@/lib/conversation-focus';

// inside ConversationsPage:
const { user } = useAuth();
const realtimeMode = getRealtimeMode();

const handleListMessageNew = useCallback(
  (msg: MessageDto) => {
    if (!user?.id || msg.senderId === user.id) return;
    if (msg.conversationId === getActiveConversationId()) return;
    setConversations((prev) =>
      incrementUnreadForConversation(prev, msg.conversationId),
    );
  },
  [user?.id],
);

useMessagingSocket({
  enabled: realtimeMode === 'ws',
  conversationId: '', // not used for filtering on list — see §6
  onMessageNew: handleListMessageNew,
  getLastMessageId: () => undefined,
  onMessagesMerged: () => {},
  onConnectionChange: undefined, // no reconnecting banner on list (Story 5)
});
```

### 6. List hook usage — relax `conversationId` filter for list

`useMessagingSocket` currently drops events where `payload.conversationId !== conversationId`. For list, pass a sentinel or extend hook:

**Preferred (small hook change):**

```typescript
export type UseMessagingSocketOptions = {
  enabled: boolean;
  /** When set, filter `message.new` to this id. When omitted, deliver all events. */
  conversationId?: string;
  onMessageNew: (message: MessageDto) => void;
  // ...
};

const onEvent = (payload: MessageDto) => {
  if (conversationId && payload.conversationId !== conversationId) {
    return;
  }
  onMessageNew(payload);
};
```

List: `conversationId` **omitted**. Detail: `conversationId: id` (unchanged).

Catch-up on list socket: **disabled** — `getLastMessageId: () => undefined` (no-op catch-up). List does not need reconnect catch-up for messages (refetch on visibility).

Optional: skip `connect` catch-up when `getLastMessageId` always undefined (already does).

### 7. Reconnecting UI on list

**None** in Story 5 — no `conversation-reconnecting` on list page. User on list sees stale badges until refetch if socket down; acceptable. Story 6 may add shared status.

### 8. Flag = `poll`

- No `useMessagingSocket` on list (`enabled: false` effectively via `realtimeMode !== 'ws'`).
- Existing mount + `visibilitychange` → `load()` unchanged.

### 9. Reconcile on refetch

Keep:

```typescript
const load = useCallback(async () => {
  const dto = await fetchMyConversations();
  setConversations(dto.conversations ?? []);
}, []);
```

Authoritative `unreadCount` from API replaces optimistic values. No merge logic needed on refetch.

---

## Prisma schema

**No changes.**

---

## API / wire contract

Unchanged. List uses existing:

| Method | Path | Use |
|--------|------|-----|
| GET | `/api/v1/me/conversations` | Authoritative list + `unreadCount` |

Live: client-side only on `message.new` (same payload as Story 2).

---

## UI contract

| Page | `ws` | `poll` |
|------|------|--------|
| `/dating/conversations` | Socket + live unread bump | Refetch on mount/visibility only |
| `/dating/conversations/[id]` | Existing thread socket + `activeConversationId` | Unchanged |

---

## Test plan (for Agent 2)

### Unit — `conversation-list-unread.ts`

| Case | Expected |
|------|----------|
| `incrementUnreadForConversation` | +1 on matching row, re-sorted unread-first |
| Unknown conversation id | unchanged array |
| `sortConversationsUnreadFirst` | higher unread first, then `matchedAt` desc |

### Component — `page.spec.tsx` (list)

Mock `getRealtimeMode` → `ws`, `useMessagingSocket` / `message.new` (same pattern as detail spec).

| Case | Expected |
|------|----------|
| `message.new` from peer | badge increments, row moves up |
| `message.new` for `activeConversationId` | no increment |
| `message.new` from self (`senderId === user.id`) | no increment |
| `load()` after optimistic bump | replaces with API counts |
| `poll` mode | no socket connect |

### Detail page spec (optional)

- Mount sets `getActiveConversationId() === id`; unmount clears.

### API

**None.**

---

## Manual smoke

1. `NEXT_PUBLIC_REALTIME=ws`  
2. B on `/dating/conversations` (not in a thread)  
3. A sends → B's badge increments live, row sorts to top  
4. B opens thread, reads, back to list → refetch shows 0  
5. B in thread, A sends → B sees message in thread; back to list shows correct count (refetch)

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Two sockets** (list + detail) — acceptable for Story 5; consolidate in Story 6 if needed.
2. **Conversation not in list** — rare; refetch on visibility handles new matches.
3. **Nav-wide unread dot** — still future (out of scope).

---

## Next agent

```text
--agent 1 sprint 4 story 5
```

**Notes for Agent 1:**

1. Add `conversation-focus.ts` + `conversation-list-unread.ts`.
2. Extend `useMessagingSocket` — optional `conversationId` filter.
3. Wire list page socket + handler; detail page sets active id.
4. Keep `poll` path unchanged.
5. Agent 2 adds list + util tests.
