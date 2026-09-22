# Handoff: first-upload — devops — phase 6

**Agent:** devops  
**Phase:** `6` Database tables (Prisma migrate)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** fail

---

## Summary

- RunTask started. No Terraform. RDS stayed private. No CloudFront. No food change.
- Container **exit 1**. Prisma **P3018** on migration `20260415000001_profile_submit_lifecycle`.
- Cause: early migration created `"UserProfile"` **without** `"userId"`. This file does `CREATE TABLE IF NOT EXISTS` (no-op) then `CREATE UNIQUE INDEX ... ("userId")` → Postgres `42703` column `"userId"` does not exist.
- Earlier migrations in the same run did apply (from `init_user_profile` through `user_product_profile_identity_fields` / start of submit lifecycle). Did **not** reset. Did **not** retry with public IP.

---

## Commands run

```powershell
aws ecs run-task --cluster dating-dev-cluster --task-definition dating-dev-api --launch-type FARGATE --started-by dating-phase6-migrate ...
aws ecs wait tasks-stopped
aws ecs describe-tasks ...
aws logs tail /ecs/dating-dev/dating-api --since 20m
```

---

## AWS ids (no secrets)

| Thing | Value |
|-------|--------|
| Task | `arn:aws:ecs:eu-central-1:907390934996:task/dating-dev-cluster/032489703e3e4183a50fe5c22ec8673a` |
| Task def | `dating-dev-api:2` |
| Cluster | `dating-dev-cluster` |
| Exit | `1` |
| Failed migration | `20260415000001_profile_submit_lifecycle` |

---

## Errors

- Prisma P3018 / Postgres 42703: `column "userId" does not exist` while creating `UserProfile_userId_key`.

---

## Console

ECS → `dating-dev-cluster` → Tasks (stopped) → that ARN. Logs: `/ecs/dating-dev/dating-api`.

---

## Next

Need a migration-history fix (not a reset). Re-design then retry RunTask.

```text
--upload-agent architect phase 6
```
