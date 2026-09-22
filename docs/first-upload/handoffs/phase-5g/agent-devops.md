# Handoff: first-upload — devops — phase 5g

**Agent:** devops  
**Phase:** `5g` Start servers (ECS Fargate)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** applied

---

## Summary

- Set `enable_cloudfront = false` in gitignored tfvars. Plan had **no** CloudFront / food.
- First apply: secrets SSM rejected **empty** strings. Skipped empty params; retried.
- ECS cluster + API/UI services created. API crashed without `OPENAI_API_KEY`. Added a Secrets Manager **stub** (not a real key) and rolled the API to task def **revision 2**.
- `/health` is **200**. UI target was already healthy. Login/DB still later.

---

## Commands run

```powershell
terraform plan -out=tfplan -target="module.secrets" -target="aws_iam_role_policy_attachment.ecs_execution_secrets" -target="module.ecs"
terraform apply tfplan
# after OpenAI stub:
aws ecs update-service --cluster dating-dev-cluster --service dating-dev-api --task-definition dating-dev-api --force-new-deployment
aws ecs wait services-stable ...
curl.exe .../health
```

---

## AWS ids (no secrets)

| Thing | Value |
|-------|--------|
| Cluster | `dating-dev-cluster` |
| API service | `dating-dev-api` (task def `:2`) |
| UI service | `dating-dev-ui` |
| URL | `http://dating-dev-alb-1407086009.eu-central-1.elb.amazonaws.com` |
| Health | `http://dating-dev-alb-1407086009.eu-central-1.elb.amazonaws.com/health` → 200 |
| Region | `eu-central-1` |

---

## Errors

- SSM empty value → skip empty keys in secrets module
- API boot requires `OPENAI_API_KEY` → stub version, not a real OpenAI key
- Outputs `secrets_*` marked sensitive so Terraform can plan

---

## Console

Frankfurt → **ECS** → Clusters → **`dating-dev-cluster`**. Two services running 1.

Browser: health URL above. Home page may load; Google/DB not this phase.

---

## Next

```text
--upload-agent qa phase 5g
```
