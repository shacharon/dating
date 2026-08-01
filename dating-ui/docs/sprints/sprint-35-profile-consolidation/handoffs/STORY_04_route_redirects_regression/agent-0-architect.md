# Handoff: Agent 0 — Architect — Sprint 35 Story 4

**Agent:** 0 architect  
**Story:** Profile route redirects & regression  
**Sprint:** sprint-35-profile-consolidation  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** Depends on 35.2 ACCEPT. **Skip Agent 4.**

---

## Summary

Lock for closing consolidation: automated redirect matrix (35.2 targets), fix leftover Matches/onboarding `/dating/analysis` navigations, delete orphan dating profile/analysis page clients, slim specs, thin UX_UI note. Ignore AGENT_COMMANDS mega manual checklist and wrong settings→edit redirect.

Full lock: [STORY_04_route_redirects_regression.md](../../STORY_04_route_redirects_regression.md)

---

## Decisions (do not reverse)

1. Redirect targets = **35.2 matrix** (`/settings/profile` → `/profile`, not edit).  
2. Product navigations must use **hub URLs**; onboarding finish → `/profile?tab=analysis`.  
3. Delete unused `profile-page-client` + `analysis-page-client`; keep analysis hooks/views.  
4. Automated regression pack is the gate — not multi-browser manual.  
5. dating-ui only.

---

## Agent 1 brief

1. Read `STORY_04_route_redirects_regression.md`  
2. Specs → link fixes → delete orphans → UX_UI note → regression pack  
3. No dating-api  

**Next command:**

```
--agent 1 sprint 35 story 4
```
