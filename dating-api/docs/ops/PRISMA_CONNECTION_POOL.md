# Prisma connection pool (ops)

**Sprint 28 Story 1.** Intentional Prisma pool sizing via `DATABASE_URL` query params.  
**Not in scope:** PgBouncer, RDS Proxy, Prisma Data Proxy, changing RDS `max_connections`.

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

`PrismaService` passes the URL through unchanged; the Prisma engine applies these params.

Omit pool params → Prisma’s default (~`num_cpus * 2 + 1`). That is OK for a single local process; use the explicit values before multi-task ECS.

---

## Sizing formula

```text
processes_that_open_Prisma × connection_limit + reserve ≤ RDS max_connections
```

- **processes:** API Fargate task count (+ short-lived migrate one-shot while it runs; + future worker process if split).
- **Workers today** run in the API process → **same** pool (do not double-count).
- **reserve:** at least **5** for `psql`, monitoring, laptop migrate, etc.

**Sprint 20 `dev` target:** 1–2 API tasks × 10 = **10–20** app connections → comfortable on `db.t4g.small` under default RDS `max_connections`.

If you raise task count or `connection_limit`, re-check RDS `max_connections` (instance class / parameter group) first.

---

## Live AWS (when deploy hold lifts)

Bake the same query params into the Secrets Manager / constructed `DATABASE_URL` used by ECS (Sprint 20 Story 03 path). Do not ship multi-task API with a bare URL and Prisma defaults.
