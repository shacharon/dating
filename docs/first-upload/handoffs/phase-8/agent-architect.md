# Handoff: first-upload — architect — phase 8

**Agent:** architect  
**Phase:** `8` Google login  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product **go**. No new RDS/NAT/CloudFront. GIS **id-token** login (`POST /api/v1/auth/google`). **Client ID only** — this app does **not** need `GOOGLE_CLIENT_SECRET` in AWS.
- Operator adds **Authorized JavaScript origins** in Google Console. Rebuild **UI** with `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (phase 4 image left it empty). Update tfvars + apply **secrets + ECS task defs**, then **CLI `update-service`** because services `ignore_changes` on `task_definition`.
- Keep `enable_cloudfront = false`. Names `dating-*` only.

---

## What must already exist

- HTTPS site `https://findyouraidate.com` (ALB 443, ACM ISSUED, Route53)
- Cluster `dating-dev-cluster`, services `dating-dev-api` / `dating-dev-ui`
- Gitignored `infra/terraform/dev/terraform.tfvars` with domain/CORS/cookie already aimed at this name
- Profile `pizza`, `eu-central-1`, account `907390934996`
- Docker Desktop (UI rebuild)

---

## Google Console (operator — before or during devops)

Same **Web** OAuth client as local. GIS button uses JS origins, not a callback path.

**Authorized JavaScript origins** (required):

- `https://findyouraidate.com`
- `https://www.findyouraidate.com`

**Authorized redirect URIs** (optional for this GIS flow; add if Console complains a Web client needs one):

- `https://findyouraidate.com`
- `https://www.findyouraidate.com`

Do **not** invent `/oauth2callback`. Do **not** paste the client secret in chat. Client **id** (ends with `.apps.googleusercontent.com`) goes into gitignored tfvars only.

---

## tfvars (gitignored — do not commit, do not print values)

Working copy `c:\dev\piza\dating\infra\terraform\dev\terraform.tfvars`:

```
google_client_id = "<web-client-id>.apps.googleusercontent.com"
cors_origin      = "https://findyouraidate.com,https://www.findyouraidate.com"
app_public_url   = "https://findyouraidate.com"
cookie_domain    = ".findyouraidate.com"
enable_cloudfront = false
ui_image_tag     = "google8"
```

Leave `NEXT_PUBLIC_API_URL` **unset** at Docker build (same-origin `/api`). Do not set `enable_cloudfront = true`.

---

## Working directory

Repo root for Docker: `c:\dev\piza\dating`  
Terraform: `c:\dev\piza\dating\infra\terraform\dev`

---

## Terraform -target

```
module.secrets
module.ecs
```

Quote targets in PowerShell (`-target="module.ecs"`). Do **not** target CloudFront, RDS, food, networking.

---

## Commands (PowerShell)

### 1) UI image (required)

Read client id from tfvars in the shell; **do not** `Write-Host` it.

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
$reg = "907390934996.dkr.ecr.eu-central-1.amazonaws.com"
Set-Location c:\dev\piza\dating

$gid = (Select-String -Path .\infra\terraform\dev\terraform.tfvars -Pattern '^\s*google_client_id\s*=').Line
$gid = ($gid -split '=',2)[1].Trim().Trim('"').Trim("'")
if (-not $gid -or $gid -like "REPLACE*") { throw "google_client_id missing in terraform.tfvars" }

aws ecr get-login-password --region eu-central-1 --profile pizza | docker login --username AWS --password-stdin $reg

Set-Location c:\dev\piza\dating\dating-ui
docker build --platform linux/amd64 -f Dockerfile `
  --build-arg API_PROXY_TARGET=http://dating-api.internal:3001 `
  --build-arg NEXT_PUBLIC_ADMIN_ENABLED=0 `
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=$gid `
  -t "${reg}/dating-ui:google8" -t "${reg}/dating-ui:latest" .
docker push "${reg}/dating-ui:google8"
docker push "${reg}/dating-ui:latest"
```

Do **not** rebuild dating-api unless the image is broken. API only needs task env `GOOGLE_CLIENT_ID` + CORS/cookie.

### 2) Plan then apply (pennies — product already go)

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating\infra\terraform\dev

terraform plan -out=tfplan -target="module.secrets" -target="module.ecs"
terraform show -no-color tfplan
```

**Abort apply** if the plan includes `aws_cloudfront_`, `food-`, NAT/RDS replace, extra desired count, or `module.cloudfront`.

Expect: SSM `GOOGLE_CLIENT_ID` / `CORS_ORIGIN` / `COOKIE_DOMAIN` / `APP_PUBLIC_URL`; new API + UI **task definition revisions**; UI image tag `google8`. Services may show **no in-place task swap** (`ignore_changes`).

```powershell
terraform apply tfplan
```

### 3) Point services at the new task defs (required)

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"

$apiTd = aws ecs describe-task-definition --task-definition dating-dev-api --query "taskDefinition.taskDefinitionArn" --output text --profile pizza --region eu-central-1
$uiTd  = aws ecs describe-task-definition --task-definition dating-dev-ui --query "taskDefinition.taskDefinitionArn" --output text --profile pizza --region eu-central-1

aws ecs update-service --cluster dating-dev-cluster --service dating-dev-api --task-definition $apiTd --force-new-deployment --profile pizza --region eu-central-1
aws ecs update-service --cluster dating-dev-cluster --service dating-dev-ui --task-definition $uiTd --force-new-deployment --profile pizza --region eu-central-1

aws ecs wait services-stable --cluster dating-dev-cluster --services dating-dev-api dating-dev-ui --profile pizza --region eu-central-1
```

Confirm env **without printing the client id**:

```powershell
aws ecs describe-task-definition --task-definition dating-dev-api --query "taskDefinition.containerDefinitions[0].environment[?name=='GOOGLE_CLIENT_ID' || name=='CORS_ORIGIN' || name=='COOKIE_DOMAIN' || name=='COOKIE_SECURE' || name=='APP_PUBLIC_URL'].name" --output text --profile pizza --region eu-central-1
```

Expect those five names present. `COOKIE_SECURE` already `true` in the module.

---

## Blast radius

- **AWS:** SSM param updates; new ECS task revisions; two service rollouts (desired 1). ECR one extra UI tag. Same NAT/RDS bill.
- **Not this phase:** CloudFront, RDS size, food cluster, GoDaddy NS, ACM.
- **Google:** Console origin list only.

---

## Rollback

- Bad UI build: keep previous UI task rev; `update-service` back to last known good (phase 4 tag `2ea2c3f` / prior revision).
- Wrong Google origin: login popup error in browser; fix Console, no AWS destroy.
- Plan wants CloudFront: stop, leave `enable_cloudfront = false`, re-plan.
- Do not `terraform destroy`.

---

## What QA should query

- `https://findyouraidate.com/` dating UI (phone or `8.8.8.8`; ignore Cellcom GoDaddy cache)
- Google button visible (not “missing client id”)
- Sign in with Google succeeds; session cookie on `findyouraidate.com`
- Upload a photo (product exit test)
- `GET https://findyouraidate.com/health` still 200
- food-backend Stockholm still desired 1 running 1

```powershell
aws ecs describe-services --cluster dating-dev-cluster --services dating-dev-api dating-dev-ui --profile pizza --region eu-central-1 --query "services[].{name:serviceName,running:runningCount,desired:desiredCount,td:taskDefinition}" --output table
aws ecs describe-services --cluster food-cluster --services food-backend --region eu-north-1 --profile pizza --query "services[0].{desired:desiredCount,running:runningCount}" --output json
```

---

## Next

```text
--upload-agent devops phase 8
```

Stop until operator has put `google_client_id` in tfvars and Google Console origins. Do not print secrets or the client id in the devops handoff.
