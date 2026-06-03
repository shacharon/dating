# Story 6: Hardening + prod gate (optional)

**Sprint:** 4  
**Status:** Done  
**Depends on:** Story 4 (stable reconnect/catch-up)

---

## Why

Before this ships to production, the socket layer needs the same guardrails the REST layer already has: authorization on every action, abuse limits, session lifecycle handling, and a clear story for running more than one API instance.

---

## What

**As a** platform operator  
**I want** the real-time layer to be authorized, rate-limited, and scale-ready  
**So that** WebSockets are safe to run in production

### Acceptance criteria

- [x] **Subscribe authorization** — `conversation.subscribe` uses `assertActiveConversationParticipant`; `subscribe.denied` on failure
- [x] **Per-socket event rate limit** — 30 inbound events / 60s per user; disconnect + `MESSAGING_WS_RATE_LIMITED`
- [x] **Session lifecycle** — 60s re-validation + `MessagingSocketRegistry.disconnectBySessionId` on logout
- [x] **Multi-instance** — `RedisIoAdapter` when `REDIS_URL` set; single-instance + sticky-session notes in `PROD_REALTIME.md`
- [x] **Origin/CORS** — `messaging-ws-cors.ts` mirrors HTTP; unit regression test
- [x] **Observability** — subscribe / rate / session / connect / disconnect error codes + active connection count in traces
- [x] **Load smoke** — documented in `LOAD_SMOKE_WS.md`
- [x] **Tests** — gateway, integration, rate limit, session, registry, cors, auth logout, UI subscribe (37 API + 14 UI hook)

### Out of scope (this story)

- Horizontal autoscaling policy / infra provisioning
- Full load/perf benchmark suite
- Presence, typing, delivery receipts

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_06_hardening_prod_gate/agent-0-architect.md`.

---

## Definition of done

- [x] Non-participant cannot subscribe to a conversation (rejected + logged)
- [x] Per-user socket event rate limit enforced
- [x] Logout/expiry disconnects the socket
- [x] Multi-instance via Redis adapter **or** single-instance constraint documented
- [x] WS handshake origin-restricted
- [x] Connection/auth/rate-limit observability in place
- [x] Load smoke documented
- [x] Unit/integration tests: subscribe authz, event rate limit, session disconnect
- [ ] Manual smoke: unauthorized subscribe blocked; flood blocked; logout drops socket — **pending user verification**

---

## Manual smoke

1. Authenticated socket tries to subscribe to a conversation it's not part of → rejected  
2. Flood inbound socket events past the limit → throttled/rejected, logged  
3. Log out → socket disconnects and does not resume authenticated  
4. (Multi-instance) Two API instances behind the LB → message sent on instance A reaches a user connected to instance B (Redis adapter)

---

## Shipped notes

- **`MessagingGateway`** — `conversation.subscribe` / `conversation.unsubscribe`; session timer; inbound guard.
- **`MessagingWsRateLimitService`** — in-memory 30/60s (per-process; documented).
- **`MessagingWsSessionService`** — `isSessionActive(sessionId)`.
- **`MessagingSocketRegistry`** — logout disconnect.
- **`RedisIoAdapter`** — optional `REDIS_URL` in `main.ts`.
- **`AuthService.logout`** — disconnects sockets before session revoke.
- **UI** — `useMessagingSocket` emits subscribe/unsubscribe on detail route.
- **Docs** — `PROD_REALTIME.md`, `LOAD_SMOKE_WS.md`.
- **Tests:** API messaging-realtime **37**; UI hook **14** (subscribe/unsubscribe).

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Presence / typing indicators | future sprint |
| Delivery / read-receipt push | future sprint |
| Push notifications (offline) | future sprint |
| Full load/perf benchmarks | future |
| Shared rate-limit store (Redis) | future ops |
