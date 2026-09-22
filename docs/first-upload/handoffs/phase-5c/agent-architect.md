# Handoff: first-upload — architect — phase 5c

**Agent:** architect  
**Phase:** `5c` Database (RDS Postgres)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product go + operator spend **yes** for RDS-only.
- Target **only** `module.rds`. Creates: subnet group, parameter group, Secrets Manager secret, `random_password`, instance `dating-dev-postgres` (`db.t4g.small`, Postgres 16, gp3 20 GB, `publicly_accessible = false`, not Multi-AZ).
- Uses **existing** private subnets + RDS security group from phase 3. Must **not** recreate VPC/NAT.
- Do not print `database_url` / password. Handoff may include instance id, endpoint hostname, secret **ARN** only.
- Skip CloudFront (5b parked). Do not target redis/alb/ecs.

---

## What must already exist

- VPC `vpc-0c6e32b971b76b4eb`, private subnets, SG `rds` from phase 3
- tfvars `rds_instance_class = "db.t4g.small"`
- Profile `pizza`, region `eu-central-1`

---

## Working directory

`c:\dev\piza\dating\infra\terraform\dev`

---

## Terraform -target (required)

```
module.rds
```

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating\infra\terraform\dev

terraform plan -out=tfplan -target="module.rds"
terraform show -no-color tfplan
```

Abort unless plan is RDS module only (subnet group, parameter group, secret, secret version, `aws_db_instance`, `random_password`). **No** `aws_nat_gateway`, Redis, ALB, ECS, CloudFront, `food-`.

If clean, operator already said yes — apply (long wait):

```powershell
terraform apply tfplan
```

Then (safe outputs only):

```powershell
terraform output rds_endpoint
terraform output rds_secrets_manager_arn
```

Do **not** `aws secretsmanager get-secret-value` in the handoff.

---

## Blast radius

- **AWS:** one private Postgres + one secret in Frankfurt. Billing starts when instance is creating/available.
- **Time:** 15–20+ minutes on apply
- **Going2Eat:** none

---

## Rollback

- Wrong plan: do not apply
- Failed create: retry same target; do not widen
- Tear down later: `-target="module.rds"` (consent). `skip_final_snapshot = true` / `deletion_protection = false` on this env.

---

## What QA should query

```powershell
aws rds describe-db-instances --db-instance-identifier dating-dev-postgres --region eu-central-1 --profile pizza --query "DBInstances[0].{status:DBInstanceStatus,class:DBInstanceClass,public:PubliclyAccessible,az:AvailabilityZone,id:DBInstanceIdentifier}" --output json
aws ecs describe-services --region eu-north-1 --profile pizza --cluster food-cluster --services food-backend-service --query "services[0].{desired:desiredCount,running:runningCount}" --output json
```

- Status `available`
- `PubliclyAccessible` false
- Class `db.t4g.small`

Console: Frankfurt → **RDS** → Databases → `dating-dev-postgres` → Status Available, Public access **No**.

---

## Next

```text
--upload-agent devops phase 5c
```
