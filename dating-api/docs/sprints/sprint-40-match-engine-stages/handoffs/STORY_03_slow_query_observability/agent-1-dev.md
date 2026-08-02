# Handoff: Agent 1 — Dev — Story 3

**Agent:** 1 implement  
**Story:** [STORY_03_slow_query_observability.md](../../STORY_03_slow_query_observability.md)  
**Sprint:** sprint-40-match-engine-stages  
**Date:** 2026-08-02  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Prisma slow-query reporting via `$on('query')` when enabled. Pure helpers in `prisma-slow-query.ts`; `PrismaService` emits structured logs + `db.prisma.query_ms`. Jest/`NODE_ENV=test` skips query events unless `PRISMA_SLOW_QUERY_FORCE`. If `VERY_SLOW < SLOW`, very-slow is clamped to slow.

---

## Files

| Path | Change |
|------|--------|
| `src/prisma/prisma-slow-query.ts` | Thresholds, enablement, fingerprint, payload |
| `src/prisma/prisma-slow-query.spec.ts` | Unit coverage |
| `src/prisma/prisma.service.ts` | Query events + obs emit (fail-open) |
| `src/prisma/prisma.module.ts` | Import `StructuredLoggingModule` |
| `src/logging/error-codes.ts` | `PRISMA_SLOW_QUERY`, `PRISMA_VERY_SLOW_QUERY` |
| `src/observability/custom-metrics.ts` | `recordPrismaSlowQueryMs` → `db.prisma.query_ms` |
| `docs/ops/PRISMA_SLOW_QUERY.md` | Ops note |
| `.env.example` | Env comment block |

---

## Notes

- Params never in production; non-prod only with `PRISMA_SLOW_QUERY_INCLUDE_PARAMS`.
- Listener registered in constructor after `super` when reporting enabled.

---

## Tests

```bash
npx jest src/prisma/prisma-slow-query.spec.ts --runInBand
npm run typecheck
```

---

## Commit

Not committed (Agent 3). Suggested:

```
observability(db): log slow Prisma queries

Sprint 40 Story 3
```

---

## Next command

```text
--agent 2 sprint 40 story 3
```
