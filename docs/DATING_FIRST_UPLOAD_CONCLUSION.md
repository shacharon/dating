# Dating first AWS upload — conclusion

**Date:** 2026-09-20  
**Account:** `907390934996` (profile `pizza`, user `shachar-admin`)  
**Region:** `eu-central-1` (Frankfurt)  
**Public site:** https://findyouraidate.com  
**Isolation:** `dating-*` only. Going2Eat `food-*` / `food-cluster` left running 1/1 in Stockholm.

Pipeline: `--upload-agent product|architect|devops|qa` per phase. Handoffs: `docs/first-upload/handoffs/`.

---

## What is live

| Piece | Name / note |
|--------|----------------|
| VPC + NAT | `dating-dev` VPC, single NAT (daily cost) |
| ECR | `dating-api`, `dating-ui` |
| Photos | S3 `dating-dev-photos` (no CloudFront) |
| DB | RDS Postgres `dating-dev-postgres` (`db.t4g.small`), private |
| Redis | `dating-dev-redis` (`cache.t4g.micro`) |
| ALB | `dating-dev-alb-1407086009.eu-central-1.elb.amazonaws.com` — HTTPS 443 + HTTP→HTTPS |
| Domain | `findyouraidate.com` (bought at GoDaddy). Nameservers → Route53 zone `Z07929232UEJHOWSE21WB`. Apex + www alias to ALB. ACM cert ISSUED in Frankfurt. |
| ECS | Cluster `dating-dev-cluster`. API `dating-dev-api` (task ~`:6`), UI `dating-dev-ui` (`dating-ui:google8`). Desired 1 each. |
| IAM | Roles `dating-dev-task`, `dating-dev-exec` |
| Health | `https://findyouraidate.com/health` → 200 `dating-api` |
| Schema | Prisma `migrate deploy` applied (empty of users until first Google login) |
| Google | Web client **dating** in GCP project `restaurantsFinder`. JS origins added for the real domain. Login on phone **works** (2026-09-20). |

Ugly ALB hostname still exists; browsers should use **https://findyouraidate.com**.

---

## How config actually works (not SSM-only)

App code still reads **env vars** (same as laptop).

- **Parameter Store** `/dating/dev/api/…` — copy of plain config (Google **client ID**, CORS, cookie domain). Changing SSM alone does **not** update a running task.
- **Secrets Manager** — DB URL, session pepper, **JWT_SECRET**, OpenAI stub, etc. Names use `name_prefix` so they look ugly (`…-bQ4BIH`). The task uses the **ARN**.
- **UI Google button** — `NEXT_PUBLIC_GOOGLE_CLIENT_ID` **baked into** image `google8`. Rebuild UI if the client ID changes.
- **JWT_SECRET** was missing at first Google login (`AUTH_LOGIN_FAILURE`). Generated 2026-09-20 and injected into API task `:6`. Not the Google client secret.

---

## Phase status

| ID | Result |
|----|--------|
| 0–4 | Done (images; API image ~200 MB parked) |
| 5a | Done (S3) |
| 5b | **Parked** — no CloudFront |
| 5c–5f | Done (RDS, Redis, ALB HTTP, IAM) |
| 5g | Done (`/health` 200) |
| 6 | Done (migrations) |
| 7 | Done after unpark — domain + HTTPS (product 7 was first parked; work done anyway). Formal QA file incomplete; operator confirmed site on **phone**. |
| 8 | Google origins + UI rebuild + login on phone. QA first run **blocked** (no operator login). Login later **passed** on phone. Photo upload **not confirmed** in this write-up. |

---

## DNS (home Wi‑Fi)

Google/Cloudflare already point at the ALB. **Cellcom router** often still returns GoDaddy Website Builder IPs (`13.248.243.5`, `76.223.105.230`). Phone / Chrome “secure DNS” / Windows `8.8.8.8` shows the real app. Waiting on home Wi‑Fi is unreliable.

---

## Still parked / later

See [OPEN_ISSUES.md](first-upload/OPEN_ISSUES.md):

- P1 — `dating-api` image ~200 MB
- P2 — CloudFront photo CDN
- NAT vs Going2Eat public-IP (cheaper) — not started

**Do not** `terraform destroy` without explicit operator yes. Tear-down is dating stack only.

---

## Operator next (product, not infra)

- Confirm **photo upload** on the live site (phase 8 original exit test).
- List UI/product bugs seen after login (separate from this upload).
