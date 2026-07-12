# Handoff: Agent 0 — Architect — Story 6

**Agent:** 0 architect  
**Story:** [STORY_06_safety_guardrails.md](../../STORY_06_safety_guardrails.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-06-02  
**Status:** complete  

---

## Summary

- **No Prisma migration** — Story 1 validation (2000 chars, non-empty) already exists; Story 6 adds **rate limit** + **profanity log-only** + **UI polish**.
- **Rate limit:** in-memory **`ConversationMessageRateLimitService`** — max **10 successful sends / 60s / user** (all conversations); **429** with message `Too many messages. Please wait.`
- **Max length:** keep DTO `@MaxLength(2000)` + service trim; UI **remove `maxLength`** on textarea so counter can show **> 2000** in red; block send client-side when `draft.length > 2000`.
- **Profanity:** static placeholder word list; **`obs.warn`** (or structured trace) — **never block** send in Story 6.
- **UI:** char counter `data-testid`, error for **429** and length **400**; optional **300ms** post-send send cooldown (double-click guard).
- Completes Sprint 3 messaging safety AC; no Redis, no ML moderation.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | N/A |
| `dating-api/src/me-profile/conversation-message.constants.ts` | created — `MAX_MESSAGE_TEXT_LENGTH`, rate limit constants |
| `dating-api/src/me-profile/conversation-message-rate-limit.service.ts` | created — in-memory limiter |
| `dating-api/src/me-profile/conversation-message-rate-limit.service.spec.ts` | created (agent 2) |
| `dating-api/src/me-profile/conversation-message-profanity.ts` | created — placeholder detect + log |
| `dating-api/src/me-profile/conversation-message-profanity.spec.ts` | created (agent 2) |
| `dating-api/src/me-profile/me-conversation-messages.service.ts` | updated — rate limit + profanity log before create |
| `dating-api/src/me-profile/me-conversation-messages.service.spec.ts` | updated (agent 2) |
| `dating-api/src/me-profile/me-conversation-messages.dto.ts` | updated — use shared constant for MaxLength |
| `dating-api/src/me-profile/me-profile.module.ts` | updated — register rate limit service |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated — Story 6 block (429, rate limit) |
| `dating-api/src/logging/error-codes.ts` | updated — `ME_CONVERSATIONS_MESSAGE_RATE_LIMITED` |
| `dating-ui/src/lib/conversations-api.ts` | updated — map **429** to user message |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — char counter styling, `canSend` length guard |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated (agent 2) |

---

## Decisions (do not reverse without discussion)

### 1. Max length — already on server (Story 1); Story 6 tightens UX

| Layer | Story 6 change |
|-------|----------------|
| DTO | Keep `@MaxLength(2000, { message: 'Message exceeds 2000 characters' })` — reference `MAX_MESSAGE_TEXT_LENGTH` constant |
| Service | Keep trim + empty guard (unchanged) |
| Integration | Story 1 already has **400** for 2001 chars — no duplicate test required unless agent 2 wants explicit Story 6 label |
| UI | **Remove** `maxLength={2000}` on `<textarea>` so user can paste overflow and see red counter |
| UI send guard | `canSend = draftTrimmed.length > 0 && draft.length <= MAX && !sending && !rateLimited` |

Constants:

```typescript
// conversation-message.constants.ts
export const MAX_MESSAGE_TEXT_LENGTH = 2000;
export const MESSAGE_RATE_LIMIT_MAX_PER_WINDOW = 10;
export const MESSAGE_RATE_LIMIT_WINDOW_MS = 60_000;
```

### 2. Rate limit — in-memory per process (Option 1)

**No Redis** in this codebase for Story 6. Accept limitation: limit resets on API restart; not shared across multiple instances (document for future).

**New service:**

```typescript
@Injectable()
export class ConversationMessageRateLimitService {
  private readonly buckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  /** Throws TooManyRequestsException when user exceeded 10 sends in current window. */
  assertCanSend(sessionUserId: string): void;

  /** Call after successful message persist. */
  recordSend(sessionUserId: string): void;

  /** Test-only: clear all buckets. */
  resetForTests(): void;
}
```

**Algorithm (fixed window from first send in period):**

```typescript
assertCanSend(userId: string): void {
  const now = Date.now();
  const bucket = this.buckets.get(userId);

  if (!bucket || bucket.resetAt <= now) {
    return; // new window starts on recordSend
  }

  if (bucket.count >= MESSAGE_RATE_LIMIT_MAX_PER_WINDOW) {
    throw new TooManyRequestsException({
      message: 'Too many messages. Please wait.',
    });
  }
}

recordSend(userId: string): void {
  const now = Date.now();
  const bucket = this.buckets.get(userId);

  if (!bucket || bucket.resetAt <= now) {
    this.buckets.set(userId, {
      count: 1,
      resetAt: now + MESSAGE_RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  bucket.count += 1;
}
```

**Call site in `sendMessage()`** (order matters):

1. `assertActiveConversationParticipant`
2. Trim + empty check
3. **`assertCanSend(sessionUserId)`**
4. **`logProfanityIfDetected(...)`** (non-blocking)
5. `prisma.message.create`
6. **`recordSend(sessionUserId)`**
7. trace + return DTO

Failed sends (400/403/404) do **not** call `recordSend`.

**Scope:** per **`sessionUserId`** (`User.id`), **across all conversations** (story AC).

### 3. HTTP 429 mapping

| Condition | Status | Body |
|-----------|--------|------|
| Rate limit exceeded | **429** | `{ message: 'Too many messages. Please wait.' }` |

Nest `TooManyRequestsException` with object body matches existing 400 pattern (`message` field).

**UI** `sendConversationMessage`:

```typescript
if (res.status === 429) {
  throw new Error('Too many messages. Please wait.');
}
```

### 4. Profanity — log only, no block

```typescript
// conversation-message-profanity.ts
const PLACEHOLDER_PROFANITY = ['badword1', 'badword2']; // lowercase tokens

export function detectProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PLACEHOLDER_PROFANITY.some(
    (word) => lower.includes(word),
  );
}

export function logProfanityIfDetected(
  obs: StructuredObservabilityService,
  sessionUserId: string,
  conversationId: string,
  text: string,
): void {
  if (!detectProfanity(text)) return;
  obs.warn(
    `me conversations message profanity detected userId=${sessionUserId} conversationId=${conversationId}`,
    ErrorCodes.ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED,
  );
  // Do not log full message text in production trace (PII) — optional hash or length only
}
```

**Do not log raw `text`** in warn message — log `textLength` only to reduce PII exposure.

### 5. Observability

```typescript
ME_CONVERSATIONS_MESSAGE_RATE_LIMITED = 'ME_CONVERSATIONS_MESSAGE_RATE_LIMITED',
ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED = 'ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED',
```

On rate limit throw, filter will log HTTP 429 (existing). Optional explicit trace before throw — skip if redundant.

### 6. UI character counter (enhance existing)

Story 1 already shows `{draft.length}/2000`. Story 6:

```tsx
const MAX_MESSAGE_TEXT_LENGTH = 2000;
const overLimit = draft.length > MAX_MESSAGE_TEXT_LENGTH;

<span
  data-testid="conversation-char-count"
  className={
    overLimit
      ? 'text-xs font-medium text-red-600 dark:text-red-400'
      : 'text-xs text-zinc-400 dark:text-zinc-500'
  }
  aria-live="polite"
>
  {draft.length} / {MAX_MESSAGE_TEXT_LENGTH}
</span>
```

**Remove** `maxLength={2000}` from textarea.

### 7. Optional post-send cooldown (include — low cost)

After successful send, keep `sending === true` for **300ms** before re-enable (prevents double-submit spam under limit):

```typescript
const SEND_COOLDOWN_MS = 300;
// in handleSendMessage finally block after success:
await new Promise((r) => setTimeout(r, SEND_COOLDOWN_MS));
```

Use real timers in app; tests can fake timers if needed.

### 8. Empty / whitespace

**No change** — Story 1 handles; Story 6 tests reference existing behavior only.

### 9. Module wiring

```typescript
// me-profile.module.ts providers:
ConversationMessageRateLimitService,
```

Inject into `MeConversationMessagesService` constructor.

---

## Prisma schema

**No changes.**

---

## Migration plan

None.

---

## API contract

### `POST /api/v1/me/conversations/:id/messages` (additions)

Existing **400** cases unchanged. New:

| Condition | Status | Body |
|-----------|--------|------|
| > 10 sends in 60s window for user | **429** | `{ message: 'Too many messages. Please wait.' }` |

**Success path unchanged:** **201** + `MessageDto`.

---

## UI contract

### `conversations-api.ts`

Handle **429** before generic `!res.ok` (same pattern as 403/404).

### `page.tsx`

| Element | Spec |
|---------|------|
| `conversation-char-count` | `{n} / 2000`, red when `n > 2000` |
| `conversation-send-error` | Shows API message for 400 length, 429 rate limit |
| Send disabled | `draft.length > 2000` or empty or `sending` |

Export `MAX_MESSAGE_TEXT_LENGTH` from shared constant in UI (duplicate const `2000` in page is OK to avoid cross-package import — or small `conversation-message-limits.ts` in UI).

**Recommended:** `dating-ui/src/lib/conversation-message-limits.ts`:

```typescript
export const MAX_MESSAGE_TEXT_LENGTH = 2000;
```

---

## Test plan (for Agent 2)

### Unit — `conversation-message-rate-limit.service.spec.ts`

| Case | Expected |
|------|----------|
| First send in window | `assertCanSend` passes; `recordSend` → count 1 |
| 10 sends in window | 11th `assertCanSend` throws `TooManyRequestsException` |
| After window expires | `assertCanSend` passes again |
| `resetForTests` | clears state |

### Unit — `conversation-message-profanity.spec.ts`

| Case | Expected |
|------|----------|
| Clean text | `detectProfanity` false |
| Contains token | true |
| `logProfanityIfDetected` | calls `obs.warn` once, does not throw |

### Unit — `me-conversation-messages.service.spec.ts`

| Case | Expected |
|------|----------|
| Rate limit exceeded | `TooManyRequestsException`, no `create` |
| Profanity in text | `create` still called; warn logged |
| Success | `recordSend` invoked |

### Integration — `me-profile-http.integration.spec.ts`

Block: **`Sprint 3 Story 6: message safety guardrails`**

| Case | Expected |
|------|----------|
| 11 POSTs within same window (mock create each time) | 10× **201**, 11th **429** |
| 429 body message | `Too many messages. Please wait.` |
| 2001-char body | **400** (reuse or reference Story 1 test) |

**Rate limit integration pattern:** use real `ConversationMessageRateLimitService` in app module; call `resetForTests()` in `beforeEach` of describe block; loop 11 POSTs with same session cookie.

### UI — `page.spec.tsx`

| Case | Expected |
|------|----------|
| Char count shows `245 / 2000` | `conversation-char-count` |
| Over 2000 → red styling / class | `draft` 2001 chars |
| Over 2000 → Send disabled | button disabled |
| 429 from API → error text visible | `Too many messages` |
| Optional: cooldown | sending disables button briefly |

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Multi-instance rate limit** — in-memory only; document ops note.
2. **Profanity list** — placeholder tokens for dev/test; replace with config/moderation pipeline later.
3. **Story 3 test backfill** — still optional, unrelated to Story 6.

---

## Next agent

```text
--agent 1 sprint 3 story 6
```

**Notes for next agent:**

1. Implement `ConversationMessageRateLimitService` + wire in `sendMessage`.
2. Profanity log helper — no block.
3. UI: remove textarea `maxLength`, red counter, 429 handling, `canSend` length check.
4. Share `MAX_MESSAGE_TEXT_LENGTH` constant between API DTO and UI.
5. Do not add Redis, AI moderation, or nav-level limits.
6. After Story 6 PM close, **Sprint 3 epic complete** (6/6).
