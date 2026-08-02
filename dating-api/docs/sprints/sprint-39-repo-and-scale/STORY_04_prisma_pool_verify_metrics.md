# Story 04 — Prisma pool verify + connection metrics

**Sprint 39 · Status: Planned**  
**Priority:** P1  
**Estimated effort:** 0.5–1 day  
**Dependencies:** [Sprint 28 Story 01](../sprint-28-backend-scale-hardening/STORY_01_prisma_pool_config.md) (Done)  
**Repo:** `dating-api` only

---

## Objective

**Do not redo Sprint 28.** Verify production/local pool guidance is still correct after UI/backend growth; close any gaps (missing env in deploy samples, missing runtime metric/log). Add light connection-pressure visibility if missing.

## Why

Audit recommended “add connection pooling” generically — Sprint 28 already documented `connection_limit` / `pool_timeout`. This story is a **verify + harden** pass, not a greenfield pool story.

## Scope / tasks

1. Re-read `PRISMA_CONNECTION_POOL.md` / `.env.example` vs current ECS/task guidance.
2. Fix stale docs or missing deploy env wiring if found.
3. Optional: expose Prisma metrics/logging for pool wait if preview features already acceptable — Architect decides; no PgBouncer.
4. Confirm multi-task sizing note still accurate.

## Out of scope

- PgBouncer / RDS Proxy
- Changing default local DX to require exotic URL params beyond Sprint 28

## Acceptance criteria

- [ ] Written verify note in handoff (or ops doc update) confirming pool posture
- [ ] Gaps fixed if any (env example / ops doc / deploy sample)
- [ ] Explicit “Sprint 28 still SoT; this story = verify” in Architect lock
- [ ] No behavior break for `npm run start:dev`

## Suggested commit

```
chore(db): verify Prisma pool guidance and add pressure signals

Sprint 39 Story 4
```
