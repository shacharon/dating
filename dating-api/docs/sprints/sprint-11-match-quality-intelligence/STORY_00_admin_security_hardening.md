# Story 0: Admin security hardening

**Sprint:** 11  
**Status:** Done (engineering gate — operator prod smoke + infra checklist pending)  
**Depends on:** [Sprint 10](../sprint-10-trust-and-ops/README.md) admin (`/admin/photos`, `/admin/reports`, `ADMIN_USER_IDS`)  
**Blocks:** Stories 2–4 on **public prod** (staging with `ADMIN_ENABLED=1` + VPN OK)

---

## Why

Admin today lives on the **same origin** as the dating app: Google session cookie + `ADMIN_USER_IDS` allowlist. No separate password, no prod 404, no network gate. That is acceptable for local dev and a tiny trusted team; it is **not** acceptable for `/admin` on the public internet long term — especially before match-quality dashboards (Stories 2–4).

---

## What

**As an** operator  
**I want** admin routes hardened before new ops UI ships  
**So that** moderation and analytics tools are not exposed on the open WWW with app-only auth

### Acceptance criteria

- [x] **Prod UI gate** — in `NODE_ENV=production`, `/admin` and subpaths return **404** unless `NEXT_PUBLIC_ADMIN_ENABLED=1` (document in `dating-ui/.env.example`)
- [x] **Escape hatch** — `NEXT_PUBLIC_ADMIN_ENABLED=1` still works for staging behind VPN/Access
- [x] **Middleware tests** — spec: prod + disabled → 404; prod + enabled → session redirect unchanged; dev → always reachable
- [x] **Runbook** — [ADMIN_ACCESS.md](../../ops/ADMIN_ACCESS.md) + LAUNCH_COHORT_RUNBOOK cross-link
- [x] **API note** — `dating-api/.env.example` + `ADMIN_ACCESS.md` (WAF/VPN on `/api/v1/admin/*`)
- [x] **Sprint 11 README** — Stories 2–4 depend on Story 0 for public prod

### Out of scope (this story)

- Dedicated admin username/password app
- Full RBAC / roles table
- Separate admin repository or deploy (infra doc only)
- Blocking admin API in code when UI is 404 (network + env policy sufficient for v1)

---

## Definition of done

- [x] Public prod build: `/admin` 404 by default (middleware + tests)
- [x] Ops doc lists firewall/Access checklist before enabling admin in prod
- [x] Stories 2–4 can ship to staging with `ADMIN_ENABLED=1`

---

## Manual smoke

1. `NODE_ENV=production` build, `NEXT_PUBLIC_ADMIN_ENABLED` unset → `GET /admin` → 404.
2. Set `NEXT_PUBLIC_ADMIN_ENABLED=1`, rebuild → `/admin` redirects unauthenticated users to landing (unchanged).
3. Admin user with session → `/admin/photos` loads (staging only).

**Operator:** see `handoffs/STORY_00_admin_security_hardening/agent-3-pm.md`.

---

## Shipped (2026-06-10)

| Area | Deliverable |
|------|-------------|
| UI gate | `admin-routes-gate.ts` + middleware hook |
| Tests | 34 gate/middleware specs; **302/302** full UI suite |
| Docs | `docs/ops/ADMIN_ACCESS.md`, runbook + `.env.example` updates |
| API | No code change (infra policy documented) |

**Deploy:** UI rebuild only. Public prod: leave `NEXT_PUBLIC_ADMIN_ENABLED` unset. Staging ops: set `=1` only behind VPN/Access.

---

## Infra checklist (operator — not automated)

- [ ] Admin URL not advertised on public marketing site
- [ ] WAF / Cloudflare Access / VPN required before `ADMIN_ENABLED=1` in prod
- [ ] `ADMIN_USER_IDS` minimal (1–2 ops accounts)
- [ ] Rotate `SESSION_SECRET_PEPPER` and review admin Google accounts periodically

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| `ADMIN_API_ENABLED` on Nest | Sprint 12+ if edge gating insufficient |
| Separate admin subdomain | Ops choice — documented in `ADMIN_ACCESS.md` |
| Prod build curl smoke | Operator manual smoke § |
