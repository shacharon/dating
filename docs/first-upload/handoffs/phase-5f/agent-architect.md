# Handoff: first-upload — architect — phase 5f

**Agent:** architect  
**Phase:** `5f` IAM + secret placeholders  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product go. Apply **only** `module.iam`.
- Creates: ECS **task** role (S3 photos + Rekognition) and **execution** role (ECR + CloudWatch logs + GetSecretValue on the RDS secret ARN already in state). Role names use prefix `dating-dev-task-` / `dating-dev-exec-` (AWS suffix).
- **Do not apply `module.secrets`.** `enable_cloudfront = true` in tfvars, and `secrets.tf` reads `module.cloudfront[0]` when that flag is on. A secrets target will plan/create CloudFront (parked 5b).
- IAM module already grants the execution role the RDS secret ARN (`secrets_arns` in `main.tf`). Extra Secrets Manager shells (Google, OpenAI, CDN key, pepper) wait until CloudFront is skipped in tfvars or applied on purpose later.
- Do not apply `aws_iam_role_policy_attachment.ecs_execution_secrets` (it depends on `module.secrets`).
- Do not apply ECS.

---

## What must already exist

- S3 `dating-dev-photos` (IAM needs bucket ARN)
- RDS `dating-dev-postgres` + its Secrets Manager ARN (already passed into `module.iam`)
- Profile `pizza`, `eu-central-1`
- Product: no real Google secret, no CloudFront this phase

---

## Working directory

`c:\dev\piza\dating\infra\terraform\dev`

---

## Terraform -target (required)

```
module.iam
```

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating\infra\terraform\dev

terraform plan -out=tfplan -target="module.iam"
terraform show -no-color tfplan
```

**Abort apply** if the plan includes any of: `aws_cloudfront_`, `aws_ecs_`, `aws_db_instance`, ElastiCache, NAT, `food-`, `module.secrets`, `module.ecs`, `module.cloudfront`.

Expect IAM only: two roles, task inline policy, execution managed `AmazonECSTaskExecutionRolePolicy`, execution secrets inline policy. Several **adds**. No Fargate services.

If clean:

```powershell
terraform apply tfplan
terraform output iam_task_role_arn
terraform output iam_execution_role_arn
```

(If those output names differ, `terraform output` with no args and copy the two IAM ARNs. Never print secret values.)

Optional **diagnostic only** (do not apply this plan):

```powershell
terraform plan -no-color -target="module.secrets"
```

Expect CloudFront in that plan while `enable_cloudfront` is true. Stop. Do not write a second apply.

---

## Blast radius

- **AWS:** two IAM roles + policies. **$0.** No tasks start. No new billable data plane.
- **Going2Eat:** none. Do not touch `food-*`.

---

## Rollback

- Wrong plan: do not apply
- After apply, unused roles: `terraform destroy -target="module.iam"` later with consent (does not delete RDS/S3)

---

## What QA should query

```powershell
aws iam get-role --role-name dating-dev-task --profile pizza --query "Role.{name:RoleName,arn:Arn}" --output json
aws iam get-role --role-name dating-dev-exec --profile pizza --query "Role.{name:RoleName,arn:Arn}" --output json
aws ecs list-clusters --region eu-central-1 --profile pizza --output json
aws cloudfront list-distributions --profile pizza --query "DistributionList.Items[?contains(Comment, 'dating') || contains(Origins.Items[0].Id, 'dating')].{id:Id,status:Status,domain:DomainName}" --output json
aws ecs describe-services --region eu-north-1 --profile pizza --cluster food-cluster --services food-backend-service --query "services[0].{desired:desiredCount,running:runningCount}" --output json
```

- At least one `dating-dev-task-*` and one `dating-dev-exec-*`
- No Dating ECS services running in Frankfurt
- No Dating CloudFront
- Food still desired 1 / running 1

---

## Decisions

- Secrets module **deferred** this phase to keep CloudFront out of the graph
- Google stays empty until phase 8
- Quote `-target="module.iam"` in PowerShell

---

## Open questions / blockers

- None for IAM. Secrets + attach extra policy: after 5b skip is encoded as `enable_cloudfront = false` **or** after an explicit CDN apply.

---

## Next

```text
--upload-agent devops phase 5f
```
