# Story 03 — Cron leader lock (SLA + mute expiry)

**Sprint 48 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 1.5 days  
**Dependencies:** Redis available in prod/dev  
**Repo:** `dating-api`  
**Extra agents:** 2.5 (shared lock / infra safety)

---

## Objective

Photo SLA enforcer + mute-expiry cron must not run on every API replica. Introduce Redis leader election / lock (fail-open or fail-closed per Architect) so only one process ticks.

## Acceptance criteria

- [x] Under 2+ processes, only one successful tick per interval (documented test)
- [x] Lock loss / Redis down behavior documented
- [x] Agent 2.5 reviews lock semantics

## Lock loss / Redis-down behavior (ops)

| Situation | Behavior |
|-----------|----------|
| `REDIS_URL` unset | Lock → `acquired` (local/single-node still ticks) |
| Redis up, key held | `not_acquired` → skip tick |
| Redis configured but down / SET error | `unavailable` → **skip** (fail-closed) |
| `CRON_LEADER_FAIL_OPEN=1` + unavailable | Run tick (break-glass; **must not** be default in prod) |
| TTL expires | Next interval can acquire (photo-SLA TTL 55m &lt; 1h) |

**Dual-process proof (unit):** `redis-cache.service.spec.ts` — first `tryAcquireCronLock` → `acquired`, second → `not_acquired` (SET NX).

**Monitor:** `CRON_LEADER_SKIPPED` / `CRON_LEADER_UNAVAILABLE` rates.

## Security notes (Agent 2.5)

- No HTTP/auth surface; lock keys are constants; values are `{ at, pid, host }` (no user PII).
- Fail-closed default reduces stampede of SLA auto-approves / capacity emails / mute clears.
- Residual: Redis write access can hold/deny locks until TTL; keep Redis private. Multi-replica **requires** `REDIS_URL`.

## Suggested commit

```
fix(workers): Redis leader lock for SLA and mute-expiry crons

Sprint 48 Story 3
```
