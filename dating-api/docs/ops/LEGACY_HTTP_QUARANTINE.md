# Legacy HTTP quarantine (lab / admin only)

**Sprint 53 Story 02.** These routes are **not** product HTTP. Product matches and profile flows use `/api/v1/me/*`.

They remain reachable only with `AuthGuard` + `AdminGuard` (`ADMIN_USER_IDS`) for lab/ops tooling. Do not wire product UI or me-profile clients to them.

See also: [PUBLIC_HTTP_ALLOWLIST.md](./PUBLIC_HTTP_ALLOWLIST.md) · [ADMIN_ACCESS.md](./ADMIN_ACCESS.md) · [ENGINE_VS_HG_OWNERSHIP.md](./ENGINE_VS_HG_OWNERSHIP.md)

---

## Quarantined in this story

| Path | Controller | Product SoT |
|------|------------|-------------|
| `POST /api/evaluate/*` | `EvaluateController` | `/api/v1/me/*` profile analysis paths |
| `GET /api/matches` | `MatchesApiController` | `/api/v1/me/matches*` |

Code markers: file-top `QUARANTINE` banners + `@deprecated` on the controllers; banner on `legacy-backend.adapter.ts` (DI seam kept until delete).

---

## Deletion schedule

| Step | When | Action |
|------|------|--------|
| Now (Story 02) | Done | Lab-only markers + this doc — **routes not deleted** |
| Sprint 53 Story 03 | **Done (SoT reconfirmed)** | Ownership map: [ENGINE_VS_HG_OWNERSHIP.md](./ENGINE_VS_HG_OWNERSHIP.md) — no product dependency on these lab routes |
| Follow-up | Operator-approved archaeology PR | Hard-delete controllers / unregister modules if still unused |

**Do not delete in Story 02.** Earliest hard removal is a follow-up PR after Story 03 (or later), not this change set. Story 03 reconfirms SoT only — **routes still not deleted**.

---

## Out of scope (siblings — not quarantined here)

| Path | Note |
|------|------|
| `POST /api/contradiction/detect` | Same LegacyBackend family; still admin-locked; not Story 02 |
| `/api/v1/matches/*` | Separate admin matches APIs |
| `POST /api/v1/profiles/evaluate` | Separate profiles evaluate path |

---

## Behavior (unchanged)

- Unauthenticated → **401**
- Authenticated non-admin → **403** `{ error: 'admin_forbidden' }`
- No env kill-switch / 410 gate in this story
