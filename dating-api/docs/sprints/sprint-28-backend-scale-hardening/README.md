# Sprint 28 — Backend Scale Hardening

**Status:** 🟡 **IN PROGRESS** — Stories 1–5 Done; Story 6 Architect locked → next Agent 1 
**Depends on:** Sprint 27 Done (match-list stopgap). **Does not** require live AWS.  
**Companion:** [`SCALE_READINESS_CR.md`](../../SCALE_READINESS_CR.md) · [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md) · [`QUICKSTART.md`](./QUICKSTART.md) · [`PRISMA_CONNECTION_POOL.md`](../../ops/PRISMA_CONNECTION_POOL.md) · [`PUBLIC_HTTP_ALLOWLIST.md`](../../ops/PUBLIC_HTTP_ALLOWLIST.md) · [`INDEX_MIGRATIONS.md`](../../ops/INDEX_MIGRATIONS.md)

**Parked:** [Sprint 20 live apply](../sprint-20-aws-dev-deployment/README.md) (prep complete; deploy deferred).

---

## Goal

Cut abuse risk and DB chatter that still hurts after Sprint 27 — without waiting on cloud:

1. Tune Prisma connection pool (document + env)
2. Lock / gate expensive unauthenticated endpoints
3. Add missing indexes for hot paths
4. Batch conversation unread counts
5. Move HTTP message rate limit to Redis
6. Throttle `lastSeenAt` writes on the auth path

**Non-goals:** PgBouncer, worker extract, match materialization, FE WS default, conversation pagination DTO (Sprint 29+).

---

## Stories

| # | Story | Status |
|---|-------|--------|
| 01 | [Prisma pool + timeouts](./STORY_01_prisma_pool_config.md) | **Done** |
| 02 | [Lock expensive endpoints](./STORY_02_lock_expensive_endpoints.md) | **Done** |
| 03 | [Missing indexes](./STORY_03_missing_indexes.md) | **Done** |
| 04 | [Batch unread counts](./STORY_04_batch_unread_counts.md) | **Done** |
| 05 | [Message RL → Redis](./STORY_05_message_rate_limit_redis.md) | **Done** |
| 06 | [Throttle lastSeenAt](./STORY_06_throttle_last_seen.md) | In progress (Architect) |

**Order:** 01 → 02 → 03 → 04 → 05 → 06 (4 agents each: `--agent 0..3 sprint 28 story N`).  
Stories are mostly independent after 01; prefer sequential to keep review simple.

---

## Roadmap after this sprint

| Next | Focus |
|------|--------|
| **29** | Traffic / FE: WS default, conversations cursor + unread-total, TanStack Query start |
| **30** | Match materialization (async precomputed ranks) |
| **Infra** | Sprint 20 live apply when deploy hold lifts |
