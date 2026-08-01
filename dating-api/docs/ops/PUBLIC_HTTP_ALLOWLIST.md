# Public / product HTTP allow-list

**Sprint 28 Story 2.** Routes that stay reachable **without** an admin session.  
Legacy evaluate / matches / profiles / user-profiles / contradiction require `AuthGuard` + `AdminGuard` (`ADMIN_USER_IDS`) — see [ADMIN_ACCESS.md](./ADMIN_ACCESS.md).

---

## Always open (no admin)

| Area | Paths |
|------|--------|
| Health | `GET /health` (and app health probes) |
| Auth | `/api/v1/auth/*` (login, logout, me where public) |
| Product (session user) | `/api/v1/me/*` — still requires normal `AuthGuard` session |
| Public funnel | `/api/v1/public/funnel/*` |
| Email unsubscribe | `/api/v1/notifications/email/*` |

Admin product APIs remain: `/api/v1/admin/*` (`AuthGuard` + `AdminGuard`).

---

## Locked (admin session required)

| Area | Paths |
|------|--------|
| LLM evaluate | `POST /api/evaluate/*`, `POST /api/v1/profiles/evaluate` |
| Profile dumps | `GET /api/v1/profiles`, `GET /api/v1/profiles/:id` |
| Legacy profile CRUD | `/api/v1/user-profiles` |
| Legacy matches | `/api/v1/matches/*` (rebuild, compare, auto, detail, …) |
| Engine list | `GET /api/matches` |
| Contradiction | `POST /api/contradiction/detect` |

Unauthenticated → **401**. Authenticated non-admin → **403** `{ error: 'admin_forbidden' }`.
