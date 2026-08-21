# Story 01 — Redis-backed presence

**Sprint 49 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 2 days  
**Dependencies:** Redis for multi-instance  
**Repo:** `dating-api`  
**Extra agents:** 2.5 (session indexing), 5 (post-deploy)

---

## Objective

Replace in-memory `MessagingSocketRegistry` Maps with a Redis-backed presence store. Keep gateway + auth logout + NewMessageEmail online-skip working across instances.

## Acceptance criteria

- [x] Presence visible cross-process
- [x] Disconnect / logout clears presence
- [x] Specs or integration proof under 2 fake nodes / Redis
- [x] Agent 2.5 reviews PII/session indexing

## Definition of Done

- [x] Schema / HTTP API / UI: N/A
- [x] Redis presence write-through (`ws:presence:user|session|meta`, TTL 90s + revalidate refresh)
- [x] Local Maps retained for `disconnect(true)`
- [x] `hasActiveConnection` async; fail-open (send email) when Redis configured but down
- [x] Logout / account delete clear Redis presence
- [x] Specs green (Agent 2: 34 passed); dual-node mock proof
- [x] Agent 2.5 approved (Critical/High: 0)
- [x] Agents 3.5 / 4: N/A
- [ ] Browser Network smoke (WS 101) — deferred, tracked for merge/operator (transport unchanged)
- [ ] Agent 5 post-deploy (after production soak)

## Security notes (Agent 2.5)

- Presence keys: ids only (no email/name/PII content).
- `sessionId` in Redis is auth-sensitive → Redis must stay private (VPC / ElastiCache).
- `PRESENCE_CLEARED` traces truncate session id; register traces use `socketId` only.
- Fail-open online-skip when Redis down → may email an online user (prefer notify over silent drop).
- Residual until Story 03: logout clears Redis presence; remote socket may linger ≤60s revalidate.
- No new HTTP/auth surface; presence not exposed to clients.

## Commits

- `78beed4` — feat(realtime): Redis-backed messaging presence across instances
- `d914e26` — test(realtime): harden sprint 49 story 1 presence coverage
- `38284d9` — security: review sprint 49 story 1 redis presence

## Suggested commit

```
feat(realtime): Redis-backed messaging presence across instances

Sprint 49 Story 1
```
