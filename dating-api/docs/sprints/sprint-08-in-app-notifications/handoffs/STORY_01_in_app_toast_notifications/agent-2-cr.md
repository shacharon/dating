# Handoff: Agent 2 — Code review — Story 1

**Agent:** 2 code-review  
**Story:** [STORY_01_in_app_toast_notifications.md](../../STORY_01_in_app_toast_notifications.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  
**Verdict:** approved (minor fix applied)

---

## Summary

- Reviewed Agent 1 implementation against `agent-0-architect.md` — **one minor defensive fix** in app shell; no API/email drift.
- Added **4 tests** (label cache unit + dismiss + Someone fallback); story suite **15/15** pass.
- Confirmed: no `MessageDto.text` in toast, no email module imports, channel separation preserved.

---

## Review notes

| Area | Finding | Severity |
|------|---------|----------|
| Architect alignment | UI-only, `message.new`, skip rules, 5s dismiss, i18n copy | OK |
| Security / privacy | Toast never renders raw message body | OK |
| Email separation | No notification/email API calls from toast layer | OK |
| Socket | Third shell socket acceptable per architect; defer shared context | Minor (deferred) |
| Label cache | Warm on mount + visibility; fallback `"Someone"` | OK |
| `user!.id` in shell | Replaced with `user ? <Provider> : children` guard | **Fixed** |
| `isInAppNotificationsEnabled` branch | Present in code; ESM prevents spy unit test until Story 3 wires real pref | Minor (deferred) |
| List page skip logic | Duplicates rules inline vs `shouldShowMessageToast` — not consolidated | Minor (optional follow-up) |

---

## Fixes applied

| Path | Change |
|------|--------|
| `dating-ui/src/components/authenticated-app-shell.tsx` | Guard `MessageToastProvider` when `user` is null (defensive) |

---

## Tests added

| File | Tests added |
|------|-------------|
| `dating-ui/src/lib/message-toast-labels.spec.ts` | **2** — index build + Someone fallback |
| `dating-ui/src/components/message-toast-provider.spec.tsx` | **+2** — dismiss button; empty cache → Someone |

(Agent 1: `message-in-app-notify` 5, `message-toast-provider` 6.)

---

## Tests / verification

- [x] `cd dating-ui && npm test -- src/lib/message-in-app-notify.spec.ts src/lib/message-toast-labels.spec.ts src/components/message-toast-provider.spec.tsx` → **15/15 pass**
- [ ] Manual smoke: B on matches, A sends → toast; open thread → no toast — **pending operator**

---

## Acceptance criteria (engineering gate)

| AC | Status |
|----|--------|
| Global listener in authenticated shell when `ws` | Done |
| Toast content + click navigation | Done |
| Auto-dismiss 5s | Done + tested |
| Skip self / active thread / disabled pref stub | Done (pref stub always true) |
| No email side effect | Done |
| Flag-aware poll off | Done + tested |
| Tests | Done — 15 unit/component |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 3 sprint 8 story 1
```

**Notes for PM:**

- Close story after operator manual smoke (or mark smoke pending in sprint README).
- Story 3 replaces `isInAppNotificationsEnabled()` stub and should add pref-off test.
- Story 2 (nav dot) can reuse label cache pattern from provider if desired.
