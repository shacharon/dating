# Story 02 — Redis email debounce + online-skip

**Sprint 49 · Status: Planned · P0 · ~1d · Depends: Story 01 · Agent 2.5**

## Objective

Move `MessageEmailDebounceService` off process-local Map to Redis. Wire online-skip through shared presence from Story 01.

## Acceptance criteria

- [x] Debounce works across instances (no duplicate emails within window) — dual-node setNx unit proof
- [x] Online users on other node skipped for new-message email — Story 01 presence + regress (no claim when online)
- [x] Agent 2.5 reviews Redis key PII + fail-open notify semantics

## Definition of Done

- [x] Schema / HTTP API / UI: N/A
- [x] Redis `SET NX EX` claim + local Map when `REDIS_URL` unset
- [x] Fail-open allow-send when Redis configured but down
- [x] Claim after eligibility; `releaseClaim` on throw after claim
- [x] Specs green (Agent 2: 16 passed)
- [x] Agent 2.5 approved (Critical/High: 0)
- [ ] Agent 3 PM close
- [ ] Agent 5 post-deploy (after production soak)

## Security notes (Agent 2.5)

- Debounce keys: opaque `conversationId` + `recipientUserId` only; Redis value `{ at }` — no email/name.
- No new HTTP/auth surface; notify path remains server-only after authenticated message send.
- HTML body continues to `escapeHtml` sender label (XSS in mail clients).
- Fail-open when Redis down → possible duplicate emails across replicas (prefer notify over silent drop).
- Compromised Redis can delete claims (extra emails) or set claims (suppress emails) — Redis must stay private.

## Commits

- `56bd080` — feat(notifications): Redis-backed new-message email debounce
- `e1266e6` — test: harden email debounce Redis claim coverage
- `bd25a2b` — security: review sprint 49 story 2 email debounce

## Suggested commit

```
feat(notifications): Redis-backed new-message email debounce

Sprint 49 Story 2
```
