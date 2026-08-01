# Story 06 — Gated admin hostname (follow-on)

**Sprint 20 · Status: PARKED** (do not start until live apply hold is lifted)  
**Priority:** P1 (security)  
**Depends on:** Stories 01–05 live apply + VERIFIED_DEV  

---

## Objective

Serve `/admin` only on a **network-gated** hostname (`admin.…`), not on the public product UI host. Public UI build keeps `NEXT_PUBLIC_ADMIN_ENABLED` unset (404).

## Why

Auth + `ADMIN_USER_IDS` alone is not enough if admin UI is on the public internet. See [`ADMIN_ACCESS.md`](../../../ops/ADMIN_ACCESS.md).

## Scope (when unparked)

1. ALB / Cloudflare Access / VPN gate for admin host.  
2. Admin UI deploy env: `NEXT_PUBLIC_ADMIN_ENABLED=1` on gated host only.  
3. Smoke: ops can open `/admin/*` via gate; public cannot.

## Acceptance

- [ ] Public product host: `/admin` 404  
- [ ] Gated host: admin pages load for allowlisted user  
- [ ] No public marketing links to `/admin`
