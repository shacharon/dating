# Handoff: Agent 0 — Architect — Sprint 34 Story 3

**Agent:** 0 architect  
**Story:** Message timestamps in conversation thread  
**Sprint:** sprint-34-messaging-content  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** UI/format lock. **No product code.** Agent 1 implements. **Skip Agent 4.**

---

## Summary

Thread timestamps are **already always visible** (AGENT_COMMANDS “hover only” is stale). Lock preserves that layout and finishes formatting: keep recent/today/yesterday/older buckets; **add this-week weekday + time** in shared `formatMessageTime`.

Full lock: [STORY_03_message_timestamps.md](../../STORY_03_message_timestamps.md)

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `conversation-display.ts` (+ spec) | this-week branch in `formatMessageTime` |
| `[id]/page.tsx` | touch only if layout not already compliant |
| `[id]/page.spec.tsx` | visibility + optional age buckets |

---

## Decisions (do not reverse)

1. Visibility already done — do **not** reintroduce hover-only.  
2. Keep `justNow` / `minutesAgo` for < 60m.  
3. Add weekday short + time for calendar day diff 2…6.  
4. No new `time-format.ts`; no day separators; no API changes.  
5. Shared helper may update inbox list timestamps — OK.  
6. Skip Agent 4.

---

## Agent 1 brief

1. Read `STORY_03_message_timestamps.md`  
2. Extend `formatMessageTime` + specs; verify thread layout  
3. Do not change dating-api  

**Next command:**

```
--agent 1 sprint 34 story 3
```
