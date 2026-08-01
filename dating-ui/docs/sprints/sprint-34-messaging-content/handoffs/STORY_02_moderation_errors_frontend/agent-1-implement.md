# Handoff: Agent 1 — Implement — Sprint 34 Story 2 Frontend

**Agent:** 1 implement  
**Story:** Rich content moderation errors — frontend  
**Sprint:** sprint-34-messaging-content  
**Date:** 2026-08-01  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md) + [STORY_02_moderation_errors_frontend.md](../../STORY_02_moderation_errors_frontend.md)

---

## Summary

- Added `ContentModerationApiError` / `MessagingMutedError` + parse helpers.
- Amber `ContentModerationErrorAlert` (no emoji, no guidelines link).
- Profile create/patch throws typed moderation error; soft-log `trace` preserved.
- Message send: moderation 400 → typed error; `messaging_muted` 403 ≠ access denied.
- Wired onboarding texts (+ basic catch) and conversation composer.
- i18n chrome in en/he/es under `contentModeration`.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/lib/content-moderation-error.ts` (+ spec) | **new** parse + error classes |
| `src/components/content-moderation-error-alert.tsx` (+ spec) | **new** amber alert |
| `src/lib/me-profile-api.ts` (+ spec) | throw typed moderation; soft-log kept |
| `src/lib/conversations-api.ts` (+ moderation spec) | moderation + mute parsing |
| `src/components/onboarding-texts-form.tsx` (+ spec) | alert + field focus |
| `src/components/onboarding-basic-form.tsx` | catch moderation without crash |
| `src/hooks/use-conversation-messages.ts` (+ spec) | `sendModerationDetails` |
| `src/app/dating/conversations/[id]/page.tsx` (+ spec) | alert above composer |
| `src/lib/i18n/{types,en,he,es}.ts` | `contentModeration` chrome |

---

## Verification

```
npx vitest run src/lib/content-moderation-error.spec.ts src/components/content-moderation-error-alert.spec.tsx src/lib/conversations-api.moderation.spec.ts src/lib/me-profile-api.spec.ts src/components/onboarding-texts-form.spec.tsx src/hooks/use-conversation-messages.spec.ts "src/app/dating/conversations/[id]/page.spec.tsx"
```

92 passed.

---

## Agent 2 next

```
--agent 2 sprint 34 story 2 frontend
```

Focus: amber vs red, mute ≠ access denied, no emoji/guidelines link, API reason/suggestion shown as-is, soft-log, i18n chrome only.
