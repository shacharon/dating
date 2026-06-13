# Handoff: Agent 0 — Architect — Story 0

**Agent:** 0 architect  
**Story:** [STORY_00_admin_security_hardening.md](../../STORY_00_admin_security_hardening.md)  
**Sprint:** sprint-11-match-quality-intelligence  
**Date:** 2026-06-10  
**Status:** complete  

---

## Summary

- **Prod default: `/admin` hidden** — new UI gate returns **404** in production unless `NEXT_PUBLIC_ADMIN_ENABLED=1` (mirror Sprint 10 `internal-routes-gate` pattern).
- **Dev unchanged** — `NODE_ENV !== 'production'` → admin always reachable; session redirect for unauthenticated users unchanged.
- **No schema / no new API routes** — `AdminGuard` + `ADMIN_USER_IDS` stay as-is; API hardening is **infra documentation only** in v1 (VPN / Cloudflare Access / IP allowlist).
- **Ops doc** — new `docs/ops/ADMIN_ACCESS.md` + LAUNCH_COHORT_RUNBOOK cross-link; checklist before enabling admin on any public host.
- **Blocks Stories 2–4** — do not set `ADMIN_ENABLED=1` on public prod without network gate + ops sign-off.

---

## Artifacts

| Path | Change |
|------|--------|
| **UI — gate (new)** | |
| `dating-ui/src/lib/admin-routes-gate.ts` | **created** — `isAdminRouteBlocked(pathname)` |
| `dating-ui/src/lib/admin-routes-gate.spec.ts` | **created** — prod/dev/enabled matrix |
| `dating-ui/src/middleware.ts` | call `isAdminRouteBlocked` after `isInternalRouteBlocked`, before auth redirect |
| `dating-ui/src/middleware.spec.ts` | prod 404 on `/admin`, `/admin/photos`, `/admin/reports`; enabled + session tests |
| `dating-ui/.env.example` | document `NEXT_PUBLIC_ADMIN_ENABLED` |
| **Docs** | |
| `dating-api/docs/ops/ADMIN_ACCESS.md` | **created** — network policy, env vars, enable checklist |
| `dating-api/docs/sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md` | link admin section to `ADMIN_ACCESS.md`; note prod 404 default |
| `dating-api/.env.example` | comment: `/api/v1/admin/*` requires same network policy as UI admin |
| `dating-api/docs/sprints/sprint-11-match-quality-intelligence/README.md` | verify Stories 2–4 “requires Story 0 on prod” (already in checklist) |
| **API** | no code change (design lock) |
| **Prisma** | N/A |

---

## Decisions (do not reverse without discussion)

### 1. Separate module — `admin-routes-gate.ts` (not merged into `internal-routes-gate`)

| Concern | `internal-routes-gate` | `admin-routes-gate` |
|---------|------------------------|---------------------|
| Default in prod | Block dev tools (`/evaluate`, …) | Block **ops** UI (`/admin`) |
| Escape hatch | `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES=1` | `NEXT_PUBLIC_ADMIN_ENABLED=1` |
| Dev behavior | Allow | Allow |

**Rationale:** opposite product intent; separate flags avoid ops accidentally enabling evaluate routes when enabling admin.

### 2. Locked gate function

```typescript
/** Prefixes blocked in production unless NEXT_PUBLIC_ADMIN_ENABLED=1 */
export const ADMIN_ROUTE_PREFIX = '/admin';

export function isAdminRouteBlocked(pathname: string): boolean {
  if (pathname !== ADMIN_ROUTE_PREFIX && !pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/`)) {
    return false;
  }
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }
  if (process.env.NEXT_PUBLIC_ADMIN_ENABLED === '1') {
    return false;
  }
  return true;
}
```

**Middleware order** (`middleware.ts`):

```text
1. isInternalRouteBlocked(pathname) → 404
2. isAdminRouteBlocked(pathname)    → 404   // NEW
3. /login redirect
4. needsAuthSession → session cookie check → redirect to /
```

**Response:** `new NextResponse(null, { status: 404 })` — same as internal routes (no body leak).

### 3. Environment variables

| Var | App | Default prod | Purpose |
|-----|-----|--------------|---------|
| `NEXT_PUBLIC_ADMIN_ENABLED` | `dating-ui` | unset (= blocked) | Build-time flag; must rebuild to toggle |
| `ADMIN_USER_IDS` | `dating-api` | unset (= no admins) | Comma-separated user ids; unchanged |
| `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES` | `dating-ui` | unset | Unrelated — do not reuse for admin |

**Local dev:** no `NEXT_PUBLIC_ADMIN_ENABLED` needed.

**Staging behind VPN:** set `NEXT_PUBLIC_ADMIN_ENABLED=1` on staging UI build only.

**Public prod:** keep unset; enable admin only on a **network-gated** host (separate staging URL or `admin.` subdomain behind Access).

### 4. API — no application-level prod disable (v1)

| Option | Verdict |
|--------|---------|
| Nest middleware 404 on `/api/v1/admin/*` when flag off | **Rejected** — duplicates UI policy; API often on different host |
| `ADMIN_API_ENABLED` env on API | **Deferred** — Story 0 scope |
| **Infra + docs:** WAF/Access blocks `/api/v1/admin` on public API host | **Chosen** |

**Locked:** Story 0 ships UI gate + `ADMIN_ACCESS.md`. Operator must apply **same network policy** to API origin as UI admin paths.

**Risk acceptance:** knowledgeable actor with session + admin user id could call API directly if API is public — mitigated by network layer, minimal `ADMIN_USER_IDS`, not advertising admin URLs.

### 5. Auth model unchanged

- UI: session cookie required for `/admin` (existing `needsAuthSession`)
- API: `AuthGuard` + `AdminGuard` (existing)
- **No** separate admin username/password in this story
- **No** RBAC table

### 6. Future admin routes (Stories 2–4)

Any new page under `/admin/*` is covered automatically by prefix gate — no per-route middleware entries beyond existing matcher.

---

## API contract

**No new endpoints.** Existing admin surface (unchanged):

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/admin/photos/pending` | Session + `ADMIN_USER_IDS` |
| PATCH | `/api/v1/admin/photos/:photoId` | Session + `ADMIN_USER_IDS` |
| GET | `/api/v1/admin/photos/:photoId/file` | Session + `ADMIN_USER_IDS` |
| GET | `/api/v1/admin/reports` | Session + `ADMIN_USER_IDS` |
| GET | `/api/v1/admin/reports/:reportId` | Session + `ADMIN_USER_IDS` |
| PATCH | `/api/v1/admin/reports/:reportId` | Session + `ADMIN_USER_IDS` |

---

## Prisma / migrations

**N/A** — no schema changes.

---

## Runtime topology

| Item | Value |
|------|--------|
| REST browser target | `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`) — credentialed `fetch` from admin pages |
| Socket | N/A — admin pages do not use realtime |
| Cookie host rule | Session cookie on API host; UI on `:3000` — same as existing admin (photos/reports) |
| Admin UI in prod | **404 at middleware** before any client fetch unless `ADMIN_ENABLED=1` |
| Expected Network (staging) | `GET /admin/photos` → 200 HTML; `GET .../api/v1/admin/photos/pending` → 200 with admin cookie |
| Expected Network (public prod, default) | `GET /admin` → **404** (no redirect to login — route does not exist publicly) |

**Dev smoke (agent 1):**

1. `npm run dev` — `/admin` redirects unauthenticated to `/`.
2. `NODE_ENV=production npm run build && npm run start` without flag — `curl -I /admin` → 404.
3. Rebuild with `NEXT_PUBLIC_ADMIN_ENABLED=1` — unauthenticated `/admin` → redirect `/`; admin session → pages load.

---

## Docs outline — `docs/ops/ADMIN_ACCESS.md`

Sections for dev to fill:

1. **Threat model (v1)** — public `/admin` + Google session + allowlist is insufficient alone.
2. **Layers** — (a) UI prod 404 default, (b) network gate, (c) `ADMIN_USER_IDS`, (d) minimal ops accounts.
3. **Enable checklist** — VPN/Access live → staging `ADMIN_ENABLED=1` → smoke photos + reports → prod only if separate gated host.
4. **Env reference** — table from §3 above.
5. **API parity** — block or restrict `/api/v1/admin/*` at edge on public API URL.
6. **What we do not do in v1** — no admin password app, no API 404 middleware.

---

## Tests / verification

- [ ] `cd dating-ui && npm test` — `admin-routes-gate.spec.ts` + `middleware.spec.ts`
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: deferred to agent 1 (prod build 404 + enabled staging path)
- [ ] Socket transport: N/A

### Test matrix (unit)

| NODE_ENV | ADMIN_ENABLED | Path | Expected |
|----------|---------------|------|----------|
| production | unset | `/admin` | blocked |
| production | unset | `/admin/photos` | blocked |
| production | `1` | `/admin` | not blocked (middleware continues to auth) |
| development | unset | `/admin` | not blocked |
| production | unset | `/dating/me-matches` | not blocked by admin gate |

---

## Open questions / blockers

- None for agent 1.

**Follow-up (out of scope):** `ADMIN_API_ENABLED` on Nest if API must be deployable without edge WAF; separate `admin.` subdomain DNS — ops decision only.

---

## Next agent

```text
--agent 1 sprint 11 story 0
```

**Notes for dev:**

- Implement `admin-routes-gate.ts` + middleware hook first; tests before docs.
- Do not add `/admin` to `INTERNAL_ROUTE_PREFIXES` — wrong escape hatch.
- LAUNCH_COHORT_RUNBOOK § moderation/reports: add one line “In production, `/admin` is 404 unless `NEXT_PUBLIC_ADMIN_ENABLED=1` and network gate — see `docs/ops/ADMIN_ACCESS.md`.”
- No API code unless you discover a one-line README comment in `dating-api/.env.example` only.
