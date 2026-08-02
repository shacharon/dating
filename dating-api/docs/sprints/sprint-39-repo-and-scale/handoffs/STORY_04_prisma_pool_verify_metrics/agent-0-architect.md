# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_prisma_pool_verify_metrics.md](../../STORY_04_prisma_pool_verify_metrics.md)  
**Sprint:** sprint-39-repo-and-scale  
**Date:** 2026-08-02  
**Status:** complete  

**Mode:** **Verify + harden** — Sprint 28 Story 01 remains source of truth for pool sizing. Close deploy-sample gaps; add light pressure signals. **No** PgBouncer / RDS Proxy. **No** Prisma `metrics` preview feature. Skip Agent 4.

---

## Summary

Confirm `connection_limit=10` / `pool_timeout=10` guidance still correct. Fix samples that bake bare `DATABASE_URL`s (esp. RDS Terraform secret). Add `db.prisma.pool_timeout` on Prisma **P2024** and a production boot warn when `connection_limit` is missing. Do not change local `start:dev` when pool params are omitted.

---

## Explicit SoT lock

| Item | Lock |
|------|------|
| Sprint 28 Story 01 | **Still source of truth** for recommended params + sizing formula |
| This story | Verify + close gaps + pressure signals — **not** a greenfield pool redesign |
| Recommended params | Unchanged: `connection_limit=10`, `pool_timeout=10`, `schema=public` |
| Multi-task math | Still: `tasks × 10 + reserve≥5 ≤ RDS max_connections`; workers **in-process** → do not double-count |

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Ops SoT | `dating-api/docs/ops/PRISMA_CONNECTION_POOL.md` |
| Example | `dating-api/.env.example` already has pool params + comments |
| Runtime | `PrismaService` passes `DATABASE_URL` through; Prisma engine applies params |
| Prisma version | **6.19.2** — no `metrics` preview in schema today |
| AWS RDS URL | `infra/terraform/modules/rds/main.tf` builds `database_url` with `schema=public&sslmode=require` **only** — **gap** |
| Compose / deploy docs | `infra/docker-compose.yml` api+migrate, `DEPLOY_AWS_DEV.md`, `DEV_CONFIG_MANIFEST.md` omit pool params — **gaps** |
| Local `.env` | Often omits pool params — **allowed** per Sprint 28 |

---

## Decisions (do not reverse without discussion)

### 1. Do **not** enable Prisma metrics preview

| Choice | Lock |
|--------|------|
| `previewFeatures = ["metrics"]` + `$metrics` scrape | **No** — schema/client churn; story prefers existing observability stack |
| PgBouncer / RDS Proxy | **Out of scope** |

### 2. Pressure signal — P2024 (locked)

Prisma **P2024** = timed out acquiring a connection from the pool (`pool_timeout`).

| Item | Lock |
|------|------|
| Helper | `recordPrismaPoolTimeout()` in `custom-metrics.ts` → emit `db.prisma.pool_timeout` value `1` |
| Detector | `maybeRecordPrismaPoolTimeout(err: unknown): boolean` — true when `PrismaClientKnownRequestError` code `P2024` |
| Wire | Call from `ObservabilityExceptionFilter.catch` **before** existing handling (HTTP + unhandled). Re-throw / continue unchanged |
| Workers | Best-effort via same helper if they already surface to filter; **do not** add Prisma `$use` middleware this story (deprecation / Nest subclass friction) |

### 3. Boot warn — production missing `connection_limit` (locked)

In `PrismaService.onModuleInit` **after** `$connect` (or before — Agent 1 pick; prefer after successful connect):

| Condition | Action |
|-----------|--------|
| `NODE_ENV === 'production'` **and** `DATABASE_URL` query string lacks `connection_limit` | One `Logger.warn` pointing at `docs/ops/PRISMA_CONNECTION_POOL.md`; emit `recordPrismaPoolConfigMissing()` → `db.prisma.pool_config_missing` count/1 |
| `development` / `test` / omit params | **Silent** — no warn, no metric |

Parse: treat as missing if URL has no `connection_limit=` query param (case-sensitive param name as Prisma uses). Do **not** fail boot.

### 4. Docs / deploy gaps to close (locked)

Update **ops verify section** in `PRISMA_CONNECTION_POOL.md`:

- Header: Sprint 28 SoT + Sprint 39 verify date  
- Confirm sizing still valid (in-process Bull workers)  
- Checklist: bake pool params into AWS `DATABASE_URL`  
- Link gaps closed this story  

**Allowlist outside `dating-api/`** (narrow exception for this story only — AC requires deploy wiring):

| Path | Change |
|------|--------|
| `infra/terraform/modules/rds/main.tf` | Append `&connection_limit=10&pool_timeout=10` to constructed `database_url` (keep `sslmode=require`) |
| `infra/docker-compose.yml` | Add same params to api (+ migrate) `DATABASE_URL` |
| `infra/env/DEV_CONFIG_MANIFEST.md` | Note pool params required on `DATABASE_URL` |
| `DEPLOY_AWS_DEV.md` | Connection-string examples include pool params + `sslmode=require` |

Do **not** change Terraform module structure, secret wiring, or ECS task maps beyond the URL string / docs.

**Note:** Existing live Secrets Manager values are **not** rewritten by Terraform string change alone if the secret was already created — ops doc must say: rotate/update RDS secret `database_url` (or recreate) after apply, then force ECS redeploy. Agent 1 handoff must include that ops step.

### 5. `.env.example` / PrismaService URL pass-through

- `.env.example`: verify only — **no** behavior change expected.  
- Do not force-append pool params in `PrismaService` (would surprise local DX / break intentional bare URLs).

### 6. Tests (locked)

1. Unit: `maybeRecordPrismaPoolTimeout` — P2024 → records metric; other codes → no.  
2. Optional: PrismaService / helper for `connection_limit` detection (pure function preferred).  
3. Filter: light spy that P2024 path calls helper (or cover via helper-only if filter hard to unit).  

```bash
cd dating-api
npx jest src/observability/ src/prisma/ --runInBand
# Agent 1 may narrow to new specs
npm run typecheck
```

Confirm `npm run start:dev` still boots with a bare local URL (manual / no forced fail).

### 7. Out of scope

- Changing recommended `10` / `10` defaults  
- Prisma Data Proxy / Accelerate  
- PgBouncer / RDS Proxy  
- Enabling `$metrics` preview  
- Rewriting all one-off scripts’ `new PrismaClient()` URLs  

### 8. Agent 4

- **Skip.**

---

## Agent 1 instructions

1. Update `PRISMA_CONNECTION_POOL.md` with Sprint 39 verify note (SoT + gaps closed + secret rotate reminder).  
2. Fix allowlisted deploy samples / RDS URL (§4).  
3. Add `recordPrismaPoolTimeout` + `recordPrismaPoolConfigMissing` + `maybeRecordPrismaPoolTimeout`; wire filter + production boot warn.  
4. Specs for detector/helpers. Do not commit.  
5. Handoff must include written verify note + AWS secret rotate reminder.

Suggested commit:

```
chore(db): verify Prisma pool guidance and add pressure signals

Sprint 39 Story 4
```

---

## Agent 2 CR checklist

- [ ] Explicit “Sprint 28 still SoT” in ops doc / handoff  
- [ ] RDS / compose / DEPLOY samples include pool params where allowlisted  
- [ ] P2024 → `db.prisma.pool_timeout`; production missing `connection_limit` → warn + metric  
- [ ] No Prisma metrics preview; fail-open boot unchanged for local bare URL  
- [ ] Specs + typecheck green  

---

## Next command

```text
--agent 1 sprint 39 story 4
```
