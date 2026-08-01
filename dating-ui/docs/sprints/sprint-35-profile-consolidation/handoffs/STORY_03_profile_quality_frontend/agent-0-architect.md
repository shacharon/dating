# Handoff: Agent 0 — Architect — Sprint 35 Story 3 Frontend

**Agent:** 0 architect  
**Story:** Bind profile quality meter to API  
**Sprint:** sprint-35-profile-consolidation  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** Prerequisite: 35.3 backend ACCEPT. **Skip Agent 4.**

---

## Summary

Lock for replacing hub client equal-weight score with `GET /api/v1/me/profile/quality`. Keep compact 35.2 chrome (bar + ≤2 i18n chips + Improve). Refresh via hub `refreshKey` after edit/photo mutations. Ignore AGENT_COMMANDS sample (emoji/blue checklist).

Full lock: [STORY_03_profile_quality_frontend.md](../../STORY_03_profile_quality_frontend.md)  
API: [STORY_03_profile_quality_backend.md](../../STORY_03_profile_quality_backend.md)

---

## Decisions (do not reverse)

1. Score = **API only**; never fall back to client % on error.  
2. Keep **compact** meter — no checklist / marketing banners / emoji / blue.  
3. Chips = first **2** API suggestions → existing hub i18n + `suggestionHref`.  
4. New `lib/profile-quality-api.ts` with `getApiBase` + credentials.  
5. Refresh = hub `refreshKey` + optional `onSaved` / photo `onMutated`.  
6. dating-ui only this phase.

---

## Agent 1 brief

1. Read `STORY_03_profile_quality_frontend.md` (+ backend lock for DTO)  
2. API client → meter bind → hub refresh wiring → specs  
3. Do not touch dating-api  

**Next command:**

```
--agent 1 sprint 35 story 3 frontend
```
