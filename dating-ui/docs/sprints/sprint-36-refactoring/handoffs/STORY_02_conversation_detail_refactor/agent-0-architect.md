# Handoff: Agent 0 — Architect — Sprint 36 Story 2

**Agent:** 0 architect  
**Story:** Refactor conversation detail page  
**Sprint:** sprint-36-refactoring  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** **Skip Agent 4.**

---

## Summary

Lock for splitting `conversations/[id]/page.tsx` into `components/conversation/*`. Reuse `useConversationMessages` / `useConversationActions`. Do **not** require a new `useMessageComposer` — draft lives in the composer component. Preserve testids; `[id]/page.spec.tsx` is the gate.

Full lock: [STORY_02_conversation_detail_refactor.md](../../STORY_02_conversation_detail_refactor.md)

---

## Decisions (do not reverse)

1. **Reuse** existing conversation hooks — no forks / no new socket layer.  
2. Target folder: `components/conversation/` (header, message-list, composer, actions, modals).  
3. Composer owns draft locally; `useMessageComposer` optional/not required.  
4. Behavior + `data-testid` freeze; existing page specs are the gate.  
5. dating-ui only; no visual redesign.

---

## Agent 1 brief

1. Read `STORY_02_conversation_detail_refactor.md`  
2. Extract components in order; slim page; run `[id]/page.spec.tsx`  
3. No dating-api  

**Next command:**

```
--agent 1 sprint 36 story 2
```
