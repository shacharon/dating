# Handoff: Agent 0 — Architect — Sprint 35 Story 3 Backend

**Agent:** 0 architect  
**Story:** Profile quality score API  
**Sprint:** sprint-35-profile-consolidation  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** API lock. **No product code.** Unblocks 35.3 frontend. **Skip Agent 4.**

---

## Summary

Locked `GET /api/v1/me/profile/quality` with weighted 0–100 score on real profile fields + APPROVED photo, structured suggestion ids aligned with 35.1 deep links. No email score. No UI.

Full lock: [STORY_03_profile_quality_backend.md](../../STORY_03_profile_quality_backend.md)

---

## Decisions (do not reverse)

1. Path: **`/api/v1/me/profile/quality`** (not `/me/quality`).  
2. Weights: nick 10 + location 10 + basics 10 + aboutMe 20 + aboutPartner 20 + aboutRelationship 15 + approved photo 15.  
3. Story texts need **≥50** trimmed chars.  
4. Suggestions: `{ id, points }[]` in fixed priority order — not English strings.  
5. Photo via existing **photo-gate** APPROVED helper.  
6. dating-api only this phase.

---

## Agent 1 brief

1. Read `STORY_03_profile_quality_backend.md`  
2. Service (+ pure compute) → DTO → controller → module → unit + HTTP specs  
3. Do not touch dating-ui  

**Next command:**

```
--agent 1 sprint 35 story 3 backend
```
