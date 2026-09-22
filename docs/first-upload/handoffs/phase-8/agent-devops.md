# Handoff: first-upload — devops — phase 8

**Agent:** devops  
**Phase:** `8` Google login  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** applied

---

## Summary

- Copied Web **Google client ID** from local `dating-ui/.env.local` into gitignored tfvars (not printed). Set CORS to apex + www, `ui_image_tag = google8`.
- Rebuilt and pushed **dating-ui** `google8` / `latest` with `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `API_PROXY_TARGET=http://dating-api.internal:3001`. Did not rebuild dating-api.
- `terraform apply` `-target module.secrets` `-target module.ecs`: SSM Google/CORS/cookie/app URL; new task defs. No CloudFront, no food, no RDS/NAT change.
- Forced ECS onto **api:5** and **ui:2**. Services stable, desired 1 running 1.
- **Operator still must add Google Console JS origins** (`https://findyouraidate.com`, `https://www.findyouraidate.com`) if not done yet. AWS cannot do that.

---

## Commands run

- Docker login ECR Frankfurt; `docker build` dating-ui `--platform linux/amd64`; push `google8` + `latest`
- `terraform plan/apply -target="module.secrets" -target="module.ecs"`
- `aws ecs update-service` api + ui `--force-new-deployment`; `wait services-stable`

---

## AWS ids (no secrets)

| Thing | Value |
|-------|--------|
| UI image | `dating-ui:google8` digest `sha256:a192d2802f89bd40bec110126ca5494a7ce0bdbd3042071d9efb858ecf58b705` |
| API task | `dating-dev-api:5` |
| UI task | `dating-dev-ui:2` (image tag `google8`) |
| API env names present | `GOOGLE_CLIENT_ID` `CORS_ORIGIN` `COOKIE_DOMAIN` `COOKIE_SECURE` `APP_PUBLIC_URL` |
| Cluster | `dating-dev-cluster` running 1/1 both services |
| food-backend-service (eu-north-1) | desired 1 running 1 (untouched) |
| `/health` via ALB IP | `{"ok":true,"service":"dating-api",...}` |

---

## Errors

- Plan JSON listed existing Redis as no-op; abort regex false-positive. Real changes were secrets SSM + task-def replace only. Applied.
- `describe-services food-backend` is empty; real name is `food-backend-service`.

---

## Next

QA: login + photo on **https://findyouraidate.com** (phone or Google DNS). Do not use Cellcom-cached GoDaddy.

```text
--upload-agent qa phase 8
```
