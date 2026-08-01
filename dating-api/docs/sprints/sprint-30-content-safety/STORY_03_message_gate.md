# Story 03 — Message moderation gate

**Sprint 30 · Status: ✅ Done**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Dependencies:** Story 01 (moderation client + violation service)  
**Handoffs:** [architect](./handoffs/STORY_03_message_gate/agent-0-architect.md) · [dev](./handoffs/STORY_03_message_gate/agent-1-dev.md) · [CR](./handoffs/STORY_03_message_gate/agent-2-cr.md) · [PM](./handoffs/STORY_03_message_gate/agent-3-pm.md)

---

## Objective

Gate all messages through OpenAI moderation before sending. Block explicit/harmful messages, track violations, and mute messaging after hitting thresholds.

---

## Scope / tasks

1. **Inject moderation into MeConversationMessagesService:**
   - Add `ContentModerationService` + `ContentViolationService` to constructor
   - On `sendMessage()` → check message text AFTER rate limit, BEFORE create
   - If flagged → throw `BadRequestException` with category
   - If clean → proceed with normal create + emit logic

2. **Error response shape:**
   ```json
   {
     "error": "message_content_moderation_failed",
     "message": "Your message contains inappropriate content",
     "details": {
       "category": "harassment",
       "suggestion": "Please rephrase your message respectfully"
     }
   }
   ```

3. **Violation tracking + thresholds:**
   - On moderation failure → `recordViolation(userId, 'message', text, category, score, 'blocked')`
   - Check counts after recording:
     - **Hourly:** if ≥3 in last 1 hour → mute for 1 hour
     - **Daily:** if ≥10 in last 24 hours → mute for 24 hours
     - **Lifetime:** if ≥20 total → mute indefinitely
   - Set `User.contentViolationStatus = 'messaging_muted'` + `contentViolationMutedUntil`

4. **Pre-flight check on send:**
   - Before moderation, check if user is currently muted:
     ```typescript
     if (user.contentViolationStatus === 'messaging_muted') {
       if (user.contentViolationMutedUntil && user.contentViolationMutedUntil > now) {
         throw ForbiddenException('Messaging is temporarily restricted')
       } else {
         // Mute expired → clear status, allow send
       }
     }
     ```

5. **Replace placeholder profanity check:**
   - Remove `logProfanityIfDetected()` call from `sendMessage()`
   - Delete `conversation-message-profanity.ts` (replaced by real moderation)

6. **Observability:**
   - Log moderation check (no raw text)
   - Log violations with category
   - Log when user gets muted (status transition + duration)

7. **Tests:**
   - Unit: moderation returns flagged → service throws with correct error
   - Unit: 3rd message violation in 1 hour → user muted for 1 hour
   - Unit: 10th violation in 24h → user muted for 24h
   - Unit: 20th lifetime violation → user muted indefinitely
   - Integration: send flagged message → 400 with category
   - Integration: muted user sends message → 403

---

## Acceptance criteria

- [x] POST `/api/v1/me/conversations/:id/messages` with flagged text → 400 with category
- [x] Clean message → sends normally (moderation adds ~100-200ms latency)
- [x] 3 violations in 1 hour → user muted for 1 hour
- [x] 10 violations in 24 hours → user muted for 24 hours  
- [x] 20 lifetime violations → user muted indefinitely
- [x] Muted user attempts send → 403 "Messaging is temporarily restricted"
- [x] Mute expiry checked on each send (auto-clear if expired)
- [x] Placeholder profanity check removed
- [x] Integration tests cover flagged/clean/muted scenarios
- [x] No raw message text in logs

---

## Technical details

### Service changes

```typescript
// src/me-profile/me-conversation-messages.service.ts

import { ContentModerationService } from '../content-moderation/content-moderation.service';
import { ContentViolationService } from '../content-moderation/content-violation.service';

export class MeConversationMessagesService {
  constructor(
    // ... existing deps
    private readonly moderation: ContentModerationService,
    private readonly violations: ContentViolationService,
  ) {}

  async sendMessage(
    sessionUserId: string,
    conversationId: string,
    text: string,
  ): Promise<MessageDto> {
    // 1. Verify participant (existing)
    const match = await this.conversations.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('Message text is required');
    }

    // 2. Check if user is muted
    await this.assertUserNotMuted(sessionUserId);

    // 3. Rate limit (existing)
    await this.messageRateLimit.consumeSendSlot(sessionUserId);

    // 4. Moderation check (NEW — replaces old profanity check)
    await this.checkMessageForModeration(sessionUserId, conversationId, trimmed);

    // 5. Create + emit (existing)
    const row = await this.prisma.message.create({ /* ... */ });
    // ... emit via gateway, analytics, etc.
    
    return toMessageDto(row);
  }

  private async assertUserNotMuted(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        contentViolationStatus: true, 
        contentViolationMutedUntil: true 
      },
    });

    if (user?.contentViolationStatus === 'messaging_muted') {
      const mutedUntil = user.contentViolationMutedUntil;
      
      if (!mutedUntil || mutedUntil > new Date()) {
        const until = mutedUntil 
          ? `until ${mutedUntil.toISOString()}` 
          : 'indefinitely';
        
        throw new ForbiddenException({
          error: 'messaging_muted',
          message: `Messaging is temporarily restricted ${until} due to content violations`,
        });
      } else {
        // Mute expired → clear status
        await this.prisma.user.update({
          where: { id: userId },
          data: { 
            contentViolationStatus: 'ok',
            contentViolationMutedUntil: null,
          },
        });
      }
    }
  }

  private async checkMessageForModeration(
    userId: string,
    conversationId: string,
    text: string,
  ): Promise<void> {
    const result = await this.moderation.checkContent(text);

    if (result.flagged) {
      await this.violations.recordViolation({
        userId,
        surface: 'message',
        flaggedText: text,
        category: result.primaryCategory,
        score: result.score,
        action: 'blocked',
      });

      // Check thresholds
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [hourlyCount, dailyCount, lifetimeCount] = await Promise.all([
        this.violations.getViolationCount(userId, { surface: 'message', since: oneHourAgo }),
        this.violations.getViolationCount(userId, { surface: 'message', since: oneDayAgo }),
        this.violations.getViolationCount(userId, { surface: 'message' }),
      ]);

      let mutedUntil: Date | null = null;
      let muteDuration = '';

      if (lifetimeCount >= 20) {
        mutedUntil = null; // indefinite
        muteDuration = 'indefinitely';
      } else if (dailyCount >= 10) {
        mutedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        muteDuration = '24 hours';
      } else if (hourlyCount >= 3) {
        mutedUntil = new Date(now.getTime() + 60 * 60 * 1000);
        muteDuration = '1 hour';
      }

      if (muteDuration) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            contentViolationStatus: 'messaging_muted',
            contentViolationMutedUntil: mutedUntil,
            contentViolationCount: lifetimeCount,
          },
        });

        this.obs.trace(
          `content user muted userId=${userId} duration=${muteDuration} lifetimeCount=${lifetimeCount}`,
          ErrorCodes.CONTENT_USER_MUTED,
        );
      }

      throw new BadRequestException({
        error: 'message_content_moderation_failed',
        message: 'Your message contains inappropriate content',
        details: {
          category: result.primaryCategory,
          suggestion: 'Please rephrase your message respectfully',
          ...(muteDuration ? { muted: muteDuration } : {}),
        },
      });
    }
  }
}
```

### Threshold matrix

| Condition | Action | Example |
|-----------|--------|---------|
| 3 violations in 1 hour | Mute for 1 hour | User sends 3 flagged messages at 10:00am, 10:15am, 10:30am → muted until 11:30am |
| 10 violations in 24 hours | Mute for 24 hours | User sends 10 flagged messages across the day → muted for 24h |
| 20 lifetime violations | Mute indefinitely | User has 20 total violations across all time → permanently muted (requires admin unblock) |

**Precedence:** Check in order lifetime → daily → hourly. Most severe wins.

---

## User experience flow

**Clean message:**
```
User sends "Hey, how's your day?"
  → Moderation check (120ms)
  → Clean
  → Message saved + emitted
  → Returns 200
```

**First violation:**
```
User sends explicit message
  → Moderation check (150ms)
  → Flagged: category='sexual'
  → Record violation (1st total)
  → Returns 400: "Your message contains inappropriate content (sexual)"
  → Message NOT saved
  → User can retry with different text
```

**Third violation in same hour:**
```
User sends 3rd flagged message at 2:45pm (others at 2:10pm, 2:30pm)
  → Moderation check (130ms)
  → Flagged
  → Record violation
  → Check counts: hourly=3, daily=3, lifetime=3
  → Mute until 3:45pm (1 hour from now)
  → Returns 400 + "muted": "1 hour"
```

**Muted user tries to send:**
```
User attempts send at 3:00pm (still muted until 3:45pm)
  → Check mute status
  → Still muted
  → Returns 403: "Messaging is temporarily restricted until 3:45pm"
  → No moderation check (short-circuit)
```

---

## Notes / gotchas

- **Latency impact:** Adds 100-200ms to every message send — acceptable for dating context (not Slack/Discord real-time)
- **Rate limit ordering:** Run rate limit BEFORE moderation to prevent abuse via spam-then-flag
- **Mute expiry:** Check on every send attempt; if expired, auto-clear status (no cron needed)
- **False positives:** User can still browse matches, just can't message — reduces support load vs full account block
- **Temporary vs permanent:** 3/10 thresholds are temporary; only 20 lifetime is permanent (requires admin intervention)

---

## UI consideration (out of scope for this story, but note for frontend)

When user gets 403 "messaging_muted", UI should:
- Disable message input
- Show banner: "Messaging is temporarily restricted due to content violations. You can still browse matches."
- If `mutedUntil` is present, show countdown: "Available again in 45 minutes"

---

## Deliverables

- `src/me-profile/me-conversation-messages.service.ts` (updated)
- `src/me-profile/me-conversation-messages.service.spec.ts` (updated unit tests)
- `src/me-profile/me-profile-http.integration.spec.ts` (updated integration tests)
- `src/me-profile/conversation-message-profanity.ts` (DELETE — replaced)
- `src/me-profile/conversation-message-profanity.spec.ts` (DELETE)
- `src/logging/error-codes.ts` (add `CONTENT_USER_MUTED`)

---

## Commit message

```
feat(moderation): gate messages through OpenAI moderation

Block explicit/harmful messages before send. Track violations
and enforce progressive muting (1h/24h/indefinite).

Replaces placeholder profanity check with real moderation.

Sprint 30 Story 3
```
