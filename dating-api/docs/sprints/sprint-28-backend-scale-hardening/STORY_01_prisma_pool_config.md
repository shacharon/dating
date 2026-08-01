# Story 01 — Prisma pool + timeouts

**Sprint 28 · Status: PLANNED**  
**Priority:** P1  
**Estimated effort:** 0.25 day  
**Dependencies:** None

---

## Objective

Make Prisma’s connection pool intentional: document and set `connection_limit` / `pool_timeout` so multi-task deploys cannot silently exhaust Postgres.

## Why

Prisma pools by default (`~num_cpus*2+1` per process). `.env.example` has a bare `DATABASE_URL` with no limits. Scale CR called this out; we never configured it.

## Scope / tasks

1. Document recommended URL query params in `.env.example` and a short ops note (tasks × `connection_limit` < RDS `max_connections`).
2. Choose defaults suitable for local + future 1–2 ECS API tasks (Architect locks numbers).
3. No PgBouncer / RDS Proxy this story.
4. Light test or doc-only acceptance if no runtime code change beyond docs/env example.

## Acceptance criteria

- [ ] `.env.example` documents `connection_limit` and `pool_timeout` (or equivalent)
- [ ] Ops note: how to size pool vs task count
- [ ] No behavior break for local single-process `npm run start:dev`
- [ ] PgBouncer explicitly out of scope

## Commit message

```
chore(db): document Prisma connection_limit and pool_timeout

Sprint 28 Story 1
```
