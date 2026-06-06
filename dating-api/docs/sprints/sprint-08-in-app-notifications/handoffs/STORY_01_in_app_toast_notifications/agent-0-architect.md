# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_in_app_toast_notifications.md](../../STORY_01_in_app_toast_notifications.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No API / DB / backend changes** — reuse Sprint 4 Story 2 `message.new` on existing Socket.IO client.
- **New UI layer** — `MessageToastProvider` mounted from `AuthenticatedAppShell` when session is `authenticated` and `NEXT_PUBLIC_REALTIME=ws`.
- **Toast** — minimal custom component (no new npm dep); sender label from warmed conversation cache; click → `/dating/conversations/{id}`; auto-dismiss 5s.
- **Skip rules** — shared pure helper with list unread logic: self-message, active conversation (`conversation-focus`), future `inAppNotificationsEnabled` (stub `true` until Story 3).
- **Third socket instance** acceptable for Story 1 (same as Story 5 list + detail pattern); shared `MessagingSocketProvider` deferred to Story 2/6 if socket count becomes painful.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/message-in-app-notify.ts` | created — `shouldShowMessageToast(msg, sessionUserId)` |
| `dating-ui/src/lib/message-toast-labels.ts` | created — peer label cache from conversations list |
| `dating-ui/src/lib/message-toast.constants.ts` | created — `MESSAGE_TOAST_AUTO_DISMISS_MS = 5000` |
| `dating-ui/src/components/message-toast.tsx` | created — presentational toast UI |
| `dating-ui/src/components/message-toast-provider.tsx` | created — WS listener + cache warm + toast state |
| `dating-ui/src/components/authenticated-app-shell.tsx` | wrap `{children}` with `<MessageToastProvider>` after auth gate |
| `dating-ui/src/lib/i18n/en.ts` | add toast copy keys |
| `dating-ui/src/lib/i18n/es.ts` | add toast copy keys |
| `dating-ui/src/lib/i18n/types.ts` | extend copy type |
| `dating-ui/src/lib/message-in-app-notify.spec.ts` | created — skip-rule unit tests |
| `dating-ui/src/components/message-toast-provider.spec.tsx` | created — toast show/skip/click tests |

**No changes:** `dating-api/*`, `useMessagingSocket` contract (use as-is), `message.new` payload, email module.

---

## Decisions (do not reverse without discussion)

### 1. No server changes

| Approach | Verdict |
|----------|---------|
| Extend `MessageDto` with `senderNickname` | Rejected — out of scope; REST/WS contract frozen |
| New `notification.toast` event | Rejected — duplicate emit |
| Client-only on `message.new` | **Chosen** |

Existing payload (`MessageDto`):

```typescript
{
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: 'SENT';
}
```

Toast must **not** show message `text` (privacy + parity with email story).

---

### 2. Placement — `MessageToastProvider` inside authenticated shell

```tsx
// authenticated-app-shell.tsx — after status === 'authenticated' branch
return (
  <>
    <nav>...</nav>
    <MessageToastProvider sessionUserId={user.id}>
      {children}
    </MessageToastProvider>
  </>
);
```

Pass `sessionUserId` from `useAuth().user!.id` (only rendered when authenticated).

Provider responsibilities:

1. `getRealtimeMode() === 'ws'` → enable socket; else no-op.
2. Warm label cache via `fetchMyConversations()` on mount + `visibilitychange`.
3. `useMessagingSocket` with **no** `conversationId` filter (all peer events).
4. On eligible `message.new` → push toast state; auto-dismiss timer.

**Do not** mount provider under public routes — shell already gates auth.

---

### 3. Skip rules — shared helper

Extract logic aligned with Sprint 4 Story 5 list handler:

```typescript
// message-in-app-notify.ts
import { getActiveConversationId } from '@/lib/conversation-focus';
import type { MessageDto } from '@/lib/conversations-api';

/** Story 3 will read auth/me; until then always true. */
export function isInAppNotificationsEnabled(): boolean {
  return true;
}

export function shouldShowMessageToast(
  msg: MessageDto,
  sessionUserId: string,
): boolean {
  if (!sessionUserId || msg.senderId === sessionUserId) {
    return false;
  }
  if (msg.conversationId === getActiveConversationId()) {
    return false;
  }
  if (!isInAppNotificationsEnabled()) {
    return false;
  }
  return true;
}
```

| Condition | Toast |
|-----------|-------|
| `senderId === sessionUserId` | No |
| `conversationId === getActiveConversationId()` | No |
| `inAppNotificationsEnabled === false` | No (Story 3) |
| `NEXT_PUBLIC_REALTIME !== ws` | No (socket disabled) |
| Peer message, other thread | **Yes** |

**Conversations list page:** toast **still shows** when user is on `/dating/conversations` but not inside the active thread — intentional (badge + toast together is OK for v1).

---

### 4. Sender display name — conversation cache (no API extension)

`MessageDto` has no nickname. Warm index from list API:

```typescript
// message-toast-labels.ts
import type { ConversationListItemDto } from '@/lib/conversations-api';
import { conversationPrimaryLabel } from '@/app/dating/conversations/conversation-display';

export type PeerLabelIndex = Map<string, string>; // senderUserId → label

export function buildPeerLabelIndex(
  conversations: ConversationListItemDto[],
): PeerLabelIndex {
  const map = new Map<string, string>();
  for (const c of conversations) {
    map.set(c.otherUser.id, conversationPrimaryLabel(c.otherUser));
  }
  return map;
}

export function resolvePeerLabel(
  index: PeerLabelIndex,
  senderId: string,
): string {
  return index.get(senderId)?.trim() || 'Someone';
}
```

Provider:

- On mount (ws + authenticated): `fetchMyConversations()` → `setPeerLabels(buildPeerLabelIndex(...))`.
- On `document.visibilitychange` visible: refresh cache (best-effort, silent catch).
- On toast: `resolvePeerLabel(peerLabels, msg.senderId)`.

Move `conversationPrimaryLabel` import path: prefer **moving** `conversationPrimaryLabel` to `dating-ui/src/lib/conversation-display.ts` (shared) if importing from `app/` into `lib/` feels wrong — **optional refactor**; importing from `conversation-display.ts` under `app/` is acceptable for Story 1 if agent 1 keeps diff small.

---

### 5. Toast UI — custom component (no `sonner`)

| Approach | Verdict |
|----------|---------|
| Add `sonner` dependency | Rejected for Story 1 — minimize deps |
| Custom fixed toast | **Chosen** — Tailwind, matches zinc palette |

```typescript
// message-toast.tsx — props
export type MessageToastViewProps = {
  senderLabel: string;
  conversationId: string;
  onDismiss: () => void;
  onOpen: () => void;
};
```

Layout:

- `fixed bottom-4 right-4 z-[60]` (above nav, below modals z-50)
- `role="status"` + `aria-live="polite"`
- Click body → `router.push(/dating/conversations/${id})` + dismiss
- Dismiss button (×) with `aria-label`
- Single toast at a time — new message **replaces** current toast (reset dismiss timer)

Copy (i18n):

```typescript
// en.ts
notifications: {
  messageToast: (name: string) => `${name} sent you a message`,
  messageToastAction: 'View',
  messageToastDismiss: 'Dismiss',
}
```

---

### 6. Socket wiring — third instance OK for v1

Story 5 accepted separate sockets for list vs detail. Story 1 adds shell socket:

| Page | Sockets |
|------|---------|
| `/dating/me-matches` | shell only |
| `/dating/conversations` | shell + list |
| `/dating/conversations/[id]` | shell + detail |

Socket.io multiplexes; acceptable for Story 1. **Do not** refactor to shared context in this story unless agent 1 hits a concrete bug.

```typescript
useMessagingSocket({
  enabled: realtimeMode === 'ws' && Boolean(sessionUserId),
  // conversationId omitted — all events
  onMessageNew: handleToastMessageNew,
  getLastMessageId: () => undefined,
  onMessagesMerged: () => {},
});
```

No catch-up, no `conversation.subscribe` on shell socket (recipient already in `user:<id>` room server-side).

---

### 7. Channel separation (locked — no email touch)

Toast handler is **UI-only**. Must not import or call notification/email APIs.

| Recipient state | Toast | Email (Sprint 6) |
|-----------------|-------|------------------|
| Online (WS) | Yes | No |
| Offline | No | Yes (if enabled) |

---

### 8. `inAppNotificationsEnabled` — stub for Story 3

Story 1 ships `isInAppNotificationsEnabled(): boolean { return true; }` in `message-in-app-notify.ts`.

Story 3 will:

- Add DB field + `auth/me` field
- Replace stub to read `user.inAppNotificationsEnabled`

Agent 1: add `// Story 3: wire from AuthUser` comment — do not add schema in Story 1.

---

## Service / module signatures

**N/A — no backend.** UI-only contracts:

```typescript
// message-toast-provider.tsx
export function MessageToastProvider(props: {
  sessionUserId: string;
  children: React.ReactNode;
}): React.ReactElement;

// message-in-app-notify.ts
export function shouldShowMessageToast(
  msg: MessageDto,
  sessionUserId: string,
): boolean;

export function isInAppNotificationsEnabled(): boolean;
```

---

## Tests / verification (agent 2 scope — agent 1 smoke only)

Agent 1 manual smoke:

1. B on `/dating/me-matches`, A sends → toast within ~1s.
2. Click toast → `/dating/conversations/{id}`.
3. B in open thread, A sends → no toast.
4. A sends as self (same session) → no toast (N/A cross-user).
5. `NEXT_PUBLIC_REALTIME=poll` → no toast.

Agent 2 automated:

```bash
cd dating-ui
npm test -- src/lib/message-in-app-notify.spec.ts src/components/message-toast-provider.spec.tsx
```

Test cases:

| Case | Expect |
|------|--------|
| Peer message, not active thread | Toast shown |
| Own `senderId` | No toast |
| `conversationId === getActiveConversationId()` | No toast |
| `isInAppNotificationsEnabled` false (mock) | No toast |
| Click toast | `router.push` called with correct id |
| Auto-dismiss after 5s | Toast hidden |

Mock `useMessagingSocket` to invoke `onMessageNew` (same pattern as `conversations/page.spec.tsx`).

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 8 story 1
```

**Notes for agent 1:**

1. Implement files in Artifacts table; no `dating-api` edits.
2. Mount `MessageToastProvider` only in authenticated branch of `AuthenticatedAppShell`.
3. Reuse `shouldShowMessageToast` — do not duplicate skip logic inline.
4. Do not show message body in toast.
5. Keep `isInAppNotificationsEnabled()` stub until Story 3.
6. Run manual smoke steps above before handoff.
7. Story 2 (nav dot) may share label cache later — OK to keep cache local to provider for now.
