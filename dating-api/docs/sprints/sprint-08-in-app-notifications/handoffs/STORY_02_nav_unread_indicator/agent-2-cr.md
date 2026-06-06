# Handoff: Agent 2 — Code review — Story 2

**Agent:** 2 code-review  
**Story:** [STORY_02_nav_unread_indicator.md](../../STORY_02_nav_unread_indicator.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  
**Verdict:** approved (test fixes applied; no prod code changes)

---

## Summary

- Reviewed Agent 1 implementation against `agent-0-architect.md` — **aligned**; single shell socket, nav badge, reconcile wiring, no API/email drift.
- Fixed **10 pre-existing failures** in `conversations/[id]/page.spec.tsx` (incomplete `messaging-socket` mock + missing `cleanup`).
- Added **3 tests** (99+ cap, bump alias, mark-read → nav refresh); story + regression suite **75/75** pass; full UI suite **192/192** pass.

---

## Review notes

| Area | Finding | Severity |
|------|---------|----------|
| Architect alignment | Single `MessagingShellProvider` socket; nav inside provider; sum `unreadCount` | OK |
| API / backend | No `dating-api` changes | OK |
| Email separation | Nav unread has no email/notification module imports | OK |
| Story 1 regression | Toast skip/dismiss/Someone tests in `messaging-shell-provider.spec.tsx` | OK |
| Bump rules | `shouldBumpUnreadForMessage` aliases `shouldShowMessageToast` | OK |
| Reconcile triggers | mount, visibility, list `load()`, detail mark-read `refresh()` | OK |
| Display choice | Numeric emerald pill (not dot); cap **99+**; i18n `aria-label` | OK (documented) |
| Shell guard | `if (!user) return children` before `MessagingShellProvider` | OK |
| List page bump logic | Inline checks vs shared `shouldBumpUnreadForMessage` | Minor (deferred per architect) |
| `[id]/page.spec.tsx` | Missing `CONVERSATION_SUBSCRIBE/UNSUBSCRIBE` mock exports | **Fixed** |

---

## Fixes applied

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | Add `MESSAGING_EVENT_CONVERSATION_*` mock exports, `emit` on socket mock, `cleanup()` in `afterEach` |
| `dating-ui/src/lib/message-in-app-notify.spec.ts` | **+1** — `shouldBumpUnreadForMessage` aliases toast rules |
| `dating-ui/src/components/authenticated-app-shell.spec.tsx` | **+1** — nav pill caps at `99+` |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | **+1** — `refreshNavUnread` after successful mark-read |

**No production code changes.**

---

## Tests / verification

- [x] Story scope:
  ```bash
  cd dating-ui
  npm test -- src/lib/conversation-unread-total.spec.ts \
    src/contexts/conversation-unread-context.spec.tsx \
    src/components/messaging-shell-provider.spec.tsx \
    src/components/authenticated-app-shell.spec.tsx \
    src/lib/message-in-app-notify.spec.ts \
    src/lib/message-toast-labels.spec.ts \
    src/app/dating/conversations/page.spec.tsx \
    src/app/dating/conversations/[id]/page.spec.tsx
  ```
  → **75/75 pass**
- [x] Full UI suite: `cd dating-ui && npm test` → **192/192 pass**
- [ ] Manual smoke: nav pill on profile, mark-read clears, live bump on `ws` — **pending operator**

---

## Acceptance criteria (engineering gate)

| AC | Status |
|----|--------|
| Nav badge when total unread > 0 | Done + tested |
| Count source = sum `unreadCount` from list API | Done + tested |
| Live optimistic bump on peer `message.new` | Done + tested |
| Reconcile on list load + mark-read + visibility | Done + tested |
| Numeric pill display (≤99, else 99+) | Done + tested |
| Accessible `aria-label` | Done (i18n en/es) |
| No email coupling | Done |
| Story 1 toast behavior preserved | Done + tested |
| Tests | Done — 75 story/regression unit/component |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 3 sprint 8 story 2
```

**Notes for PM:**

- Close story after operator manual smoke (steps in `agent-1-dev.md`).
- Story 3 replaces `isInAppNotificationsEnabled()` stub; add pref-off tests for toast + nav bump together.
- Optional follow-up: consolidate conversations list inline bump checks to `shouldBumpUnreadForMessage`.
