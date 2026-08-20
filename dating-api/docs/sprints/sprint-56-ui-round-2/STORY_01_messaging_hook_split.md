# Story 01 — Messaging hook split

**Sprint 56 · Done · P1 · ~2d · Agent 3.5**

**Status:** Done  
**Tip:** `feature/sprint-56-story-1` @ `b4f0112` (impl `2973bfa`)

Split `use-conversation-messages` / `use-messaging-socket` / shell provider into: socket lifecycle, thread state machine, list optimistic patch. i18n for load errors.

## Definition of done

- [x] Three concerns separated in `hooks/messaging/` (+ stable re-exports)
- [x] List client uses `useConversationListRealtime`; thread façade preserves API
- [x] i18n fallbacks wired; EN equality hack gone
- [x] Runtime topology unchanged (singleton direct-to-API); browser Network smoke deferred with tracker (Agent 5 / operator)
- [x] Agent 2 approved; Agent 3.5 approved; Agent 3 closes
