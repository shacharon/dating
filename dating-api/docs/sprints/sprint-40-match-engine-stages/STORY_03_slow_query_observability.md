# Story 03 — Prisma slow-query observability

**Sprint 40 · Status: Planned**  
**Priority:** P1  
**Estimated effort:** 1 day  
**Dependencies:** None  
**Repo:** `dating-api` only

---

## Objective

Log slow Prisma queries (e.g. >100ms) via structured observability; escalate very slow (>1s) without dumping secrets/PII params in production carelessly.

## Why

Scale audit called for query duration visibility; today custom metrics cover match-list phases but not general Prisma query latency.

## Scope / tasks

1. Hook Prisma query events in `PrismaService` (or middleware) — Architect locks thresholds + redaction.
2. Emit via `StructuredObservabilityService` / existing ErrorCodes if appropriate.
3. Guard noise in tests (disable or raise threshold under Jest).
4. Document env overrides for thresholds if any.

## Out of scope

- Full APM vendor setup beyond existing Sentry/APM
- Automatic index migrations

## Acceptance criteria

- [ ] Slow queries emit structured signal with duration + safe query fingerprint
- [ ] Test env does not spam CI
- [ ] No functional behavior change for happy-path queries
- [ ] Redaction policy locked by Architect

## Suggested commit

```
observability(db): log slow Prisma queries

Sprint 40 Story 3
```
