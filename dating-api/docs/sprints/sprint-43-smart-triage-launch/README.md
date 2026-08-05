# Sprint 43 — Smart Triage Polish & Go-Live (P0 Launch Readiness)

**Status:** 📋 Planned  
**Depends on:** Sprint 42 complete + positive opener metrics  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

**Context:** Sprints 41-42 built the Smart Triage core. Sprint 43 polishes the experience, adds differentiation features, and prepares for beta launch.

---

## Goal

Polish the Smart Triage experience and add trust-building features that make the algorithm's value visible and credible to users.

**Launch readiness:** After Sprint 43, the product is ready for 100-user beta in Tel Aviv.

---

## Product Completeness

### After Sprint 42 (Current)
- ✅ Photo-first match browse
- ✅ Priority ranking (HIGH / GOOD / OTHER)
- ✅ Conversation starters for HIGH matches
- ✅ Analytics tracking effectiveness

### After Sprint 43 (Target)
- ✅ Algorithm transparency (build trust)
- ✅ Priority match notifications (bring users back)
- ✅ Empty states polish (better onboarding)
- ✅ Success metrics dashboard (internal validation)

---

## Stories

| # | Story | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 01 | [Algorithm transparency UI](./STORY_01_algorithm_transparency.md) | P0 | 2d | Planned |
| 02 | [Priority match notifications](./STORY_02_priority_notifications.md) | P1 | 2d | Planned |
| 03 | [Empty states & onboarding polish](./STORY_03_empty_states_polish.md) | P1 | 1d | Planned |
| 04 | [Beta launch preparation](./STORY_04_beta_launch_prep.md) | P0 | 2d | Planned |

**Order:** 01 (transparency) → 02 (notifications) → 03 (polish) → 04 (launch prep) — can parallelize 01-03 if multiple devs

---

## Success Metrics

| Metric | Pre-Sprint 43 | Target Post-Sprint 43 |
|--------|---------------|------------------------|
| User understanding of algorithm | Low (black box) | High (transparent breakdown) |
| Return rate (notifications) | Organic only | 2x via priority match alerts |
| Onboarding completion | Unknown | >80% reach match browse |
| Beta launch readiness | No | Yes (100 users, Tel Aviv) |

---

## Scope

### What's In
- Algorithm explainability (compatibility breakdown)
- Push/email notifications for HIGH priority matches
- Empty state improvements (no matches, photo gate, etc.)
- Beta launch checklist (100 users, metrics dashboard)

### What's Out (Defer to Sprint 44+)
- Onboarding simplification (still essays for now)
- Freemium/monetization (all free in beta)
- Growth mechanics (referral program)
- Advanced features (filters, boosts, read receipts)

---

## Launch Criteria (Sprint 43 Exit Gate)

**Product:**
- [x] Smart Triage UX complete (Sprints 41-43)
- [x] Algorithm transparency visible to users
- [x] Notifications working (HIGH priority match alerts)
- [x] Empty states polished (no dead ends)

**Technical:**
- [x] All Sprints 41-43 tests passing
- [x] No critical bugs in match flow
- [x] Analytics dashboard tracking key metrics
- [x] Error handling robust (LLM failures don't break UX)

**Operational:**
- [x] 100-user target list (Tel Aviv, friends/network)
- [x] Invite email template ready
- [x] Support process defined (how to handle feedback)
- [x] Kill criteria documented (when to pivot/shutdown)

**Metrics Dashboard:**
- [x] D1, D7, D30 retention
- [x] Match browse → message conversion
- [x] HIGH priority message rate
- [x] Opener usage rate
- [x] Response rates (opener vs manual)

---

## Risk Mitigation

### Risk 1: Beta users abandon quickly
- **Mitigation:** Notifications bring them back (Story 2)
- **Fallback:** Personal outreach, iterate fast

### Risk 2: Algorithm transparency confuses users
- **Mitigation:** User testing before ship (Story 1)
- **Fallback:** Hide advanced breakdown, show simple score only

### Risk 3: Not enough HIGH priority matches
- **Mitigation:** Tune thresholds (lower from 85 to 80 if needed)
- **Fallback:** Show GOOD matches in "Message these" section too

### Risk 4: Beta users are low quality (friends who don't engage)
- **Mitigation:** Target serious daters only (not just any 100 people)
- **Fallback:** Replace inactive users after Week 1

---

## After Sprint 43

**Beta launch week:**
1. Invite 100 users (Tel Aviv, 28-40, serious daters)
2. Daily monitoring (dashboard, support channel)
3. Weekly metrics review
4. Rapid iteration based on feedback

**Sprint 44+ roadmap (based on beta results):**
- Part 2: Onboarding simplification (if drop-off high)
- Part 4: Growth strategy (viral loops, referral program)
- Part 6: Monetization (freemium split, premium features)
- New features based on user requests

**Decision point (Week 4 of beta):**
- **Success:** D7 >40%, opener usage >30%, positive feedback → Scale up
- **Mixed:** D7 20-40% → Iterate, extend beta
- **Failure:** D7 <20% → Reassess pivot or shut down
