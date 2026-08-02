# Story 03 — Prisma slow-query observability

**Sprint 40 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 1 day  
**Dependencies:** None  
**Repo:** `dating-api` only  
**Handoffs:** [agent-0-architect.md](./handoffs/STORY_03_slow_query_observability/agent-0-architect.md) · [agent-1-dev.md](./handoffs/STORY_03_slow_query_observability/agent-1-dev.md) · [agent-2-cr.md](./handoffs/STORY_03_slow_query_observability/agent-2-cr.md) · [agent-3-pm.md](./handoffs/STORY_03_slow_query_observability/agent-3-pm.md)

---

## Objective

Log slow Prisma queries (e.g. >100ms) via structured observability; escalate very slow (>1s) without dumping secrets/PII params in production carelessly.

## Why

Scale audit called for query duration visibility; today custom metrics cover match-list phases but not general Prisma query latency.

## Locked policy (Architect)

| Item | Decision |
|------|----------|
| Hook | `$on('query')` with `log: [{ emit: 'event', level: 'query' }]` — **not** `$use` middleware |
| Slow / escalate | `PRISMA_SLOW_QUERY_MS=100` / `PRISMA_VERY_SLOW_QUERY_MS=1000` |
| Test / CI | Disabled when `NODE_ENV=test` unless `PRISMA_SLOW_QUERY_FORCE` |
| Redaction | Fingerprint from `e.query` only; **never** params in production |
| Emit | `PRISMA_SLOW_QUERY` (`trace`) / `PRISMA_VERY_SLOW_QUERY` (`error`); metric `db.prisma.query_ms` |
| Helpers | `src/prisma/prisma-slow-query.ts` (pure + unit-tested) |

## Scope / tasks

1. Hook Prisma query events in `PrismaService` (or middleware) — Architect locks thresholds + redaction.
2. Emit via `StructuredObservabilityService` / existing ErrorCodes if appropriate.
3. Guard noise in tests (disable or raise threshold under Jest).
4. Document env overrides for thresholds if any.

## Out of scope

- Full APM vendor setup beyond existing Sentry/APM
- Automatic index migrations

## Acceptance criteria

- [x] Slow queries emit structured signal with duration + safe query fingerprint
- [x] Test env does not spam CI
- [x] No functional behavior change for happy-path queries
- [x] Redaction policy locked by Architect

## Suggested commit

```
observability(db): log slow Prisma queries

Sprint 40 Story 3
```
