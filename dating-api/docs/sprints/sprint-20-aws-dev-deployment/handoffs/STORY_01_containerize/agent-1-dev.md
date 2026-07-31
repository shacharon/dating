# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_containerize.md](../../STORY_01_containerize.md)  
**Sprint:** sprint-20-aws-dev-deployment  
**Date:** 2026-07-31  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Verified landed containerization against architect lock. Both images build; API image runs as uid 1000 with `dist/main.js` present. Compose Postgres + Redis healthy. Compose `api` was crash-looping on missing `OPENAI_API_KEY` — wired `${OPENAI_API_KEY}` into compose (gap close). Corrected story doc CMD path to `dist/main.js`.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| `node:22-slim` API + UI | Pass |
| CMD `dist/main.js` (not `dist/src/main.js`) | Pass |
| `USER node`, HEALTHCHECK `/health` | Pass |
| `STRUCTURED_LOG_FILE=0` in API image | Pass |
| Migrate script separate from CMD | Pass |
| UI `output: 'standalone'` + build-args | Pass |
| `.dockerignore` excludes `.env*` / uploads / logs (API) | Pass |
| Compose redis host **6380**, in-net `redis:6379` | Pass |
| Prisma `debian-openssl-3.0.x` binaryTarget | Pass |
| No Alpine | Pass |

---

## Verification ran

| Check | Result |
|-------|--------|
| `docker build -t dating-api:local ./dating-api` | **OK** |
| `docker build -t dating-ui:local ./dating-ui` | **OK** |
| `docker run --rm --user node dating-api:local` → uid 1000, `dist/main.js` exists | **OK** |
| `docker compose … ps` postgres + redis | **healthy** |
| Compose `api` health / Redis adapter | **Blocked** until host exports `OPENAI_API_KEY` then recreate api |
| Queued analysis / photo e2e | Soft skip (architect); needs key + apps profile |

---

## Changes made this agent

1. `infra/docker-compose.yml` — pass `OPENAI_API_KEY: ${OPENAI_API_KEY:-}` into `api` (documents L5 boot blocker for local compose).
2. `STORY_01_containerize.md` — CMD path text → `dist/main.js`.

No Dockerfile rewrites (lock satisfied).

---

## Residual gaps / human follow-ups

1. Recreate API with key:  
   `$env:OPENAI_API_KEY='…'; docker compose -f infra/docker-compose.yml --profile apps up -d`  
   Then `GET /health` + `/health/realtime` (`redisAdapter: true`).
2. Full photo/queue e2e still soft — Story 05 / optional later.
3. UI image has no HEALTHCHECK (architect did not require one) — OK.

---

## Commit

Will commit Agent 1 fixes with Sprint 20 Story 1 Agent 1 message.

---

## Agent 2 note

CR should re-check compose OPENAI wiring (no secret values in git) and story CMD text fix.
