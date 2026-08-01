# Story 07 — Deny public `/api/v1/admin/*` (follow-on)

**Sprint 20 · Status: PARKED** (do not start until live apply hold is lifted)  
**Priority:** P1 (security)  
**Depends on:** Story 06 (or same cut as 06); live ALB  

---

## Objective

Block `/api/v1/admin*` on the **public** ALB/WAF path so admin APIs are not reachable from the open internet even with a stolen session cookie against the public API origin.

## Why

Hiding UI is not enough — admin Nest routes still exist on the API. [`ADMIN_ACCESS.md`](../../../ops/ADMIN_ACCESS.md) requires edge deny.

## Scope (when unparked)

1. ALB listener rule or WAF: public → 403 on `/api/v1/admin*`.  
2. Gated network path still reaches admin APIs.  
3. Optional later: Nest `ADMIN_API_ENABLED` belt-and-suspenders (not required for this story).

## Acceptance

- [ ] From public internet: `/api/v1/admin/*` denied  
- [ ] From gated network: admin APIs work for allowlisted session  
- [ ] Documented in ADMIN_ACCESS + VERIFIED_DEV smoke
