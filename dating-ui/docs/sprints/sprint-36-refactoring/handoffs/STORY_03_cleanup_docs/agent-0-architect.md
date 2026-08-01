# Handoff: Agent 0 — Architect — Sprint 36 Story 3

**Agent:** 0 architect  
**Story:** Code cleanup and documentation  
**Sprint:** sprint-36-refactoring  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** **Skip Agent 4.**

---

## Summary

Lock for README rewrite, lean `docs/ARCHITECTURE.md`, bounded JSDoc on Sprint 33–36 UI exports, and light cleanup. **Do not** install Storybook. **Do not** require repo-wide ESLint zero (pre-existing ~32 problems). Keep Vitest.

Full lock: [STORY_03_cleanup_docs.md](../../STORY_03_cleanup_docs.md)

---

## Decisions (do not reverse)

1. **Docs first:** README + new ARCHITECTURE.md are primary ACCEPT surfaces.  
2. **JSDoc scope:** `nav/`, `match-detail/`, `conversation/`, `profile/`, plus moderation alert, conversation filters, onboarding text-field help — not all of `src/`.  
3. **Storybook:** out of scope (not in repo).  
4. **Lint:** no new errors in touched files; no mandate to clear all `set-state-in-effect` debt.  
5. **dating-ui only;** no behavior / route redesign.

---

## Agent 1 brief

1. Read `STORY_03_cleanup_docs.md`  
2. README → ARCHITECTURE → JSDoc → cleanup → `typecheck`  
3. No Storybook, no dating-api  

**Next command:**

```
--agent 1 sprint 36 story 3
```
