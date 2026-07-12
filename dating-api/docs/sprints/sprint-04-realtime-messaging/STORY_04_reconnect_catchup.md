# Story 4: Reconnect + catch-up

**Sprint:** 4  
**Status:** Done  
**Depends on:** Story 3 (UI consumes `message.new`)

---

## Why

WebSockets drop — sleep, network blips, server restarts, proxy timeouts. A naive socket UI silently loses messages during the gap. To safely replace polling, the client must reconnect and backfill anything it missed while disconnected.

---

## What

**As a** user whose connection briefly drops  
**I want** the app to reconnect and fetch anything I missed  
**So that** I never lose messages even though we no longer poll

### Acceptance criteria

- [x] **Auto-reconnect** — socket.io reconnection with exponential backoff (1s–10s)
- [x] **Catch-up on reconnect** — On `connect`, one `GET ?after=<lastId>`; merge with dedupe
- [x] **Gap-safe** — Missed messages backfill via catch-up fetch
- [x] **Reconnecting indicator** — `Reconnecting…` banner; cleared on `connect`
- [x] **No duplicates** — `appendUniqueMessages` / `mergeIncomingMessages`
- [x] **Initial connect** — First `connect` after history load runs catch-up
- [x] **Tests** — hook + page + socket config (45 related UI tests)

### Out of scope (this story)

- Live list-page badges (Story 5)
- Per-socket event rate limiting / Redis adapter (Story 6)
- Offline message queue for the sender (out of sprint)

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_04_reconnect_catchup/agent-0-architect.md` for the reconnect/catch-up contract.

---

## Definition of done

- [x] Reconnection with backoff configured on the client
- [x] On connect/reconnect, one `GET ?after=<lastId>` runs and merges
- [x] Reconnecting indicator shows while down, clears on reconnect
- [x] No duplicate messages after catch-up (tests)
- [x] UI test: disconnect→reconnect → catch-up fetch + merge
- [x] UI test: catch-up dedupe
- [ ] Manual smoke: network drop → peer send → backfill — **pending user verification**

---

## Manual smoke

1. Two tabs / accounts, conversation open, flag = `ws`  
2. In tab B, disable network (dev tools offline)  
3. Tab A sends 2 messages  
4. Tab B shows "Reconnecting…"  
5. Re-enable network in tab B → socket reconnects, indicator clears, the 2 missed messages appear (once each)  
6. Continue sending → live delivery resumes normally

---

## Shipped notes

- **`createMessagingSocket`** — `reconnection`, `reconnectionDelay` 1s, `reconnectionDelayMax` 10s.
- **`useMessagingSocket`** — `connect` catch-up with `catchUpInFlight` guard; `disconnect` → reconnecting status.
- **`page.tsx`** — `mergeIncomingMessages`, `conversation-reconnecting` banner, stable `handleSocketConnectionChange`.
- **Tests:** hook 9, page 35 (Story 4 cases), `messaging-socket.spec` 1.
- **Core realtime path (Stories 1–4) complete** for conversation route when `NEXT_PUBLIC_REALTIME=ws`.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Live unread badges on list | Story 5 (optional) |
| Hardening (event limit, Redis, session re-validation) | Story 6 (optional) |
| Sender offline queue | future |
| Browser manual smoke | user verification |
