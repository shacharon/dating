# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_nav_unread_indicator.md](../../STORY_02_nav_unread_indicator.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No API / DB changes** — nav total derived from existing `GET /api/v1/me/conversations` `unreadCount` per row.
- **Consolidate shell realtime** — merge Story 1 `MessageToastProvider` into **`MessagingShellProvider`** (single `useMessagingSocket`, one `fetchMyConversations` warm path).
- **Nav badge** — numeric emerald pill on “Conversations” link (matches list row style); cap **99+**; `aria-label` with total.
- **Live bump** — optimistic `totalUnread++` on peer `message.new` when same rules as list/toast apply; authoritative reconcile on refetch.
- **Reconcile triggers** — mount, `visibilitychange`, conversations list load, conversation detail mark-read success.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/conversation-unread-total.ts` | created — `sumUnreadCounts`, `bumpUnreadTotal` |
| `dating-ui/src/lib/message-in-app-notify.ts` | add `shouldBumpUnreadForMessage` (alias shared rules) |
| `dating-ui/src/contexts/conversation-unread-context.tsx` | created — `totalUnread`, `refresh`, `reconcileFromList`, `bumpFromMessage` |
| `dating-ui/src/components/messaging-shell-provider.tsx` | created — replaces `MessageToastProvider` (toast + unread + socket) |
| `dating-ui/src/components/message-toast-provider.tsx` | **deleted** or re-export shim → `MessagingShellProvider` |
| `dating-ui/src/components/authenticated-app-shell.tsx` | wrap **nav + children** in `MessagingShellProvider`; nav badge on Conversations link |
| `dating-ui/src/app/dating/conversations/page.tsx` | call `reconcileFromList` after `fetchMyConversations` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | call `refresh()` after successful `markConversationAsRead` |
| `dating-ui/src/lib/i18n/types.ts` | `nav.conversationsUnreadLabel(total: number)` |
| `dating-ui/src/lib/i18n/en.ts` / `es.ts` | aria copy for nav badge |
| `dating-ui/src/lib/conversation-unread-total.spec.ts` | created |
| `dating-ui/src/contexts/conversation-unread-context.spec.tsx` | created (or provider spec) |
| `dating-ui/src/components/authenticated-app-shell.spec.tsx` | created — nav badge show/hide |

**No changes:** `dating-api/*`, `message.new` payload, email module.

---

## Decisions (do not reverse without discussion)

### 1. No server changes

Nav total = `sum(conversations[].unreadCount)` from existing list endpoint. No new API, no WebSocket event.

---

### 2. Consolidate Story 1 shell provider — **mandatory**

Story 1 added a third socket in `MessageToastProvider`. Story 2 **must not** add a fourth.

| Approach | Verdict |
|----------|---------|
| Separate `NavUnreadProvider` + second shell socket | Rejected |
| Merge into `MessagingShellProvider` | **Chosen** |

`MessagingShellProvider` responsibilities (single socket):

1. Toast (Story 1 behavior unchanged)
2. Nav `totalUnread` state (Story 2)
3. Peer label cache warm (Story 1)
4. One `useMessagingSocket` handler dispatches both toast + bump

```typescript
const handleMessageNew = (msg: MessageDto) => {
  if (shouldShowMessageToast(msg, sessionUserId)) {
    // toast path (Story 1)
  }
  if (shouldBumpUnreadForMessage(msg, sessionUserId)) {
    bumpFromMessage(msg.conversationId);
  }
};
```

**Rename:** `message-toast-provider.tsx` → `messaging-shell-provider.tsx`. Update imports in `authenticated-app-shell.tsx` and tests. Optional thin re-export from old path for one commit — prefer clean rename.

---

### 3. Shell layout — provider wraps nav + children

Nav must read `useConversationUnread()`. Provider wraps authenticated chrome:

```tsx
return (
  <MessagingShellProvider sessionUserId={user.id}>
    <nav aria-label="Main">...</nav>
    {children}
  </MessagingShellProvider>
);
```

Move `<nav>` **inside** provider (currently nav is outside `MessageToastProvider`).

---

### 4. Display — numeric pill (not dot only)

Match conversations list row badge for visual consistency:

```tsx
{totalUnread > 0 && (
  <span
    data-testid="nav-conversations-unread"
    aria-label={copy.nav.conversationsUnreadLabel(totalUnread)}
    className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white dark:bg-emerald-500"
  >
    {totalUnread > 99 ? '99+' : totalUnread}
  </span>
)}
```

Place pill **inline after** “Conversations” label inside the `Link`.

---

### 5. Shared bump rules — same as list / toast

Extract shared predicate (Story 1 + list aligned):

```typescript
// message-in-app-notify.ts
export function shouldBumpUnreadForMessage(
  msg: MessageDto,
  sessionUserId: string,
): boolean {
  // Same rules as shouldShowMessageToast for Story 2:
  // peer only, not active conversation, in-app enabled stub
  return shouldShowMessageToast(msg, sessionUserId);
}
```

| Condition | Bump nav total? |
|-----------|-----------------|
| Own message | No |
| Active conversation (`getActiveConversationId`) | No |
| Peer message, other thread | **Yes** (+1) |

**Active conversation while reading:** user sees messages in thread; nav should not inflate. Mark-read + refetch reconciles to 0 when they leave.

Optional later: consolidate conversations list inline checks to `shouldBumpUnreadForMessage` — **out of scope** unless trivial.

---

### 6. Unread total helpers

```typescript
// conversation-unread-total.ts
import type { ConversationListItemDto } from '@/lib/conversations-api';

export function sumUnreadCounts(
  conversations: ConversationListItemDto[],
): number {
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

/** Optimistic +1 when peer message arrives for a known conversation id. */
export function bumpUnreadTotal(
  currentTotal: number,
  _conversationId: string,
): number {
  return currentTotal + 1;
}
```

Authoritative state always wins on `reconcileFromList` / `refresh`.

---

### 7. Context contract

```typescript
// conversation-unread-context.tsx
export type ConversationUnreadContextValue = {
  totalUnread: number;
  /** GET /api/v1/me/conversations → sum unreadCount */
  refresh: () => Promise<void>;
  /** After list page fetch — sync nav without extra HTTP */
  reconcileFromList: (conversations: ConversationListItemDto[]) => void;
  /** Optimistic +1 from shell socket */
  bumpFromMessage: (conversationId: string) => void;
};

export function useConversationUnread(): ConversationUnreadContextValue;

export function ConversationUnreadProvider(props: {
  sessionUserId: string;
  children: React.ReactNode;
  // internal — wired by MessagingShellProvider
}): React.ReactElement;
```

Implementation note: `ConversationUnreadProvider` can be **internal** to `MessagingShellProvider` (single file) or separate context module — prefer **separate context file** so conversations pages import hook without pulling toast/socket.

`MessagingShellProvider` composes:

```tsx
<ConversationUnreadProvider sessionUserId={sessionUserId}>
  {/* socket + toast + children */}
</ConversationUnreadProvider>
```

Unread provider owns `totalUnread` state + `refresh` / `reconcileFromList` / `bumpFromMessage`. Shell provider adds socket + toast on top.

---

### 8. Reconcile triggers

| Trigger | Action |
|---------|--------|
| Shell mount (`ws` mode) | `refresh()` |
| `document.visibilitychange` → visible | `refresh()` (merge with existing label warm) |
| Conversations list `fetchMyConversations` success | `reconcileFromList(dto.conversations)` |
| Detail `markConversationAsRead` success | `refresh()` (or optimistic subtract — prefer **refresh** for simplicity) |
| `poll` mode (no socket) | mount + visibility `refresh()` only |

**Detail page** (minimal hook):

```typescript
const { refresh: refreshNavUnread } = useConversationUnread();

// after successful markConversationAsRead(id):
void refreshNavUnread();
```

Guard: only call when inside `MessagingShellProvider` (always true on `/dating/*`).

---

### 9. Poll mode

When `NEXT_PUBLIC_REALTIME !== ws`:

- No socket bump; nav updates on mount + visibility refetch only (same as Story 1 toast off).
- Conversations list visibility refetch still reconciles nav when user visits list.

---

### 10. i18n

```typescript
// types.ts — nav section
conversationsUnreadLabel: (count: number) => string;

// en.ts
conversationsUnreadLabel: (count) =>
  `${count} unread message${count === 1 ? '' : 's'}`,

// es.ts
conversationsUnreadLabel: (count) =>
  `${count} mensaje${count === 1 ? '' : 's'} sin leer`,
```

---

### 11. Email / channel separation

Nav badge reflects **DB unread state** only. No email imports. Independent of `emailNotificationsEnabled`.

---

## Service / module signatures

**N/A — no backend.**

```typescript
export function sumUnreadCounts(conversations: ConversationListItemDto[]): number;
export function bumpUnreadTotal(currentTotal: number, conversationId: string): number;
export function shouldBumpUnreadForMessage(msg: MessageDto, sessionUserId: string): boolean;
export function useConversationUnread(): ConversationUnreadContextValue;
export function MessagingShellProvider(props: {
  sessionUserId: string;
  children: React.ReactNode;
}): React.ReactElement;
```

---

## Tests / verification (agent 2 scope — agent 1 smoke)

Agent 1 manual smoke:

1. B has 2 unread → nav pill shows **2** on `/dating/profile`.
2. B opens thread, mark-read runs → nav clears (or updates after refresh).
3. A sends while B on matches → nav increments without page refresh (`ws`).

Agent 2 automated targets:

```bash
cd dating-ui
npm test -- src/lib/conversation-unread-total.spec.ts \
  src/contexts/conversation-unread-context.spec.tsx \
  src/components/messaging-shell-provider.spec.tsx \
  src/components/authenticated-app-shell.spec.tsx
```

| Case | Expect |
|------|--------|
| `sumUnreadCounts` | Sums row counts |
| Nav hidden when total 0 | No `nav-conversations-unread` |
| Nav shows pill when total > 0 | Pill text matches |
| `message.new` peer → total +1 | Optimistic |
| Own message → no bump | Total unchanged |
| Active conversation → no bump | Total unchanged |
| `reconcileFromList` replaces optimistic | API wins |
| `refresh` after mark-read | Total matches API |
| Story 1 toast tests still pass | After provider rename |

Migrate `message-toast-provider.spec.tsx` → `messaging-shell-provider.spec.tsx` (update imports).

---

## Migration notes (Story 1 → Story 2)

1. Rename provider file; keep toast behavior identical.
2. Move nav inside provider wrapper.
3. Do not regress Story 1 AC (toast skip rules, 5s dismiss, click navigate).
4. Run Story 1 test file paths after rename.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 8 story 2
```

**Notes for agent 1:**

1. **Must** consolidate sockets — no fourth `useMessagingSocket`.
2. Nav pill style matches list `conversation-unread-badge` classes.
3. Wire `reconcileFromList` in conversations list page; `refresh` in detail after mark-read.
4. Update Story 1 tests for renamed provider.
5. No `dating-api` edits.
