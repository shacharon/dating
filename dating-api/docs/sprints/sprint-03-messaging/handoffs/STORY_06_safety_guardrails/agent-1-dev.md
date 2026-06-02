# Handoff: Agent 1 — Dev — Story 6

**Agent:** 1 dev  
**Story:** [STORY_06_safety_guardrails.md](../../STORY_06_safety_guardrails.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-06-02  
**Status:** complete  

---

## Summary

- **Rate limit:** `ConversationMessageRateLimitService` — in-memory, 10 sends / 60s per `User.id` (all conversations); **429** `{ message: 'Too many messages. Please wait.' }` via `HttpException` + `HttpStatus.TOO_MANY_REQUESTS` (Nest version lacks `TooManyRequestsException`).
- **Profanity:** placeholder list in `conversation-message-profanity.ts`; **log-only** via `obs.trace` + `ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED` (no raw message text; includes `textLength`).
- **Constants:** `conversation-message.constants.ts` shared by DTO `@MaxLength` and rate limiter.
- **UI:** removed textarea `maxLength`; red char counter when over 2000; send disabled when `draft.length > 2000`; **429** mapped in `conversations-api.ts`; **300ms** post-send cooldown; `data-testid="conversation-char-count"`.
- **No migration.**

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/conversation-message.constants.ts` | created |
| `dating-api/src/me-profile/conversation-message-rate-limit.service.ts` | created |
| `dating-api/src/me-profile/conversation-message-profanity.ts` | created |
| `dating-api/src/me-profile/me-conversation-messages.service.ts` | rate limit + profanity before/after create |
| `dating-api/src/me-profile/me-conversation-messages.dto.ts` | `MAX_MESSAGE_TEXT_LENGTH` for `@MaxLength` |
| `dating-api/src/me-profile/me-conversation-messages.service.spec.ts` | mock `messageRateLimit` in constructor |
| `dating-api/src/me-profile/me-profile.module.ts` | register rate limit service |
| `dating-api/src/logging/error-codes.ts` | rate limit + profanity codes |
| `dating-ui/src/lib/conversation-message-limits.ts` | created |
| `dating-ui/src/lib/conversations-api.ts` | 429 handling |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | counter, canSend, cooldown |

---

## Decisions (do not reverse without discussion)

- Used `HttpException` + `HttpStatus.TOO_MANY_REQUESTS` instead of `TooManyRequestsException` (not exported in current `@nestjs/common`).
- Profanity uses `obs.trace` (no `warn` on `StructuredObservabilityService`).
- `sendMessage()` order: participant → trim/empty → `assertCanSend` → profanity log → create → `recordSend` → trace.
- Failed sends do not call `recordSend`.

---

## Tests / verification

- [x] `npm run build` (dating-api) — pass
- [x] `npx jest me-conversation-messages.service.spec.ts` — 17/17 pass
- [x] `npm run build` (dating-ui) — pass
- [x] `npx vitest run page.spec.tsx` (conversation detail) — 22/22 pass
- [ ] Story 6 rate-limit / profanity unit tests — Agent 2
- [ ] Story 6 integration (429 after 11 sends) — Agent 2
- [ ] Story 6 UI tests (char counter red, 429 error, over-limit send disabled) — Agent 2
- [ ] Manual smoke — pending user

---

## Manual smoke

1. Paste text > 2000 chars → counter red, Send disabled.  
2. Trim to valid length → Send works.  
3. Send 11 messages within 60s (same user) → 11th returns **429**, UI shows “Too many messages. Please wait.”  
4. Message containing `badword1` → send succeeds; API trace includes profanity code (no message body in log).

---

## Deferred / follow-up

| Item | Owner |
|------|--------|
| Rate limit shared across API instances (Redis) | future |
| Real profanity / moderation pipeline | future |
| `ME_CONVERSATIONS_MESSAGE_RATE_LIMITED` explicit trace on throw | optional |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 3 story 6
```

**Notes for next agent:**

- Add `conversation-message-rate-limit.service.spec.ts` and `conversation-message-profanity.spec.ts`.
- Integration: loop 10 successful POSTs then assert 11th is 429; call `resetForTests()` between cases if needed (expose via test module or direct service inject).
- UI: assert `conversation-char-count` red class when over limit; mock 429 on send; optional fake timers for 300ms cooldown.
- Architect handoff: [agent-0-architect.md](./agent-0-architect.md)
