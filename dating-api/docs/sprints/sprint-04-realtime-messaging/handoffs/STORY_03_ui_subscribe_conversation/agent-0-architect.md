# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_ui_subscribe_conversation.md](../../STORY_03_ui_subscribe_conversation.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **No API changes** — consume Story 2 `message.new` on the client; REST history/send/read unchanged.
- **Feature flag** `NEXT_PUBLIC_REALTIME=ws|poll` — default **`poll`** when unset/invalid (Sprint 3 behavior preserved; opt-in to WS).
- **`useMessagingSocket` hook** — connect on conversation mount (`ws` only), listen for `message.new`, filter by `conversationId`, disconnect on unmount / id change.
- **Gate polling** — existing `setInterval` + `visibilitychange` poll effect runs **only** when mode is `poll`; do not delete poll code (rollback).
- **Dedupe** — reuse `appendUniqueMessages` (id-based); self-echo from server matches `POST` response `id`.
- **Story 3 scope:** wire socket + remove poll when `ws`. **No** reconnect UI, **no** catch-up on reconnect (Story 4). socket.io default auto-reconnect is acceptable until Story 4 adds `GET ?after=`.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/realtime-mode.ts` | created — `getRealtimeMode(): 'ws' \| 'poll'` |
| `dating-ui/src/lib/messaging-socket.ts` | updated — export `MESSAGING_EVENT_MESSAGE_NEW` (re-export constant) |
| `dating-ui/src/hooks/use-messaging-socket.ts` | created — `useMessagingSocket(...)` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — hook + gated poll |
| `dating-ui/.env.example` | updated — `NEXT_PUBLIC_REALTIME=poll` |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated — ws append, no poll, dedupe tests |
| Optional | `dating-ui/src/app/dating/conversations/conversation-message-utils.ts` — move `appendUniqueMessages` if hook tests need it (optional; can stay in page) |

**No changes:** `dating-api/*`, `next.config.ts` (Story 1 proxy already shipped).

---

## Decisions (do not reverse without discussion)

### 1. Feature flag — default `poll`

```typescript
// realtime-mode.ts
export type RealtimeMode = 'ws' | 'poll';

export function getRealtimeMode(): RealtimeMode {
  const raw = process.env.NEXT_PUBLIC_REALTIME?.trim().toLowerCase();
  if (raw === 'ws') return 'ws';
  return 'poll'; // includes unset, empty, typos
}
```

| Value | Behavior |
|-------|----------|
| `ws` | Socket connect + `message.new`; **no** 3s `after` poll |
| `poll` or unset | Sprint 3: `POLL_INTERVAL_MS` + `fetchConversationMessages(..., { after })` |

Document in `.env.example` and manual smoke: set `NEXT_PUBLIC_REALTIME=ws` in `dating-ui/.env.local` for realtime QA.

**Dev note:** Same-origin (`NEXT_PUBLIC_API_URL` unset) required for WS cookie auth (Story 1). Cross-origin `:3001` may not send `SameSite=Lax` cookie.

### 2. `useMessagingSocket` — hook contract

```typescript
import type { MessageDto } from '@/lib/conversations-api';
import {
  createMessagingSocket,
  MESSAGING_EVENT_MESSAGE_NEW,
} from '@/lib/messaging-socket';

export type UseMessagingSocketOptions = {
  /** When false, no socket is created (poll mode or SSR). */
  enabled: boolean;
  conversationId: string;
  /** Called for each `message.new` matching conversationId (already filtered). */
  onMessageNew: (message: MessageDto) => void;
};

export function useMessagingSocket(options: UseMessagingSocketOptions): void;
```

**Lifecycle (inside hook):**

```typescript
useEffect(() => {
  if (!enabled || !conversationId) return;

  const socket = createMessagingSocket();

  const onEvent = (payload: MessageDto) => {
    if (payload.conversationId !== conversationId) return;
    options.onMessageNew(payload);
  };

  socket.on(MESSAGING_EVENT_MESSAGE_NEW, onEvent);
  socket.connect();

  return () => {
    socket.off(MESSAGING_EVENT_MESSAGE_NEW, onEvent);
    socket.disconnect();
  };
}, [enabled, conversationId, options.onMessageNew]);
```

- One socket per conversation page mount (not a global singleton in Story 3).
- **`onMessageNew` must be stable** — wrap in `useCallback` in the page (deps: `[]` or refs for scroll helpers).
- **Do not** add `subscribe:conversation` client emit (Story 6). Server pushes to `user:<userId>` rooms; client filters by `conversationId`.
- **Connect even while `messagesLoading`** — OK; events for other conversations are ignored. Alternatively defer `enabled: mode === 'ws' && !messagesLoading` — either is fine; prefer `!messagesLoading` to avoid connecting before auth shell is ready (optional polish).

### 3. Page wiring — `conversations/[id]/page.tsx`

```typescript
import { getRealtimeMode } from '@/lib/realtime-mode';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';

const realtimeMode = getRealtimeMode(); // stable for build; re-read on client OK

const handleMessageNew = useCallback((msg: MessageDto) => {
  setMessages((prev) => {
    const merged = appendUniqueMessages(prev, [msg]);
    if (merged === prev) return prev;
    const listEl = listRef.current;
    if (listEl && isNearBottom(listEl)) {
      requestAnimationFrame(() => scrollListToBottom(listEl));
    }
    return merged;
  });
}, []);

useMessagingSocket({
  enabled: realtimeMode === 'ws' && !!id && !messagesLoading,
  conversationId: id,
  onMessageNew: handleMessageNew,
});
```

**Poll effect — gate at top (keep body intact):**

```typescript
useEffect(() => {
  if (realtimeMode !== 'poll') return;
  if (!id || messagesLoading) return;
  // ... existing poll + setInterval + visibilitychange unchanged
}, [realtimeMode, id, messagesLoading]);
```

Move `POLL_INTERVAL_MS` / poll logic only runs in `poll` mode.

**Unchanged in Story 3:**

- Initial `fetchConversationMessages(id)` history load
- `markConversationAsRead` + visibility debounce for read
- `handleSendMessage` → `sendConversationMessage` → `appendUniqueMessages(prev, [sent])`
- Load earlier (`before` cursor)
- Unmatch flow

### 4. Event + payload contract (client)

| Event | Payload | Filter |
|-------|---------|--------|
| `message.new` | `MessageDto` from `conversations-api.ts` | `payload.conversationId === openConversationId` |

Must match server Story 2 shape:

```typescript
interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: 'SENT';
}
```

### 5. Dedupe — self echo

Flow when user sends:

1. `POST` returns `MessageDto` with `id: msg_x`
2. Page: `appendUniqueMessages(prev, [sent])`
3. Server emits `message.new` with same `id: msg_x` to sender room
4. `appendUniqueMessages` skips duplicate id → **one bubble**

**Do not** skip echo by `senderId === user.id` — id dedupe is sufficient and handles multi-tab.

### 6. Auto-scroll

Reuse existing near-bottom rule (80px threshold) for:

- WS `message.new`
- Poll merge (already implemented)
- Send (already implemented)

### 7. socket.io client options (Story 3)

Keep Story 1 factory:

```typescript
io(url + '/ws/messaging', {
  path: '/socket.io',
  withCredentials: true,
  autoConnect: false,
});
```

**Do not** customize reconnection/backoff in Story 3 (Story 4). Default `reconnection: true` is fine; missed messages while offline fixed in Story 4.

### 8. No reconnecting indicator

Story 3: no UI for `connect` / `disconnect` / `connect_error`. Silent until Story 4.

### 9. Testing strategy (Agent 2)

Mock `@/lib/messaging-socket` (not real TCP):

```typescript
const socketHandlers: Record<string, (...args: unknown[]) => void> = {};
const mockSocket = {
  on: vi.fn((event, fn) => { socketHandlers[event] = fn; }),
  off: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};
vi.mock('@/lib/messaging-socket', () => ({
  createMessagingSocket: () => mockSocket,
  MESSAGING_EVENT_MESSAGE_NEW: 'message.new',
}));
```

Mock `getRealtimeMode`:

```typescript
vi.mock('@/lib/realtime-mode', () => ({
  getRealtimeMode: vi.fn(() => 'ws'), // or 'poll' per test
}));
```

| Test | Mode | Assert |
|------|------|--------|
| Appends on `message.new` | `ws` | emit handler → bubble in DOM |
| No polling interval | `ws` | `vi.spyOn(global, 'setInterval')` not called with 3000 (or `fetchConversationMessages` not called with `after` after initial load) |
| Poll still works | `poll` | fake timers → `after` fetch (optional if no poll test today — add minimal) |
| Self-echo dedupe | `ws` | send + same-id `message.new` → one bubble |
| History + mark-read | both | existing tests still pass |

Use `vi.stubEnv('NEXT_PUBLIC_REALTIME', 'ws')` if testing via env instead of mocking `getRealtimeMode`.

### 10. Manual smoke checklist

1. `NEXT_PUBLIC_REALTIME=ws` in `dating-ui/.env.local`; restart `npm run dev`
2. API + UI running; same-origin proxy (no `NEXT_PUBLIC_API_URL`)
3. Two accounts / tabs on same conversation
4. Send → other tab **< 1s** (not ~3s)
5. Network: no repeating `GET .../messages?after=` every 3s
6. Sender sees one bubble (not two)
7. `NEXT_PUBLIC_REALTIME=poll` → 3s poll returns

---

## Prisma schema

**No changes.**

---

## Migration plan

None.

---

## API / wire contract

Unchanged from Story 2. Client consumes `message.new` only.

---

## UI contract

| Surface | `poll` | `ws` |
|---------|--------|------|
| History `GET` | yes | yes |
| Send `POST` | yes | yes |
| Mark read `PUT` | yes | yes |
| Poll `after` | every 3s | **off** |
| WS `message.new` | off | **on** |

---

## Test plan (for Agent 2)

### Unit / component — `page.spec.tsx`

- Mock socket + realtime mode as above
- Minimum **3** new cases: ws append, ws no poll, self dedupe
- Regression: existing send/history/mark-read tests green in **both** modes (default mock `poll` preserves current behavior)

### API

**None.**

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Default `poll`** — production ships safe; enable `ws` per environment when ready.
2. **Missed messages on brief disconnect** — Story 4 catch-up; acceptable gap in Story 3.
3. **Pre-existing UI typecheck** — `me-matches/[id]/page.spec.tsx` unrelated; not blocking.

---

## Next agent

```text
--agent 1 sprint 4 story 3
```

**Notes for Agent 1:**

1. Add `realtime-mode.ts` + `use-messaging-socket.ts`.
2. Gate poll effect with `getRealtimeMode() === 'poll'`.
3. Wire hook in `page.tsx` with `handleMessageNew` + `appendUniqueMessages`.
4. Update `.env.example`.
5. Do **not** implement Story 4 reconnect/catch-up or remove poll code permanently.
6. Agent 2 adds/extends `page.spec.tsx` tests.
