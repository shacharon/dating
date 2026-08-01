# Handoff: Agent 0 — Architect — Sprint 34 Story 1 Frontend

**Agent:** 0 architect  
**Story:** Message previews — frontend  
**Sprint:** sprint-34-messaging-content  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** UI/contract lock. **No product code.** Agent 1 implements. **Skip Agent 4.**

---

## Summary

Wire backend `lastMessage` into the conversations inbox: type pass-through, 60-code-point preview with i18n `You:` / empty copy, list timestamp via existing formatters, keep emerald unread badge, drop gender·age·location secondary line, optimistic WS preview updates.

Full lock: [STORY_01_message_previews_frontend.md](../../STORY_01_message_previews_frontend.md)

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `conversations-api.ts` | `lastMessage` types + pass-through |
| `conversation-display.ts` (+ spec) | normalize / truncate / format preview |
| `conversation-list-unread.ts` (+ spec) | apply incoming message → preview |
| `conversations-page-client.tsx` | row layout |
| `page.spec.tsx` | fixtures + asserts |
| `i18n` types + en/he/es | `youPrefix`, `noMessagesYet` |

---

## Decisions (do not reverse)

1. Keep emerald **count** badge — no blue unread dot.  
2. No new `time-format.ts` — reuse `formatMessageTime` / `formatMatchedAt`.  
3. Preview helpers live in `conversation-display.ts` (component file optional).  
4. Truncate at **60 code points** after whitespace normalize.  
5. Secondary meta removed from list row; preview is the secondary line.  
6. WS: update `lastMessage` optimistically; unread bump rules unchanged for peers.  
7. Skip Agent 4.

---

## Agent 1 brief

1. Read `STORY_01_message_previews_frontend.md`  
2. Implement types → helpers → row → WS apply → i18n → specs  
3. Do not change dating-api  

**Next command:**

```
--agent 1 sprint 34 story 1 frontend
```
