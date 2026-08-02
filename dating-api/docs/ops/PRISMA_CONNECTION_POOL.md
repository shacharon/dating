# Prisma connection pool (ops)

**Sprint 28 Story 1 — source of truth** for recommended params + sizing formula.  
**Sprint 39 Story 4 (2026-08-02)** — verify pass: guidance still correct; deploy samples + pressure signals closed gaps below.  
**Not in scope:** PgBouncer, RDS Proxy, Prisma Data Proxy, Prisma `$metrics` preview, changing RDS `max_connections`.

---

## Recommended URL params

| Param | Recommended | Meaning |
|-------|-------------|---------|
| `connection_limit` | `10` | Max DB connections per PrismaClient / Node process |
| `pool_timeout` | `10` | Seconds to wait for a free pooled connection before error |
| `schema` | `public` | Unchanged |

Example (also in `.env.example`):

```text
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public&connection_limit=10&pool_timeout=10"
```

AWS / RDS also needs `sslmode=require`:

```text
DATABASE_URL="postgresql://USER:PASSWORD@RDS:5432/dating?schema=public&sslmode=require&connection_limit=10&pool_timeout=10"
```

`PrismaService` passes the URL through unchanged; the Prisma engine applies these params.

Omit pool params → Prisma’s default (~`num_cpus * 2 + 1`). That is OK for a single local process; use the explicit values before multi-task ECS.

---

## Sizing formula

```text
processes_that_open_Prisma × connection_limit + reserve ≤ RDS max_connections
```

- **processes:** API Fargate task count (+ short-lived migrate one-shot while it runs; + future worker process if split).
- **Workers today** run in the API process (Bull match-list rank, etc.) → **same** pool (do not double-count). Confirmed Sprint 39.
- **reserve:** at least **5** for `psql`, monitoring, laptop migrate, etc.

**Sprint 20 `dev` target:** 1–2 API tasks × 10 = **10–20** app connections → comfortable on `db.t4g.small` under default RDS `max_connections`.

If you raise task count or `connection_limit`, re-check RDS `max_connections` (instance class / parameter group) first.

---

## Live AWS

Bake the same query params into the Secrets Manager / constructed `DATABASE_URL` used by ECS (Sprint 20 Story 03 path). Do not ship multi-task API with a bare URL and Prisma defaults.

Terraform RDS module (`infra/terraform/modules/rds/main.tf`) now includes `connection_limit` + `pool_timeout` on the constructed `database_url`.

### After Terraform change on an existing environment

Updating the Terraform string does **not** rewrite an already-created Secrets Manager secret value by itself. Operators must:

1. Update the RDS secret JSON key `database_url` to include `&connection_limit=10&pool_timeout=10` (or recreate / `terraform apply` that forces secret version if your workflow does), **or** put a corrected URL into the fallback `DATABASE_URL` secret.
2. Force a new ECS deployment so tasks pick up the new secret version.

Production boot logs a warn + `db.prisma.pool_config_missing` when `connection_limit` is absent. Pool wait timeouts emit `db.prisma.pool_timeout` (Prisma **P2024**).

---

## Sprint 39 verify checklist

- [x] Sprint 28 params / formula still SoT  
- [x] `.env.example` already documents pool params  
- [x] RDS Terraform `database_url`, compose api/migrate, `DEPLOY_AWS_DEV.md`, `DEV_CONFIG_MANIFEST.md` include pool params  
- [x] Runtime: P2024 metric + production missing-`connection_limit` warn  
- [x] Local bare URL still allowed for `start:dev`  
