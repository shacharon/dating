# Handoff: Agent 1 — Dev — Story 5

**Agent:** 1 dev  
**Story:** [STORY_05_live_unread_badges.md](../../STORY_05_live_unread_badges.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **No API changes** — list listens to existing Story 2 `message.new` on the user room.
- **List page** — `useMessagingSocket` when `NEXT_PUBLIC_REALTIME=ws`; optimistic `unreadCount++` + unread-first re-sort.
- **Active thread** — `conversation-focus.ts` set by detail route; list skips bump for that `conversationId`.
- **`poll` mode** — no list socket; mount + `visibilitychange` refetch unchanged (Sprint 3).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/conversation-focus.ts` | created — `setActiveConversationId` / `getActiveConversationId` |
| `dating-ui/src/lib/conversation-list-unread.ts` | created — increment + sort helpers |
| `dating-ui/src/lib/conversation-list-unread.spec.ts` | created — 3 unit tests |
| `dating-ui/src/hooks/use-messaging-socket.ts` | optional `conversationId`; skip catch-up when omitted |
| `dating-ui/src/hooks/use-messaging-socket.spec.ts` | +1 list-wide subscription test |
| `dating-ui/src/app/dating/conversations/page.tsx` | socket + `handleListMessageNew` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | set/clear active conversation on mount/unmount |
| `dating-ui/src/app/dating/conversations/page.spec.tsx` | ws block: live bump, active skip, reconcile |

**No changes:** `dating-api/*`

---

## Decisions (do not reverse without discussion)

- Reuse `message.new` — no `conversation.unread` server event.
- Separate list + detail sockets when both mounted is acceptable; list unmounted on detail route.
- No reconnecting banner on list (`onConnectionChange` omitted).
- `conversationId` omitted on list hook → all events delivered; catch-up disabled without id.
- Authoritative counts on `fetchMyConversations()` (mount + visibility) replace optimistic state.

---

## Tests / verification

- [x] `npm run test` — `conversation-list-unread.spec.ts` **3/3**, `page.spec.tsx` **10/10**, `use-messaging-socket.spec.ts` **10/10**
- [ ] Manual smoke: sit on list, peer sends, badge bumps live — pending user

---

## Manual smoke

1. `NEXT_PUBLIC_REALTIME=ws` in `dating-ui/.env.local`  
2. B on `/dating/conversations` (not in a thread)  
3. A sends → B badge increments live, row sorts unread-first  
4. B opens thread → back to list → refetch shows 0  
5. B in open thread, A sends → list badge does not inflate while thread open  

---

## Next agent

```text
--agent 2 sprint 4 story 5
```

**Notes for Agent 2:**

1. CR against `agent-0-architect.md` — confirm no API drift.
2. Optional: detail page spec for `setActiveConversationId` on mount/unmount.
3. Optional: `poll` explicit test that socket mock never registers handler (if not covered).
4. Run broader UI suite if touching shared hook mocks.
