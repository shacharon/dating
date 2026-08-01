# Handoff: Agent 0 — Architect — Sprint 35 Story 2

**Agent:** 0 architect  
**Story:** Implement unified profile hub  
**Sprint:** sprint-35-profile-consolidation  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** Depends on 35.1 ACCEPT. **Skip Agent 4.**

---

## Summary

Lock for shipping `/profile?tab=` hub: flip `(authenticated)/profile` from redirect to real page; migrate overview; embed forms with new `variant="profileHub"`; analysis tab reuses hook/views; settings holds notifications; client completeness meter; redirects + nav update. No quality API (35.3).

Full lock: [STORY_02_unified_profile_implement.md](../../STORY_02_unified_profile_implement.md)  
Design: [STORY_01_unified_profile_design.md](../../STORY_01_unified_profile_design.md)

---

## Decisions (do not reverse)

1. Hub lives at **`(authenticated)/profile`** — not a new unauthenticated tree.  
2. Forms need **`variant: 'onboarding' | 'profileHub'`** (default onboarding).  
3. Meter = **client** completeness chrome only.  
4. No emoji / no blue tab chrome.  
5. Redirects in 35.2; deep QA = 35.4.  
6. Photos on Edit via existing `ProfilePhotoSection`.

---

## Agent 1 brief

1. Read STORY_01 + STORY_02 locks  
2. Implement in order listed at end of STORY_02  
3. No dating-api  

**Next command:**

```
--agent 1 sprint 35 story 2
```
