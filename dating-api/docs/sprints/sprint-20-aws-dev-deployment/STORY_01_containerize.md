# Story 01 — Containerize the apps

**Sprint 20 · Status: ✅ Done** (retro 4-agent CR; landed on `main`, Agent 2 PASS)

**Handoffs:** [architect](./handoffs/STORY_01_containerize/agent-0-architect.md) · [dev](./handoffs/STORY_01_containerize/agent-1-dev.md) · [CR](./handoffs/STORY_01_containerize/agent-2-cr.md) · [PM](./handoffs/STORY_01_containerize/agent-3-pm.md)

## Objective
Produce production-grade container images for `dating-api` and `dating-ui`, and extend local compose with Redis so local == cloud. No AWS yet — this story is fully validatable on a laptop.

## Why
The repo has **no Dockerfile** today and local compose runs Postgres only. ECS needs images; local dev needs Redis to exercise the queue/cache/socket paths that only activate when `REDIS_URL` is set (prevents the L2/L3 "works locally" blind spots).

## Scope / tasks
1. **`dating-api/Dockerfile`** — multi-stage:
   - Base Node 20–22 (match `@types/node ^22`).
   - `npm ci` → `npx prisma generate` → `npm run build`.
   - Runtime stage copies `dist/`, `node_modules` (prod), `prisma/`. Runs `node dist/main.js` (Nest flattens `src/` → `dist/main.js`).
   - Non-root user; `EXPOSE 3001`; `HEALTHCHECK` hitting `/health`.
   - Include Prisma engine binaries for the container's libc (Debian slim vs Alpine — pick slim to avoid OpenSSL/musl issues).
2. **`dating-ui/Dockerfile`** — multi-stage Next.js 16:
   - Build with `NEXT_PUBLIC_*` build args (they bake at build time — document this).
   - Use Next `standalone` output; runtime runs `node server.js` (or `next start`).
   - Non-root; `EXPOSE 3000`.
3. **`.dockerignore`** for both (`node_modules`, `dist`, `.next`, `uploads`, `logs`, `.env*`).
4. **Extend `infra/docker-compose.yml`** — add a `redis:7` service; add optional `api`/`ui` services building from the Dockerfiles; wire `REDIS_URL`, `DATABASE_URL` to the compose network.
5. **Migration entrypoint** — a small script/target that runs `npx prisma migrate deploy` (used by the one-shot task in Story 04), kept separate from the app start command.

## Acceptance criteria
- [x] `docker build` succeeds for both images with no source changes required. *(Agent 1 verified)*
- [x] `docker compose up` brings up Postgres + Redis; API + UI via `--profile apps`. *(Postgres+Redis healthy; API needs host `OPENAI_API_KEY` — wired in compose)*
- [ ] Uploading a photo with `PHOTO_STORAGE_DRIVER=local` still works in-container (volume), and switching to `s3` env vars is a no-code change. *(soft / optional — volume wired; full e2e deferred)*
- [ ] Profile submit returns 202 and analysis completes via the **queued** (not inline) path, proving Redis/Bull works in-container. *(soft / optional — needs key + e2e)*
- [x] Images run as non-root and pass their `HEALTHCHECK`. *(API HEALTHCHECK; UI non-root, no HC by design)*
- [x] Image sizes are reasonable (multi-stage, prod deps only).

## Notes / gotchas
- Prisma + Alpine is a common footgun (OpenSSL). Prefer `node:22-slim`.
- Next.js `standalone` needs `output: 'standalone'` in `next.config.ts`; confirm it doesn't break the existing `/api` + `/socket.io` rewrites.
- Do **not** copy `.env`, `uploads/`, or `logs/` into images.
- `STRUCTURED_LOG_FILE=0` in the image default so logs go to stdout.

## Deliverables
`dating-api/Dockerfile`, `dating-ui/Dockerfile`, two `.dockerignore` files, updated `infra/docker-compose.yml`, migration entrypoint script.
