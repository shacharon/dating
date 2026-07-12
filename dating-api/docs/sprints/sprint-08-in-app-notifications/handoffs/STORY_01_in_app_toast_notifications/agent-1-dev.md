# Handoff: Agent 1 — Senior dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_in_app_toast_notifications.md](../../STORY_01_in_app_toast_notifications.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- Shipped **global in-app message toast** via `MessageToastProvider` in `AuthenticatedAppShell` (all `/dating/*` pages).
- Subscribes to existing `message.new` WS event when `NEXT_PUBLIC_REALTIME=ws`; no backend changes.
- Custom toast UI (no new npm dep): sender label from warmed conversations cache, 5s auto-dismiss, click → conversation.
- Skip rules: own message, active thread (`conversation-focus`), `isInAppNotificationsEnabled()` stub (always true until Story 3).
- **11 unit tests** pass (`message-in-app-notify` + `message-toast-provider`).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/message-in-app-notify.ts` | created |
| `dating-ui/src/lib/message-toast-labels.ts` | created |
| `dating-ui/src/lib/message-toast.constants.ts` | created |
| `dating-ui/src/components/message-toast.tsx` | created |
| `dating-ui/src/components/message-toast-provider.tsx` | created |
| `dating-ui/src/components/authenticated-app-shell.tsx` | wrap children with `MessageToastProvider` |
| `dating-ui/src/lib/i18n/types.ts` | `notifications` copy keys |
| `dating-ui/src/lib/i18n/en.ts` | English toast copy |
| `dating-ui/src/lib/i18n/es.ts` | Spanish toast copy |
| `dating-ui/src/lib/message-in-app-notify.spec.ts` | created — 5 tests |
| `dating-ui/src/components/message-toast-provider.spec.tsx` | created — 6 tests |

**No changes:** `dating-api/*`

---

## Decisions (do not reverse without discussion)

- Followed architect: third socket in shell (list/detail keep their own).
- `conversationPrimaryLabel` imported from app `conversation-display.ts` (no lib move in this story).
- Toast shows message text only as i18n template — never raw `MessageDto.text`.

---

## Tests / verification

- [x] `cd dating-ui && npm test -- src/lib/message-in-app-notify.spec.ts src/components/message-toast-provider.spec.tsx` → **11/11 pass**
- [ ] Manual smoke (operator): B on `/dating/me-matches`, A sends → toast; open thread → no toast — **pending user**

### How to manual smoke

1. Ensure `NEXT_PUBLIC_REALTIME=ws` in `dating-ui/.env.local`.
2. Start API + UI; log in as users A and B (mutual match with conversation).
3. B on `/dating/me-matches`; A sends message → B sees toast bottom-right within ~1s.
4. Click toast → lands on `/dating/conversations/{id}`.
5. B opens that thread; A sends again → no toast.
6. Set `NEXT_PUBLIC_REALTIME=poll` → restart UI → no toast on message (poll mode).

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 8 story 1
```

**Notes for agent 2:**

- CR against `agent-0-architect.md` — confirm no API/email drift.
- Consider whether duplicate shell + list sockets need consolidation (defer unless bug found).
- Story 3 will replace `isInAppNotificationsEnabled()` stub.
- Manual smoke still pending operator.
