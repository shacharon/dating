# Handoff: Agent 1 — Dev — Story 6

**Agent:** 1 dev  
**Story:** [STORY_06_hardening_prod_gate.md](../../STORY_06_hardening_prod_gate.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **`conversation.subscribe` / `conversation.unsubscribe`** — gateway authz via `MeConversationsService.assertActiveConversationParticipant`; UI emits on detail route connect/cleanup.
- **Inbound rate limit** — 30 events / 60s per user; disconnect + `MESSAGING_WS_RATE_LIMITED`.
- **Session lifecycle** — 60s re-validation; `MessagingSocketRegistry` + logout disconnect.
- **Redis adapter** — optional `REDIS_URL` via `RedisIoAdapter` in `main.ts`.
- **Prod docs** — `PROD_REALTIME.md`, `LOAD_SMOKE_WS.md`.

---

## Artifacts

| Path | Change |
|------|--------|
| `messaging.gateway.ts` | subscribe handlers, session timer, registry, rate limit |
| `messaging-ws-rate-limit.service.ts` | created |
| `messaging-ws-session.service.ts` | created |
| `messaging-socket-registry.service.ts` | created |
| `redis-io.adapter.ts` | created |
| `messaging-realtime.module.ts` | forwardRef MeProfile; new providers |
| `me-profile.module.ts` | forwardRef + export `MeConversationsService` |
| `auth.module.ts` / `auth.service.ts` | logout disconnects sockets |
| `main.ts` | `RedisIoAdapter` |
| `error-codes.ts` | subscribe / rate / session codes |
| `package.json` | `@socket.io/redis-adapter`, `redis` |
| `use-messaging-socket.ts` | subscribe / unsubscribe emits |
| `messaging-socket.ts` | event constants |
| `PROD_REALTIME.md`, `LOAD_SMOKE_WS.md` | created |
| `*.spec.ts` | gateway, rate limit, registry, cors, integration, auth, UI hook |

---

## Decisions (do not reverse without discussion)

- Emit path unchanged (`user:<id>` rooms only).
- Rate limit disconnects socket (hard stop).
- CORS regression covered by `messaging-ws-cors.spec.ts` (engine Origin header not reliable in integration).
- In-memory rate limit per process (documented).

---

## Tests / verification

- [x] API `npx jest src/messaging-realtime src/auth/auth.service.spec.ts` — **30/30**
- [x] API `npm run build` — pass
- [x] UI `use-messaging-socket.spec.ts` — **14/14**
- [ ] Manual smoke Story 6 — pending user
- [ ] Multi-instance Redis smoke — pending user (local Docker Redis)

---

## Manual smoke

See `STORY_06_hardening_prod_gate.md` and `PROD_REALTIME.md`.

---

## Next agent

```text
--agent 2 sprint 4 story 6
```
