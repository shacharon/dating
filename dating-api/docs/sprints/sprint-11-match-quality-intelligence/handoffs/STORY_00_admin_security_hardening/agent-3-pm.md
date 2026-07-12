# Handoff: Agent 3 — PM — Story 0

**Agent:** 3 pm  
**Story:** [STORY_00_admin_security_hardening.md](../../STORY_00_admin_security_hardening.md)  
**Sprint:** sprint-11-match-quality-intelligence  
**Date:** 2026-06-10  
**Status:** complete  

---

## Summary

- **Story 0 closed as Done (engineering gate)** — production `/admin` hidden by default (`admin-routes-gate` + middleware); `NEXT_PUBLIC_ADMIN_ENABLED=1` for gated staging; `docs/ops/ADMIN_ACCESS.md` + runbook updates.
- Full pipeline: architect → dev → code review (+ escape-hatch tests) → pm.
- **Sprint 11 progress: 1/7.**
- **Unblocks:** Stories 2–4 admin UI on **staging** (with VPN + `ADMIN_ENABLED=1`); public prod stays 404 default.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Public prod `/admin` 404 by default | Done | `admin-routes-gate.ts` + middleware + 34 specs |
| Ops firewall/Access checklist | Done | `ADMIN_ACCESS.md` |
| Staging path for Stories 2–4 | Done | `NEXT_PUBLIC_ADMIN_ENABLED=1` documented |
| Manual smoke (story §) | Pending operator | Prod build curl + staging session |
| Infra checklist (story §) | Pending operator | VPN/Access before prod enable |

---

## Acceptance criteria

**6 / 6** engineering AC met.

| AC | Status |
|----|--------|
| Prod UI gate | Done + tested |
| Escape hatch | Done + tested |
| Middleware tests | Done (+ CR: internal hatch ≠ admin) |
| Runbook / ADMIN_ACCESS | Done |
| API note | Done |
| Sprint README dependency | Done |

---

## Sprint 11 progress

| # | Story | Status |
|---|--------|--------|
| 0 | Admin security hardening | **Done** (operator smoke pending) |
| 1 | Feedback KPI runbook | Planned |
| 2 | Admin feedback aggregates API | Planned |
| 3 | Admin match quality dashboard | Planned |
| 4 | Feedback → audit drill-down | Planned |
| 5 | Engine review & approval workflow | Planned |
| 6 | Engine change validation | Planned |

---

## Artifacts updated

| Path | Change |
|------|--------|
| `STORY_00_admin_security_hardening.md` | Status Done, AC/DoD checked, shipped table |
| `README.md` (sprint-11) | Story 0 row; sprint 1/7 |
| `handoffs/STORY_00_admin_security_hardening/agent-3-pm.md` | this file |

---

## Decisions (do not reverse without discussion)

- Story closes on **engineering gate**; operator prod build smoke + infra checklist waived to ops.
- **UI-only prod hide** — API admin routes need WAF/VPN parity (documented, not coded in v1).
- **`ALLOW_INTERNAL_ROUTES` does not enable admin** — separate flags (CR-locked).
- **No separate admin website** — extend `/admin` in same Next app; network-gate the host.

---

## Tests / verification

- [x] UI full suite — **302/302** pass
- [x] Gate + middleware specs — **34/34** pass
- [ ] Prod `npm run build` + curl `/admin` → 404 — pending operator
- [ ] VPN/Access live before any prod `ADMIN_ENABLED=1` — pending operator

---

## Operator manual smoke (Story 0)

**Prerequisites:** UI deployed from this story.

1. Production build **without** `NEXT_PUBLIC_ADMIN_ENABLED` → `GET /admin` → **404** (not redirect).
2. Rebuild with `NEXT_PUBLIC_ADMIN_ENABLED=1` on **gated staging** → unauthenticated `/admin` → redirect `/`; admin session → `/admin/photos` loads.
3. Confirm `ALLOW_INTERNAL_ROUTES=1` does **not** expose `/admin` on public prod build.

See [ADMIN_ACCESS.md](../../../ops/ADMIN_ACCESS.md) enable checklist.

---

## Next work

```text
--agent 0 sprint 11 story 1
```

Story 1 (feedback KPI runbook) can run in parallel — no code dependency on Story 0. Stories **2–3** should wait for Story 1 metric definitions; Story 0 is required before **public prod** admin for Stories 2–4.

---

## Open questions / blockers

- None blocking story closeout.
