# Handoff: Agent 1 — Dev — Story 3

**Agent:** 1 dev  
**Story:** [STORY_03_ui_subscribe_conversation.md](../../STORY_03_ui_subscribe_conversation.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **`NEXT_PUBLIC_REALTIME=ws|poll`** — default `poll`; `ws` connects socket and disables 3s `after` polling.
- **`useMessagingSocket`** — listens for `message.new`, filters by `conversationId`, disconnects on unmount.
- **Conversation page** — `handleMessageNew` + `appendUniqueMessages` + near-bottom scroll; poll effect gated.
- **Tests** — `realtime-mode.spec.ts` (3) + `page.spec.tsx` ws block (3); all existing tests pass with default `poll`.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/realtime-mode.ts` | `getRealtimeMode()` |
| `dating-ui/src/lib/realtime-mode.spec.ts` | flag unit tests |
| `dating-ui/src/lib/messaging-socket.ts` | `MESSAGING_EVENT_MESSAGE_NEW` |
| `dating-ui/src/hooks/use-messaging-socket.ts` | socket hook |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | hook + gated poll |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | ws mode tests + mocks |
| `dating-ui/.env.example` | `NEXT_PUBLIC_REALTIME` documented |

---

## Decisions (do not reverse without discussion)

- Default **`poll`** — production-safe until env sets `ws`.
- Socket connects when `ws && id && !messagesLoading`.
- Poll code retained behind flag (not deleted).

---

## Tests / verification

- [x] `npm run test` — `page.spec.tsx` **28/28**, `realtime-mode.spec.ts` **3/3**
- [ ] `npm run typecheck` — may fail on unrelated `me-matches` spec (pre-existing)
- [ ] Manual smoke: two tabs near-instant with `NEXT_PUBLIC_REALTIME=ws` — pending user

---

## Manual smoke

1. Add to `dating-ui/.env.local`: `NEXT_PUBLIC_REALTIME=ws`
2. Restart UI; ensure same-origin (no `NEXT_PUBLIC_API_URL`)
3. API on :3001, UI on :3000
4. Two accounts on same conversation → send → other tab instant
5. Network: no repeating `GET .../messages?after=` every 3s
6. Sender message appears once
7. Set `NEXT_PUBLIC_REALTIME=poll` → 3s poll returns

---

## Deferred / follow-up

| Item | Owner |
|------|--------|
| Reconnect + catch-up | Story 4 |
| Live unread badges | Story 5 |
| Agent 2 extra tests | optional review |

---

## Next agent

```text
--agent 2 sprint 4 story 3
```
