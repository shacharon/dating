# Sprint 42 — Conversation Intelligence (P0 Product Enabler)

**Status:** ✅ Stories 1–3 Done  
**Depends on:** Sprint 41 validated (PASS or MIXED)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

**Context:** With photo-first browse and priority ranking proven, add the intelligence layer that makes your algorithm uniquely valuable: AI-generated conversation starters.

---

## Goal

Generate smart, contextual conversation openers for HIGH priority matches using LLM, making it easy for users to start conversations with their best matches.

**Core value:** "We don't just tell you WHO to message—we tell you WHAT to say."

---

## Product Enhancement

### Current State (After Sprint 41)
- Users see HIGH priority matches
- They know THESE are their best matches
- But: Starting conversation still hard ("Hey" doesn't work)

### Target State (After Sprint 42)
```
┌─────────────────────────────────┐
│ 🔥 Sarah, 32 (92% match)        │
│ [Photo]                         │
│                                 │
│ You both want kids and love     │
│ hiking. Strong personality fit. │
│                                 │
│ 💬 TRY THIS:                    │
│ "I saw you love hiking - have   │
│  you done the Israel Trail?"    │
│                                 │
│ [Use this opener] [Message]     │
└─────────────────────────────────┘
```

**When user taps "Use this opener":**
- Opens conversation
- Pre-fills message with suggested opener
- User can edit or send as-is

---

## Stories

| # | Story | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 01 | [LLM conversation starter generation](./STORY_01_conversation_starters.md) | P0 | 3d | Done |
| 02 | [Display openers in UI + pre-fill](./STORY_02_opener_ui.md) | P0 | 2d | Done |
| 03 | [Track opener usage + effectiveness](./STORY_03_opener_analytics.md) | P1 | 1d | Done |

**Order:** 01 (backend LLM) → 02 (frontend display) → 03 (analytics)

---

## Success Metrics

| Metric | Target | Why |
|--------|--------|-----|
| Opener usage rate | >30% | Users find them helpful |
| Message send rate (with opener) | >80% | Users don't delete them |
| Response rate (opener vs. manual) | >+15% | They actually work better |
| Generation time | <2s | Fast enough for real-time |
| Opener quality (manual review) | ≥8/10 | Natural, not robotic |

---

## Technical Scope

### Backend (`dating-api`)
- New service: `ConversationStarterService`
- Reuse existing `LlmModule` (from Sprint 22 match narratives)
- Generate openers based on:
  - Shared interests
  - Match compatibility breakdown
  - Writing prompt answers
- Cache openers (one per match pair, invalidate on profile update)

### Frontend (`dating-ui`)
- Display suggested opener on HIGH priority matches
- "Use this opener" button → pre-fills conversation input
- Track: Usage, edits, send rate

### Integration
- Link to existing conversation flow (`/dating/conversations/[id]`)
- Pass opener as URL param or session state

---

## Out of Scope (Defer)

- Opener for GOOD/OTHER priority (only HIGH for v1)
- Multiple opener options (just 1 per match)
- User feedback on opener quality (defer to Sprint 43)
- Opener regeneration (defer)
- Conversation AI coaching (way future)

---

## Risk Mitigation

**Risk 1: LLM generates bad openers**
- **Mitigation:** Manual review sample of 50 before launch
- **Fallback:** If LLM fails, hide opener (don't show garbage)

**Risk 2: Users edit openers heavily**
- **Mitigation:** Track edit rate, learn what to improve
- **Acceptable:** 30-50% edit rate (they're starting points)

**Risk 3: Openers feel robotic**
- **Mitigation:** Prompt engineering focuses on natural, casual tone
- **Test:** Show to wife, friends—do they sound human?

---

## LLM Cost Estimate

**Assumptions:**
- 100 active users
- 5 HIGH priority matches each = 500 matches
- 1 opener generation per match
- OpenAI GPT-4-turbo: ~$0.01/generation

**Cost:** ~$5/month for 100 users (negligible)

**Optimization:** Cache openers aggressively (only regen on profile update)

---

## Validation Plan

After implementation:
1. Generate 50 test openers (diverse profiles)
2. Manual review: Do they sound natural? Relevant?
3. Show to 5 people: "Would you send this?"
4. Track usage rate in beta (target >30%)
5. Compare response rates (opener vs. manual)

**Decision gate:** If usage <10% or quality bad → reassess LLM prompt or feature

---

## After Sprint 42

**Next:** Sprint 43 (Polish + Notifications) — priority match notifications, algorithm transparency, visual polish

**Deferred to Sprint 44+:**
- Onboarding simplification (Part 2 from analysis)
- Growth strategy (Part 4 from analysis)
- Monetization features (freemium split)
