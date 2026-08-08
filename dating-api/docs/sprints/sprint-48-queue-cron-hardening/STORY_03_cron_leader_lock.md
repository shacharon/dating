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

- [ ] Under 2+ processes, only one successful tick per interval (documented test)
- [ ] Lock loss / Redis down behavior documented
- [ ] Agent 2.5 reviews lock semantics

## Suggested commit

```
fix(workers): Redis leader lock for SLA and mute-expiry crons

Sprint 48 Story 3
```
