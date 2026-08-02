# Story 04 — Prisma pool verify + connection metrics

**Sprint 39 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 0.5–1 day  
**Dependencies:** [Sprint 28 Story 01](../sprint-28-backend-scale-hardening/STORY_01_prisma_pool_config.md) (Done)  
**Repo:** `dating-api` primary; **narrow** infra/root allowlist for deploy URL samples (see Architect)  
**Handoffs:** [agent-0-architect.md](./handoffs/STORY_04_prisma_pool_verify_metrics/agent-0-architect.md) · [agent-1-dev.md](./handoffs/STORY_04_prisma_pool_verify_metrics/agent-1-dev.md) · [agent-2-cr.md](./handoffs/STORY_04_prisma_pool_verify_metrics/agent-2-cr.md) · [agent-3-pm.md](./handoffs/STORY_04_prisma_pool_verify_metrics/agent-3-pm.md)

---

## Objective

**Do not redo Sprint 28.** Verify production/local pool guidance is still correct after UI/backend growth; close any gaps (missing env in deploy samples, missing runtime metric/log). Add light connection-pressure visibility if missing.

## Why

Audit recommended “add connection pooling” generically — Sprint 28 already documented `connection_limit` / `pool_timeout`. This story is a **verify + harden** pass, not a greenfield pool story.

## Locked policy (Architect)

| Item | Decision |
|------|----------|
| SoT | **Sprint 28 Story 01** still owns recommended `10` / `10` + sizing formula |
| Prisma `$metrics` preview | **No** |
| Pressure | `P2024` → `db.prisma.pool_timeout`; prod boot warn if `connection_limit` missing |
| Gaps | Bake pool params into RDS Terraform `database_url`, compose, DEPLOY docs |
| Local DX | Bare URL still OK for `start:dev` |

## Scope / tasks

1. Re-read `PRISMA_CONNECTION_POOL.md` / `.env.example` vs current ECS/task guidance.
2. Fix stale docs or missing deploy env wiring if found.
3. Optional: expose Prisma metrics/logging for pool wait if preview features already acceptable — Architect decides; no PgBouncer.
4. Confirm multi-task sizing note still accurate.

## Out of scope

- PgBouncer / RDS Proxy
- Changing default local DX to require exotic URL params beyond Sprint 28
- Enabling Prisma metrics preview feature

## Acceptance criteria

- [x] Written verify note in handoff (or ops doc update) confirming pool posture
- [x] Gaps fixed if any (env example / ops doc / deploy sample)
- [x] Explicit “Sprint 28 still SoT; this story = verify” in Architect lock
- [x] No behavior break for `npm run start:dev`

## Suggested commit

```
chore(db): verify Prisma pool guidance and add pressure signals

Sprint 39 Story 4
```
