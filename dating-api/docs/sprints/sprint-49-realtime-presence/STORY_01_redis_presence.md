# Story 01 — Redis-backed presence

**Sprint 49 · Status: Planned · P0 · ~2d · Agent 2.5**

## Objective

Replace in-memory `MessagingSocketRegistry` Maps with a Redis-backed presence store (or document Socket.IO adapter rooms as source of truth). Keep gateway + auth logout + NewMessageEmail online-skip working across instances.

## Acceptance criteria

- [x] Presence visible cross-process
- [x] Disconnect / logout clears presence
- [x] Specs or integration proof under 2 fake nodes / Redis
- [x] Agent 2.5 reviews PII/session indexing

## Security notes (Agent 2.5)

- Presence keys: `ws:presence:user|session|meta` — ids only (no email/name/PII content).
- `sessionId` in Redis is auth-sensitive → Redis must stay private (VPC / ElastiCache).
- `PRESENCE_CLEARED` traces truncate session id; register traces use `socketId` only.
- Fail-open online-skip when Redis down → may email an online user (prefer notify over silent drop).
- Residual until Story 03: logout clears Redis presence; remote socket may linger ≤60s revalidate.
- No new HTTP/auth surface; presence not exposed to clients.
