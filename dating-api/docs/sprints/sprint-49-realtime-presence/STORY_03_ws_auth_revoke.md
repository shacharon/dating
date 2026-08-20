# Story 03 — WS deletedAt parity + revoke disconnect

**Sprint 49 · Status: Planned · P0 · ~1.5d · Agent 2.5**

## Objective

1. WS handshake rejects soft-deleted users (`deletedAt`) like HTTP AuthGuard.
2. Session revoke force-disconnects remote sockets via session/user rooms + Redis adapter (without waiting solely on 60s revalidation).

## Acceptance criteria

- [x] Soft-deleted cannot maintain WS — handshake + `isConnectionAllowed` revalidate
- [x] Revoke disconnects sockets (documented test) — WS integration + unit call-order
- [x] Agent 2.5 signs off auth parity

## Definition of Done

- [x] Schema / HTTP API / UI: N/A
- [x] Handshake `deletedAt` → `user_not_found` (AuthGuard opacity)
- [x] Session room join + `disconnectSockets` on logout / account delete
- [x] Specs green (Agent 2: 53 passed)
- [x] Agent 2.5 approved (Critical/High: 0)
- [ ] Agent 3 PM close
- [ ] Agent 5 post-deploy (after production soak)
- [ ] Browser Network operator smoke (optional; integration gate done)

## Security notes (Agent 2.5)

- Soft-delete WS denial matches HTTP AuthGuard opacity (`user_not_found` / 401-equivalent, no distinct deleted reason).
- No new HTTP/auth surface; force-disconnect only from authenticated logout / account-delete → registry.
- `session:{sessionId}` rooms are auth-sensitive ids — Redis / Socket.IO adapter must stay private (VPC).
- Clients cannot invent session rooms; server joins after validated handshake only.
- Residual: Redis-down → remote linger ≤60s revalidate; soft-delete without revoke caught on next revalidate tick.
- Pre-existing: connect traces may log full `sessionId` (not introduced here).

## Commits

- `3b6b313` — feat(realtime): WS deletedAt parity + cluster force-disconnect
- `c937660` — test: harden WS auth revoke force-disconnect coverage
- `e80f58c` — security: review sprint 49 story 3 WS auth revoke

## Suggested commit

```
feat(realtime): WS deletedAt parity + cluster force-disconnect

Sprint 49 Story 3
```
