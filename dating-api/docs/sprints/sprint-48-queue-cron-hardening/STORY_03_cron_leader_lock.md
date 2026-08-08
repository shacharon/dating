# Story 03 — Cron leader lock (SLA + mute expiry)

**Sprint 48 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 1.5 days  
**Dependencies:** Redis available in prod/dev  
**Repo:** `dating-api`  
**Extra agents:** 2.5 (shared lock / infra safety), 5 (post-deploy)

---

## Objective

Photo SLA enforcer + mute-expiry cron must not run on every API replica. Introduce Redis leader election / lock (fail-open or fail-closed per Architect) so only one process ticks.

## Acceptance criteria

- [x] Under 2+ processes, only one successful tick per interval (documented test)
- [x] Lock loss / Redis down behavior documented
- [x] Agent 2.5 reviews lock semantics

## Definition of Done

- [x] Schema: N/A
- [x] API / UI: N/A
- [x] `tryAcquireCronLock` (fail-closed when Redis configured; `acquired` if `REDIS_URL` unset)
- [x] `setNx` fail-open unchanged
- [x] Photo SLA + mute-expiry gated; keys/TTLs per architect
- [x] ErrorCodes `CRON_LEADER_*` + `cronLock` CacheOp
- [x] Lock loss / Redis-down table documented (below)
- [x] Specs green (Agent 2: 34 passed)
- [x] Agent 2.5 approved (Critical/High: 0)
- [x] Agents 3.5 / 4: N/A
- [ ] Agent 5 post-deploy (after production soak — watch `CRON_LEADER_*`)

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

**Prod check:** task defs must **not** set `CRON_LEADER_FAIL_OPEN` (confirmed absent from `infra/`).

## Security notes (Agent 2.5)

- No HTTP/auth surface; lock keys are constants; values are `{ at, pid, host }` (no user PII).
- Fail-closed default reduces stampede of SLA auto-approves / capacity emails / mute clears.
- Residual: Redis write access can hold/deny locks until TTL; keep Redis private. Multi-replica **requires** `REDIS_URL`.

## Commits

- `45fc09c` — fix(workers): Redis leader lock for SLA and mute-expiry crons
- `1f4fe48` — test(workers): harden sprint 48 story 3 cron leader lock coverage
- `fc4b8d8` — security: review sprint 48 story 3 cron leader lock

## Suggested commit

```
fix(workers): Redis leader lock for SLA and mute-expiry crons

Sprint 48 Story 3
```
