# Story 02 — Lock expensive endpoints

**Sprint 28 · Status: PLANNED**  
**Priority:** P0  
**Estimated effort:** 0.5–1 day  
**Dependencies:** Prefer after Story 01 (independent OK)

---

## Objective

Stop unauthenticated callers from burning LLM quota, CPU, and DB via legacy / internal endpoints.

## Why

Scale CR P0: open `POST /api/evaluate/*`, `POST /api/v1/matches/rebuild`, and open profile evaluate/CRUD paths.

## Scope / tasks

1. Inventory current controllers: `evaluate`, `matches` rebuild, `profiles` evaluate/CRUD, any other open expensive routes.
2. Architect locks: **401/403 guard**, admin-only, or **remove/disable** in non-dev — align with [`docs/ops/ADMIN_ACCESS.md`](../../ops/ADMIN_ACCESS.md).
3. Keep health checks and intentional public auth routes open.
4. Specs: unauthenticated → rejected; authorized path still works where required.
5. Agent 4 only if Architect requires HTTP integration.

## Acceptance criteria

- [ ] Expensive evaluate / rebuild / open profile mutation paths are not anonymously callable in production config
- [ ] Documented allow-list of remaining public routes
- [ ] Tests cover reject path
- [ ] Product `/api/v1/me/*` auth flows unchanged

## Commit message

```
fix(api): lock unauthenticated expensive evaluate and rebuild routes

Sprint 28 Story 2
```
