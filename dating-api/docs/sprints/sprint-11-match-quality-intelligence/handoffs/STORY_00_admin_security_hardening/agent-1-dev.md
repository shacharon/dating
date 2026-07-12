# Handoff: Agent 1 — Dev — Story 0

**Agent:** 1 dev  
**Story:** [STORY_00_admin_security_hardening.md](../../STORY_00_admin_security_hardening.md)  
**Sprint:** sprint-11-match-quality-intelligence  
**Date:** 2026-06-10  
**Status:** complete  

---

## Summary

- **`admin-routes-gate.ts`** — prod `/admin` 404 unless `NEXT_PUBLIC_ADMIN_ENABLED=1`; dev unchanged.
- **`middleware.ts`** — gate runs after internal routes, before auth redirect.
- **Ops doc** — `docs/ops/ADMIN_ACCESS.md` + runbook + `.env.example` updates.
- **No API / Prisma changes** per architect lock.

---

## Files changed

| Path | Change |
|------|--------|
| `dating-ui/src/lib/admin-routes-gate.ts` | created |
| `dating-ui/src/lib/admin-routes-gate.spec.ts` | created (4 tests) |
| `dating-ui/src/middleware.ts` | `isAdminRouteBlocked` hook |
| `dating-ui/src/middleware.spec.ts` | admin prod gate describe block (5 tests) |
| `dating-ui/.env.example` | `NEXT_PUBLIC_ADMIN_ENABLED` documented |
| `dating-api/docs/ops/ADMIN_ACCESS.md` | created |
| `dating-api/docs/sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md` | admin access note + link |
| `dating-api/.env.example` | WAF note on `ADMIN_USER_IDS` |
| `dating-api/docs/sprints/sprint-11-match-quality-intelligence/STORY_00_admin_security_hardening.md` | status → in progress |

---

## Verification

```powershell
cd dating-ui
npm test   # 300/300 passed
```

| Check | Result |
|-------|--------|
| `prisma migrate deploy` | N/A |
| Unit tests | **300/300** pass |
| Prod `npm run build` + curl `/admin` | **Deferred** — middleware matrix covered by unit tests; operator smoke in story § |

### Browser / prod build smoke (deferred)

Operator or agent 2 optional:

```powershell
cd dating-ui
# Default prod — admin hidden
$env:NODE_ENV='production'
npm run build
npm run start
# curl -I http://localhost:3000/admin → expect 404

# Gated staging
$env:NEXT_PUBLIC_ADMIN_ENABLED='1'
npm run build
npm run start
# unauthenticated /admin → redirect /; with session → 200
```

---

## Runtime topology

Unchanged from architect handoff — admin pages still fetch `NEXT_PUBLIC_API_URL` with credentials. Prod default: middleware 404 before any client bundle loads for `/admin`.

---

## Decisions (held)

- Did not add `/admin` to `INTERNAL_ROUTE_PREFIXES`.
- Did not add Nest `ADMIN_API_ENABLED` — docs only.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 11 story 0
```

**Notes for CR:**

- Review middleware order: internal → admin → login → session.
- Confirm prod build inlines `NEXT_PUBLIC_ADMIN_ENABLED` at build time (Next.js standard).
- Optional: run prod build smoke above before approve.
