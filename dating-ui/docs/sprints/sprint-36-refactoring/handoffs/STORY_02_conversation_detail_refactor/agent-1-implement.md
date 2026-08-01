# Handoff: Agent 1 — Implement — Sprint 36 Story 2

**Agent:** 1 implement  
**Story:** Refactor conversation detail page  
**Sprint:** sprint-36-refactoring  
**Date:** 2026-08-01  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [STORY_02_conversation_detail_refactor.md](../../STORY_02_conversation_detail_refactor.md)

---

## Summary

Split `conversations/[id]/page.tsx` (~490 → ~196 lines) into `components/conversation/*`. Reused `useConversationMessages` / `useConversationActions`. Composer owns draft locally (no `useMessageComposer`). Scroll helpers/effects live with the message list. Back link stays on the page so it remains visible during load/error; header is match card only. **60 specs passed.**

---

## Files

| Path | Change |
|------|--------|
| `components/conversation/conversation-header.tsx` | **new** (match card) |
| `components/conversation/conversation-message-bubble.tsx` | **new** |
| `components/conversation/conversation-message-list.tsx` | **new** (+ scroll) |
| `components/conversation/conversation-message-composer.tsx` | **new** (owns draft) |
| `components/conversation/conversation-actions.tsx` | **new** |
| `components/conversation/conversation-modals.tsx` | **new** (`dynamic` report) |
| `app/dating/conversations/[id]/page.tsx` | Thin orchestrator |

---

## Specs run

```
npm test -- "src/app/dating/conversations/[id]/page.spec.tsx" \
  src/hooks/use-conversation-messages.spec.ts \
  src/hooks/use-conversation-actions.spec.ts
```

**60 passed** (43 page + 11 messages hook + 6 actions hook).

---

## Agent 2 notes

1. Confirm `conversation-back-link` is on the page (always visible), not inside header — intentional for load/error chrome.  
2. Confirm hooks not duplicated; draft only in composer.  
3. Page ~196 lines (soft prefer ≤150; under hard fail 300). Components all ≤150.

**Next command:**

```
--agent 2 sprint 36 story 2
```
