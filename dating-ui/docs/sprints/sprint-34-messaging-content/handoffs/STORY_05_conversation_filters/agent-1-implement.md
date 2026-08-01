# Agent 1 — Implement — Story 34.5 Conversation filters

**Status:** Ready for Agent 2 (CR)  
**Date:** 2026-08-01  

## What shipped

Client-side search / filter / sort on the conversations inbox, without API changes.

| Path | Change |
|------|--------|
| `src/lib/conversation-list-controls.ts` (+ spec) | Pure `filterAndSortConversations`; activity = `lastMessage.sentAt ?? matchedAt`; search on `conversationPrimaryLabel`; sessionStorage parse helpers |
| `src/components/conversation-list-filters.tsx` (+ spec) | Search + filter select + sort select; clear ✕; no emoji |
| `conversations-page-client.tsx` | 300ms debounce; `sessionStorage` key `dating.conversations.listControls.v1`; filtered list + filtered-empty; load-more still when `hasMore` |
| `page.spec.tsx` | Search debounce/clear, unread, A–Z, session restore, filtered-empty |
| i18n types + en/he/es | List controls + filtered-empty + `loadMore` |

## Semantics (locked)

1. Flatten pages (+ optimistic overlay)  
2. Filter: search ∩ type (`all` / `unread` / `recent` 24h)  
3. Sort: `recent` (activity desc, id tie) / `alphabetical` (label `localeCompare`, id tie)  
4. Persist raw `searchQuery` + filter + sort for the browser session  

## Tests

```
npx vitest run src/lib/conversation-list-controls.spec.ts \
  src/components/conversation-list-filters.spec.tsx \
  src/app/dating/conversations/page.spec.tsx
```

**Result:** 32 passed.

## Next

```
--agent 2 sprint 34 story 5
```
