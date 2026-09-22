---
name: dating-push
description: >-
  When the user says push (or push to git / docker / aws) in the Dating repo:
  git push, build and push dating-api and dating-ui Docker images to Frankfurt
  ECR, then roll both ECS services. Never Going2Eat food-*.
---

# Dating push (git + both images)

Trigger: user says **push** in this repo. Do all of this. PowerShell: `;` not `&&`. Profile `pizza`, region `eu-central-1`. Never `food-*`. Do not print Google client id or secrets.

Read `.cursor/aws-deploy.json` for names.

## 1) Git

- `git status` / `git diff`. Do **not** commit: `infra/terraform/dev/terraform.tfvars`, `tfplan`, `.env`, `.env.local`, secrets.
- If there is dating source to ship: stage it, commit (1–2 sentences, why), `git push` to the tracked branch.
- Never `git push --force` to `main`/`master`.

## 2) Docker + ECR (both)

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
$reg = "907390934996.dkr.ecr.eu-central-1.amazonaws.com"
Set-Location <repo-root>
$sha = (git rev-parse --short HEAD).Trim()

$gid = (Select-String -Path .\infra\terraform\dev\terraform.tfvars -Pattern '^\s*google_client_id\s*=').Line
$gid = ($gid -split '=',2)[1].Trim().Trim('"').Trim("'")
if (-not $gid -or $gid -like "REPLACE*") { throw "google_client_id missing in terraform.tfvars" }

aws ecr get-login-password --region eu-central-1 --profile pizza | docker login --username AWS --password-stdin $reg

Set-Location .\dating-api
docker build --platform linux/amd64 -f Dockerfile -t "${reg}/dating-api:${sha}" -t "${reg}/dating-api:latest" .
docker push "${reg}/dating-api:${sha}"
docker push "${reg}/dating-api:latest"

Set-Location ..\dating-ui
docker build --platform linux/amd64 -f Dockerfile `
  --build-arg API_PROXY_TARGET=http://dating-api.internal:3001 `
  --build-arg NEXT_PUBLIC_ADMIN_ENABLED=0 `
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=$gid `
  -t "${reg}/dating-ui:${sha}" -t "${reg}/dating-ui:latest" .
docker push "${reg}/dating-ui:${sha}"
docker push "${reg}/dating-ui:latest"
```

A Cursor hook may ask to approve `docker push`. Wait.

## 3) Live ECS (required or the site stays on the old image)

Services `ignore_changes` on `task_definition`. After push:

- Register new task defs (or copy latest, set image to `${reg}/dating-api:${sha}` and `${reg}/dating-ui:${sha}`).
- `aws ecs update-service` `dating-dev-cluster` / `dating-dev-api` and `dating-dev-ui` `--force-new-deployment`.
- `aws ecs wait services-stable` both.
- Confirm `/health` on https://findyouraidate.com (if home DNS is GoDaddy, use `--resolve` to ALB or tell operator to use phone).

Do not scale food. Do not enable CloudFront unless asked.

## Report

SHA tags, both ECR pushes, new API/UI task revisions, running 1/1. No secret values.
