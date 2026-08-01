# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_lock_expensive_endpoints.md](../../STORY_02_lock_expensive_endpoints.md)  
**Sprint:** sprint-28-backend-scale-hardening  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

All inventory controllers use `@UseGuards(AuthGuard, AdminGuard)`. Introduced `AdminAuthModule` so legacy modules avoid the heavy `AdminModule` graph. Added allow-list docs + HTTP 401/403/admin-ok coverage on `POST /api/v1/matches/rebuild`. Matches smoke overrides guards. Agent 4 skipped.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| Evaluate / profiles / user-profiles / matches / contradiction guarded | Pass |
| AuthModule + AdminAuthModule imports | Pass |
| `/api/v1/me/*` unchanged | Pass |
| PUBLIC_HTTP_ALLOWLIST + ADMIN_ACCESS link | Pass |
| 401 / 403 / admin success tests | Pass |
| Agent 4 skip | Pass |

---

## Changes

| Path | Change |
|------|--------|
| `admin/admin-auth.module.ts` | New slim module |
| `admin/admin.module.ts` | Uses / exports AdminAuthModule |
| evaluate / profiles / matches / contradiction controllers + modules | Guards + imports |
| `locked-expensive-endpoints-http.integration.spec.ts` | 401/403/admin |
| `matches-api-smoke.integration.spec.ts` | overrideGuard |
| `docs/ops/PUBLIC_HTTP_ALLOWLIST.md` | New |
| `docs/ops/ADMIN_ACCESS.md` | Related link |

---

## Verification

- `npx jest --testPathPatterns="locked-expensive-endpoints-http|matches-api-smoke" --runInBand` — pass
- `npx jest --testPathPatterns=admin-photos-http.integration --runInBand` — pass
- `npm run build` — pass

---

## Agent 2 notes

- Confirm all seven controllers guarded; product me routes untouched.
- `AdminAuthModule` extraction is architect-allowed (circular DI avoidance).
