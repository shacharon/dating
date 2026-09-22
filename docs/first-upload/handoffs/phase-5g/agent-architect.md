# Handoff: first-upload — architect — phase 5g

**Agent:** architect  
**Phase:** `5g` Start servers (ECS Fargate)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product go. This is the first upload. **Wait for operator yes** on Fargate spend before apply.
- Creates: cluster `dating-dev-cluster`, Fargate services `dating-dev-api` + `dating-dev-ui` (desired 1 each), task defs, log groups, Cloud Map `dating-api.internal`, API autoscaling 1–2.
- Also **must** create `module.secrets` this phase (ECS `depends_on` the execution-role secrets attachment). SSM placeholders + generated pepper/unsubscribe. Google stays empty. **Do not print secret values.**
- Private subnets, `assign_public_ip = false` (existing NAT). Images `:latest` (ECR also has `2ea2c3f`).
- **Hard — CloudFront:** tfvars still has `enable_cloudfront = true`, which makes ECS/secrets depend on `module.cloudfront[0]`. **Encode the parked 5b skip:** set `enable_cloudfront = false` in gitignored `terraform.tfvars` **before** plan. That is not “building CDN”; it is turning the flag off so apply cannot create it.
- **Hard — OPENAI shell:** `ecs_secrets_from_secretsmanager_only` always injects `OPENAI_API_KEY`, but a secret **version** is only created if the key is non-empty. Empty shell → tasks fail `ResourceInitializationError`. Before apply, make OPENAI optional (same as RESEND). See below.

---

## What must already exist

- IAM `dating-dev-task` / `dating-dev-exec`
- ALB `dating-dev-alb` (503 today is expected)
- ECR `dating-api` + `dating-ui` `:latest`
- RDS + Redis available, photos bucket, NAT, private subnets
- Profile `pizza`, `eu-central-1`

---

## Code change before plan (required)

`infra/terraform/modules/secrets/task_env.tf` — remove `OPENAI_API_KEY` from `ecs_secrets_required`. Add it to `ecs_secrets_optional` only when `var.openai_api_key != ""` (mirror RESEND). Do not put a real OpenAI key in tfvars.

`infra/terraform/dev/terraform.tfvars` (gitignored):

```
enable_cloudfront = false
```

Do not commit tfvars.

---

## Working directory

`c:\dev\piza\dating\infra\terraform\dev`

---

## Terraform -target (required)

```
module.secrets
aws_iam_role_policy_attachment.ecs_execution_secrets
module.ecs
```

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating\infra\terraform\dev

terraform plan -out=tfplan -target="module.secrets" -target="aws_iam_role_policy_attachment.ecs_execution_secrets" -target="module.ecs"
terraform show -no-color tfplan
```

**Abort apply** if the plan includes `aws_cloudfront_`, `food-`, extra NAT, RDS replace, or `module.cloudfront`.

Expect: secrets (SSM + SM shells + generated versions), IAM policy attach, ECS cluster/services/task defs/logs/Cloud Map, maybe API autoscaling. **Adds**, not destroy of VPC/RDS/ALB.

Show plan to operator. Apply only after **yes**:

```powershell
terraform apply tfplan
```

Then wait (can be 3–10+ minutes):

```powershell
aws ecs wait services-stable --region eu-central-1 --profile pizza --cluster dating-dev-cluster --services dating-dev-api dating-dev-ui
curl.exe -sS -o NUL -w "%{http_code}" http://dating-dev-alb-1407086009.eu-central-1.elb.amazonaws.com/health
```

If wait times out: `describe-services` + CloudWatch `/ecs/dating-dev/dating-api`. Do not apply food or CloudFront.

---

## Blast radius

- **AWS:** Fargate 2× (defaults **512 CPU / 1024 MB** each) + CloudWatch logs + Cloud Map. New monthly tens of dollars on top of NAT/RDS/Redis/ALB.
- Secrets Manager/SSM: cents.
- **Going2Eat:** none.

---

## Rollback

- Wrong plan: do not apply
- After apply, stop spend without full destroy: set desired count 0 (consent) or `terraform destroy -target="module.ecs"` (consent). Do not destroy RDS/NAT unless asked.

---

## What QA should query

```powershell
aws ecs describe-services --region eu-central-1 --profile pizza --cluster dating-dev-cluster --services dating-dev-api dating-dev-ui --query "services[].{name:serviceName,desired:desiredCount,running:runningCount,pending:pendingCount}" --output json
curl.exe -sS -D - -o NUL http://dating-dev-alb-1407086009.eu-central-1.elb.amazonaws.com/health
aws cloudfront list-distributions --profile pizza --output json
aws ecs describe-services --region eu-north-1 --profile pizza --cluster food-cluster --services food-backend-service --query "services[0].{desired:desiredCount,running:runningCount}" --output json
```

- `/health` **200**
- Both services running ≥ 1
- No Dating CloudFront
- food 1 / 1
- Google not required; DB pages may still fail (phase 6)

---

## Decisions

- `enable_cloudfront = false` is the 5b skip in the graph
- Secrets apply now because ECS cannot start without it
- Quote all `-target="..."` in PowerShell

---

## Open questions / blockers

- Apply blocked until operator **yes** on Fargate spend
- If operator refuses to flip CloudFront flag, stop — do not apply ECS

---

## Next

```text
--upload-agent devops phase 5g
```
