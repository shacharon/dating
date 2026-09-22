# Handoff: first-upload — architect — phase 4

**Agent:** architect  
**Phase:** `4` Build and push images  
**Date:** 2026-09-19  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product go. Build two Linux/amd64 images, tag with git short SHA **and** `latest`, push to Frankfurt ECR only.
- No Terraform apply. No ECS start. No Going2Eat / `food-backend` registry (`eu-north-1`).
- UI `API_PROXY_TARGET` is **baked at Next build**. Must match ECS Cloud Map: `http://dating-api.internal:3001` (module default `service_discovery_namespace = "internal"`). Leave `NEXT_PUBLIC_GOOGLE_*` empty (no domain/login yet). Same-origin `/api` via ALB later; do not bake a public API URL.

---

## What must already exist

- Docker Desktop running
- ECR repos `dating-api`, `dating-ui` in `eu-central-1` (phase 3)
- Profile `pizza`, account `907390934996`
- Dockerfiles: `dating-api/Dockerfile`, `dating-ui/Dockerfile`

---

## Registry / tag

| | |
|--|--|
| Registry | `907390934996.dkr.ecr.eu-central-1.amazonaws.com` |
| Tag | `$sha` = `git rev-parse --short HEAD` plus `latest` |
| Platform | `linux/amd64` (Fargate) |

---

## Terraform -target

None.

---

## Blast radius

- **AWS:** two image pushes to Dating ECR (storage). No VPC/NAT change.
- **Going2Eat:** must not login/push `eu-north-1` food repo.

---

## Commands (PowerShell)

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
$reg = "907390934996.dkr.ecr.eu-central-1.amazonaws.com"
Set-Location c:\dev\piza\dating
$sha = (git rev-parse --short HEAD).Trim()

aws ecr get-login-password --region eu-central-1 --profile pizza | docker login --username AWS --password-stdin $reg

Set-Location c:\dev\piza\dating\dating-api
docker build --platform linux/amd64 -f Dockerfile -t "${reg}/dating-api:${sha}" -t "${reg}/dating-api:latest" .
docker push "${reg}/dating-api:${sha}"
docker push "${reg}/dating-api:latest"

Set-Location c:\dev\piza\dating\dating-ui
docker build --platform linux/amd64 -f Dockerfile `
  --build-arg API_PROXY_TARGET=http://dating-api.internal:3001 `
  --build-arg NEXT_PUBLIC_ADMIN_ENABLED=0 `
  -t "${reg}/dating-ui:${sha}" -t "${reg}/dating-ui:latest" .
docker push "${reg}/dating-ui:${sha}"
docker push "${reg}/dating-ui:latest"
```

If login/push hook asks, that is expected. Do not proceed to ECS.

Optional: `docker info` first; if daemon down, stop.

---

## Rollback

- Failed build: do not push a half image. Fix Dockerfile/build, retry.
- Wrong registry: do not `docker push` food. Delete wrong local tags.
- Bad UI proxy arg: rebuild UI (do not “fix” with ECS env only for `API_PROXY_TARGET` rewrites).

---

## What QA should query

```powershell
aws ecr describe-images --repository-name dating-api --region eu-central-1 --profile pizza --query "imageDetails[].imageTags" --output json
aws ecr describe-images --repository-name dating-ui --region eu-central-1 --profile pizza --query "imageDetails[].imageTags" --output json
aws ecr list-images --repository-name food-backend --region eu-north-1 --profile pizza --query "imageIds[0]" --output json
```

- Both Dating repos have tags including the same `$sha` and `latest`
- food-backend list is a spot-check only (must still exist; we did not replace it)

---

## Next

```text
--upload-agent devops phase 4
```

Builds can take 10–20+ minutes. No NAT-style extra yes required; product already go. Stop after both pushes.
