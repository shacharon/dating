# Handoff: Agent 0 — Architect — Sprint 36 Story 1

**Agent:** 0 architect  
**Story:** Refactor match detail page  
**Sprint:** sprint-36-refactoring  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** **Skip Agent 4.**

---

## Summary

Lock for splitting `me-matches/[id]/page.tsx` into `components/match-detail/*`. Hooks + dynamic modals already exist — UI extraction only. Preserve testids/behavior; keep `page.spec.tsx` green.

Full lock: [STORY_01_match_detail_refactor.md](../../STORY_01_match_detail_refactor.md)

---

## Decisions (do not reverse)

1. **Reuse** `useMatchActions` / `useMatchFeedback` / `useCelebrationFlow` — do not recreate.  
2. Target folder: `components/match-detail/` (header, hard-block, content, feedback, actions, modals).  
3. Keep block-confirm → `blockMatch` + redirect (do not switch to hook.block).  
4. Behavior + `data-testid` freeze; existing page specs are the gate.  
5. dating-ui only; no visual redesign.

---

## Agent 1 brief

1. Read `STORY_01_match_detail_refactor.md`  
2. Extract components in order listed; slim page; run `[id]/page.spec.tsx`  
3. No dating-api  

**Next command:**

```
--agent 1 sprint 36 story 1
```
