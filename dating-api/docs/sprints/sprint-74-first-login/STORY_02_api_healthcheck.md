# Story 2: API health check must not use wget

**Status:** Done  
**Shipped on main:** `9d2090f`  
**Feature tip ahead of main:** 0  
**Depends on:** none

## Why

On 2026-09-22, `dating-dev-api` kept replacing tasks. ECS runs `wget` against `http://127.0.0.1:3001/health`. The image is `node:22-slim` and does not include `wget`. Tasks stop with “Task failed container health checks” (exit 137). The public site can still return 200 between kills.

## What

**As a** person using findyouraidate.com  
**I want** the API task to stay up  
**So that** the site does not drop while ECS restarts it

### Acceptance criteria

- [x] ECS health check for `dating-dev-api` uses Node `fetch` of `http://127.0.0.1:3001/health`, the same check as `dating-api/Dockerfile`
- [x] A new task definition is registered and `dating-dev-api` is rolled (`dating-dev-api:7`)
- [x] A task stays running. Stopped reason is not “Task failed container health checks”
- [x] `https://findyouraidate.com/health` stays 200 across several minutes
- [x] Deployment `failedTasks` stops climbing (0 on revision 7)

### Out of scope

- UI image
- Adding `wget` to the image
- Socket origin (Story 7)

## Definition of done

- [x] `infra/terraform/modules/ecs/main.tf` health check command matches the Dockerfile
- [x] Live service is on that task definition and steady at 1/1
- [x] `/health` and `/health/ready` return 200 after the new task has been up for several minutes
