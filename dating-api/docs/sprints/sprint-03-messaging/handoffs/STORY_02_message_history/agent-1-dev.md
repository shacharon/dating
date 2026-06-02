# Handoff: Agent 1 — Senior dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_message_history.md](../../STORY_02_message_history.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Added **`MeConversationMessagesService.listMessages()`** + **`GET /api/v1/me/conversations/:id/messages`** → **200** + `MessageListDto`.
- Cursor pagination: `limit` (default 50, max 100) + optional `before=<messageId>`; chronological ASC; `hasMore` + `nextCursor`.
- Reused **`assertActiveConversationParticipant`**; invalid cursor/limit → **400**.
- UI: load history on mount; left/right bubbles via **`useAuth().user.id`**; **`formatMessageTime()`**; load earlier button; auto-scroll on first load + send; dedupe on send append.
- **No migration**; **no `after` param** (Story 3).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-conversation-messages.dto.ts` | updated — `MessageListDto`, `parseMessageListLimit` |
| `dating-api/src/me-profile/me-conversation-messages.service.ts` | updated — `listMessages()` |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `GET conversations/:id/messages` |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated — `message.findMany` / `findFirst` mocks |
| `dating-api/src/logging/error-codes.ts` | updated — `ME_CONVERSATIONS_MESSAGES_LIST_OK` |
| `dating-ui/src/lib/conversations-api.ts` | updated — `MessageListDto`, `fetchConversationMessages` |
| `dating-ui/src/app/dating/conversations/conversation-display.ts` | updated — `formatMessageTime()` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — history, alignment, load more, scroll |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated — mocks for `fetchConversationMessages`, `useAuth` |

**Deferred to Agent 2:** `listMessages` unit tests, GET integration block, expanded UI tests per architect test plan.

---

## Decisions (do not reverse without discussion)

- Followed architect: message **ID** cursor for `before`; exclude `DELETED`; empty history **200**.
- `scrollTo` fallback to `scrollTop` for jsdom/test environments.
- Load earlier preserves scroll position via height delta.
- Recipient must reopen conversation for new messages until Story 3 (no polling).

---

## How to run

```powershell
cd c:\dev\piza\dating\dating-api
npm run start:dev

cd c:\dev\piza\dating\dating-ui
npm run dev
```

No migration needed.

---

## Manual smoke (happy path)

1. User A and User B have mutual match; exchange a few messages.
2. User A opens conversation → sees full history, chronological order.
3. A's messages right (blue), B's left (gray); timestamps visible.
4. Send new message → appears at bottom; scroll follows.
5. User B opens same conversation → sees same history (Story 2 fix vs Story 1).
6. With 50+ messages → "Load earlier messages" → prepends older rows.
7. Non-participant / unmatch → 403/404 unchanged.

---

## Tests / verification

- [x] `npm run build` (dating-api) — pass
- [x] `npm run build` (dating-ui) — pass
- [x] `page.spec.tsx` (12 tests) — pass
- [x] `listMessages` unit tests — Agent 2
- [x] GET messages integration tests — Agent 2

---

## Open questions / blockers

- None blocking Agent 2.

---

## Next agent

**Agent 2 (CR):** `--agent 2 sprint 3 story 2`
