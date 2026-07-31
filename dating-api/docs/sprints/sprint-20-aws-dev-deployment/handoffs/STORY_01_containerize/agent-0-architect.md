# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_containerize.md](../../STORY_01_containerize.md)  
**Sprint:** sprint-20-aws-dev-deployment  
**Date:** 2026-07-31  
**Status:** complete  

**Mode:** Retro lock — implementation already on `main` (`2e8b1da`). Agent 1 verifies parity with this lock and closes gaps only. Do **not** rewrite Dockerfiles unless CR finds a lock violation.

---

## Summary

- Production multi-stage images for **dating-api** and **dating-ui** on **`node:22-slim`** (never Alpine).
- Local compose: **Postgres 16 + Redis 7** always; optional **api/ui/migrate** behind Compose profiles.
- Migrations are a **separate** entrypoint (`scripts/docker-migrate.sh`) — never in API `CMD` (fixes L6 for Story 04).
- `NEXT_PUBLIC_*` + `API_PROXY_TARGET` are **build-time** for UI. **Skip Agent 4** (no live ECS); Agent 1 may smoke `docker build` + compose health if Docker available.

---

## Artifacts (locked paths)

| Path | Role |
|------|------|
| `dating-api/Dockerfile` | Multi-stage Nest + Prisma runtime |
| `dating-api/.dockerignore` | Exclude `node_modules`, `dist`, `uploads`, `logs`, `.env*` |
| `dating-ui/Dockerfile` | Multi-stage Next standalone |
| `dating-ui/.dockerignore` | Same class of excludes |
| `dating-ui/next.config.ts` | `output: 'standalone'` — **keep**; rewrites `/api` + `/socket.io` unchanged |
| `dating-api/scripts/docker-migrate.sh` | One-shot `prisma migrate deploy` |
| `infra/docker-compose.yml` | postgres + redis + profiles `apps` / `migrate` |
| `dating-api/prisma/schema.prisma` | `binaryTargets` includes Debian openssl for slim |

---

## Decisions (do not reverse without discussion)

### 1. Base image

- **`node:22-slim`** for both API and UI.
- **Forbidden:** Alpine (Prisma OpenSSL/musl footgun).

### 2. API runtime command

- Nest emits **`dist/main.js`** (sourceRoot flatten) — **not** `dist/src/main.js`.
- Locked CMD: `["node", "dist/main.js"]`.
- Story text that says `dist/src/main.js` is **wrong**; do not “fix” back to that path.

### 3. API image defaults

```text
NODE_ENV=production
PORT=3001
STRUCTURED_LOG_FILE=0
USER node (uid 1000)
EXPOSE 3001
HEALTHCHECK → GET http://127.0.0.1:$PORT/health
```

- Runtime includes **prod `node_modules` + `prisma` CLI** so migrate script can run from the same image.
- Build stage may use a placeholder `DATABASE_URL` for `prisma generate` only; clear before runner.

### 4. UI image / Next standalone

- `output: 'standalone'` required.
- Runtime: `node server.js` from standalone root; copy `.next/static` + `public`.
- **Build args (bake into client):** all `NEXT_PUBLIC_*` used by the app.
- **Build arg (server rewrites):** `API_PROXY_TARGET` (compose default `http://api:3001`).
- Changing any of the above requires **image rebuild**, not task restart alone (document for Story 04).

### 5. Secrets / env in images

- **Never** copy `.env`, `uploads/`, or `logs/` into the image (`.dockerignore`).
- Compose `api` may use **dev-only** placeholders (`SESSION_SECRET_PEPPER`, mock moderation) for local boot — cloud values come from Story 03.

### 6. Compose topology

| Service | Always / profile | Notes |
|---------|------------------|--------|
| `postgres` | always | Host **5433** → 5432 |
| `redis` | always | Host **6380** → 6379 (avoid local 6379 clash) |
| `migrate` | `migrate` + `apps` | Same API image; entrypoint migrate script |
| `api` | `apps` | `REDIS_URL=redis://redis:6379`, photo volume, depends on migrate success |
| `ui` | `apps` | Depends on `api`; build-arg `API_PROXY_TARGET=http://api:3001` |

- Host npm API against compose Redis: `REDIS_URL=redis://127.0.0.1:6380`.
- In-compose services **must** use `redis://redis:6379` (not host 6380).

### 7. Photos in compose

- Default compose: `PHOTO_STORAGE_DRIVER=local` + named volume `dating_api_uploads`.
- Switching to S3 is **env-only** (Story 03) — no Dockerfile change.

### 8. Migration separation (L6)

- API `CMD` = app only.
- Migrate = `docker-migrate.sh` / compose `migrate` service / Story 04 ECS one-shot.
- **Forbidden:** `prisma migrate deploy` in API container entrypoint on every start.

### 9. Agent 4

- **Skip.** Live ECS/ALB verification is Story 05. Optional local compose e2e (queued analysis, photo upload) is Agent 1 **nice-to-have**, not a separate Agent 4 gate for this story.

---

## Acceptance mapping (what “done” means)

| Criterion | Owner | Bar |
|-----------|--------|-----|
| `docker build` both images | Agent 1 | Exit 0 |
| Compose postgres+redis healthy | Agent 1 | `ps` healthy |
| `--profile apps` health 200 + realtime Redis when using compose API | Agent 1 | Prefer verify; if Docker unavailable, document blocker |
| Non-root + HEALTHCHECK on API | Agent 1/2 | `USER node`; HEALTHCHECK present |
| Migrate not in CMD | Agent 2 | CR checklist |
| No `.env` in image | Agent 2 | `.dockerignore` + Dockerfile review |
| Queued analysis / photo volume e2e | Agent 1 optional | Soft; Story 05 owns cloud proof |

---

## Out of scope (this story)

- AWS / ECR / ECS / Terraform (Stories 02–04)
- SSM/Secrets Manager (Story 03)
- CI workflows (Story 04)
- Changing Nest or Next app business logic beyond `output: 'standalone'`

---

## Agent 1 instructions

1. Diff current tree against this lock (paths above).
2. Fix **only** lock violations or broken builds.
3. Run `docker build` for API + UI if Docker is available; note Redis host port **6380** in any README touch.
4. Do **not** “correct” CMD to `dist/src/main.js`.
5. Write `handoffs/STORY_01_containerize/agent-1-dev.md` with build results + residual gaps.
6. Commit only if you change files; message should reference Sprint 20 Story 1 Agent 1.

---

## Agent 2 instructions

Review vs this lock:

- [ ] `node:22-slim`, non-root, API HEALTHCHECK `/health`
- [ ] CMD `dist/main.js`; migrate script separate
- [ ] UI standalone + documented build-args
- [ ] `.dockerignore` excludes secrets/uploads/logs
- [ ] Compose Redis + profiles; host 6380 documented
- [ ] No Alpine; no migrate-on-start

Write `agent-2-cr.md` with pass/fail + required fixes.

---

## Agent 3 instructions

- Accept if Agent 2 passes (or fixes landed).
- Update `STORY_01_containerize.md` status → **Done** (note: retro CR of landed code).
- Update sprint README story row if present.
- Write `agent-3-pm.md`.

---

## Open risks (explicit)

1. Compose `api` lacks `OPENAI_API_KEY` — analysis e2e may fail until env provided; not a Dockerfile defect.
2. UI `API_PROXY_TARGET` baked at build — wrong arg → broken `/api` proxy until rebuild.
3. Host vs compose Redis ports confuse local npm workflows — keep 6380 comment in compose forever.
