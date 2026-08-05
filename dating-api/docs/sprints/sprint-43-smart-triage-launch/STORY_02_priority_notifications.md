# Story 02 — Priority match notifications

**Sprint 43 · Status: Planned**  
**Priority:** P1 (retention driver)  
**Estimated effort:** 2 days  
**Dependencies:** Sprint 41-42 complete (priority ranking exists)  
**Repo:** Both `dating-api` (send logic) and `dating-ui` (notification preferences)  
**Risk:** Low (reuse existing notification infrastructure from Sprint 8)  
**Handoffs:** `handoffs/STORY_02_priority_notifications/agent-*.md`

---

## Objective

Send email/push notifications when a user gets a new HIGH priority match, bringing them back to the app to message first.

## Why

**Retention problem:** Users sign up, browse matches once, then forget about the app.

**Solution:** Notify when HIGH priority matches appear → gives them a reason to return → increases engagement.

**The hook:** "You have a 92% match! Message Sarah before she gets overwhelmed."

---

## Current State

- Notification infrastructure exists (Sprint 8: email, in-app toast)
- Match list has priority ranking
- No proactive notifications for new matches

---

## Target State

**Email notification:**
```
Subject: 🔥 High compatibility match!

Hi [Name],

You matched with Sarah (92% compatible).

You both want kids, value deep conversations, and 
share 8 key interests. This is one of your best 
matches!

Suggested opener:
"I saw you love hiking - have you done the Israel Trail?"

[Message Sarah now]

---
Prefer fewer emails? Update your notification settings.
```

**Push notification (future, defer if no mobile):**
```
🔥 High compatibility match!
Sarah (92%) - Message her first
```

**Notification settings page:**
```
/settings/notifications

Email Notifications
☑️ High priority matches (recommended)
☐ New matches (any priority)
☐ Messages received
☑️ Mutual matches

Frequency
○ Real-time
● Daily digest (1 email per day)
○ Off
```

---

## Scope / Tasks

### Agent 0 (Architect)
1. Review existing notification system (Sprint 8 infrastructure)
2. Decide: Real-time vs batch (daily digest)?
3. Design frequency limits (max 1 HIGH notification per day? per week?)
4. Lock trigger logic: When exactly does notification send?
5. Define user preferences structure (opt-out, frequency)
6. Privacy: What data goes in email? (names ok? photos?)

### Agent 1 (Senior Dev)

**1. Add notification trigger to match creation:**

```typescript
// In MeMatchesService or match list rebuild

async onNewMutualMatch(viewerId: string, candidateId: string) {
  // Existing logic: create MutualMatch row
  
  // NEW: Check priority
  const match = await this.getMatch(viewerId, candidateId);
  
  if (match.priorityTier === 'HIGH') {
    await this.notificationService.sendHighPriorityMatchNotification({
      recipientUserId: viewerId,
      matchProfileId: candidateId,
      matchName: match.name,
      priorityScore: match.priorityScore,
      reasonShort: match.reasonShort,
      suggestedOpener: match.suggestedOpener
    });
  }
}
```

**2. Create notification template:**

```typescript
// src/notifications/templates/high-priority-match.template.ts

export const highPriorityMatchEmailTemplate = (data: {
  recipientName: string,
  matchName: string,
  matchAge: number,
  priorityScore: number,
  reasonShort: string,
  suggestedOpener?: string,
  matchUrl: string
}) => ({
  subject: `🔥 High compatibility match!`,
  
  html: `
    <h2>Hi ${data.recipientName},</h2>
    
    <p>You matched with <strong>${data.matchName}, ${data.matchAge}</strong> 
    (${data.priorityScore}% compatible).</p>
    
    <p>${data.reasonShort}</p>
    
    ${data.suggestedOpener ? `
      <div style="background: #f3f4f6; padding: 16px; margin: 16px 0; border-left: 3px solid #6366f1;">
        <strong>💬 Try this opener:</strong><br>
        <em>"${data.suggestedOpener}"</em>
      </div>
    ` : ''}
    
    <a href="${data.matchUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
      Message ${data.matchName} now
    </a>
    
    <hr>
    <p style="font-size: 12px; color: #6b7280;">
      Prefer fewer emails? 
      <a href="${process.env.APP_URL}/settings/notifications">Update your settings</a>
    </p>
  `,
  
  text: `
Hi ${data.recipientName},

You matched with ${data.matchName}, ${data.matchAge} (${data.priorityScore}% compatible).

${data.reasonShort}

${data.suggestedOpener ? `Try this opener: "${data.suggestedOpener}"` : ''}

Message now: ${data.matchUrl}

---
Update notification settings: ${process.env.APP_URL}/settings/notifications
  `
});
```

**3. Add frequency control:**

```typescript
// src/notifications/notification-frequency.service.ts

@Injectable()
export class NotificationFrequencyService {
  
  async canSendHighPriorityNotification(userId: string): Promise<boolean> {
    // Check user preferences
    const prefs = await this.getUserNotificationPrefs(userId);
    if (!prefs.highPriorityMatchesEnabled) return false;
    
    // Check frequency limit (max 1 per day for HIGH)
    const lastSent = await this.prisma.notificationLog.findFirst({
      where: {
        userId,
        type: 'HIGH_PRIORITY_MATCH',
        sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });
    
    return !lastSent;  // Can send if none in last 24h
  }
  
  async logNotificationSent(userId: string, type: string) {
    await this.prisma.notificationLog.create({
      data: { userId, type, sentAt: new Date() }
    });
  }
}
```

**4. Add database schema:**

```prisma
model UserNotificationPreferences {
  id                         String  @id @default(cuid())
  userId                     String  @unique
  user                       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  highPriorityMatchesEnabled Boolean @default(true)
  newMatchesEnabled          Boolean @default(false)
  messagesReceivedEnabled    Boolean @default(true)
  mutualMatchesEnabled       Boolean @default(true)
  
  frequency                  String  @default("realtime")  // "realtime" | "daily" | "off"
  
  updatedAt                  DateTime @updatedAt
  createdAt                  DateTime @default(now())
}

model NotificationLog {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "HIGH_PRIORITY_MATCH" | "MESSAGE_RECEIVED" etc
  sentAt    DateTime @default(now())
  
  @@index([userId, type, sentAt])
}
```

**5. Frontend: Notification settings page:**

```tsx
// app/settings/notifications/page.tsx

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>();
  
  const handleToggle = async (key: string, value: boolean) => {
    await updateNotificationPrefs({ [key]: value });
    // Refetch
  };

  return (
    <div className="settings-page">
      <h1>Notification Settings</h1>
      
      <section>
        <h2>Email Notifications</h2>
        
        <ToggleRow
          label="🔥 High priority matches (recommended)"
          description="When you get a 85%+ compatibility match"
          checked={prefs.highPriorityMatchesEnabled}
          onChange={(v) => handleToggle('highPriorityMatchesEnabled', v)}
        />
        
        <ToggleRow
          label="💬 Messages received"
          description="When someone messages you"
          checked={prefs.messagesReceivedEnabled}
          onChange={(v) => handleToggle('messagesReceivedEnabled', v)}
        />
        
        <ToggleRow
          label="💚 Mutual matches"
          description="When you match with someone"
          checked={prefs.mutualMatchesEnabled}
          onChange={(v) => handleToggle('mutualMatchesEnabled', v)}
        />
      </section>
      
      <section>
        <h2>Frequency</h2>
        <RadioGroup
          value={prefs.frequency}
          onChange={(v) => handleToggle('frequency', v)}
          options={[
            { value: 'realtime', label: 'Real-time (as they happen)' },
            { value: 'daily', label: 'Daily digest (1 email per day)' },
            { value: 'off', label: 'Off' }
          ]}
        />
      </section>
    </div>
  );
}
```

### Agent 2 (Code Review)
1. Verify: Frequency limits prevent spam (max 1 HIGH per day)
2. Check: Unsubscribe link works (email best practices)
3. Verify: No PII in subject line (match name ok, no sensitive data)
4. Check: Notification preferences persist correctly
5. Verify: Works with existing email infrastructure (Sprint 8)
6. Check: Analytics track notification sends + opens
7. Verify: Mobile email rendering (test Gmail, Outlook)

### Agent 3 (PM)
1. **Email testing:**
   - Send test notification to yourself
   - Check rendering on desktop + mobile
   - Verify: Links work, unsubscribe works
2. **User flow testing:**
   - Create HIGH priority match
   - Verify: Email arrives within 5 min (real-time) or next day (daily digest)
   - Click email link → verify: lands on match detail
3. **Settings testing:**
   - Toggle notification preferences
   - Verify: Preferences save correctly
   - Create match → verify: Respects settings (no email if disabled)
4. **Document:**
   - Screenshot email template
   - Measure: Open rate, click rate (after beta launch)

---

## Locked Policy (Architect)

| Item | Decision |
|------|----------|
| Priority threshold | HIGH only (≥85%) gets email |
| Frequency limit | Max 1 per day (prevent spam) |
| Default state | Enabled (opt-out, not opt-in) |
| Subject line | No match name (privacy) |
| Email content | Match name, score, opener, CTA |
| Unsubscribe | Required by law, easy to access |
| Push notifications | Defer to later (email only for v1) |

---

## Out of Scope

- Push notifications (mobile app required)
- SMS notifications (expensive, low priority)
- Daily digest batching (send real-time for now, add later)
- In-app notification center (defer)
- Notification sounds/badges

---

## Acceptance Criteria

- [x] HIGH priority mutual match triggers email notification
- [x] Email includes match name, score, reason, opener
- [x] Frequency limit: Max 1 HIGH notification per 24h
- [x] User can toggle notification preferences
- [x] Unsubscribe link works
- [x] Email renders correctly on mobile
- [x] Analytics track sends, opens, clicks
- [x] No notifications sent if user disabled them

---

## Testing

### Unit Tests
```typescript
describe('HighPriorityMatchNotification', () => {
  it('sends email for HIGH priority match', async () => {
    await onNewMutualMatch(viewerId, candidateId);
    expect(emailService.send).toHaveBeenCalledWith({
      to: viewerEmail,
      subject: '🔥 High compatibility match!',
      ...
    });
  });

  it('respects frequency limit (1 per 24h)', async () => {
    await sendNotification(userId);
    await sendNotification(userId);  // Second attempt
    expect(emailService.send).toHaveBeenCalledTimes(1);
  });

  it('respects user preferences (disabled)', async () => {
    await updatePrefs(userId, { highPriorityMatchesEnabled: false });
    await sendNotification(userId);
    expect(emailService.send).not.toHaveBeenCalled();
  });
});
```

### Manual Testing
1. Create 2 profiles that match (HIGH priority)
2. Mutual like → creates match
3. Check email (arrives within 5 min)
4. Click link → verify lands on match detail
5. Disable notifications in settings
6. Create another HIGH match → verify no email

---

## Email Best Practices

**Subject line:**
- ✅ "🔥 High compatibility match!" (clear, no PII)
- ❌ "Sarah wants to meet you!" (reveals name, spammy)

**Body:**
- Clear CTA button (not just link)
- Plain text alternative (for email clients that block HTML)
- Unsubscribe link prominent (footer)
- No tracking pixels (respect privacy)

**Sending:**
- Use verified domain (SPF, DKIM, DMARC)
- Monitor bounce/spam rates
- Respect opt-outs immediately

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Email open rate | >30% |
| Click-through rate | >15% |
| Opt-out rate | <5% |
| Return rate (7-day) | 2x baseline |

---

## Suggested Commits

**Backend:**
```
feat(notifications): send email for HIGH priority matches

- Trigger on mutual match if priority ≥85%
- Frequency limit: 1 per 24h per user
- Template includes match info + opener
- Respects user preferences

Sprint 43 Story 2
```

**Database:**
```
feat(db): add notification preferences and log tables

- UserNotificationPreferences: per-user toggles
- NotificationLog: track sends for frequency control

Sprint 43 Story 2
```

**Frontend:**
```
feat(ui): add notification settings page

- Toggle HIGH priority, messages, mutual matches
- Frequency control (realtime, daily, off)
- Unsubscribe flow

Sprint 43 Story 2
```

---

## Follow-Up (Story 3)

After notifications bring users back, Story 3 polishes empty states to ensure smooth onboarding and no dead ends.
