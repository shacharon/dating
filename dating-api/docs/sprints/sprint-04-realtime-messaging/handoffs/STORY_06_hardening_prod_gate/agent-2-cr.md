# Handoff: Agent 2 — Code review — Story 6

**Agent:** 2 code-review  
**Story:** [STORY_06_hardening_prod_gate.md](../../STORY_06_hardening_prod_gate.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  
**Verdict:** approved  

---

## Summary

- Reviewed Agent 1 implementation against `agent-0-architect.md` — **no production code changes required**.
- Added **7** tests: session service unit (5), Redis adapter no-op (1), gateway unsubscribe (1).
- Confirmed subscribe authz, rate limit, session lifecycle, logout registry, Redis wiring, CORS unit coverage, UI subscribe emits.

---

## Review notes

| Area | Finding |
|------|---------|
| Subscribe authz | Reuses `assertActiveConversationParticipant`; `subscribe.ok` / `subscribe.denied` — correct |
| Emit path | Still `RealtimePublisher` → `user:<id>` only — correct |
| Rate limit | 30/60s in-memory; disconnect on exceed — correct |
| Session | 60s re-validation + logout `disconnectBySessionId` before revoke — correct |
| Redis | Optional `REDIS_URL`; single-instance documented in `PROD_REALTIME.md` — correct |
| CORS | `messaging-ws-cors.spec.ts` mirrors HTTP allowlist — correct |
| Module DI | `forwardRef` MeProfile ↔ MessagingRealtime; registry exported to Auth — correct |
| Minor | Integration CORS via `Origin` header unreliable; unit test covers policy |
| Minor | Jest integration leaves session timers — use `--forceExit` or close app (pre-existing pattern) |

---

## Tests added

### Unit — `messaging-ws-session.service.spec.ts` (new, **5**)

- Empty id, missing row, revoked, expired, active session

### Unit — `redis-io.adapter.spec.ts` (new, **1**)

- `REDIS_URL` unset → no adapter attached

### Unit — `messaging.gateway.spec.ts` (+1)

- `conversation.unsubscribe` removes id from tracked set

(Agent 1 already had: gateway subscribe/deny/rate/session, rate limit, registry, cors, integration subscribe/deny/rate, auth logout, UI subscribe/unsubscribe.)

---

## Tests / verification

- [x] API `npx jest src/messaging-realtime src/auth/auth.service.spec.ts` — **37/37**
- [x] UI `use-messaging-socket.spec.ts` — **14/14**
- [ ] Manual smoke Story 6 — pending user
- [ ] Multi-instance Redis smoke — pending user

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 3 sprint 4 story 6
```
