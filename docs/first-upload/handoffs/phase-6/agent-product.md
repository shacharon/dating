# Handoff: first-upload — product — phase 6

**Agent:** product  
**Phase:** `6` Database tables (Prisma migrate)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** go

---

## Summary

- Phase 5g QA passed. `/health` is 200. RDS exists but is **empty**.
- What: run **Prisma** `migrate deploy` once against `dating-dev-postgres` so the tables from `dating-api/prisma/migrations/` exist. Script already in the API image: `scripts/docker-migrate.sh`.
- Why: empty DB is not “app works.” Login and profile APIs need tables.
- Not yet: domain/HTTPS (7), Google (8). CloudFront still parked.
- Operator started 6. Architect designs a **one-off** on the private network (ECS RunTask, same image as API). Do not open RDS to the internet. Do not print `DATABASE_URL` / passwords.

---

## Locked decisions

- Account `907390934996`, profile `pizza`, `eu-central-1`
- Same `dating-*` VPC / RDS already created
- `prisma migrate deploy` (idempotent), not `migrate dev`
- Do not touch food RDS / food ECS

---

## Money

- Short Fargate one-shot: **pennies to a few dollars**, not a new monthly NAT. Show the run; no extra “expensive RDS” stop.

---

## Exit test

- `prisma migrate status` (or task logs) shows migrations **applied** / database up to date
- **or** a real API call that needs tables succeeds (not only `/health`)
- RDS still private
- food-backend still desired 1 / running 1
- Google not required

---

## Do not

- `prisma migrate reset` / drop the database
- Publicly expose Postgres
- Apply CloudFront
- Treat `/health` 200 as proof tables exist

---

## Next

```text
--upload-agent architect phase 6
```
