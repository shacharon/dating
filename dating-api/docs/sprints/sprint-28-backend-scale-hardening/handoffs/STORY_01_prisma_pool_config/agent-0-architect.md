# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_prisma_pool_config.md](../../STORY_01_prisma_pool_config.md)  
**Sprint:** sprint-28-backend-scale-hardening  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Docs + `.env.example` only. No `PrismaService` code change. Skip Agent 4.

---

## Summary

Make Prisma pool sizing intentional via `DATABASE_URL` query params. Lock defaults for local + future 1–2 ECS API tasks. Document headroom math vs RDS `max_connections`. **No PgBouncer / RDS Proxy** this story.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/.env.example` | Extend `DATABASE_URL` example with pool params + comment block |
| `dating-api/docs/ops/PRISMA_CONNECTION_POOL.md` | Short ops note (sizing formula, defaults, out of scope) |
| Sprint README (optional) | Point to ops note |

**Do not change:** `src/prisma/prisma.service.ts` (already passes URL through; engine reads params). Do not rewrite developers’ local `.env` files.

---

## Decisions (do not reverse without discussion)

### 1. Defaults (locked)

| Param | Value | Meaning |
|-------|-------|---------|
| `connection_limit` | **10** | Max connections per PrismaClient / process (matches scale CR) |
| `pool_timeout` | **10** | Seconds to wait for a free connection before erroring |
| `schema` | `public` | Keep existing |

**Example `.env.example` line (locked shape):**

```text
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public&connection_limit=10&pool_timeout=10"
```

Comments above the line must explain:

- Params apply per **Node process** (each ECS task / local `start:dev` / one-shot migrate).
- Omit params → Prisma default pool (~`num_cpus * 2 + 1`) — still valid for local; example recommends explicit 10.
- Existing local `.env` without params need not be updated for Story 1 AC (no break); operators **should** adopt the example when preparing multi-task AWS.

**Optional (nice-to-have, not required):** `connect_timeout=5` — only if Agent 1 can confirm it is honored for Prisma 6.19 + Postgres URL without side effects; otherwise skip.

### 2. Sizing formula (locked)

```text
processes_that_open_Prisma × connection_limit + reserve ≤ RDS max_connections
```

Where:

- `processes_that_open_Prisma` ≈ API Fargate tasks (+ short-lived migrate one-shot while it runs) (+ any future worker process when split).
- Workers **today** are in-process with the API → **same** pool, not double-counted.
- `reserve` ≥ **5** for `psql`, monitoring, Prisma migrate from a laptop, etc.

**Dev topology target (Sprint 20):** 1–2 API tasks × 10 = **10–20** app connections → fine for `db.t4g.small` (leave large headroom under default RDS `max_connections`).

If raising tasks or `connection_limit`, re-check RDS `max_connections` (instance class / parameter group) before apply.

### 3. Code / runtime (locked)

- **No** Nest code change this story.
- **No** validation that rewrites or rejects URLs missing params.
- **No** PgBouncer, RDS Proxy, or Prisma Data Proxy.
- When Sprint 20 live apply resumes: bake the same query params into the Secrets Manager / constructed `DATABASE_URL` (note in ops doc only; do not change Terraform in Story 1).

### 4. Tests (locked)

- Doc-only acceptance. No unit test required.
- Agent 1: `npm run build` smoke (or skip if docs-only and no TS change — build still fine).

### 5. Agent 4

- **Skip.**

---

## Out of scope

- PgBouncer / RDS Proxy  
- Changing RDS parameter group `max_connections`  
- Worker process split  
- Forcing every developer `.env` to update  

---

## Agent 1 instructions

1. Update `.env.example` per §1.
2. Add `docs/ops/PRISMA_CONNECTION_POOL.md` per §2–3.
3. Optional one-liner link from Sprint 28 README.
4. Commit with story message; write `agent-1-dev.md`.

Suggested commit message:

```
chore(db): document Prisma connection_limit and pool_timeout

Sprint 28 Story 1
```

---

## Agent 2 instructions

- [ ] Example URL includes `connection_limit=10` and `pool_timeout=10`
- [ ] Ops note has sizing formula + 1–2 task math
- [ ] PgBouncer explicitly out of scope
- [ ] No PrismaService behavior change
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README.
- Write `agent-3-pm.md`.

---

## Open risks

1. Operators who copy an old bare `DATABASE_URL` into multi-task ECS without params still risk default large pools — mitigated by ops note + live-apply checklist later.  
2. `connection_limit=10` may feel tight under extreme parallel match-list miss + many WS — raise deliberately with formula, do not invent unbounded pools.
