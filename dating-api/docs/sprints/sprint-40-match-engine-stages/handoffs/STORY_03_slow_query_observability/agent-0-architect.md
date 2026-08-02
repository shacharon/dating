# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_slow_query_observability.md](../../STORY_03_slow_query_observability.md)  
**Sprint:** sprint-40-match-engine-stages  
**Date:** 2026-08-02  
**Status:** complete  

**Mode:** Observability only — log / metric slow Prisma SQL; **no** query path or pool behavior change. Skip Agent 4.

---

## Summary

Enable Prisma **query events** on `PrismaService`, filter by duration thresholds, emit a **structured log** (safe fingerprint, **no params** by default) plus a **custom metric**. Disable the hook in Jest/`NODE_ENV=test` so CI stays quiet. Do **not** use Prisma `$use` middleware (same Nest/deprecation friction called out in Sprint 39 Story 4).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Client | `PrismaService` extends `PrismaClient` 6.19.2; today: `super({ datasourceUrl })` only |
| Obs stack | `StructuredObservabilityService` (`trace` / `error` / `fatal`); `custom-metrics.ts` JSON + optional dogstatsd |
| Error codes | Stable strings in `error-codes.ts` — add new Prisma slow-query codes |
| Pool story | Sprint 39 already has `db.prisma.pool_timeout` / `pool_config_missing` — **do not** conflate |
| Profiles stub | `ProfilesPrismaService` is not a live PrismaClient — **out of scope** |
| Nest | `PrismaModule` + `StructuredLoggingModule` both `@Global()`; logging does **not** import Prisma → safe to inject obs into Prisma |

---

## Decisions (do not reverse without discussion)

### 1. Hook mechanism (locked) — `$on('query')`, not middleware

| Choice | Lock |
|--------|------|
| Prisma `$use` / client middleware | **No** |
| `log: [{ emit: 'event', level: 'query' }]` + `$on('query', …)` | **Yes** |
| When to enable log events | Only when slow-query reporting is **enabled** (see §4) — avoid paying query-event overhead in test |

Wire in `PrismaService` constructor (after `super`) or `onModuleInit` before/after `$connect` — Agent 1 pick; prefer **constructor after `super`** so the listener is ready before any query.

TypeScript: pass the `log` array into `super({ datasourceUrl, log })` so `$on('query')` is typed. If Nest subclass typing fights, cast narrowly — do not drop `datasourceUrl`.

### 2. Thresholds + env (locked)

| Env | Default | Meaning |
|-----|---------|---------|
| `PRISMA_SLOW_QUERY_MS` | **100** | Emit “slow” when `duration >=` this (ms) |
| `PRISMA_VERY_SLOW_QUERY_MS` | **1000** | Escalate “very_slow” when `duration >=` this |
| `PRISMA_SLOW_QUERY_DISABLED` | unset | Truthy (`1` / `true` / `yes` / `on`) → **no** query events / no emits |
| `PRISMA_SLOW_QUERY_FORCE` | unset | Truthy → enable even when `NODE_ENV=test` (unit/integration of the listener only) |
| `PRISMA_SLOW_QUERY_INCLUDE_PARAMS` | unset | Truthy **and** `NODE_ENV !== 'production'` → allow truncated params in log payload; **never** in production |

Parse like `resolveMatchListRebuildBudgetMs`: unset / non-finite / `< 1` → defaults. If `VERY_SLOW < SLOW`, clamp `VERY_SLOW = SLOW` (document in Agent 1).

Helpers live in a small pure module, e.g. `src/prisma/prisma-slow-query.ts` (constants + resolve + fingerprint + `shouldReport`).

### 3. Redaction / fingerprint (locked)

| Rule | Lock |
|------|------|
| Emit `params` | **Never** in production. Non-prod only if `PRISMA_SLOW_QUERY_INCLUDE_PARAMS` truthy; then truncate (e.g. **256** chars) and still treat as sensitive |
| Fingerprint source | `e.query` only (Prisma already uses `$1…` placeholders) |
| Normalize | Collapse whitespace → single spaces; trim |
| Truncate | Cap fingerprint at **512** chars (append `…` if cut) |
| Never log | `DATABASE_URL`, passwords, full unbound SQL dumps beyond fingerprint |
| Payload fields | `durationMs`, `severity` (`slow` \| `very_slow`), `query` (fingerprint), optional `target` from event |

### 4. When reporting is enabled (locked)

| Environment | Default |
|-------------|---------|
| `NODE_ENV=test` | **Disabled** unless `PRISMA_SLOW_QUERY_FORCE` |
| `PRISMA_SLOW_QUERY_DISABLED` truthy | **Disabled** |
| Otherwise (`development` / `production` / unset) | **Enabled** |

Disabled ⇒ do **not** pass `log: query/event` (keep client as today aside from existing options).

### 5. Emit channels (locked)

For each query event with `duration >= PRISMA_SLOW_QUERY_MS`:

1. **Custom metric** — `recordPrismaSlowQueryMs(ms, severity)` → `db.prisma.query_ms` with tag `severity:slow` or `severity:very_slow`.  
   - Do **not** emit a metric for every query — only slow+.
2. **Structured log** via `StructuredObservabilityService`:  
   - `severity === 'slow'` → `obs.trace(JSON.stringify(payload), ErrorCodes.PRISMA_SLOW_QUERY)`  
   - `severity === 'very_slow'` → `obs.error(JSON.stringify(payload), ErrorCodes.PRISMA_VERY_SLOW_QUERY, undefined, { includeStack: false })`  
   - If both thresholds met, emit **once** as `very_slow` only (not both).

Add ErrorCodes:

```ts
PRISMA_SLOW_QUERY: 'PRISMA_SLOW_QUERY',
PRISMA_VERY_SLOW_QUERY: 'PRISMA_VERY_SLOW_QUERY',
```

Inject `StructuredObservabilityService` into `PrismaService`. Import `StructuredLoggingModule` from `PrismaModule` if needed for clarity (both global — still OK).

Listener must be fail-open: try/catch around emit; never throw into Prisma engine path.

### 6. Docs (locked)

| Path | Change |
|------|--------|
| `dating-api/.env.example` | Comment block for the four env vars + defaults |
| `dating-api/docs/ops/PRISMA_CONNECTION_POOL.md` **or** short `docs/ops/PRISMA_SLOW_QUERY.md` | ½–1 page: thresholds, redaction, test disable — Agent 1 pick one (prefer **new** short ops note if pool doc is already long) |

### 7. Tests (locked)

Unit-test pure helpers (no Nest boot required):

1. Threshold resolve defaults / env / clamp.  
2. Fingerprint normalize + truncate.  
3. `shouldReport` / severity selection (`slow` vs `very_slow`; under threshold → none).  
4. Params inclusion gated by env + non-production.  
5. Enabled/disabled matrix (`test`, `DISABLED`, `FORCE`).

Optional thin `PrismaService` spec only if cheap; **do not** require live DB for this story.

```bash
cd dating-api
npx jest src/prisma/prisma-slow-query.spec.ts --runInBand
npm run typecheck
```

### 8. Out of scope

- Prisma `metrics` preview / OpenTelemetry tracing productization  
- Automatic index migrations / EXPLAIN  
- Changing pool params or P2024 handling  
- Logging every query under the slow threshold  
- FE / API contract changes  

### 9. Agent 4

- **Skip.**

---

## Agent 1 instructions

1. Add `prisma-slow-query.ts` (+ spec) per §2–§4.  
2. Wire `PrismaService` query events + obs + `recordPrismaSlowQueryMs`.  
3. Add ErrorCodes + `.env.example` + short ops note.  
4. Confirm Jest suite does not spam (default test disable). Do not commit.

Suggested commit:

```
observability(db): log slow Prisma queries

Sprint 40 Story 3
```

---

## Agent 2 CR checklist

- [ ] `$on('query')` only when enabled; no `$use` middleware  
- [ ] Defaults 100ms / 1000ms; env overrides documented  
- [ ] No params in production; fingerprint truncated  
- [ ] `test` env silent unless FORCE  
- [ ] Metric only for slow+; very_slow escalates to `error` once  
- [ ] Fail-open listener; typecheck + helper specs green  

---

## Next command

```text
--agent 1 sprint 40 story 3
```
