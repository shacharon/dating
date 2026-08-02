# Handoff: Agent 0 — Architect — Sprint 37 Story 2

**Agent:** 0 architect  
**Story:** Edit tab guided panes  
**Sprint:** sprint-37-profile-polish  
**Date:** 2026-08-02  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** **Skip Agent 4.**

---

## Summary

Re-lock Edit after prior uncommitted work was wiped. UX is **one pane at a time** (Basics → Photos → Story) with sticky nav + progress dots — **not** accordion collapse (rejected in product try). Reuse existing hub forms; keep `#basic` / `#photos` / `#story`.

Full lock: [STORY_02_edit_tab_sections.md](../../STORY_02_edit_tab_sections.md)

---

## Decisions (do not reverse)

1. **One visible pane**; inactive stay mounted (`hidden`).  
2. **No Expand/Collapse** accordion.  
3. Nav order **Basics → Photos → Story**; hash ids unchanged.  
4. Reuse `OnboardingBasicForm` / `ProfilePhotoSection` / `OnboardingTextsForm` with `profileHub` where applicable.  
5. dating-ui only; do not touch Overview/Settings/onboarding routes.

---

## Agent 1 brief

1. Read `STORY_02_edit_tab_sections.md`  
2. Implement nav + shell + rewrite `profile-edit-tab.tsx` + specs  
3. No dating-api / no 37.1 / 37.3 rework  

**Next command:**

```
--agent 1 sprint 37 story 2
```
