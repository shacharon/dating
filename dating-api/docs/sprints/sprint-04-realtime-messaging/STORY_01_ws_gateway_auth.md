# Story 1: WebSocket gateway + auth

**Sprint:** 4  
**Status:** Done  
**Depends on:** Sprint 3 (messaging REST endpoints must exist)

---

## Why

Real-time push requires a persistent connection. Before emitting any messages, we need an authenticated WebSocket channel so only the logged-in user receives events meant for them. Auth reuses the existing HttpOnly session cookie so there is no second credential system.

---

## What

**As a** logged-in user with an open app  
**I want** my browser to hold an authenticated real-time connection  
**So that** the server can push messages to me without polling

### Acceptance criteria

- [x] **Dependencies** — Add `@nestjs/websockets` + `@nestjs/platform-socket.io` (API) and `socket.io-client` (UI)
- [x] **Gateway** — `MessagingGateway` on namespace `/ws/messaging`
- [x] **Handshake auth** — Validate the session cookie on connect (reuse `SessionService.validateSessionToken`); reject + disconnect unauthenticated sockets
- [x] **User room** — On successful connect, socket joins room `user:<userId>`
- [x] **Same-origin** — Next proxy forwards `/socket.io/*` to API (manual browser smoke pending)
- [x] **Disconnect on session end** — Invalid session rejected at connect; periodic re-validation deferred to Story 6
- [x] **Observability** — Structured log on connect/disconnect/auth-fail with dedicated `ErrorCodes`
- [x] **No events yet** — Gateway authenticates and rooms only; message emit is Story 2
- [x] **Tests** — 15 automated (ws-auth, gateway, publisher, WS integration)

### Out of scope (this story)

- Emitting `message.new` (Story 2)
- UI subscribing / removing polling (Story 3)
- Reconnect/catch-up logic (Story 4)
- Live unread badges (Story 5)
- Per-event rate limiting, Redis adapter (Story 6)

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_01_ws_gateway_auth/agent-0-architect.md` for the gateway contract and connection lifecycle.

---

## Definition of done

- [x] WS deps installed (API + UI)
- [x] `MessagingGateway` registered in `MessagingRealtimeModule` + `AppModule`
- [x] Connect with valid session cookie → accepted, joins `user:<userId>` (integration test)
- [x] Connect without cookie → rejected + disconnected (integration test)
- [x] Next config proxies `/socket.io/*` to API
- [x] Connect/disconnect/auth-fail logged with error codes
- [x] Unit tests: ws-auth (5), gateway (4), publisher (3)
- [x] Integration tests: WS connect/reject (2)
- [ ] Manual smoke: browser WS 101 + cookie — **pending user verification**

---

## Manual smoke

1. Log in to the UI  
2. Open dev tools → Network → WS; confirm `/socket.io` with namespace `/ws/messaging`, status **101 Switching Protocols**  
3. Confirm the connection carries the session cookie (request headers)  
4. Clear the session cookie / log out → connection is closed and not re-established as authenticated  
5. Check API logs for `MESSAGING_WS_CONNECT_OK` / `MESSAGING_WS_AUTH_FAILED`

---

## Shipped notes

- **`MessagingRealtimeModule`** — `MessagingGateway`, `MessagingWsAuthService`, `RealtimePublisher`.
- **Auth:** `parseCookieHeader` + `validateSessionToken` + active user (mirrors `AuthGuard`).
- **`IoAdapter`** in `main.ts`; CORS via `messaging-ws-cors.ts`.
- **`RealtimePublisher`** bound in `afterInit` — ready for Story 2 emit.
- **UI:** `createMessagingSocket()` factory only (`autoConnect: false`); conversation page unchanged (polling remains).
- **Tests:** 15/15 `npx jest messaging-realtime --runInBand`.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Emit message.new | Story 2 |
| UI subscribe + remove polling | Story 3 |
| Reconnect + catch-up | Story 4 |
| Periodic session re-validation on open socket | Story 6 |
| Redis adapter (multi-instance) | Story 6 |
| Browser manual smoke | user verification |
