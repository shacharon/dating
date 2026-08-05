# Story 04 — Beta launch preparation

**Sprint 43 · Status: Planned**  
**Priority:** P0 (launch gate)  
**Estimated effort:** 2 days  
**Dependencies:** Stories 1-3 complete (product ready)  
**Repo:** Both (operational readiness)  
**Risk:** Low (non-coding, checklist execution)  
**Handoffs:** `handoffs/STORY_04_beta_launch_prep/agent-*.md`

---

## Objective

Prepare for 100-user beta launch: metrics dashboard, invite list, support process, kill criteria. Ensure you can measure success and respond to issues.

## Why

Launching without preparation = flying blind. You need:
1. **Metrics** to know if it's working
2. **Support** to handle feedback/bugs
3. **Kill criteria** to avoid wasting time on a dead product
4. **User list** of real people (not just test accounts)

**This story = launch readiness gate.**

---

## Current State

- Product complete (Sprints 41-43)
- No metrics dashboard
- No launch plan
- No defined success criteria

---

## Target State

**After this story:**
- ✅ Metrics dashboard tracking key numbers
- ✅ 100-user target list (Tel Aviv, 28-40, serious daters)
- ✅ Invite email template ready
- ✅ Support channel setup (email, form, or Discord)
- ✅ Kill criteria documented
- ✅ Weekly review schedule

---

## Scope / Tasks

### Agent 0 (Architect)
1. Define key metrics to track (what = success?)
2. Design dashboard: Manual query vs automated?
3. Lock kill criteria: When to pivot or shut down?
4. Plan data collection: Database queries or analytics service?
5. Define support workflow: Email? Form? Slack?

### Agent 1 (Senior Dev)

**1. Create metrics dashboard (internal admin page):**

```tsx
// app/admin/beta-metrics/page.tsx

export default async function BetaMetricsPage() {
  const metrics = await calculateBetaMetrics();

  return (
    <div className="metrics-dashboard">
      <h1>Beta Launch Metrics</h1>
      <p>Last updated: {new Date().toLocaleString()}</p>

      <MetricsGrid>
        <MetricCard
          title="Active Users"
          value={metrics.activeUsers}
          target={100}
          trend="+12 this week"
        />
        
        <MetricCard
          title="D7 Retention"
          value={`${metrics.d7Retention}%`}
          target={40}
          status={metrics.d7Retention >= 40 ? 'good' : 'warning'}
        />
        
        <MetricCard
          title="Match Browse → Message"
          value={`${metrics.browseToMessage}%`}
          target={30}
        />
        
        <MetricCard
          title="HIGH Priority Message Rate"
          value={`${metrics.highPriorityMessageRate}%`}
          target={60}
          status={metrics.highPriorityMessageRate >= 60 ? 'good' : 'warning'}
        />
        
        <MetricCard
          title="Opener Usage Rate"
          value={`${metrics.openerUsageRate}%`}
          target={30}
        />
        
        <MetricCard
          title="Response Rate (Openers)"
          value={`${metrics.openerResponseRate}%`}
          comparison={`Manual: ${metrics.manualResponseRate}%`}
        />
      </MetricsGrid>

      <section>
        <h2>Funnel (Last 7 Days)</h2>
        <FunnelChart data={metrics.funnel} />
        {/*
          Sign up → Profile complete → Photo upload → 
          First match browse → First like → First match → 
          First message → First reply
        */}
      </section>

      <section>
        <h2>Priority Distribution</h2>
        <BarChart data={metrics.priorityDistribution} />
        {/* HIGH: 20%, GOOD: 40%, OTHER: 40% */}
      </section>

      <section>
        <h2>Issues & Feedback</h2>
        <IssuesList issues={metrics.recentIssues} />
      </section>

      <section>
        <h2>Decision Framework</h2>
        <DecisionTable criteria={KILL_CRITERIA} current={metrics} />
      </section>
    </div>
  );
}
```

**2. Backend: Metrics calculation service:**

```typescript
// src/admin/beta-metrics.service.ts

@Injectable()
export class BetaMetricsService {
  
  async calculateBetaMetrics(since: Date = sevenDaysAgo()) {
    const users = await this.getActiveUsers(since);
    const d7Retention = await this.calculateD7Retention();
    const browseToMessage = await this.calculateBrowseToMessageConversion();
    // ... more calculations

    return {
      activeUsers: users.length,
      d7Retention,
      browseToMessage,
      highPriorityMessageRate: await this.getHighPriorityMessageRate(),
      openerUsageRate: await this.getOpenerUsageRate(),
      openerResponseRate: await this.getOpenerResponseRate(),
      manualResponseRate: await this.getManualResponseRate(),
      funnel: await this.getFunnelData(),
      priorityDistribution: await this.getPriorityDistribution(),
      recentIssues: await this.getRecentSupportIssues()
    };
  }

  private async calculateD7Retention(): Promise<number> {
    // Users who signed up 7 days ago
    const cohort = await this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // How many returned on Day 7?
    const returned = cohort.filter(u => 
      u.lastLoginAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    return (returned.length / cohort.length) * 100;
  }

  // Similar methods for other metrics...
}
```

**3. Create support intake form:**

```tsx
// app/support/page.tsx

export default function SupportPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (data) => {
    await fetch('/api/v1/support/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setSubmitted(true);
  };

  if (submitted) {
    return <div>Thanks! We'll respond within 24 hours.</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Get Help</h1>
      
      <label>
        What's wrong?
        <select name="issueType">
          <option>Can't see matches</option>
          <option>Photo upload failed</option>
          <option>Conversation not loading</option>
          <option>Other bug</option>
          <option>Feature request</option>
        </select>
      </label>

      <label>
        Describe the issue:
        <textarea name="description" rows={5} required />
      </label>

      <label>
        Your email (for follow-up):
        <input type="email" name="email" required />
      </label>

      <button type="submit">Submit</button>
    </form>
  );
}
```

**4. Create invite email template:**

```markdown
# INVITE_EMAIL_TEMPLATE.md

Subject: You're invited to try [App Name] (Beta)

---

Hi [Name],

You're invited to the private beta of [App Name] - a dating app that helps you prioritize your best matches.

**What's different:**
- Smart Triage: We rank your matches by compatibility
- Conversation Starters: AI-powered openers for your best matches
- Transparent: See exactly why you matched

**Beta details:**
- 100 people only (Tel Aviv)
- Free during beta
- Your feedback shapes the product

[Join Beta] → [unique signup link]

Looking forward to your feedback!

[Your name]
Founder, [App Name]

P.S. Know someone who'd be interested? Forward this email.
```

**5. Document kill criteria:**

```markdown
# BETA_DECISION_FRAMEWORK.md

## Success Criteria (Week 4 Checkpoint)

### GREEN (Scale Up)
- D7 retention: ≥40%
- HIGH priority message rate: ≥60%
- Opener usage rate: ≥30%
- Positive feedback: ≥70%

**Action:** Expand to 500 users, invest in growth

### YELLOW (Iterate)
- D7 retention: 20-39%
- Message rate: 40-59%
- Opener usage: 15-29%
- Mixed feedback: 40-69%

**Action:** Address top complaints, extend beta 4 weeks

### RED (Pivot or Kill)
- D7 retention: <20%
- Message rate: <40%
- Opener usage: <15%
- Negative feedback: <40%

**Action:** 
1. Diagnose root cause (UX? Algorithm? Market?)
2. Pivot (new approach) OR
3. Shut down gracefully (refund? migrate?)

## Weekly Check-Ins

Every Monday:
1. Review metrics dashboard
2. Read all support tickets
3. Summarize top 3 issues
4. Decide: Continue, iterate, or escalate
```

### Agent 2 (Code Review)
1. Verify: Metrics calculations accurate (test with known data)
2. Check: Dashboard only accessible to admin
3. Verify: Support form stores submissions
4. Check: Email template variables correct
5. Verify: Kill criteria realistic (not too harsh or lenient)

### Agent 3 (PM)

**1. Recruit 100 beta users:**

Create target list:
```markdown
# BETA_USER_LIST.md

## Target Profile
- Location: Tel Aviv
- Age: 28-40
- Goal: Serious relationship (not casual)
- Source: Personal network, friends-of-friends

## Recruitment Channels
1. Personal outreach (50 people)
   - Friends, colleagues, alumni
2. Facebook groups (30 people)
   - Tel Aviv dating/singles groups
3. Reddit (10 people)
   - r/Israel, r/TelAviv
4. LinkedIn (10 people)
   - Professional network

## Spreadsheet
| Name | Email | Source | Status | Invited | Signed Up |
|------|-------|--------|--------|---------|-----------|
| ... | ... | ... | ... | ... | ... |

Target: 100 sign-ups by Week 1
```

**2. Launch week schedule:**

```markdown
# BETA_LAUNCH_WEEK_SCHEDULE.md

## Day -3 (Thu)
- [ ] Final testing (smoke test all flows)
- [ ] Prepare invite emails
- [ ] Set up support channel

## Day -1 (Sat)
- [ ] Send invites to first 20 people (friends)
- [ ] Monitor sign-ups

## Day 1 (Sun) - LAUNCH
- [ ] Send invites to remaining 80 people
- [ ] Monitor metrics dashboard hourly
- [ ] Respond to support tickets within 2h

## Day 2-7
- [ ] Daily: Check dashboard, support queue
- [ ] Daily: Personal outreach to stuck users
- [ ] Weekly: Compile feedback summary

## Week 2
- [ ] Monday: First metrics review
- [ ] Iterate based on top issue
- [ ] Ship fix by Friday

## Week 4
- [ ] Decision checkpoint (GREEN/YELLOW/RED)
```

**3. Manual testing checklist:**

```markdown
# PRE_LAUNCH_SMOKE_TEST.md

## Test Flow (10 min)
- [ ] Sign up with Google
- [ ] Complete onboarding (basic info, prompts)
- [ ] Upload photo
- [ ] Submit profile for analysis
- [ ] Wait for analysis (or force complete)
- [ ] Browse matches (HIGH/GOOD/OTHER sections)
- [ ] Expand "How we calculated"
- [ ] Tap "Use this opener"
- [ ] Send message
- [ ] Receive reply (from test account)
- [ ] Check notification email

## Edge Cases
- [ ] No photo uploaded → photo gate shown
- [ ] No matches → empty state shown
- [ ] LLM failure → fallback works
- [ ] Network error → error state shown

## Cross-Browser
- [ ] Chrome (desktop)
- [ ] Safari (iPhone)
- [ ] Gmail (email rendering)
```

---

## Locked Policy (Architect)

| Item | Decision |
|------|----------|
| Beta size | 100 users (Tel Aviv only) |
| Dashboard access | Admin only (password-protected) |
| Support response | <24h for critical, <3 days for non-critical |
| Metrics refresh | Daily manual query (automate later) |
| Kill criteria review | Week 4 checkpoint (not earlier) |
| User communication | Weekly email update during beta |

---

## Out of Scope

- Automated dashboard (Grafana, Metabase)
- Real-time alerting (Slack bot)
- A/B testing infrastructure
- User analytics (Mixpanel, PostHog)
- Feedback voting system

---

## Acceptance Criteria

- [x] Metrics dashboard shows key numbers
- [x] Support intake form exists and works
- [x] Invite email template ready
- [x] 100-user target list created
- [x] Kill criteria documented
- [x] Launch week schedule planned
- [x] Pre-launch smoke test checklist complete

---

## Testing

No automated tests (this is operational prep).

**Manual checklist:**
1. Access metrics dashboard (admin only)
2. Submit support ticket (verify stored)
3. Send test invite email (verify rendering)
4. Run smoke test (full user flow)
5. Review kill criteria (realistic?)

---

## Launch Week Deliverables

**Day 1 (Launch):**
- Invite emails sent to 100 people
- Metrics dashboard live
- Support channel monitored

**Day 7:**
- 50+ sign-ups (50% conversion target)
- All support tickets responded
- No critical bugs

**Week 4:**
- Metrics review meeting
- Decision: GREEN/YELLOW/RED
- Next sprint planned or shutdown initiated

---

## Suggested Commits

**Admin Dashboard:**
```
feat(admin): add beta metrics dashboard

- D7 retention, message rates, opener usage
- Funnel visualization
- Support issue tracker
- Decision framework display

Sprint 43 Story 4
```

**Support:**
```
feat(support): add beta support intake form

- Issue type, description, email
- Stores in database
- Email notification to admin

Sprint 43 Story 4
```

**Documentation:**
```
docs: add beta launch plan and kill criteria

- 100-user target list
- Invite email template
- Launch week schedule
- Decision framework (GREEN/YELLOW/RED)

Sprint 43 Story 4
```

---

## Post-Launch (After Sprint 43)

**If GREEN (success):**
- Sprint 44: Onboarding simplification
- Sprint 45: Growth/viral loops
- Sprint 46: Monetization (freemium)

**If YELLOW (mixed):**
- Sprint 44: Fix top complaint
- Extend beta 4 weeks
- Reassess

**If RED (failure):**
- Post-mortem: What went wrong?
- Options:
  1. Major pivot (new approach)
  2. Shut down gracefully
  3. Open-source the code (learning project)

---

## Final Gate: Ready to Launch?

Before sending invites, verify:
- [ ] All Sprints 41-43 stories complete
- [ ] All tests passing
- [ ] Smoke test checklist green
- [ ] Support channel staffed
- [ ] Metrics dashboard accessible
- [ ] You're mentally prepared for feedback (good and bad)

**If all ✅ → LAUNCH! 🚀**

**If any ❌ → Fix before launch.**
