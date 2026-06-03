# Handoff: Agent 2 — Code review — Story 5

**Agent:** 2 code-review  
**Story:** [STORY_05_live_unread_badges.md](../../STORY_05_live_unread_badges.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  
**Verdict:** approved  

---

## Summary

- Reviewed Agent 1 implementation against `agent-0-architect.md` — **no production code changes required**.
- Added **6** tests to close architect test-plan gaps (poll socket off, self-message skip, unread-first re-sort, list-wide event delivery, detail focus id, DOM cleanup).
- Confirmed no API drift; sort helper matches `me-conversations.service.ts` ordering.

---

## Review notes

| Area | Finding |
|------|---------|
| Event reuse | `message.new` only — no new server event — correct |
| List handler | Peer-only, active-conversation skip, optimistic increment — correct |
| Hook | Optional `conversationId`; catch-up skipped without id — correct |
| Sort | `unreadCount` desc then `matchedAt` desc — matches API |
| Poll mode | Socket not created when `poll` — correct |
| Detail focus | `setActiveConversationId` on mount/cleanup — correct |
| Minor | `next/link` mock omits `data-testid` on rows — tests use `href` queries |

---

## Tests added

### Unit — `use-messaging-socket.spec.ts` (+1)

- Forwards `message.new` from any conversation when `conversationId` is omitted

### Component — `page.spec.tsx` (+4)

- `poll` mode → `createMessagingSocket` not called
- Own `senderId` → no badge increment
- Peer message → bumped row moves to top (unread-first)
- `cleanup()` in `afterEach` for isolated DOM

### Component — `[id]/page.spec.tsx` (+1)

- Sets `activeConversationId` on mount; clears on unmount

(Agent 1 already had: util tests, live bump, active skip, reconcile, list-wide connect.)

---

## Tests / verification

- [x] `npm run test` — `conversation-list-unread` **3/3**, `page.spec` **13/13**, `use-messaging-socket` **11/11**
- [x] Detail focus test — **1/1** (`active conversation` filter)
- [ ] Manual smoke: list live badge — pending user

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 3 sprint 4 story 5
```
