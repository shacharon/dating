# Prisma slow-query observability (ops)

**Sprint 40 Story 3** — log / metric Prisma SQL that exceeds duration thresholds.  
**Not in scope:** Prisma `$metrics` preview, OpenTelemetry productization, automatic index migrations.

---

## Defaults

| Signal | Threshold | Channel |
|--------|-----------|---------|
| Slow | ≥ **100** ms | Structured `trace` + `ErrorCodes.PRISMA_SLOW_QUERY`; metric `db.prisma.query_ms` tag `severity:slow` |
| Very slow | ≥ **1000** ms | Structured `error` (no stack) + `PRISMA_VERY_SLOW_QUERY`; same metric with `severity:very_slow` |

Only queries at or above the slow threshold emit. A query that meets both thresholds is emitted **once** as very slow.

---

## Env overrides

| Variable | Default | Meaning |
|----------|---------|---------|
| `PRISMA_SLOW_QUERY_MS` | `100` | Slow threshold (ms). Unset / non-finite / `< 1` → default |
| `PRISMA_VERY_SLOW_QUERY_MS` | `1000` | Escalate threshold. If set below slow, clamped up to slow |
| `PRISMA_SLOW_QUERY_DISABLED` | unset | `1` / `true` / `yes` / `on` → no query events / no emits |
| `PRISMA_SLOW_QUERY_FORCE` | unset | Truthy → enable even when `NODE_ENV=test` |
| `PRISMA_SLOW_QUERY_INCLUDE_PARAMS` | unset | Truthy **and** non-production → include truncated `params` in log payload |

---

## Redaction

- Fingerprint from Prisma `query` text only (placeholders `$1…`); whitespace collapsed; max **512** chars.
- **Never** log bind `params` in production.
- Non-prod params only with `PRISMA_SLOW_QUERY_INCLUDE_PARAMS` (truncated to 256 chars) — treat as sensitive.

---

## Test / CI

`NODE_ENV=test` disables query-event registration unless `PRISMA_SLOW_QUERY_FORCE` is set, so Jest does not spam or pay query-log overhead.

---

## Hook

`PrismaService` uses `log: [{ emit: 'event', level: 'query' }]` + `$on('query')` when reporting is enabled. Not Prisma `$use` middleware.
