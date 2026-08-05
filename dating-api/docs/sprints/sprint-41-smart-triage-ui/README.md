# Sprint 41 — Smart Triage UI (P0 Product Pivot)

**Status:** 🚧 In progress (Stories 01–02 Done; Story 03 engineering ready — human validation pending)  
**Depends on:** Sprint 40 Done  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

**Context:** Strategic pivot from "conversation-first" to "smart triage" — photos get you in the door, algorithm helps you prioritize after matching.

---

## Goal

Flip the information hierarchy: let users swipe on photos naturally (like Tinder), then use algorithm intelligence to prioritize which matches to message first.

**Core thesis:** Don't fight human nature (attraction matters). Instead, help users make better choices among people they already find attractive.

---

## Product Change

### Before (Conversation-First)
- Show match explanation upfront
- Force reading before swiping
- Algorithm tries to convince you to swipe on 6/10s

### After (Smart Triage)
- Swipe on photos naturally
- Algorithm kicks in AFTER mutual match
- Shows "Message these first" with priority ranking
- Users still see explanations, but post-match

---

## Stories

| # | Story | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 01 | [Photo-first match browse UI](./STORY_01_photo_first_browse.md) | P0 | 2d | Done |
| 02 | [Match priority ranking backend + frontend](./STORY_02_priority_ranking.md) | P0 | 2d | Done |
| 03 | [User validation testing](./STORY_03_validation_testing.md) | P0 | 1d | Engineering ready — human PENDING |

**Order:** 01 → 02 → 03 (sequential: UI foundation, then intelligence, then validate)

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Time to first swipe | ~15s (reading explanation) | <3s (photo visible) |
| Swipes per session | Low (friction) | 3-5x higher |
| Match browse completion | Users bounce early | Users swipe through all |
| Message rate on HIGH priority | N/A | >60% (vs. <30% on LOW) |

---

## Technical Scope

### Frontend (`dating-ui`)
- Match browse card: Photo-dominant layout (70% viewport)
- Match list: Priority sections (🔥 HIGH / ⭐ GOOD / ✨ OTHER)
- Collapsible explanations (keep existing LLM narrative, just moved)

### Backend (`dating-api`)
- Add `priorityScore` and `priorityTier` to match DTO
- Implement priority ranking logic (reuse existing `finalScore`)
- No algorithm changes (just surfacing what exists)

### No Changes
- Database schema (use existing scores)
- Match algorithm (Sprint 40 stages)
- LLM narratives (just repositioned in UI)

---

## Validation Plan

After implementation:
1. Create 10 test profiles with diverse attributes
2. Run through algorithm, verify priority makes sense
3. Show to 3-5 people (wife, friends): "Would you use this?"
4. Track: Do they read HIGH priority explanations? Do they skip LOW?

**Decision gate:** If validation fails (people still ignore priorities), reassess before Sprint 42.

---

## After Sprint 41

**Next:** Sprint 42 (Conversation Intelligence) — add smart opener suggestions
**Deferred:** Onboarding simplification (Sprint 44), Growth strategy (Sprint 45)
