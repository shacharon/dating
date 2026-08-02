# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 implement  
**Story:** [STORY_04_prisma_pool_verify_metrics.md](../../STORY_04_prisma_pool_verify_metrics.md)  
**Sprint:** sprint-39-repo-and-scale  
**Date:** 2026-08-02  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Verified Sprint 28 pool guidance still SoT. Closed deploy-sample gaps (RDS Terraform URL, compose, DEPLOY, manifest). Added `db.prisma.pool_timeout` (P2024 via exception filter) and production boot warn/`db.prisma.pool_config_missing` when `connection_limit` absent. Local bare URL unchanged for `start:dev`.

---

## Verify note

| Check | Result |
|-------|--------|
| Sprint 28 SoT (`10`/`10` + formula) | Confirmed — workers still in-process |
| `.env.example` | Already correct — no change |
| Deploy URL gaps | Fixed (allowlist) |
| Prisma `$metrics` preview | Not enabled |

---

## Files

| Path | Change |
|------|--------|
| `docs/ops/PRISMA_CONNECTION_POOL.md` | Sprint 39 verify + secret rotate reminder |
| `infra/terraform/modules/rds/main.tf` | pool params on `database_url` |
| `infra/docker-compose.yml` | api + migrate URLs |
| `infra/env/DEV_CONFIG_MANIFEST.md` | pool note |
| `DEPLOY_AWS_DEV.md` | connection string examples |
| `custom-metrics.ts` | `recordPrismaPoolTimeout` / `recordPrismaPoolConfigMissing` |
| `prisma/prisma-pool.helpers.ts` (+ spec) | detector helpers |
| `prisma/prisma.service.ts` | production boot warn |
| `logging/observability-exception.filter.ts` | P2024 hook |

---

## Ops — existing AWS secret

Terraform string change does **not** rewrite an already-created Secrets Manager `database_url`. After apply:

1. Update RDS secret JSON `database_url` to include `&connection_limit=10&pool_timeout=10` (keep `sslmode=require`), **or** recreate secret per your rotate workflow.  
2. Force ECS new deployment.

Watch for `db.prisma.pool_config_missing` (prod boot) and `db.prisma.pool_timeout` (P2024).

---

## Tests

```bash
npx jest src/prisma/prisma-pool.helpers.spec.ts --runInBand
# 3 passed

npm run typecheck
# passed
```

---

## Commit

Not committed (Agent 3). Suggested:

```
chore(db): verify Prisma pool guidance and add pressure signals

Sprint 39 Story 4
```

---

## Next command

```text
--agent 2 sprint 39 story 4
```
