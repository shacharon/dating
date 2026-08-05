# Story 03 — Track opener usage + effectiveness

**Sprint 42 · Status: Done**  
**Closed:** 2026-08-05 — Agent 3 ACCEPT (migration applied; Network smoke deferred — API container missing OPENAI_API_KEY)  
**Priority:** P1 (validation, not blocking)  
**Estimated effort:** 1 day  
**Dependencies:** Stories 1 & 2 complete  
**Repo:** Both `dating-api` (analytics) and `dating-ui` (events)  
**Risk:** Low (analytics only, no user-facing product changes beyond attribution plumbing)  
**Handoffs:** `handoffs/STORY_03_opener_analytics/agent-*.md`

---

## Objective

Instrument opener usage to measure effectiveness: Are users using them? Are they editing them? Do they lead to more responses?

## Why

Conversation starters are expensive (LLM cost, dev time). We need data to validate:
1. **Usage rate:** Do users tap "Use this opener"?
2. **Edit rate:** Do they trust them or rewrite?
3. **Send rate:** Do they send or abandon?
4. **Response rate:** Do openers get more replies than manual messages?

**This data informs:** Should we invest more in openers? Improve prompts? Expand to GOOD priority?

---

## Current State

After Stories 1 & 2:
- Openers generated and displayed
- Basic events tracked: `opener_displayed`, `opener_used`
- No effectiveness metrics

---

## Target State

**Dashboard-ready metrics:**
```
OPENER EFFECTIVENESS (Week 1)
- Openers generated: 247
- Openers displayed: 247 (100%)
- Usage rate: 74 used / 247 shown = 30% ✅
- Edit rate: 52 edited / 74 used = 70% ⚠️
- Send rate: 68 sent / 74 used = 92% ✅
- Response rate: 45 replied / 68 sent = 66% 🔥
- Baseline (manual): 38% response rate
- LIFT: +28 percentage points

DECISION: Openers are working! Expand to GOOD priority.
```

---

## Metrics to Track

### 1. Generation Metrics (Backend)
```typescript
// Already logged in Story 1
{
  event: 'conversation.opener_generated',
  conversationId,
  viewerProfileId,
  matchProfileId,
  priorityScore,
  openerLength,
  promptVersion,
  generationTimeMs
}
```

### 2. Display Metrics (Frontend)
```typescript
// When opener visible on match card
{
  event: 'conversation.opener_displayed',
  conversationId,
  priorityScore,
  openerLength
}
```

### 3. Usage Metrics (Frontend)
```typescript
// When user taps "Use this opener"
{
  event: 'conversation.opener_used',
  conversationId,
  openerLength
}

// When conversation page loads with pre-filled opener
{
  event: 'conversation.opener_prefilled',
  conversationId
}
```

### 4. Edit Metrics (NEW - Frontend)
```typescript
// When user sends message, compare to original opener
{
  event: 'conversation.message_sent',
  conversationId,
  messageLength,
  wasPrefilled: boolean,     // Was this from opener?
  wasEdited: boolean,        // Did user change it?
  editDistance: number       // Levenshtein distance (optional)
}
```

### 5. Response Metrics (NEW - Backend)
```typescript
// When recipient replies to a message
{
  event: 'conversation.message_replied',
  conversationId,
  originalMessageId,
  responseTimeMinutes,
  senderUsedOpener: boolean  // Was original message from opener?
}
```

---

## Scope / Tasks

### Agent 0 (Architect)
1. Review existing analytics infrastructure (Story 7 funnel?)
2. Decide: Store metrics in database OR log-only?
3. Design response tracking: How to link reply to original message?
4. Define weekly report format (manual or automated?)
5. Lock privacy policy: What's logged? What's redacted?

### Agent 1 (Senior Dev)

**1. Update `ConversationStarter` table:**
```prisma
model ConversationStarter {
  ...existing fields,
  
  // Usage tracking
  displayed         Boolean   @default(false)
  displayedAt       DateTime?
  used              Boolean   @default(false)
  usedAt            DateTime?
  edited            Boolean   @default(false)
  sent              Boolean   @default(false)
  sentAt            DateTime?
  
  // Effectiveness tracking
  messageId         String?   // Link to actual sent message
  receivedReply     Boolean   @default(false)
  replyReceivedAt   DateTime?
  responseTimeMin   Int?      // Minutes until reply
}
```

**2. Add backend tracking service:**
```typescript
// src/analytics/opener-tracking.service.ts

@Injectable()
export class OpenerTrackingService {
  
  async trackOpenerDisplayed(conversationId: string) {
    await this.prisma.conversationStarter.updateMany({
      where: { conversationId, displayed: false },
      data: { displayed: true, displayedAt: new Date() }
    });
  }

  async trackOpenerUsed(conversationId: string) {
    await this.prisma.conversationStarter.updateMany({
      where: { conversationId, used: false },
      data: { used: true, usedAt: new Date() }
    });
  }

  async trackOpenerSent(
    conversationId: string,
    messageId: string,
    wasEdited: boolean
  ) {
    await this.prisma.conversationStarter.updateMany({
      where: { conversationId },
      data: {
        sent: true,
        sentAt: new Date(),
        edited: wasEdited,
        messageId
      }
    });
  }

  async trackOpenerReply(messageId: string, responseTimeMin: number) {
    const starter = await this.prisma.conversationStarter.findFirst({
      where: { messageId }
    });
    
    if (starter) {
      await this.prisma.conversationStarter.update({
        where: { id: starter.id },
        data: {
          receivedReply: true,
          replyReceivedAt: new Date(),
          responseTimeMin
        }
      });
    }
  }

  // Weekly report query
  async getWeeklyReport() {
    const starters = await this.prisma.conversationStarter.findMany({
      where: {
        generatedAt: { gte: sevenDaysAgo() }
      }
    });

    const generated = starters.length;
    const displayed = starters.filter(s => s.displayed).length;
    const used = starters.filter(s => s.used).length;
    const edited = starters.filter(s => s.edited).length;
    const sent = starters.filter(s => s.sent).length;
    const replied = starters.filter(s => s.receivedReply).length;

    return {
      generated,
      displayed,
      used,
      usageRate: used / displayed,
      editRate: edited / used,
      sendRate: sent / used,
      responseRate: replied / sent
    };
  }
}
```

**3. Wire into message sending:**
```typescript
// In MessagingService or ConversationsController

async sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  metadata?: { wasPrefilled?: boolean; originalOpener?: string }
) {
  const message = await this.prisma.message.create({
    data: { conversationId, senderId, text, ... }
  });

  // Track if this was from opener
  if (metadata?.wasPrefilled) {
    const wasEdited = text !== metadata.originalOpener;
    await this.openerTrackingService.trackOpenerSent(
      conversationId,
      message.id,
      wasEdited
    );
  }

  // Product analytics (existing)
  this.analyticsService.track('message.sent', {
    conversationId,
    wasPrefilled: metadata?.wasPrefilled ?? false,
    wasEdited: metadata?.wasPrefilled ? text !== metadata.originalOpener : false
  });

  return message;
}
```

**4. Track replies:**
```typescript
// In MessagingService

async sendMessage(...) {
  // ... create message

  // Check if this is a reply to an opener message
  const conversation = await this.getConversation(conversationId);
  const previousMessages = await this.getMessages(conversationId, { limit: 10 });
  
  const lastFromOtherUser = previousMessages.find(m => m.senderId !== senderId);
  
  if (lastFromOtherUser) {
    const starter = await this.prisma.conversationStarter.findFirst({
      where: { messageId: lastFromOtherUser.id }
    });
    
    if (starter && !starter.receivedReply) {
      const responseTimeMin = Math.floor(
        (Date.now() - starter.sentAt.getTime()) / 60000
      );
      await this.openerTrackingService.trackOpenerReply(
        lastFromOtherUser.id,
        responseTimeMin
      );
    }
  }
}
```

**5. Frontend: Send opener metadata:**
```typescript
// In conversation message input

const handleSend = async () => {
  await sendMessage(conversationId, {
    text: message,
    metadata: {
      wasPrefilled: !!starterFromUrl,
      originalOpener: starterFromUrl
    }
  });
};
```

### Agent 2 (Code Review)
1. Verify: No PII logged (opener text ok, user messages NO)
2. Check: Database updates don't block message sending
3. Verify: Response tracking logic correct (links reply to opener)
4. Check: Weekly report query performant (indexed fields)
5. Verify: Privacy compliant (redact message text in analytics)

### Agent 3 (PM)
1. **Create test scenario:**
   - Generate 10 openers
   - Use 5, edit 3, send 4
   - Have test user reply to 2
2. **Run weekly report query:**
   - Verify metrics accurate
   - Document sample output
3. **Create dashboard mockup:**
   - Design weekly report format
   - Share with stakeholders (you!)
4. **Document decision framework:**
   - What metrics = success?
   - What metrics = kill feature?
   - Example: <20% usage = kill, >40% = expand

---

## Locked Policy (Architect)

See [`handoffs/STORY_03_opener_analytics/agent-0-architect.md`](./handoffs/STORY_03_opener_analytics/agent-0-architect.md).

| Item | Decision |
|------|----------|
| Storage | **Extend** `ConversationStarterCache` (profile + eval key) — **not** a `conversationId`-keyed redesign |
| Lifecycle | `displayed` / `used` via best-effort `POST .../opener-lifecycle`; `sent` / `edited` / `reply` on message send |
| Prefill attribution | Optional `openerAttribution.originalOpener` on send; retain Story 2 baseline in memory after URL strip |
| Reply attribution | Via `sentMessageId` only |
| PII in analytics | Booleans / lengths / hashes only — **no** message or opener text in `AnalyticsService` properties |
| Report | `getWeeklyReport()` + doc SQL; **no** admin dashboard UI |
| Kill / expand | Documented thresholds only — no auto feature-kill |
| Agent 4 | **Skip** |

---

## Out of Scope

- Automated dashboard (manual query for v1)
- User-facing feedback ("Was this helpful?")
- A/B testing opener variations
- Cost tracking per opener
- Response quality scoring (NLP on replies)

---

## Acceptance Criteria

- [x] Database tracks: displayed, used, edited, sent, replied
- [x] Backend service tracks opener lifecycle
- [x] Message sending includes opener metadata
- [x] Reply detection links back to opener message
- [x] Weekly report query returns metrics
- [x] No PII in analytics logs
- [x] Tracking doesn't block message sending

---

## Testing

### Unit Tests
```typescript
describe('OpenerTrackingService', () => {
  it('tracks opener lifecycle', async () => {
    await service.trackOpenerDisplayed(convId);
    await service.trackOpenerUsed(convId);
    await service.trackOpenerSent(convId, msgId, false);
    await service.trackOpenerReply(msgId, 45);

    const starter = await prisma.conversationStarter.findFirst({ where: { conversationId: convId } });
    expect(starter.displayed).toBe(true);
    expect(starter.used).toBe(true);
    expect(starter.sent).toBe(true);
    expect(starter.receivedReply).toBe(true);
    expect(starter.responseTimeMin).toBe(45);
  });

  it('calculates weekly report correctly', async () => {
    // Create 10 starters with varied states
    const report = await service.getWeeklyReport();
    expect(report.usageRate).toBeCloseTo(0.3);
  });
});
```

### Integration Test
1. Generate opener for test match
2. Display on match card
3. User taps "Use this opener"
4. User edits text
5. User sends message
6. Other user replies
7. Query database: All tracking fields set correctly

---

## Weekly Report Format

**Query to run:**
```sql
SELECT
  COUNT(*) AS generated,
  SUM(CASE WHEN displayed THEN 1 ELSE 0 END) AS displayed,
  SUM(CASE WHEN used THEN 1 ELSE 0 END) AS used,
  SUM(CASE WHEN edited THEN 1 ELSE 0 END) AS edited,
  SUM(CASE WHEN sent THEN 1 ELSE 0 END) AS sent,
  SUM(CASE WHEN received_reply THEN 1 ELSE 0 END) AS replied,
  ROUND(AVG(CASE WHEN received_reply THEN response_time_min END), 1) AS avg_response_min
FROM conversation_starters
WHERE generated_at >= NOW() - INTERVAL '7 days';
```

**Output format:**
```markdown
# Opener Effectiveness Report - Week of Aug 4, 2026

## Summary
- Generated: 247
- Displayed: 247 (100%)
- Used: 74 (30%)
- Edited: 52 (70% of used)
- Sent: 68 (92% of used)
- Replied: 45 (66% of sent)

## Insights
- **Usage rate (30%):** On target ✅
- **Edit rate (70%):** High - users customize ⚠️
- **Send rate (92%):** Strong intent ✅
- **Response rate (66%):** Excellent 🔥
- **Avg response time:** 45 minutes

## Comparison
- Opener response rate: 66%
- Manual message response rate: 38% (baseline)
- **Lift: +28 percentage points**

## Decision
✅ Expand openers to GOOD priority matches (Sprint 43)
```

---

## Decision Framework

| Metric | Kill (<) | Caution (↔) | Success (>) |
|--------|----------|-------------|-------------|
| Usage rate | <20% | 20-40% | >40% |
| Edit rate | N/A | >80% | <50% |
| Send rate | <60% | 60-80% | >80% |
| Response rate | <40% | 40-60% | >60% |
| vs. Baseline | Worse | +0-10pp | >+10pp |

**Action based on results:**
- **Kill:** <20% usage after 4 weeks → Remove feature
- **Caution:** Mixed results → Improve prompts, iterate
- **Success:** >40% usage + lift → Expand to GOOD priority

---

## Suggested Commits

**Backend:**
```
feat(analytics): track conversation opener effectiveness

- Add lifecycle tracking: displayed → used → sent → replied
- Link replies back to opener messages
- Weekly report query for metrics

Sprint 42 Story 3
```

**Database:**
```
feat(db): add opener tracking fields to conversation_starters

- displayed, used, edited, sent, receivedReply timestamps
- messageId to link opener to actual message
- responseTimeMin for effectiveness measurement

Sprint 42 Story 3
```

---

## Follow-Up (Sprint 43)

If metrics are positive:
- Expand openers to GOOD priority (not just HIGH)
- Add "regenerate opener" feature
- Show effectiveness stats to users ("92% response rate")
