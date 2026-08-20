# Story 03 — WS deletedAt parity + revoke disconnect

**Sprint 49 · Status: Planned · P0 · ~1.5d · Agent 2.5**

## Objective

1. WS handshake rejects soft-deleted users (`deletedAt`) like HTTP AuthGuard.
2. Session revoke publishes disconnect so remote sockets die without waiting for 60s revalidation (Architect may also reduce per-socket Prisma timers).

## Acceptance criteria

- [ ] Soft-deleted cannot maintain WS
- [ ] Revoke disconnects sockets (documented test)
- [ ] Agent 2.5 signs off auth parity
