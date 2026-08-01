# Story 34.1 Frontend — Message Previews on Conversation List (LOCKED)

**Sprint:** 34 — Messaging & Content  
**Story:** 1 — Message previews (frontend phase)  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** Done (ACCEPT)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` for this phase only.  
**Prerequisite:** Backend phase **ACCEPT** (`b7dd9eb`) — API returns `lastMessage`.

---

## Goal

Show last-message preview + list timestamp on the conversations inbox, using existing unread badge semantics. Match backend contract; stay within current zinc/emerald row chrome.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| List page | `conversations-page-client.tsx` + `page.tsx` |
| Types | `src/lib/conversations-api.ts` — **no `lastMessage` yet** |
| Display helpers | `conversation-display.ts` (`formatMatchedAt`, `formatMessageTime`, labels) |
| Unread UI | Emerald count pill `conversation-unread-badge`, `99+` cap, `unreadAria` |
| Auth | `useAuth().user?.id` available on list page |
| Fetch | `useInfiniteQuery` + `fetchMyConversations` |
| WS today | Peer `message.new` → optimistic `unreadCount` only (no preview text) |
| Backend contract | `lastMessage: { text, senderId, sentAt } \| null` (full text; SENT only) |

### AGENT_COMMANDS corrections (outdated — ignore these)

- ❌ Blue unread **dot** — keep existing **emerald count badge**
- ❌ New `lib/time-format.ts` — extend `conversation-display.ts` + existing i18n `format.*`
- ❌ Mandatory `conversation-message-preview.tsx` — prefer pure helpers; inline render (optional thin component OK if it clarifies JSX)
- ❌ Replacing unread badge with “just a dot”
- ❌ Soft-delete preview rewrite (backend returns `null` for DELETED-only)

---

## Locked row layout

Preserve photo, link chrome (`rounded-xl border …`), chevron, emerald unread badge.

```
┌──────────────────────────────────────────────────┐
│ [photo]  Name (semibold; bold if unread)   2h ago│
│          You: Thanks for sharing…            [2]→│
└──────────────────────────────────────────────────┘
```

| Slot | Rule |
|------|------|
| Primary | `conversationPrimaryLabel` (unchanged) — `font-semibold` when `unreadCount > 0`, else `font-medium` |
| Timestamp (top-right of text column, or row trailing before badge) | If `lastMessage` → `formatMessageTime(lastMessage.sentAt, …)`; else → `formatMatchedAt(matchedAt, …)` |
| Secondary line | Preview (see below) — **replaces** gender·age·location + separate matched-at line on the list |
| Unread | Existing emerald count badge only when `unreadCount > 0` (no blue dot) |

---

## Locked preview semantics

### Types (`conversations-api.ts`)

```typescript
export interface ConversationLastMessageDto {
  text: string;
  senderId: string;
  /** ISO-8601 */
  sentAt: string;
}

export interface ConversationListItemDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  unreadCount: number;
  lastMessage: ConversationLastMessageDto | null;
}
```

Pass-through in `fetchMyConversations` (`lastMessage: item.lastMessage ?? null`).

### Helpers (`conversation-display.ts`)

| Export | Behavior |
|--------|----------|
| `CONVERSATION_PREVIEW_MAX_CHARS = 60` | Constant |
| `normalizePreviewText(text)` | Collapse whitespace / newlines → single spaces; trim |
| `truncatePreviewText(text, max = 60)` | Code-point safe: `[...normalized].length`; if over max → slice + `…` (ellipsis character) |
| `formatConversationPreview(lastMessage, currentUserId, copy)` | `null`/`empty` → `copy.noMessagesYet`; if `senderId === currentUserId` → `${copy.youPrefix}${truncated}`; else truncated text only |

### i18n (`conversations.list` — en / he / es)

| Key | EN |
|-----|-----|
| `youPrefix` | `You: ` (include trailing space) |
| `noMessagesYet` | `No messages yet` |

Reuse existing `conversations.format.*` via `formatMessageTime` / `formatMatchedAt` — **no new time-format module**.

### Edge cases

| Case | UI |
|------|-----|
| `lastMessage === null` | `noMessagesYet`; timestamp = matchedAt |
| Own last message | `You:` + truncated text |
| Peer last message | truncated text only |
| Long / emoji / multiline | normalize → truncate to 60 code points |
| DELETED-only (API null) | same as empty |

---

## Locked realtime behavior

Extend list optimistic path (do **not** require a full list refetch for every message):

1. Add helper (e.g. in `conversation-list-unread.ts` or beside it):  
   `applyIncomingMessageToConversationList(items, msg, opts: { currentUserId; bumpUnread: boolean })`  
   - Updates matching row: `lastMessage: { text, senderId, sentAt: createdAt }`  
   - If `bumpUnread` → `unreadCount + 1` then existing unread-first sort  
2. `handleListMessageNew`:  
   - Always apply preview update when conversation is in the loaded list  
   - `bumpUnread` only when sender ≠ self **and** conversation ≠ active focus (same as today)  
   - Own messages: preview only, no unread bump  
3. Leaving active thread / focus refetch still clears optimistic state via `dataUpdatedAt` (unchanged)

Out of scope: pushing preview via a new WS event type; Story 34.3 thread timestamps.

---

## Files Agent 1 should touch

| Path | Change |
|------|--------|
| `src/lib/conversations-api.ts` | Types + pass-through `lastMessage` |
| `src/app/dating/conversations/conversation-display.ts` | Preview normalize/truncate/format helpers (+ keep time helpers) |
| `src/app/dating/conversations/conversation-display.spec.ts` | **New** — truncate / You: / empty / emoji |
| `src/lib/conversation-list-unread.ts` (+ spec) | Apply incoming message → lastMessage (+ optional unread) |
| `src/app/dating/conversations/conversations-page-client.tsx` | Row layout + wire helpers + WS apply |
| `src/app/dating/conversations/page.spec.tsx` | Fixtures with `lastMessage`; preview / empty / You: / unread bold |
| `src/lib/i18n/{types,en,he,es}.ts` | `youPrefix`, `noMessagesYet` |

Optional: tiny `ConversationMessagePreview` presentational component under `app/dating/conversations/` — **not required**.

Do **not** change backend API this phase.

---

## Tests (required)

- Preview truncates at 60 code points with ellipsis  
- Own message gets `You:` prefix; peer does not  
- `null` lastMessage → `noMessagesYet`  
- Newline/whitespace collapsed before truncate  
- List row shows preview; fixtures include `lastMessage`  
- Unread badge still appears for `unreadCount > 0`  
- WS path updates preview text (unit and/or page spec)

---

## Acceptance criteria

- [x] Types include `lastMessage` matching backend  
- [x] Preview ≤ 60 code points + ellipsis when longer  
- [x] `You:` prefix for current user’s last message (i18n)  
- [x] Empty / null → `No messages yet` (i18n)  
- [x] Timestamp from `lastMessage.sentAt` when present, else matchedAt  
- [x] Unread: existing emerald count badge; bold name when unread  
- [x] Secondary meta (gender·age·location) removed from list row in favor of preview  
- [x] Optimistic WS updates preview (+ unread rules above)  
- [x] Dark mode tokens preserved  
- [x] en / he / es strings  
- [x] Specs green  

---

## Agent 3 next

```
--agent 3 sprint 34 story 1 frontend
```

## Done — Story 34.1 complete

Backend + frontend ACCEPT. Suggested next:

```
--agent 0 sprint 34 story 2 backend
```
