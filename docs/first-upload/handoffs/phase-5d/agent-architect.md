# Handoff: first-upload — architect — phase 5d

**Agent:** architect  
**Phase:** `5d` Redis  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product go. Target **only** `module.redis`.
- Creates: ElastiCache subnet group, Redis 7 parameter group, replication group `dating-dev-redis` (`cache.t4g.micro`, 1 node, port 6379, not Multi-AZ, transit encryption **off** per tfvars).
- Uses existing private subnets + Redis SG from phase 3. Must not recreate NAT/RDS.
- Description in module is ASCII (unlike the RDS em-dash bug).

---

## What must already exist

- VPC + private subnets + `aws_security_group.redis` (phase 3)
- RDS may exist; do not target it
- Profile `pizza`, `eu-central-1`

---

## Working directory

`c:\dev\piza\dating\infra\terraform\dev`

---

## Terraform -target (required)

```
module.redis
```

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating\infra\terraform\dev

terraform plan -out=tfplan -target="module.redis"
terraform show -no-color tfplan
```

Abort if plan includes RDS instance, NAT, ALB, ECS, CloudFront, `food-`. Expected: subnet group + parameter group + `aws_elasticache_replication_group` (~3 adds).

If clean, apply (wait ~5–15 min):

```powershell
terraform apply tfplan
terraform output redis_endpoint
```

Do not dump secrets. `redis_url` is host+port only (no password) — prefer `redis_endpoint` in the handoff.

---

## Blast radius

- **AWS:** one Redis node in Frankfurt. Idle ~$10–15/month.
- **Going2Eat:** none

---

## Rollback

- Wrong plan: do not apply
- Destroy later: `-target="module.redis"` (consent)

---

## What QA should query

```powershell
aws elasticache describe-replication-groups --replication-group-id dating-dev-redis --region eu-central-1 --profile pizza --query "ReplicationGroups[0].{id:ReplicationGroupId,status:Status,node:NodeGroups[0].NodeGroupMembers[0].CurrentRole}" --output json
aws ecs describe-services --region eu-north-1 --profile pizza --cluster food-cluster --services food-backend-service --query "services[0].{desired:desiredCount,running:runningCount}" --output json
```

- Status `available`
- Console: Frankfurt → **ElastiCache** → Redis OSS caches → `dating-dev-redis`

---

## Next

```text
--upload-agent devops phase 5d
```
