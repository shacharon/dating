# Handoff: first-upload — architect — phase 6

**Agent:** architect  
**Phase:** `6` Database tables (Prisma migrate)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product go. **No Terraform apply.** One Fargate **RunTask** using the existing API task definition, override command to `./scripts/docker-migrate.sh` (`prisma migrate deploy`).
- Same image, same `DATABASE_URL` secret injection, same private subnets + API SG, **assignPublicIp DISABLED** (NAT already exists). RDS stays private.
- Do **not** print secret values or `DATABASE_URL`.
- Repo also has `.github/scripts/ecs-run-migrate.sh` (bash). Operator is on PowerShell — use the commands below, not that bash file.

---

## What must already exist

- Cluster `dating-dev-cluster`, task family `dating-dev-api` (use **latest** revision)
- Private subnets `subnet-04fe9e5383244eb6c`, `subnet-04eaa986c444dd1ba`
- API SG `sg-0ce6cb17b07bca3d9`
- RDS `dating-dev-postgres` available
- Profile `pizza`, `eu-central-1`

Confirm IDs (read-only) if needed:

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating\infra\terraform\dev
terraform output ecs_cluster_name
terraform output api_security_group_id
terraform output private_subnet_ids
```

---

## Working directory

`c:\dev\piza\dating`

---

## Terraform -target

None. Do not `terraform apply`. Do not `-target module.cloudfront`.

---

## Commands (PowerShell)

Write override JSON (ASCII), then run-task. **Do not** `migrate reset`.

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating

@'
{
  "awsvpcConfiguration": {
    "subnets": ["subnet-04fe9e5383244eb6c", "subnet-04eaa986c444dd1ba"],
    "securityGroups": ["sg-0ce6cb17b07bca3d9"],
    "assignPublicIp": "DISABLED"
  }
}
'@ | Set-Content -Encoding ascii .\migrate-network.json

@'
{
  "containerOverrides": [
    {
      "name": "dating-api",
      "command": ["./scripts/docker-migrate.sh"]
    }
  ]
}
'@ | Set-Content -Encoding ascii .\migrate-overrides.json

aws ecs run-task `
  --cluster dating-dev-cluster `
  --task-definition dating-dev-api `
  --launch-type FARGATE `
  --count 1 `
  --started-by dating-phase6-migrate `
  --network-configuration file://migrate-network.json `
  --overrides file://migrate-overrides.json `
  --query "tasks[0].taskArn" `
  --output text
```

Copy the task ARN. Poll until STOPPED (up to ~10 minutes):

```powershell
$arn = "PASTE_TASK_ARN"
aws ecs wait tasks-stopped --cluster dating-dev-cluster --tasks $arn
aws ecs describe-tasks --cluster dating-dev-cluster --tasks $arn --query "tasks[0].{last:lastStatus,stop:stoppedReason,exit:containers[0].exitCode}" --output json
```

**Success:** container `exitCode` **0**. Then fetch logs (no secrets in the handoff):

```powershell
aws logs tail /ecs/dating-dev/dating-api --since 15m --region eu-central-1 --profile pizza
```

Look for Prisma “applied” / “up to date” / `migrate deploy` success. Delete the two JSON files after (they have no secrets).

If `run-task` `failures` is non-empty, or exit ≠ 0: stop. Do not retry with public IP or a public RDS change. Read stop reason + logs.

Optional QA signal (no login): an API that needs tables should stop returning a missing-relation/500. `/health` 200 is **not** the exit test.

---

## Blast radius

- **AWS:** one extra Fargate task for a few minutes. Pennies. No new RDS, NAT, ALB, CloudFront.
- **DB:** CREATE TABLE / Prisma `_prisma_migrations` only. No drop.
- **Going2Eat:** none. Do not change `food-*`.

---

## Rollback

- Failed migrate: RDS may be partially migrated; `migrate deploy` is idempotent — fix the error and run the same RunTask again. Do **not** reset.
- Success: nothing to roll back unless operator asks to destroy the env.

---

## What QA should query

```powershell
aws ecs list-tasks --cluster dating-dev-cluster --desired-status STOPPED --started-by dating-phase6-migrate --region eu-central-1 --profile pizza
aws ecs describe-tasks --cluster dating-dev-cluster --tasks <arn> --query "tasks[0].containers[0].exitCode" --region eu-central-1 --profile pizza
aws logs filter-log-events --log-group-name /ecs/dating-dev/dating-api --region eu-central-1 --profile pizza --filter-pattern "migrate" --limit 20 --query "events[*].message"
aws rds describe-db-instances --db-instance-identifier dating-dev-postgres --region eu-central-1 --profile pizza --query "DBInstances[0].{pub:PubliclyAccessible,status:DBInstanceStatus}" --output json
aws ecs describe-services --region eu-north-1 --profile pizza --cluster food-cluster --services food-backend-service --query "services[0].{desired:desiredCount,running:runningCount}" --output json
```

- Migrate container exit **0** + log evidence of deploy
- RDS `PubliclyAccessible` false, `available`
- food 1 / 1
- Do not fail only because `/health` is 200

---

## Decisions

- RunTask override, not a new Terraform service
- Latest `dating-dev-api` task def (includes DATABASE_URL from RDS secret)
- Private IP only

---

## Open questions / blockers

- None if 5g API task def still injects `DATABASE_URL`

---

## Next

```text
--upload-agent devops phase 6
```
