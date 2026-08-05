# Smart Triage Product Pivot — Sprints 41-43 Index

**Created:** August 4, 2026  
**Context:** Product pivot from "conversation-first" to "smart triage" after user validation (wife test)  
**Replaces:** Original Option C (conversation-first approach that fought human nature)

---

## 🎯 The Pivot in One Sentence

**Old:** Try to make people swipe on 6/10s by showing algorithm explanations first  
**New:** Let people swipe on attractive matches, then help them prioritize who to message

---

## 📋 Sprint Overview

| Sprint | Goal | Duration | Key Deliverable |
|--------|------|----------|-----------------|
| **41** | Photo-first UI + priority ranking | 5 days | Match browse that works WITH human nature |
| **42** | Conversation intelligence | 6 days | AI-powered openers for HIGH matches |
| **43** | Polish + launch prep | 7 days | Beta-ready product for 100 users |

**Total:** ~3 weeks from concept to beta launch

---

## Sprint 41 — Smart Triage UI

**Folder:** [`sprint-41-smart-triage-ui/`](./sprint-41-smart-triage-ui/)

### Stories
1. **Photo-first match browse** (2d) — Make photos 70% of card, explanations below fold
2. **Priority ranking** (2d) — Add HIGH/GOOD/OTHER sections, sort by score
3. **Validation testing** (1d) — Test with 5 people, document feedback
4. **Browse WHY TLDR from narrative** (2d) — List one-liner = short form of profile `matchNarrative` (kill template takeaways) — **Done**

### Key Changes
- Match cards now photo-dominant (not explanation-first)
- Matches grouped: 🔥 HIGH (message first) / ⭐ GOOD / ✨ OTHER
- Algorithm scores visible but not forced upfront
- Explanations collapsible (opt-in, not blocking)
- Browse differentiator: WHY TLDR from same narrative as profile (Story 04)

### Validation Gate
- ≥3/5 testers say they'd use this
- Priority ranking seen as helpful
- Photo-first approach validated

**Outcome:** If PASS → Sprint 42, if FAIL → reassess pivot

---

## Sprint 42 — Conversation Intelligence

**Folder:** [`sprint-42-conversation-intelligence/`](./sprint-42-conversation-intelligence/)

### Stories
1. **LLM conversation starters** (3d) — Generate contextual openers using existing LLM infra
2. **Display openers in UI** (2d) — Show on HIGH matches, pre-fill message input
3. **Track effectiveness** (1d) — Measure usage rate, edit rate, response rate

### Key Features
- HIGH priority matches get smart openers
- Example: "I saw you love hiking - have you done the Israel Trail?"
- One-tap usage → pre-fills conversation
- Cached (one per match pair)
- Fallback if LLM fails

### Success Metrics
- Usage rate >30% (users find them helpful)
- Response rate >+15% vs manual messages
- Edit rate <80% (users trust them mostly)

---

## Sprint 43 — Smart Triage Launch

**Folder:** [`sprint-43-smart-triage-launch/`](./sprint-43-smart-triage-launch/)

### Stories
1. **Algorithm transparency** (2d) — Show HOW score was calculated (life goals, personality, interests)
2. **Priority notifications** (2d) — Email when HIGH match appears
3. **Empty states polish** (1d) — No dead ends, every screen has next action
4. **Beta launch prep** (2d) — Metrics dashboard, 100-user list, kill criteria

### Launch Readiness
- Product complete (photo-first + priority + openers + transparency)
- Metrics dashboard tracking key numbers
- Support process defined
- 100-user target list (Tel Aviv, 28-40, serious daters)
- Kill criteria documented (when to pivot or shutdown)

---

## 🎯 Success Criteria (Week 4 Post-Launch)

### GREEN — Scale Up ✅
- D7 retention ≥40%
- HIGH priority message rate ≥60%
- Opener usage ≥30%
- Positive feedback ≥70%

**Action:** Expand to 500 users, invest in growth

### YELLOW — Iterate ⚠️
- D7 retention 20-39%
- Message rate 40-59%
- Mixed results

**Action:** Address top complaints, extend beta 4 weeks

### RED — Pivot or Kill ❌
- D7 retention <20%
- Message rate <40%
- Users don't engage

**Action:** Major pivot OR graceful shutdown

---

## 🔧 Technical Summary

### Backend Changes
- `priorityScore` and `priorityTier` added to match DTO
- `ConversationStarterService` for LLM openers
- `ConversationStarter` table (cache + analytics)
- `OpenerTrackingService` for effectiveness metrics
- Notification triggers for HIGH matches
- `UserNotificationPreferences` table

### Frontend Changes
- Photo-dominant match cards
- Priority sections (HIGH/GOOD/OTHER)
- Expandable compatibility breakdown
- Conversation starter UI with pre-fill
- Algorithm explainer page (`/about/algorithm`)
- Empty state components
- Notification settings page
- Admin metrics dashboard

### No Changes
- Match algorithm scoring (reuse existing)
- Database schema (minimal additions)
- Authentication/authorization
- Existing LLM infrastructure (from Sprint 22)

---

## 📊 Metrics to Track

| Metric | Definition | Target |
|--------|------------|--------|
| D7 Retention | % users who return after 7 days | ≥40% |
| Browse → Message | % who message after browsing | ≥30% |
| HIGH Priority Rate | % HIGH matches messaged | ≥60% |
| Opener Usage | % who tap "Use this opener" | ≥30% |
| Opener Response | % openers that get replies | ≥60% |
| Opener Lift | Response rate vs manual | ≥+15pp |

---

## 🚀 How to Execute

### For Each Sprint:
1. Read sprint `README.md` (overview, goals, success criteria)
2. Review `AGENT_COMMANDS.md` (command list)
3. Execute stories sequentially: `--agent 0 sprint X story Y` → agent 1 → 2 → 3
4. Each story has 4 agents:
   - Agent 0: Architect (design, lock policy)
   - Agent 1: Senior Dev (implement)
   - Agent 2: Code Review (verify quality)
   - Agent 3: PM/Contractor (test, document, close)

### Recommended Approach:
- Sprint 41 → validate → if PASS, continue
- Sprint 42 → measure opener metrics
- Sprint 43 → launch to 100 users
- Week 4: Decision checkpoint (GREEN/YELLOW/RED)

---

## 🎓 Key Learnings (From Analysis)

### What We Fixed:
1. **User validation first** — Wife test killed original thesis, informed pivot
2. **Work with human nature** — Don't fight attraction, enhance decision-making after swipe
3. **Clear value prop** — "Match on attraction, message based on compatibility"
4. **Validation gates** — Story 41.3 prevents building wrong thing

### What Still Needs Work (Future Sprints):
1. **Onboarding simplification** (Part 2 from analysis) — Still too much friction
2. **Growth strategy** (Part 4) — Cold start, viral loops, referral program
3. **Strategic focus** (Part 6) — Pick ONE language, ONE city, ONE goal
4. **Monetization** — Freemium split (deferred until product-market fit)

---

## 📁 File Structure

```
dating-api/docs/sprints/
├── sprint-41-smart-triage-ui/
│   ├── README.md
│   ├── AGENT_COMMANDS.md
│   ├── STORY_01_photo_first_browse.md
│   ├── STORY_02_priority_ranking.md
│   ├── STORY_03_validation_testing.md
│   └── STORY_04_why_tldr_from_narrative.md
│
├── sprint-42-conversation-intelligence/
│   ├── README.md
│   ├── AGENT_COMMANDS.md
│   ├── STORY_01_conversation_starters.md
│   ├── STORY_02_opener_ui.md
│   └── STORY_03_opener_analytics.md
│
└── sprint-43-smart-triage-launch/
    ├── README.md
    ├── AGENT_COMMANDS.md
    ├── STORY_01_algorithm_transparency.md
    ├── STORY_02_priority_notifications.md
    ├── STORY_03_empty_states_polish.md
    └── STORY_04_beta_launch_prep.md
```

---

## 🔗 Related Documents

- **Analysis that led to this pivot:** (this chat conversation)
- **Original architecture work:** Sprint 38-40 (god services split, repositories, match engine stages)
- **Previous product work:** Sprint 1-37 (match actions, messaging, i18n, etc.)

---

## ✅ Ready to Start?

Run the first command in another chat:

```
--agent 0 sprint 41 story 1
```

Good luck! 🚀
