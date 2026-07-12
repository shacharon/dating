# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_reconnect_catchup.md](../../STORY_04_reconnect_catchup.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **No API changes** — reuse `GET .../messages?after=<lastId>` (Sprint 3 Story 3).
- **Client-only** — extend `createMessagingSocket` reconnection options + `useMessagingSocket` catch-up on `connect` / `reconnect`.
- **Safety net** — one catch-up fetch per connect event (guarded against overlap); merge via `appendUniqueMessages`.
- **UI** — subtle `Reconnecting…` banner while socket is down **after** first successful connect; cleared on `connect`.
- **Scope:** `ws` mode only (`poll` unchanged). Flag still `NEXT_PUBLIC_REALTIME`.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/messaging-socket.ts` | reconnection backoff options on `io()` |
| `dating-ui/src/hooks/use-messaging-socket.ts` | `connect`/`disconnect` handlers, catch-up, connection status callback |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | `socketReconnecting` state, indicator, `mergeIncomingMessages`, pass refs/callbacks to hook |
| `dating-ui/src/app/dating/conversations/conversation-message-utils.ts` | optional — export `appendUniqueMessages` for reuse/tests |
| `dating-ui/src/hooks/use-messaging-socket.spec.ts` | catch-up + status tests |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | reconnect indicator + catch-up integration tests |

**No changes:** `dating-api/*`, REST contracts, `RealtimePublisher`.

---

## Decisions (do not reverse without discussion)

### 1. No new API — reuse `after` cursor

Same call as Sprint 3 poll gap-fill:

```typescript
await fetchConversationMessages(conversationId, {
  after: lastKnownMessageId,
  limit: 100,
});
```

- `lastKnownMessageId` = last message in thread state (`messagesRef.current.at(-1)?.id`).
- **Skip catch-up** when thread is empty (no `lastId`) — same as poll loop.
- Server returns messages **strictly after** cursor, chronological ASC (existing API).

### 2. socket.io reconnection — explicit backoff in factory

Story 3 left defaults implicit. Story 4 configures in `createMessagingSocket()`:

```typescript
return io(`${url}${MESSAGING_WS_NAMESPACE}`, {
  path: '/socket.io',
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 10_000,
  randomizationFactor: 0.5,
});
```

socket.io applies exponential backoff between `reconnectionDelay` and `reconnectionDelayMax`. Do not implement custom backoff timers.

### 3. Catch-up trigger — `connect` event only

| Event | Action |
|-------|--------|
| `connect` | Set status **connected**; run **one** catch-up fetch (initial + every reconnect) |
| `disconnect` | If previously connected → status **reconnecting** |
| `message.new` | Unchanged (live push) |

**Why `connect` not `reconnect`:** In socket.io v4, `connect` fires on first connection and after successful reconnection. Single handler covers both (Story AC: initial connect + reconnect).

**Do not** catch-up on every `message.new` or on an interval in `ws` mode.

### 4. Overlap guard — one catch-up in flight

```typescript
let catchUpInFlight = false;

async function runCatchUp(): Promise<void> {
  const lastId = getLastMessageId();
  if (!lastId || catchUpInFlight) return;
  catchUpInFlight = true;
  try {
    const { messages } = await fetchConversationMessages(conversationId, {
      after: lastId,
      limit: 100,
    });
    if (messages.length > 0) {
      onMessagesMerged(messages);
    }
  } catch {
    // silent — next connect/reconnect retries
  } finally {
    catchUpInFlight = false;
  }
}
```

Register: `socket.on('connect', () => { onConnectionChange('connected'); void runCatchUp(); });`

### 5. Extended `useMessagingSocket` contract

```typescript
export type MessagingConnectionStatus = 'connected' | 'reconnecting';

export type UseMessagingSocketOptions = {
  enabled: boolean;
  conversationId: string;
  onMessageNew: (message: MessageDto) => void;
  /** Latest thread tail id (e.g. from messagesRef). */
  getLastMessageId: () => string | undefined;
  /** Batch merge after catch-up (same dedupe/scroll as live push). */
  onMessagesMerged: (messages: MessageDto[]) => void;
  onConnectionChange?: (status: MessagingConnectionStatus) => void;
};
```

- `getLastMessageId` and `onMessagesMerged` should be **stable** (`useCallback` in page).
- `fetchConversationMessages` imported inside hook (or injected — prefer direct import to match page).

**`wasConnected` guard for reconnecting UI:**

```typescript
let wasConnected = false;

socket.on('connect', () => {
  wasConnected = true;
  onConnectionChange?.('connected');
  void runCatchUp();
});

socket.on('disconnect', () => {
  if (wasConnected) {
    onConnectionChange?.('reconnecting');
  }
});
```

Avoid showing "Reconnecting…" before the first successful connect.

### 6. Page wiring — shared merge helper

Extract merge + scroll (used by `handleMessageNew`, catch-up, and poll) to avoid drift:

```typescript
const mergeIncomingMessages = useCallback((incoming: MessageDto[]) => {
  if (incoming.length === 0) return;
  setMessages((prev) => {
    const merged = appendUniqueMessages(prev, incoming);
    if (merged === prev) return prev;
    const listEl = listRef.current;
    if (listEl && isNearBottom(listEl)) {
      requestAnimationFrame(() => scrollListToBottom(listEl));
    }
    return merged;
  });
}, []);

const handleMessageNew = useCallback(
  (msg: MessageDto) => mergeIncomingMessages([msg]),
  [mergeIncomingMessages],
);

const getLastMessageId = useCallback(
  () => messagesRef.current[messagesRef.current.length - 1]?.id,
  [],
);

const [socketReconnecting, setSocketReconnecting] = useState(false);

useMessagingSocket({
  enabled: realtimeMode === 'ws' && !!id && !messagesLoading,
  conversationId: id,
  onMessageNew: handleMessageNew,
  getLastMessageId,
  onMessagesMerged: mergeIncomingMessages,
  onConnectionChange: (status) => {
    setSocketReconnecting(status === 'reconnecting');
  },
});
```

Optional: move `appendUniqueMessages` to `conversation-message-utils.ts` and import in page + tests.

### 7. Reconnecting indicator — minimal, non-blocking

Place inside the messaging section, **above** the message list (below section border):

```tsx
{realtimeMode === 'ws' && socketReconnecting && (
  <p
    role="status"
    data-testid="conversation-reconnecting"
    className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
  >
    Reconnecting…
  </p>
)}
```

- Visible only when `socketReconnecting === true`.
- Thread remains readable; composer stays enabled (sender may fail until network returns — acceptable).
- **Do not** block the whole page with a modal.

### 8. Race: history load vs first socket connect

Current order (keep):

1. `fetchConversationMessages` completes → `messages` populated, `messagesLoading = false`
2. `useMessagingSocket` `enabled` becomes true → `socket.connect()`
3. `connect` fires → catch-up with `after=lastId` fills gap between step 1 and 3

This satisfies **"Initial connect also runs catch-up"**.

### 9. Dedupe — id-based only

Catch-up + live `message.new` may overlap around reconnect. `appendUniqueMessages` by `id` prevents duplicate bubbles. **Do not** add separate dedupe logic.

### 10. `poll` mode — unchanged

No socket hook work in `poll` mode; no reconnecting indicator. Existing 3s poll remains the gap-fill mechanism.

### 11. Out of scope (confirm)

- List-page live unread (Story 5)
- API rate limits / Redis adapter (Story 6)
- Offline outbound queue for sender
- Custom reconnect countdown UI
- Multiple catch-up pages (`limit: 100` sufficient for gap; full pagination deferred)

---

## Prisma schema

**No changes.**

---

## Migration plan

None.

---

## API / wire contract

Unchanged. Catch-up uses existing endpoint:

| Method | Path | Query |
|--------|------|-------|
| GET | `/api/v1/me/conversations/:id/messages` | `after=<messageId>&limit=100` |

---

## UI contract

| State | `ws` behavior |
|-------|----------------|
| Connected | No banner; live `message.new` + catch-up on `connect` |
| Disconnected (after was connected) | `data-testid="conversation-reconnecting"` visible |
| Reconnected | Banner cleared; catch-up merges missed rows |

---

## Test plan (for Agent 2)

### Unit — `use-messaging-socket.spec.ts`

| Case | Expected |
|------|----------|
| `connect` → `fetchConversationMessages` with `after: lastId` | called once |
| `connect` with empty thread | no fetch |
| overlapping `connect` events | at most one in-flight fetch (mock slow resolve) |
| `disconnect` after connect | `onConnectionChange('reconnecting')` |
| `connect` after disconnect | `onConnectionChange('connected')` + catch-up |
| catch-up results | `onMessagesMerged` called with API messages |
| `disconnect` before first connect | no `reconnecting` status |

Mock `fetchConversationMessages` in hook spec (vi.mock `@/lib/conversations-api`).

### Component — `page.spec.tsx` (ws mode)

| Case | Expected |
|------|----------|
| Simulate `disconnect` | `conversation-reconnecting` visible |
| Simulate `connect` | indicator hidden; catch-up fetch |
| Catch-up + existing message same id | one bubble |
| `poll` mode | no reconnecting testid |

Extend socket mock to expose `connect` / `disconnect` emitter helpers.

### API

**None.**

---

## Manual smoke

1. `NEXT_PUBLIC_REALTIME=ws`, two tabs on same conversation  
2. Tab B: DevTools → Offline  
3. Tab A: send 2 messages  
4. Tab B: "Reconnecting…"  
5. Tab B: Online → banner clears, 2 messages appear once each  
6. Live send works again  

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **>100 messages during outage** — single catch-up page only; rare for MVP; document limit.
2. **Catch-up while scrolled up** — still merge; scroll only if near-bottom (existing rule).
3. **Manual disconnect on unmount** — must not flash "Reconnecting…"; `wasConnected` + cleanup order handles this.

---

## Next agent

```text
--agent 1 sprint 4 story 4
```

**Notes for Agent 1:**

1. Add reconnection options to `createMessagingSocket`.
2. Extend `useMessagingSocket` with catch-up + `onConnectionChange`.
3. Page: `mergeIncomingMessages`, indicator, wire callbacks.
4. Keep `poll` path untouched.
5. Agent 2 adds hook + page tests.
