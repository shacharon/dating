# Handoff: Agent 0 — Architect — Sprint 34 Story 5

**Agent:** 0 architect  
**Story:** Conversation list search & filters  
**Sprint:** sprint-34-messaging-content  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** UI/behavior lock. **No product code.** Agent 1 implements. **Skip Agent 4.**

---

## Summary

Client-side search (primary label), All/Unread/Recent(24h), Recent/A–Z sort on flattened infinite-query pages; sessionStorage; debounced search; filtered-empty state. Null-safe labels; keep emerald badge + previews + WS optimism.

Full lock: [STORY_05_conversation_filters.md](../../STORY_05_conversation_filters.md)

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `lib/conversation-list-controls.ts` (+ spec) | pure filter/sort |
| `components/conversation-list-filters.tsx` (+ spec) | controls UI |
| `conversations-page-client.tsx` + `page.spec.tsx` | wire + persist |
| `i18n` en/he/es + types | chrome + filtered empty |

---

## Decisions (do not reverse)

1. Client-side only on **loaded** pages; keep Load more.  
2. Search/sort via `conversationPrimaryLabel`, not raw nullable nickname.  
3. Recent = activity `lastMessage.sentAt ?? matchedAt` within 24h.  
4. sessionStorage `dating.conversations.listControls.v1`.  
5. Debounce search 300ms; clear control; no emoji.  
6. Skip Agent 4.

---

## Agent 1 brief

1. Read `STORY_05_conversation_filters.md`  
2. Helper → filters UI → page wire → i18n → specs  
3. Do not change dating-api  

**Next command:**

```
--agent 1 sprint 34 story 5
```
