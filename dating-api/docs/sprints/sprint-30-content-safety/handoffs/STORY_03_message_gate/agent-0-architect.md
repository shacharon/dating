# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_message_gate.md](../../STORY_03_message_gate.md)  
**Sprint:** sprint-30-content-safety  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Wire Story 1 client into message send; remove placeholder profanity. **Skip Agent 4** (unit + existing HTTP integration mocks; no live OpenAI).

---

## Summary

- Gate **`MeConversationMessagesService.sendMessage`** via **`OpenAIModerationClient`** (Story docs’ `ContentModerationService` is **stale**).
- Pre-flight **`messaging_muted`** (respect `contentViolationMutedUntil`; auto-clear when expired) → **403**.
- Flagged → `recordViolation(surface: 'message')` → apply mute thresholds → **400** (message **not** persisted).
- Thresholds: **3 / hour → mute 1h**; **10 / 24h → mute 24h**; **20 lifetime → indefinite** (`mutedUntil = null`). Precedence: lifetime → daily → hourly.
- Delete placeholder profanity module; keep rate limit **before** moderation.
- `ContentModerationModule` already imported by `MeProfileModule` (Story 2) — **inject only**.

**Out of scope:** profile gate changes, admin unblock UI (Story 05), consolidating enforcement into Story 04 API (local mute write OK here; Story 04 may absorb), frontend mute banner.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/me-profile/me-conversation-messages.service.ts` | inject client + violations; mute + moderation gate; remove profanity call |
| `src/me-profile/me-conversation-messages.service.spec.ts` | flagged / mute tiers / expiry / fail-open / flag-off; drop profanity assertions |
| `src/me-profile/me-profile-http.integration.spec.ts` | POST messages 400 flagged / 403 muted / clean 201 |
| `src/me-profile/conversation-message-profanity.ts` | **DELETE** |
| `src/me-profile/conversation-message-profanity.spec.ts` | **DELETE** |
| `src/logging/error-codes.ts` | `CONTENT_USER_MUTED`, `CONTENT_MESSAGING_MUTED` |

No new Nest module. Do **not** invent `content-moderation.service.ts`.

---

## Decisions (do not reverse without discussion)

### 1. Injectables (locked)

```ts
// MeConversationMessagesService constructor (append)
private readonly moderation: OpenAIModerationClient,
private readonly contentViolations: ContentViolationService,
```

- Module import already present — **do not** re-import.
- Helpers: `isContentModerationEnabled` from `content-moderation.types`.

### 2. Send-path order (locked)

```text
1. assertActiveConversationParticipant   (existing)
2. trim; empty → 400                      (existing)
3. if isContentModerationEnabled():
     assertMessagingAllowed(userId)       // 403 or clear expired mute
4. messageRateLimit.consumeSendSlot       (existing — BEFORE moderation)
5. if isContentModerationEnabled():
     moderateMessageText(userId, trimmed) // 400 if flagged (+ maybe mute)
6. prisma.message.create + emit…          (existing)
```

| Concern | Lock |
|---------|------|
| Rate limit before moderation | **Yes** — prevents spam burning Moderation API |
| Mute before rate limit | **Yes** — muted users should not consume RL slots |
| Flag off | Skip steps 3 and 5 entirely (RL still runs) |
| WS create path | **None** — HTTP only |

### 3. Feature flag + fail-open (locked)

Mirror Story 2:

- `!isContentModerationEnabled()` → no mute assert, no moderation, no recordings (profanity already gone).
- `result.failOpen === true` → treat as clean (do not record / 400).

### 4. Mute pre-flight (locked)

Use `contentViolations.getUserViolationStatus(userId)`.

```ts
private async assertMessagingAllowed(userId: string): Promise<void>
```

| Status | Behavior |
|--------|----------|
| `messaging_muted` and (`mutedUntil == null` **or** `mutedUntil > now`) | **403** `messaging_muted` (indefinite when `mutedUntil` null) |
| `messaging_muted` and `mutedUntil <= now` | Clear to `ok` + `mutedUntil: null`, then allow |
| `profile_edit_blocked` / `ok` / other | **Do not** block messaging |

**403 body:**

```json
{
  "error": "messaging_muted",
  "message": "Messaging is temporarily restricted due to previous content violations",
  "details": {
    "mutedUntil": "2026-08-01T12:00:00.000Z" | null
  }
}
```

- `mutedUntil` ISO string when temporary; `null` when indefinite.
- Use `ForbiddenException` + `markHttpExceptionObservabilityLogged`.
- Trace: `CONTENT_MESSAGING_MUTED` (no raw text).

### 5. Moderation on flag (locked)

```ts
private async moderateMessageText(userId: string, text: string): Promise<void>
```

On `flagged && !failOpen`:

1. `recordViolation({ userId, surface: 'message', flaggedText: text, category, score, action: 'blocked' })`  
   - `category = primaryCategory ?? categories[0] ?? 'unknown'`
2. Count (exact surface `'message'`):

```ts
const [hourly, daily, lifetime] = await Promise.all([
  getViolationCount(userId, { surface: 'message', since: oneHourAgo }),
  getViolationCount(userId, { surface: 'message', since: oneDayAgo }),
  getViolationCount(userId, { surface: 'message' }),
]);
```

3. Mute decision — **precedence lifetime → daily → hourly** (most severe wins; evaluate in that order, first match applies):

| Condition | `contentViolationMutedUntil` | Duration label |
|-----------|------------------------------|----------------|
| `lifetime >= 20` | `null` (indefinite) | `indefinitely` |
| else `daily >= 10` | `now + 24h` | `24 hours` |
| else `hourly >= 3` | `now + 1h` | `1 hour` |
| else | no mute write | — |

4. If mute applies:

```ts
await this.prisma.user.update({
  where: { id: userId },
  data: {
    contentViolationStatus: 'messaging_muted',
    contentViolationMutedUntil: mutedUntil, // null = indefinite
  },
});
```

**Do not** overwrite `contentViolationCount` — `recordViolation` already increments.

5. Trace mute with `CONTENT_USER_MUTED` (`userId`, duration label, counts — no raw text).  
6. Trace flag with `CONTENT_MODERATION_FLAGGED` (`userId`, `surface=message`, `category`).  
7. Throw **400** (even when mute applied on this request):

```json
{
  "error": "message_content_moderation_failed",
  "message": "Your message contains inappropriate content",
  "details": {
    "category": "harassment",
    "suggestion": "Please rephrase your message respectfully",
    "muted": "1 hour"   // omit key if no mute this request
  }
}
```

### 6. Delete placeholder profanity (locked)

- Remove `logProfanityIfDetected(...)` from `sendMessage`.
- **Delete** `conversation-message-profanity.ts` + `.spec.ts`.
- Remove any imports / ErrorCodes-only usage that becomes dead for that path (leave `ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED` in error-codes if other refs exist; otherwise OK to leave unused constant — prefer delete only if unused after grep).

### 7. Observability codes (locked)

| Code | When |
|------|------|
| `CONTENT_MESSAGING_MUTED` | Pre-flight 403 |
| `CONTENT_USER_MUTED` | Status → `messaging_muted` applied |
| `CONTENT_MODERATION_FLAGGED` | Reuse (already exists) |

### 8. Tests (locked)

| Spec | Must cover |
|------|------------|
| `me-conversation-messages.service.spec.ts` | Flagged → BadRequest + record, no create; failOpen → create; flag off → no moderation; hourly 3 → mute 1h; daily 10 → 24h; lifetime 20 → indefinite (`mutedUntil` null); muted pre-flight → Forbidden; expired mute → clear + allow; rate limit still before moderation (moderation not called if RL throws — optional assert) |
| `me-profile-http.integration.spec.ts` | POST flagged → **400** + `message_content_moderation_failed`; muted → **403** + `messaging_muted`; clean text → **201** + create called |
| Deleted | profanity unit spec |

Reuse existing HTTP overrides for `OpenAIModerationClient` / `ContentViolationService`. Update service constructor call sites in unit specs.

### 9. Agent 4

**Skip.**

---

## Runtime topology

```text
POST /api/v1/me/conversations/:id/messages
  → sendMessage
       → participant + trim
       → [flag] assertMessagingAllowed → 403 or clear expired
       → rate limit → 429
       → [flag] checkContent
            → failOpen / clean → create
            → flagged → record → maybe mute → 400
```

---

## Open questions / blockers

- None blocking Agent 1.
- Story 04 may centralize mute/threshold helpers; duplicate logic here is acceptable.
- Admin indefinite unmute → Story 05.

---

## Next agent

```text
--agent 1 sprint 30 story 3
```

**Notes for next agent:**

1. Inject into `MeConversationMessagesService` only (module already wired).
2. Order: mute → RL → moderation → create.
3. Delete profanity files.
4. Fail-open + flag-off must not block sends.
5. Commit with story message; write `agent-1-dev.md`.
