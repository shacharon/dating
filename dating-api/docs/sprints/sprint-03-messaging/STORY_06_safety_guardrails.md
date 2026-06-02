# Story 6: Message safety guardrails

**Sprint:** 3  
**Status:** Done  
**Depends on:** Story 1 (send message must exist)

---

## Why

Without limits, users could spam, send abusive content, or abuse the system. Safety guardrails protect users and the platform.

---

## What

**As a** platform operator  
**I want** to enforce message safety rules  
**So that** the messaging experience is safe and abuse is minimized

### Acceptance criteria

- [x] **Max length** — Server rejects messages > 2000 characters with 400 error
- [x] **Rate limit** — Max 10 messages per minute per user (across all conversations)
- [x] **Rate limit error** — Return 429 "Too many messages. Please wait." when limit exceeded
- [x] **Client char counter** — UI shows character count near input (e.g., "245 / 2000")
- [x] **Client rate feedback** — Disable send button briefly after sending (300ms cooldown)
- [x] **Profanity placeholder** — Log detected profanity/slurs (no block yet; moderation policy TBD)
- [x] **Empty/whitespace** — Already handled in Story 1 (reject empty messages)
- [x] **Tests** — Rate limit enforcement, max length validation, char counter UI

### Out of scope (this story)

- AI content moderation
- User reporting within conversation
- Automated bans/suspensions
- Link/URL sanitization
- Spam detection (ML-based)

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_06_safety_guardrails/agent-0-architect.md` for rate limit algorithm, profanity log-only contract, and UI spec.

---

## Definition of done

- [x] Server validation: reject messages > 2000 chars (400)
- [x] Rate limit: max 10 messages/minute per user (429)
- [x] UI: character counter displayed near input
- [x] UI: error feedback for rate limit and length validation
- [x] Profanity detection: log only (no block)
- [x] Integration test: send 11 messages in 1 minute → 11th returns 429
- [x] Integration test: send 2001-char message → 400
- [x] UI test: char counter updates, shows warning when > 2000
- [ ] Manual smoke: test rate limit, test max length — **pending user verification**

---

## Manual smoke

1. User A opens conversation  
2. Type a 2100-character message → see char counter "2100 / 2000" in red  
3. Click Send → Send disabled while over limit; shorten to ≤2000 to send  
4. Shorten to 1500 chars → send successfully  
5. Rapidly send 10 messages → all succeed  
6. Try sending 11th message within 1 minute → error: "Too many messages. Please wait."  
7. Wait 1 minute → send again → succeeds  

---

## Shipped notes

- **`ConversationMessageRateLimitService`** — in-memory, 10 sends / 60s per `User.id` (all conversations); resets on API restart.
- **429** via `HttpException` + `HttpStatus.TOO_MANY_REQUESTS` (Nest version has no `TooManyRequestsException`).
- **Profanity** — placeholder tokens; `obs.trace` with `ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED`; no raw message text in logs.
- **UI** — `conversation-char-count` (red when > 2000); textarea `maxLength` removed; client blocks send over limit; 429 mapped in `conversations-api.ts`; 300ms post-send cooldown.
- **Integration** — global `resetForTests()` in HTTP suite `beforeEach` to isolate rate-limit state.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Redis / multi-instance rate limit | future |
| Real profanity / ML moderation | future |
| Story 3 polling test backfill (optional) | `--agent 2 sprint 3 story 3` |
