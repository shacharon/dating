# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_reconnect_catchup.md](../../STORY_04_reconnect_catchup.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **socket.io reconnection** — explicit backoff in `createMessagingSocket` (1s–10s, infinite attempts).
- **Catch-up on `connect`** — one guarded `GET ?after=<lastId>`; merges via shared `mergeIncomingMessages`.
- **Reconnecting banner** — `conversation-reconnecting` when socket drops after first connect.
- **Stable `handleSocketConnectionChange`** — `useCallback` so hook effect is not reset every render.

---

## Artifacts

| Path | Change |
|------|--------|
| `messaging-socket.ts` | reconnection options |
| `use-messaging-socket.ts` | connect/disconnect, catch-up, status callback |
| `page.tsx` | `mergeIncomingMessages`, indicator, hook wiring |
| `use-messaging-socket.spec.ts` | +4 tests (catch-up, reconnecting) |
| `page.spec.tsx` | reconnecting + catch-up page tests |

---

## Decisions (do not reverse without discussion)

- `onConnectionChange` must be stable (`useCallback`) — inline arrow caused socket teardown every render.
- Catch-up on every `connect` (initial + reconnect).
- `poll` mode unchanged.

---

## Tests / verification

- [x] `npm run test` — hook **8/8**, page **33/33**, realtime-mode **3/3**
- [ ] Manual smoke: offline → missed messages backfill — pending user

---

## Manual smoke

1. `NEXT_PUBLIC_REALTIME=ws`  
2. Two tabs; tab B offline  
3. Tab A sends 2 messages  
4. Tab B: "Reconnecting…"  
5. Tab B online → banner clears, 2 messages appear once each  

---

## Next agent

```text
--agent 2 sprint 4 story 4
```
