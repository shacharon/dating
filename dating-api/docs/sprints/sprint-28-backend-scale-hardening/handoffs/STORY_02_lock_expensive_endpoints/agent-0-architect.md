# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_lock_expensive_endpoints.md](../../STORY_02_lock_expensive_endpoints.md)  
**Sprint:** sprint-28-backend-scale-hardening  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Guard legacy/internal HTTP surfaces with existing `AuthGuard` + `AdminGuard`. Skip Agent 4 if Agent 1 ships focused HTTP/unit reject coverage.

---

## Summary

Unauthenticated callers can hit LLM evaluate, match rebuild/compare/list, open profile CRUD, and contradiction detect. Lock those controllers behind **session + `ADMIN_USER_IDS`** (same pattern as `/api/v1/admin/*`). Product `/api/v1/me/*` and public auth/health stay open.

---

## Inventory (locked in-scope)

| Controller | Base path | Why lock |
|------------|-----------|----------|
| `EvaluateController` | `POST /api/evaluate/*` | LLM cost |
| `ProfilesController` | `POST /api/v1/profiles/evaluate` | LLM cost |
| `ProfilesReadController` | `GET /api/v1/profiles`, `GET /api/v1/profiles/:id` | Open profile dump |
| `UserProfilesApiController` | `CRUD /api/v1/user-profiles` | Open mutation/list (legacy UI only; product uses `/me`) |
| `MatchesController` | `POST /api/v1/matches/rebuild`, `GET auto`, `POST compare`, `GET :id`, … | Rebuild CPU/DB; legacy compare/detail |
| `MatchesApiController` | `GET /api/matches` | Full engine list dump |
| `ContradictionController` | `POST /api/contradiction/detect` | Internal tooling |

**Already guarded (no change):** `/api/v1/admin/*` (`AuthGuard` + `AdminGuard`).

**Out of scope this story (remain public / product):**

| Path | Notes |
|------|--------|
| `GET /health` (and app health) | Probes |
| `/api/v1/auth/*` | Login / session |
| `/api/v1/me/*` | Product (already `AuthGuard`) |
| `/api/v1/public/funnel/*` | Public analytics |
| `/api/v1/notifications/email/*` | Unsubscribe token flow |

Document this allow-list in `docs/ops/PUBLIC_HTTP_ALLOWLIST.md` (Agent 1).

---

## Decisions (do not reverse without discussion)

### 1. Guard strategy (locked)

On **each** in-scope controller class:

```typescript
@UseGuards(AuthGuard, AdminGuard)
```

Same order as admin controllers: **401** if no/invalid session; **403** `{ error: 'admin_forbidden' }` if session user not in `ADMIN_USER_IDS`.

- **Do not** invent a new guard or `INTERNAL_API_KEY` this story.
- **Do not** env-disable routes only in production (guards always on — local needs admin allowlist to use internal tools, consistent with ADMIN_ACCESS).
- **Do not** delete controllers this story (lock first; delete later if unused).

### 2. Module wiring (locked)

Import `AuthModule` + `AdminModule` into:

- `evaluate.module.ts`
- `profiles.module.ts`
- `matches.module.ts`
- `contradiction.module.ts`

`AdminModule` already **exports** `AdminGuard` / `AdminConfigService`. `AuthModule` exports `AuthGuard`.

If Nest circular DI appears (`AdminModule` → `MeProfileModule` → …), Agent 1 may extract a tiny `AdminAuthModule` (config + guard only) — prefer that fix over weakening guards. Escalate in handoff if needed.

### 3. Product / UI impact (locked)

- Product browse/messaging uses `/api/v1/me/*` — **unchanged**.
- Legacy UI under `/profiles`, `/evaluate`, etc. is already middleware-gated in prod; API lock means those tools need a logged-in **admin** session when the UI escape hatch is on. Acceptable.
- `dating-ui` `user-profiles-api.ts` callers become admin-only — intentional.

### 4. Docs (locked)

- Add [`docs/ops/PUBLIC_HTTP_ALLOWLIST.md`](../../../ops/PUBLIC_HTTP_ALLOWLIST.md): public/product routes that stay open + pointer that legacy evaluate/matches/profiles/user-profiles/contradiction require admin session.
- One-line cross-link from [`ADMIN_ACCESS.md`](../../../ops/ADMIN_ACCESS.md) Related section.

### 5. Tests (locked)

Minimum:

1. Unauthenticated request to a representative locked route → **401** (e.g. `POST /api/evaluate/batch` or `POST /api/v1/matches/rebuild`).
2. Authenticated non-admin → **403** `admin_forbidden`.
3. Optional: admin session → not 401/403 (can stub service) — nice if cheap.

Prefer extending an existing Nest HTTP integration pattern (admin photos / auth smoke) rather than a full Agent 4 e2e suite.

Smoke/regression: existing tests that hit unlocked routes without admin must be updated to set `ADMIN_USER_IDS` + session **or** override guards — Agent 1 must fix broken suites (`matches-api-smoke`, profiles specs, etc.).

### 6. Agent 4

- **Skip** if §5 coverage lands in Agent 1.
- Require Agent 4 only if CR finds no reject-path test.

---

## Artifacts

| Path | Change |
|------|--------|
| Controllers listed in inventory | `@UseGuards(AuthGuard, AdminGuard)` |
| Evaluate / Profiles / Matches / Contradiction modules | Import Auth + Admin |
| Specs / smoke | 401/403 + fix callers |
| `docs/ops/PUBLIC_HTTP_ALLOWLIST.md` | New |
| `docs/ops/ADMIN_ACCESS.md` | Related link |

---

## Out of scope

- Removing legacy controllers  
- Network/WAF rules (still recommended in ADMIN_ACCESS)  
- `ADMIN_API_ENABLED` kill switch  
- Rate limiting (Story 05)  
- Changing `/api/v1/me/*`  

---

## Agent 1 instructions

1. Apply guards + module imports per §1–2.
2. Fix broken tests; add 401/403 coverage per §5.
3. Write PUBLIC_HTTP_ALLOWLIST + ADMIN_ACCESS link.
4. `npm run build` + relevant jest.
5. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
fix(api): lock unauthenticated expensive evaluate and rebuild routes

Sprint 28 Story 2
```

---

## Agent 2 instructions

- [ ] All inventory controllers guarded
- [ ] `/api/v1/me/*` / auth / health unchanged
- [ ] 401/403 tests present; smokes green
- [ ] Allow-list doc exists
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README.
- Write `agent-3-pm.md`.

---

## Open risks

1. Forgotten script/UI calling open evaluate without admin cookie → 401/403 after this story (expected).  
2. `AdminModule` import graph — watch circular DI; extract `AdminAuthModule` if needed.  
3. `GET /api/v1/matches/:id` legacy detail also locked — intentional; product detail is under `/me`.
