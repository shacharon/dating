# Deploy to AWS `dev` — Comprehensive Runbook (local → cloud)

> **Audience:** whoever is pushing the `dating` monorepo from a local dev box to a shared **AWS `dev`** environment for the first time (and every time after).
>
> **Scope:** the whole system end-to-end — database, scale/perf, photo pipeline, users/auth, backend, frontend, and health. Every "nuance" that bites you locally-vs-cloud is called out explicitly.
>
> **Golden rule (learned the hard way on the prior `going2eat.food` project):** *the app boots fine locally with half the config missing because almost everything fails open. In the cloud those same "optional" gaps turn into silent data loss, broken photos, dropped WebSockets, and login loops.* This doc closes every one of those gaps. Read [§2 Lessons from the food project](#2-lessons-from-the-food-project-read-first) before you touch anything.

---

## 0. TL;DR — the happy path

```text
1. Provision:  RDS Postgres 16 · ElastiCache Redis · S3 bucket · IAM role · (CloudFront)
2. Secrets:    put every var from §6 into SSM Parameter Store / Secrets Manager
3. DB:         npx prisma migrate deploy        (run once per deploy, before app start)
4. API:        npm ci && npm run build && npm run start:prod    (port 3001, needs Redis+DB+OpenAI)
5. UI:         npm ci && npm run build && npm run start          (port 3000, points at API)
6. Verify:     GET /health · GET /health/realtime · smoke tests in §9
```

If any of those steps is unfamiliar, keep reading — each has a section with the exact commands and the cloud-specific traps.

---

## 1. Architecture & what actually needs to run

Two long-lived Node processes plus managed AWS backing services.

```
                         ┌────────────────────────────────────────────┐
        Browser ──────►  │  CloudFront / ALB (HTTPS, one public origin) │
                         └───────────────┬───────────────┬─────────────┘
                                         │ /              │ /api/*  /socket.io
                                         ▼                ▼
                              ┌──────────────────┐  ┌──────────────────┐
                              │ dating-ui         │  │ dating-api        │
                              │ Next.js 16 :3000  │  │ NestJS 11 :3001   │
                              │ next start        │  │ node dist/...     │
                              └──────────────────┘  └───────┬──────────┘
                                                            │
             ┌───────────────┬──────────────┬──────────────┼───────────────┬──────────────┐
             ▼               ▼              ▼              ▼               ▼              ▼
        RDS Postgres   ElastiCache      S3 bucket     Rekognition     CloudFront     OpenAI API
        (data)         Redis            (photos)      (moderation)    (photo CDN)    (analysis)
                       (cache/queues/
                        ws-adapter)
```

| Component | Tech | Port | Must-have backing services |
|-----------|------|------|-----------------------------|
| `dating-api` | NestJS 11, Node 20–22 | 3001 | Postgres, Redis, OpenAI key; S3+Rekognition for photos |
| `dating-ui`  | Next.js 16, React 19 | 3000 | reaches API over HTTP + `/socket.io` |
| Workers | `bull` (Redis) in-process | — | run **inside** the API process (no separate deploy today) |
| SLA cron | `setInterval` in API | — | same process |

> **Nuance — there is no separate worker service.** Profile-analysis and photo-moderation queues run in the same API process via `bull`. That's fine for `dev`, but it means **if the API has 0 running instances, no jobs are processed.** Keep ≥1 API instance always up.

---

## 2. Lessons from the food project (read first)

These are the failure modes that cost us time before. Each maps to a concrete fix later in this doc.

| # | What bit us | Why it "worked locally" | Fix in this doc |
|---|-------------|--------------------------|-----------------|
| L1 | **Photos vanished / 403 on reload** | Local uses disk (`PHOTO_UPLOAD_DIR`); cloud containers are ephemeral so uploaded files disappear on restart/scale. | Use `PHOTO_STORAGE_DRIVER=s3` — [§5.3](#53-s3-photo-storage) |
| L2 | **WebSocket chat dropped / duplicated across tabs** | Single local instance needs no shared adapter; multiple cloud instances split socket.io state. | `REDIS_URL` + sticky sessions — [§5.2](#52-redis-elasticache) & [§8](#8-scale--performance) |
| L3 | **Profile analysis "stuck forever"** | Locally, missing Redis → jobs run inline so you never notice. In cloud with a bad `REDIS_URL`, Bull silently degrades / retries. | Verified `REDIS_URL` + [§7 workers](#7-workers-queues--sla) |
| L4 | **Login worked, then every request 401** | Local is same-origin http; cookie flags don't matter. Cross-origin HTTPS needs `Secure`, `SameSite`, and correct `COOKIE_DOMAIN`. | [§10 users/auth](#10-users-auth-sessions--cors) |
| L5 | **API crashed on boot in cloud, fine locally** | `OPENAI_API_KEY` is **required at boot**; missing secret = crash loop. | [§6 secrets](#6-secrets--environment-variables) |
| L6 | **DB migrations ran twice / race on scale-up** | One local process; multiple cloud instances each tried `migrate deploy` on start. | Run migrations as a **separate one-shot step**, not in the app entrypoint — [§4](#4-database-rds-postgres) |
| L7 | **Logs disappeared** | Local writes `logs/*.log`; cloud FS is read-only/ephemeral. | Set `STRUCTURED_LOG_FILE=0`, ship stdout — [§6](#6-secrets--environment-variables) & [§11](#11-observability--health) |
| L8 | **CORS/redirect loop between UI and API** | Same-origin locally; split hosts in cloud need explicit `CORS_ORIGIN` + proxy target. | [§10](#10-users-auth-sessions--cors) |
| L9 | **"It's slow" under load** | No cache/pagination pressure locally. | Redis cache + cursor pagination + indexes — [§8](#8-scale--performance) |
| L10 | **Admin UI exposed or 404** in prod build | Dev flags differ from prod build gating. | `NEXT_PUBLIC_ADMIN_ENABLED` + WAF — [§10](#10-users-auth-sessions--cors) |

---

## 3. Pre-flight checklist

Before deploying, confirm you have:

- [ ] AWS account access + region chosen (default assumption: `us-east-1`).
- [ ] Ability to create/read **RDS**, **ElastiCache**, **S3**, **IAM**, **CloudFront**, **Secrets Manager/SSM**.
- [ ] `OPENAI_API_KEY` (**boot blocker** — API will not start without it).
- [ ] `GOOGLE_CLIENT_ID` (OAuth Web client; the UI needs the *same* value).
- [ ] A long random `SESSION_SECRET_PEPPER` (≥32 chars).
- [ ] Decided the public origin(s): single origin (recommended) vs split API/UI hosts.
- [ ] Node 20–22 available in the build/runtime image.
- [ ] Local green build: `npm ci && npm run build` in **both** `dating-api` and `dating-ui`, and tests pass.

```bash
# from repo root — prove it builds before you ship it
cd dating-api && npm ci && npm run build && npm test
cd ../dating-ui && npm ci && npm run build && npm test
```

---

## 4. Database (RDS Postgres)

**Target:** RDS (or Aurora) **PostgreSQL 16**, matching local `postgres:16`.

### 4.1 Provision
- Engine: PostgreSQL 16, `dev` sizing (e.g. `db.t4g.micro`/`small` is fine for dev).
- Create DB `dating`, a least-privilege app user.
- Security group: allow **5432** only from the API's security group (never `0.0.0.0/0`).
- Enable automated backups + `deletion protection` off for `dev` (on for prod later).

### 4.2 Connection string
```
DATABASE_URL="postgresql://<user>:<password>@<rds-endpoint>:5432/dating?schema=public&sslmode=require&connection_limit=10&pool_timeout=10"
```
> **Nuance:** local uses host port **5433** (docker-compose remaps). RDS is **5432**. Don't copy the local port. Add `sslmode=require` for RDS. Include Prisma pool params (`connection_limit` / `pool_timeout`) — see `dating-api/docs/ops/PRISMA_CONNECTION_POOL.md`.

### 4.3 Migrations — run as a one-shot, NOT in the app entrypoint (fixes **L6**)
```bash
cd dating-api
npx prisma generate         # already runs in build, safe to repeat
npx prisma migrate deploy   # applies all 45+ migrations, idempotent
```
Run this **once per deploy, before** starting API instances (a CodeBuild/CodeDeploy hook, an ECS one-off task, or a manual step). Do **not** rely on `start:dev:ready`/`db:migrate` inside every instance's start command or concurrent instances will race.

Sprint 19 adds two migrations that must be applied for the perf + moderation features:
- `20260712000000_add_performance_indexes` — indexes for match-list queries.
- `20260712120000_add_photo_flagged_for_review` — `FLAGGED_FOR_REVIEW` photo status.

Verify:
```bash
npx prisma migrate status
```

---

## 5. AWS backing services

### 5.1 IAM
Create one role (attach to the API's compute — ECS task role / EC2 instance profile). Prefer **role-based creds** over static keys.

Minimum policy (scope ARNs to your bucket/distribution):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "S3Photos", "Effect": "Allow",
      "Action": ["s3:PutObject","s3:GetObject","s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_PHOTO_BUCKET/*" },
    { "Sid": "Rekognition", "Effect": "Allow",
      "Action": ["rekognition:DetectModerationLabels","rekognition:DetectFaces"],
      "Resource": "*" }
  ]
}
```
> **Nuance:** the S3 client auto-discovers role creds via `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI` (ECS) or instance metadata (EC2). If you use a role, **leave `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` unset.** Only set static keys if you have no role.

### 5.2 Redis (ElastiCache)
Redis is **optional in code (fail-open)** but **required in practice** for the cloud — it powers the socket.io adapter, Bull queues, match-list cache, and WS rate limiting (fixes **L2, L3, L9**).

- Provision ElastiCache **Redis** (single node is fine for `dev`), same VPC/subnets as the API.
- Security group: allow **6379** only from the API SG.
- ```
  REDIS_URL=redis://<elasticache-endpoint>:6379
  ```
- If encryption-in-transit is on, use `rediss://`.

> **Nuance:** if `REDIS_URL` is wrong/unreachable, the API **still boots** but silently degrades: single-instance sockets, inline (non-queued) analysis, no shared cache. Always confirm `/health/realtime` shows the adapter connected after deploy.

### 5.3 S3 (photo storage)
Fixes **L1** (ephemeral disk).

- Create a **private** bucket (Block Public Access ON). Photos are served via signed CDN URLs or authenticated API, never public.
- ```
  PHOTO_STORAGE_DRIVER=s3
  PHOTO_S3_BUCKET=your-dating-dev-photos
  PHOTO_S3_REGION=us-east-1
  PHOTO_S3_PREFIX=profile-photos
  ```
- Do **not** set `PHOTO_UPLOAD_DIR` for cloud; that's the local disk driver.

### 5.4 CloudFront (photo CDN — optional but recommended)
Serves photos fast with **signed URLs** (private bucket stays private).

- Create a CloudFront distribution with the S3 bucket as origin (OAC/OAI).
- Create a CloudFront key pair; store the private key.
- ```
  PHOTO_CDN_ENABLED=1
  PHOTO_CDN_DOMAIN=dXXXX.cloudfront.net
  PHOTO_CDN_KEY_PAIR_ID=KXXXXXXXXXXXXX
  PHOTO_CDN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
  PHOTO_CDN_URL_TTL_SECONDS=3600
  ```
> **Nuance:** the private key must keep its `\n` escapes when stored as a single-line secret. If `PHOTO_CDN_ENABLED` is unset, the app falls back to authenticated relative URLs (`/api/v1/me/matches/.../file`) — functional, just not CDN-accelerated.

### 5.5 Rekognition (photo moderation)
- No provisioning beyond IAM; it's a regional API.
- ```
  PHOTO_MODERATION_DRIVER=rekognition
  PHOTO_FACE_DETECTION_ENABLED=1
  NSFW_FLAG_THRESHOLD=50
  NSFW_AUTO_REJECT_THRESHOLD=80
  ```
> **Nuance:** if the driver is unset, the app picks `rekognition` **only when AWS creds are present**, else `mock` (auto-approve). Set it explicitly so `dev` behaves like prod. **Never** set `PHOTO_MODERATION_AUTO_APPROVE=1` outside pure local testing.

---

## 6. Secrets & environment variables

Put these in **SSM Parameter Store** or **Secrets Manager** and inject at runtime. Never bake secrets into images or commit `.env`.

> **Terraform / reviewable manifest (Sprint 20 Story 03):** see [`infra/env/DEV_CONFIG_MANIFEST.md`](infra/env/DEV_CONFIG_MANIFEST.md) and [`infra/terraform/modules/secrets/`](infra/terraform/modules/secrets/). Non-secret placeholders: [`infra/env/dev.tfvars.example`](infra/env/dev.tfvars.example). Rotation = ECS redeploy; changing any `NEXT_PUBLIC_*` requires a **UI image rebuild**.

### 6.1 `dating-api` — required for a healthy cloud boot
```bash
# --- boot blockers / core ---
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/dating?schema=public&sslmode=require&connection_limit=10&pool_timeout=10
OPENAI_API_KEY=sk-...                 # REQUIRED — API crashes without it (L5)
REDIS_URL=redis://elasticache:6379    # required in practice (L2/L3/L9)
PORT=3001
NODE_ENV=production

# --- auth / sessions (L4) ---
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
SESSION_SECRET_PEPPER=<long-random-32+>
SESSION_COOKIE_NAME=dating_session
SESSION_TTL_DAYS=14
COOKIE_SECURE=true                    # HTTPS in cloud
COOKIE_DOMAIN=.your-dev-domain.tld    # only if UI+API share a parent domain
CORS_ORIGIN=https://dev.your-domain.tld
CORS_CREDENTIALS=true

# --- photos (L1) ---
PHOTO_STORAGE_DRIVER=s3
PHOTO_S3_BUCKET=your-dating-dev-photos
PHOTO_S3_REGION=us-east-1
PHOTO_S3_PREFIX=profile-photos
PHOTO_MODERATION_DRIVER=rekognition
PHOTO_FACE_DETECTION_ENABLED=1
NSFW_FLAG_THRESHOLD=50
NSFW_AUTO_REJECT_THRESHOLD=80
# CDN (optional): PHOTO_CDN_ENABLED / PHOTO_CDN_DOMAIN / PHOTO_CDN_KEY_PAIR_ID / PHOTO_CDN_PRIVATE_KEY

# --- logging (L7) ---
STRUCTURED_LOG_FILE=0                 # ship stdout to CloudWatch; no local files

# --- admin ---
ADMIN_USER_IDS=<comma,separated,User.id>

# --- email (optional in dev; enable when domain verified) ---
# EMAIL_PROVIDER=resend
# RESEND_API_KEY=re_...
# EMAIL_FROM=Piza <notifications@going2eat.food>
# APP_PUBLIC_URL=https://dev.your-domain.tld
# EMAIL_UNSUBSCRIBE_SECRET=<long-random>

# --- observability (recommended) ---
# SENTRY_DSN=... ; SENTRY_ENVIRONMENT=dev ; SENTRY_TRACES_SAMPLE_RATE=0.1
# DD_TRACE_ENABLED=1 ; DD_API_KEY=... ; DD_ENV=dev ; DD_SERVICE=dating-api  (requires `npm i dd-trace`)
```

### 6.2 `dating-ui` — build-time + runtime
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com   # same as API GOOGLE_CLIENT_ID
# Same-origin (recommended): leave NEXT_PUBLIC_API_URL UNSET and proxy via rewrites:
API_PROXY_TARGET=http://dating-api.internal:3001               # server-side rewrite target
INTERNAL_API_URL=http://dating-api.internal:3001               # SSR server-side calls
# Split-origin instead: NEXT_PUBLIC_API_URL=https://api-dev.your-domain.tld
NEXT_PUBLIC_REALTIME=ws                                        # enable WebSocket chat
NEXT_PUBLIC_ADMIN_ENABLED=1                                    # only if admin UI needed on this host (L10)
# NEXT_PUBLIC_SENTRY_DSN / NEXT_PUBLIC_SENTRY_ENVIRONMENT
```
> **Nuance:** `NEXT_PUBLIC_*` values are **baked at build time**. If you change them you must **rebuild** the UI, not just restart it.

---

## 7. Workers, queues & SLA

- **Profile analysis** (`profile-analysis` queue) and **photo moderation** (`photo-moderation` queue) are `bull` queues backed by `REDIS_URL`, running inside the API process. Retry: 3 attempts, exponential backoff.
- **SLA cron** (`photo-sla.cron.ts`) runs hourly via `setInterval` in the API: flags stuck `PENDING`, auto-approves aged `FLAGGED_FOR_REVIEW`.
- Profile submit flow: `POST /api/v1/me/profile/submit` → **202** + `analysisJobId`, then UI polls `GET /api/v1/me/profile/analysis-status`.

> **Nuances:**
> - Because workers live in the API process, **at least one API instance must always be running** or jobs stall (fixes **L3**).
> - With `REDIS_URL` set, jobs are queued and survive across requests. Without it, they run inline on the request process — do not ship `dev` without Redis.
> - If you later scale to many API instances, the SLA `setInterval` runs on **every** instance. That's tolerable (idempotent), but if it becomes noisy, gate it to a single "leader" instance.

---

## 8. Scale & performance

Sprint 19 ("performance-and-photo-moderation") targets **match-list p95 < 2s**. To hit that in cloud:

1. **Redis cache** — `match:list:{userId}` (TTL 3600s), `profile:eval:{profileId}`. Requires `REDIS_URL`.
2. **Cursor pagination** — `GET /api/v1/me/matches?cursor=&limit=20` (UI uses `use-infinite-matches.ts`). Don't fetch unbounded lists.
3. **DB indexes** — shipped in the Sprint 19 migration; confirm `migrate deploy` applied them.
4. **Photo CDN + lazy images** — CloudFront + Next `<Image>`.
5. **Sticky sessions for WebSockets** — the ALB/target group must enable **session stickiness** so a socket stays on one API instance; the Redis adapter handles cross-instance fan-out (fixes **L2**).

### Load test before calling it done
```bash
cd dating-api/docs/sprints/sprint-19-performance-and-photo-moderation
BASE_URL=https://dev.your-domain.tld \
SESSION_COOKIE='dating_session=...' \
VUS=25 DURATION=2m \
k6 run load-test-matches.js     # p95 threshold < 2000ms
```

**Scaling guidance for `dev`:** 1–2 API instances, 1 UI instance. Scale API horizontally behind an ALB with stickiness; Redis makes multi-instance safe.

---

## 9. Backend & frontend deploy steps

### 9.1 Build artifacts
```bash
# API
cd dating-api
npm ci
npm run build                 # nest build → dist/
# UI
cd ../dating-ui
npm ci
npm run build                 # next build (bakes NEXT_PUBLIC_* — set them first!)
```

### 9.2 Run (per instance)
```bash
# API  (migrations already applied in the one-shot step from §4.3)
cd dating-api && npm run start:prod       # node dist/src/main.js, binds 0.0.0.0:3001

# UI
cd dating-ui && npm run start             # next start, :3000
```

### 9.3 Recommended deploy order
1. `prisma migrate deploy` (one-shot).
2. Roll out **API** first; wait for `GET /health` = 200.
3. Roll out **UI**; wait for `/` = 200.
4. Run smoke tests (§9.4). Roll back if red.

### 9.4 Smoke tests
```bash
# API liveness
curl -fsS https://dev.your-domain.tld/health
# → {"ok":true,"service":"dating-api",...}

# Realtime/adapter snapshot (confirms Redis socket adapter in cloud — L2)
curl -fsS https://dev.your-domain.tld/health/realtime

# UI serves and proxies API
curl -fsS https://dev.your-domain.tld/ | head
```
There's also `dating-ui/smoke-test.sh` and `dating-ui/DEPLOYMENT_SMOKE_TEST.md` for a fuller UI walkthrough.

---

## 10. Users, auth, sessions & CORS

This is the #1 source of "works locally, 401s in cloud" (fixes **L4, L8, L10**).

- **Google Sign-In:** add the cloud UI origin (e.g. `https://dev.your-domain.tld`) to the Google OAuth client's **Authorized JavaScript origins**. `GOOGLE_CLIENT_ID` (API) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (UI) **must match**.
- **Cookies over HTTPS:**
  - `COOKIE_SECURE=true` (required once you're on HTTPS).
  - `COOKIE_DOMAIN` — set to the shared parent (e.g. `.your-domain.tld`) **only if** UI and API are on subdomains of the same registrable domain. If they're unrelated hosts, leave it unset and use same-origin proxying.
- **CORS:** `CORS_ORIGIN=https://dev.your-domain.tld` (exact origin, comma-separated for multiple) and `CORS_CREDENTIALS=true` so the session cookie is sent cross-origin.
- **Same-origin is simplest:** put UI and API behind one origin; UI proxies `/api/*` and `/socket.io` to the API (`API_PROXY_TARGET`). Then cookies are first-party and CORS is a non-issue.
- **Admin surface:** `/api/v1/admin/*` is gated by `ADMIN_USER_IDS`; the UI `/admin` routes require `NEXT_PUBLIC_ADMIN_ENABLED=1` in the prod build. Additionally restrict admin at the WAF/VPN layer (see `dating-api/docs/ops/ADMIN_ACCESS.md`).

---

## 11. Observability & health

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness (use for ALB health check target). |
| `GET /health/realtime` | Messaging/socket adapter snapshot — verify Redis adapter connected. |
| `GET /health/sentry-test` | Only if `ENABLE_SENTRY_TEST=1`; throws a test error. |

- **ALB health check** → `/health`, healthy threshold 200. (Note: `/health` is **not** under `/api`.)
- **Logs:** set `STRUCTURED_LOG_FILE=0` and rely on stdout → CloudWatch (fixes **L7**). The file sink is best-effort and will be skipped on read-only/ephemeral FS anyway.
- **Sentry:** set `SENTRY_DSN` + `SENTRY_ENVIRONMENT=dev`; UI uses `NEXT_PUBLIC_SENTRY_DSN`.
- **APM (optional):** Datadog via `DD_*` (requires `npm i dd-trace` added to the API image).
- **Health is liveness-only** — it does **not** check DB/Redis depth. Add synthetic checks (a login + fetch-matches canary) for real confidence in `dev`.

---

## 12. Rollback & common failure triage

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| API crash-loops on boot | Missing `OPENAI_API_KEY` (L5) or bad `DATABASE_URL` | Confirm secrets injected; check `sslmode=require`. |
| Login then instant 401 | Cookie flags / CORS (L4/L8) | `COOKIE_SECURE=true`, correct `COOKIE_DOMAIN`, `CORS_ORIGIN`, `CORS_CREDENTIALS=true`. |
| Photos 403 / disappear after restart | Still on local disk driver (L1) | `PHOTO_STORAGE_DRIVER=s3` + bucket/IAM. |
| Chat drops/dupes across tabs | No Redis adapter / no stickiness (L2) | Set `REDIS_URL`; enable ALB stickiness. |
| Profile analysis never completes | Redis unreachable / no API instance (L3) | Verify `REDIS_URL`, `/health/realtime`, ≥1 API up. |
| Migrations race / partial | Ran per-instance (L6) | Move `migrate deploy` to one-shot pre-deploy step. |
| `NEXT_PUBLIC_*` change had no effect | Baked at build | Rebuild UI, not just restart. |
| Slow match list | No cache/pagination (L9) | Confirm Redis + cursor pagination + indexes applied. |

**Rollback:** deploy the previous known-good API/UI artifact. **Do not** auto-rollback the DB — Prisma migrations are forward-only here; a schema rollback needs a hand-written down-migration and a maintenance window.

---

## 13. Appendix — service ↔ env var quick map

| Service | API env vars |
|---------|--------------|
| Postgres (RDS) | `DATABASE_URL` |
| Redis (ElastiCache) | `REDIS_URL` |
| S3 photos | `PHOTO_STORAGE_DRIVER=s3`, `PHOTO_S3_BUCKET`, `PHOTO_S3_REGION`, `PHOTO_S3_PREFIX` |
| Rekognition | `PHOTO_MODERATION_DRIVER=rekognition`, `PHOTO_FACE_DETECTION_ENABLED`, `NSFW_FLAG_THRESHOLD`, `NSFW_AUTO_REJECT_THRESHOLD` |
| CloudFront CDN | `PHOTO_CDN_ENABLED`, `PHOTO_CDN_DOMAIN`, `PHOTO_CDN_KEY_PAIR_ID`, `PHOTO_CDN_PRIVATE_KEY`, `PHOTO_CDN_URL_TTL_SECONDS` |
| OpenAI | `OPENAI_API_KEY` (+ optional `OPENAI_BASE_URL`, `LLM_MODELS`) |
| Auth | `GOOGLE_CLIENT_ID`, `SESSION_SECRET_PEPPER`, `SESSION_COOKIE_NAME`, `SESSION_TTL_DAYS`, `COOKIE_SECURE`, `COOKIE_DOMAIN` |
| CORS | `CORS_ORIGIN`, `CORS_CREDENTIALS` |
| Email (Resend) | `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_PUBLIC_URL`, `EMAIL_UNSUBSCRIBE_SECRET` |
| Logging | `STRUCTURED_LOG_FILE` (=0 in cloud) |
| Sentry | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` |
| Datadog | `DD_TRACE_ENABLED`, `DD_API_KEY`, `DD_ENV`, `DD_SERVICE` |
| Admin | `ADMIN_USER_IDS` |

| Service | UI env vars |
|---------|-------------|
| Auth | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (matches API) |
| API routing | `API_PROXY_TARGET` / `INTERNAL_API_URL` (same-origin) **or** `NEXT_PUBLIC_API_URL` (split) |
| Realtime | `NEXT_PUBLIC_REALTIME=ws` |
| Admin | `NEXT_PUBLIC_ADMIN_ENABLED` |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT` |

---

### Related in-repo docs
- `DEV.md` — local dev bring-up.
- `infra/docker-compose.yml` — local Postgres (host port 5433).
- `infra/env/DEV_CONFIG_MANIFEST.md` — secret vs config inventory + cloud defaults (Story 03).
- `infra/terraform/modules/secrets/` — SSM / Secrets Manager / ECS injection Terraform.
- `dating-api/docs/EMAIL_RESEND_SETUP.md` — email domain verification.
- `dating-api/docs/ops/ADMIN_ACCESS.md` — admin lockdown.
- `dating-api/docs/sprints/sprint-19-performance-and-photo-moderation/` — perf + moderation design + `load-test-matches.js`.
- `dating-ui/DEPLOYMENT_SMOKE_TEST.md` — UI smoke walkthrough.
