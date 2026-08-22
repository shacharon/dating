# Story 03 — Final Prisma Peel + Thin Adapters

**Sprint:** 64  
**Effort:** 2–3 days  
**Risk:** ⚠️ MEDIUM  
**Status:** Done  
**Branch:** `feature/sprint-64-story-3`  
**Handoffs:** [preflight](./handoffs/story-03-final-prisma-peel/agent--1-preflight.md) · [architect](./handoffs/story-03-final-prisma-peel/agent-0-architect.md) · [dev](./handoffs/story-03-final-prisma-peel/agent-1-dev.md) · [cr](./handoffs/story-03-final-prisma-peel/agent-2-cr.md) · [e2e](./handoffs/story-03-final-prisma-peel/agent-4-e2e.md) · [pm](./handoffs/story-03-final-prisma-peel/agent-3-pm.md)

---

## Objective

Get product Prisma injectors to ≤4 services, thin fat adapters.

---

## Implementation summary

| Peel target | Port | Outcome |
|-------------|------|---------|
| `MatchNarrativeCacheService` | `MATCH_NARRATIVE_CACHE_REPOSITORY` | Peeled → `PrismaMatchNarrativeCacheRepository` |
| `MessagingWsSessionService` | `SESSION_CONNECTION_READ` | Peeled → `PrismaSessionConnectionReadRepository` |
| `AdminMatchQualityService` | — | Accepted (admin-only) |
| `prisma-match.repository.ts` (424 LOC) | ISP ports (S63 S04) | **Accepted** — no split |

**Product direct `PrismaService` injectors:** **0** (infra `{session, users}` only).

**Commits:** `c30aea3` (refactor) · `d569f02` (CR wiring tests)

---

## Success

- [x] Product Prisma injectors ≤ 4 (0 product + 2 infra accepted)
- [x] Narrative cache peeled via dedicated port
- [x] WS session revalidate peeled via `SESSION_CONNECTION_READ`
- [x] Match repo adapter evaluated — accepted at 424 LOC
- [x] Story 03 unit/integration tests green (35 passed); E2E narrative cache paths pass (3/4, same as main)

---

## Pipeline

| Agent | Verdict |
|-------|---------|
| -1 Pre-flight | ready |
| 0 Architect | ready |
| 1 Dev | complete (`c30aea3`) |
| 2 CR | approved (`d569f02`) |
| 4 E2E | pass (no peel regressions) |
| 3 PM | Done |

---

## Deferred (out of scope)

- Pre-existing narrative **list** E2E fail (Sprint 63 S04 harness / `ProfileAnalysisQueueService`) — not introduced by peel.
- Legacy `MatchesService` Prisma — Story 02 scope.
