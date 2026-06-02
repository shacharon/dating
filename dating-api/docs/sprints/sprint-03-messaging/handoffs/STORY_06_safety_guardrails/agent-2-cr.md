# Handoff: Agent 2 — Code review — Story 6

**Agent:** 2 code-review  
**Story:** [STORY_06_safety_guardrails.md](../../STORY_06_safety_guardrails.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-06-02  
**Status:** complete  
**Verdict:** approved  

---

## Summary

- Reviewed Agent 1 implementation — **no production code changes required**.
- Added **4** rate-limit unit tests, **4** profanity unit tests, **2** message-service unit tests, **2** integration tests, **3** UI tests.
- Integration suite resets `ConversationMessageRateLimitService` in global `beforeEach` to avoid cross-test pollution from POST message tests.

---

## Review notes

| Area | Finding |
|------|---------|
| Rate limit | Fixed window per user; 10×201 then 429 — correct |
| Profanity | Log-only via `obs.trace`; no raw text in log message |
| DTO / service | Shared `MAX_MESSAGE_TEXT_LENGTH`; trim + validation unchanged |
| UI | Counter red over limit; Send disabled; 429 surfaced |
| Nest 429 | `HttpException` + `TOO_MANY_REQUESTS` — acceptable |
| Minor | Optional 300ms cooldown UI test skipped (low value vs timer flake) |

---

## Tests added

### Unit — `conversation-message-rate-limit.service.spec.ts` (new, **4**)

- First send in window
- 11th `assertCanSend` → **429** body
- Window expiry → allow again (fake timers)
- `resetForTests`

### Unit — `conversation-message-profanity.spec.ts` (new, **4**)

- Clean / token detection
- `logProfanityIfDetected` → `obs.trace` once, no throw, no raw profanity in message

### Unit — `me-conversation-messages.service.spec.ts` (+2 → **19** total)

- Rate limit exceeded → no `create`, no `recordSend`
- Profanity → `create` + profanity trace + send OK trace
- Success case asserts `assertCanSend` / `recordSend`
- `mockReset` on rate-limit mocks in `beforeEach` (fixes implementation leak)

### Integration — `me-profile-http.integration.spec.ts`

Block: **`Sprint 3 Story 6: message safety guardrails`**

- 10× **201**, 11th **429** + message body; `create` called 10 times
- **400** for 2001-char body (Story 6 label)

Global `beforeEach`: `ConversationMessageRateLimitService.resetForTests()`.

### UI — `page.spec.tsx` (+3 → **25** total)

- Char count `245 / 2000`
- Over 2000 → red class + Send disabled
- 429 error text in `conversation-send-error`

---

## Tests / verification

- [x] `npx jest conversation-message-rate-limit.service.spec.ts conversation-message-profanity.spec.ts me-conversation-messages.service.spec.ts` — **27/27**
- [x] `npx jest me-profile-http.integration.spec.ts -t "Sprint 3 Story 6"` — **2/2**
- [x] `npx vitest run page.spec.tsx` (conversation detail) — **25/25**
- [ ] Full integration file — not re-run (Story 6 subset green)
- [ ] Manual smoke — pending user

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 3 sprint 3 story 6
```

**Notes for next agent:**

- Mark Story 6 **Done**; sprint **6/6**; epic messaging complete.
- Optional backlog: Story 3 polling test backfill (`--agent 2 sprint 3 story 3`).
