# Sprint 29 — Frontend Realtime + Cache

**Status:** 🟡 **IN PROGRESS** — Stories 1–4 Done; Story 5 CR PASS → Agent 3 PM  
**Depends on:** Sprint 28 Done (backend hardening). **Does not** require live AWS.  
**Companion:** [`SCALE_READINESS_CR.md`](../../SCALE_READINESS_CR.md) · [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md) · [`QUICKSTART.md`](./QUICKSTART.md) · prior: [Sprint 28](../sprint-28-backend-scale-hardening/README.md)

**Parked:** [Sprint 20 live apply](../sprint-20-aws-dev-deployment/README.md) (prep complete; deploy deferred).

---

## Goal

Cut FE chatter that still hurts after Sprint 28:

1. Default WebSocket realtime (stop 3s message polling in normal product paths)
2. Paginate conversations + lightweight unread-total
3. Introduce TanStack Query for shared cache / dedupe
4. Enable real `next/image` optimization
5. Lazy-load admin + heavy UI chunks

**Non-goals:** Match materialization (Sprint 30), Redis session cache, PgBouncer, worker extract, AWS live apply.

---

## Stories

| # | Story | Status |
|---|-------|--------|
| 01 | [WS realtime default](./STORY_01_ws_realtime_default.md) | **Done** |
| 02 | [Conversations cursor + unread-total](./STORY_02_conversations_pagination.md) | **Done** |
| 03 | [TanStack Query cache](./STORY_03_tanstack_query.md) | **Done** |
| 04 | [next/image optimization](./STORY_04_next_image.md) | **Done** |
| 05 | [Lazy-load admin / heavy UI](./STORY_05_lazy_admin_ui.md) | CR PASS → Agent 3 |

**Order:** 01 → 02 → 03 → 04 → 05 (4 agents each: `--agent 0..3 sprint 29 story N`).  
Prefer **01 before 03** (realtime mode affects what Query should refetch). **02 API** can run in parallel with 01 after Architect locks, but default sequential for review simplicity.

---

## Acceptance (sprint-level)

- Product conversation thread does not 3s-poll messages when WS is available / defaulted on
- Conversations list is cursor-paginated; badge can use unread-total without full inbox
- Shared client cache (TanStack) for at least conversations / auth-adjacent hot paths Architect locks
- Profile/match images use optimized `next/image` where Architect scopes
- Admin (or other heavy) routes code-split via dynamic import

---

## Roadmap after this sprint

| Next | Focus |
|------|--------|
| **30** | Match materialization (async precomputed ranks) |
| **Infra** | Sprint 20 live apply when deploy hold lifts |
| Stretch | Redis session cache; worker extract |
