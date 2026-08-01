# Admin access policy

**Sprint 11 Story 0** — how ops reaches `/admin` and `/api/v1/admin/*` safely.

---

## Threat model (v1)

The dating app uses **Google Sign-In** + an HttpOnly session cookie + `ADMIN_USER_IDS` allowlist. That is enough for **local dev** and a **tiny trusted team on a private network**. It is **not** sufficient alone for admin tools on the **public internet**:

- `/admin` URLs can be discovered
- Any compromised admin Google session grants photo moderation and report triage
- API admin routes on a public API host can be called directly if an attacker has a valid admin session

**Defense in depth:** hide admin UI in prod by default, gate with network policy, keep allowlist minimal.

---

## Layers

| Layer | What | Where |
|-------|------|--------|
| 1 | **UI prod 404** | `NEXT_PUBLIC_ADMIN_ENABLED` unset → `/admin` returns 404 in production builds |
| 2 | **Network gate** | VPN, Cloudflare Access, or IP allowlist on staging/admin host |
| 3 | **Allowlist** | `ADMIN_USER_IDS` in `dating-api/.env` |
| 4 | **Minimal accounts** | 1–2 ops Google accounts only |

---

## Environment variables

| Variable | App | Production default | Purpose |
|----------|-----|-------------------|---------|
| `NEXT_PUBLIC_ADMIN_ENABLED` | `dating-ui` | unset (admin UI hidden) | Set to `1` only on **network-gated** staging/admin builds; requires UI rebuild |
| `ADMIN_USER_IDS` | `dating-api` | unset | Comma-separated `User.id` values for `/api/v1/admin/*` |
| `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES` | `dating-ui` | unset | Dev/evaluate escape hatch — **not** for admin |

**Local dev:** no `NEXT_PUBLIC_ADMIN_ENABLED` needed; `/admin` works when logged in as an allowlisted user.

---

## Enable checklist (staging or gated prod)

- [ ] VPN / Cloudflare Access / WAF rule in place for admin hostname
- [ ] Same network policy applied to **API** origin for `/api/v1/admin/*` (edge block on public API URL if UI and API differ)
- [ ] `ADMIN_USER_IDS` set to minimal ops accounts only
- [ ] UI built with `NEXT_PUBLIC_ADMIN_ENABLED=1` on the **gated** host only (not on public marketing deploy)
- [ ] Smoke: `/admin/photos`, `/admin/reports`, and (Story 3) `/admin/match-quality` load for admin user; non-admin gets 403 from API
- [ ] API smoke: `GET /api/v1/admin/match-quality/summary` returns 200 for admin session (Story 2)
- [ ] Do not link `/admin` from public marketing pages

---

## API parity

The Nest app does **not** return 404 on `/api/v1/admin/*` in v1 when UI admin is disabled. Restrict admin API paths at the **load balancer / WAF** on any host that is reachable from the open internet without VPN.

**Deferred:** `ADMIN_API_ENABLED` env on API (Sprint 12+ if edge gating is insufficient).

---

## What we do not do in v1

- Separate admin username/password application
- Full RBAC / roles table
- Separate admin repository or deploy (optional ops choice only)

---

## Related

- [PUBLIC_HTTP_ALLOWLIST.md](./PUBLIC_HTTP_ALLOWLIST.md) — product/public routes vs admin-locked legacy evaluate/matches/profiles
- [LAUNCH_COHORT_RUNBOOK.md](../sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md) §3 moderation/reports
- [Sprint 11 Story 0](../sprints/sprint-11-match-quality-intelligence/STORY_00_admin_security_hardening.md)
