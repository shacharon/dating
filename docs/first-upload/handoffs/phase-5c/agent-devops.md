# Handoff: first-upload — devops — phase 5c

**Agent:** devops  
**Phase:** `5c` Database (RDS Postgres)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** applied

---

## Summary

- First apply failed: RDS parameter group **description** had a Unicode dash; AWS rejected it. Fixed to ASCII in `infra/terraform/modules/rds/main.tf`.
- Second apply: **3 added**. Instance created.
- Password not printed. Secret ARN only below.

---

## Commands run

```powershell
terraform plan -out=tfplan -target="module.rds"
terraform apply tfplan
# retry after description fix
```

---

## AWS ids (no secrets)

| Thing | Value |
|-------|--------|
| Identifier | `dating-dev-postgres` |
| Endpoint | `dating-dev-postgres.ch4y0q6q40kz.eu-central-1.rds.amazonaws.com:5432` |
| Class | `db.t4g.small` |
| Public | false |
| Secret ARN | `arn:aws:secretsmanager:eu-central-1:907390934996:secret:dating-dev-rds-20260920074419270200000002-FAVK5y` |
| Region | `eu-central-1` |

---

## Errors

- Fixed: `InvalidParameterValue` on parameter group description (em dash).

---

## Console

Frankfurt → **RDS** → Databases → **`dating-dev-postgres`** → Status **Available**, Public access **No**.

---

## Next

```text
--upload-agent qa phase 5c
```
