# Handoff: Agent 0 — Architect — Sprint 34 Story 2 Frontend

**Agent:** 0 architect  
**Story:** Rich content moderation errors — frontend  
**Sprint:** sprint-34-messaging-content  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** UI/contract lock. **No product code.** Agent 1 implements. **Skip Agent 4.**

---

## Summary

Parse backend moderation details into `ContentModerationApiError`; show amber structured alert on profile texts + message send; fix `messaging_muted` 403 mislabeled as access denied. No emoji, no fake guidelines link, no textarea highlight this story.

Full lock: [STORY_02_moderation_errors_frontend.md](../../STORY_02_moderation_errors_frontend.md)

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `lib/content-moderation-error.ts` (+ spec) | **new** parse + error class |
| `components/content-moderation-error-alert.tsx` (+ spec) | **new** alert |
| `me-profile-api.ts` | throw typed moderation error |
| `conversations-api.ts` | moderation + mute parsing |
| `onboarding-texts-form.tsx` (+ basic if needed) | wire alert |
| `use-conversation-messages` / thread page | wire alert |
| `i18n` en/he/es + types | chrome labels |

---

## Decisions (do not reverse)

1. Amber structured alert for policy rejects; red string for other errors.  
2. API `reason`/`suggestion`/`example` displayed as returned (EN).  
3. No `/content-guidelines` CTA; no emoji; no highlight overlay.  
4. Fix mute 403 separately from generic access denied.  
5. Skip Agent 4.

---

## Agent 1 brief

1. Read `STORY_02_moderation_errors_frontend.md`  
2. Parse → alert → wire profile + messaging → i18n → specs  
3. Do not change dating-api  

**Next command:**

```
--agent 1 sprint 34 story 2 frontend
```
