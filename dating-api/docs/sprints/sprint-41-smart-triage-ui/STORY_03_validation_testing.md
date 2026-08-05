# Story 03 — User validation testing

**Sprint 41 · Status: Engineering ready — human validation PENDING**  
**Priority:** P0 (validation gate)  
**Estimated effort:** 1 day  
**Dependencies:** Stories 1 & 2 complete  
**Repo:** Both (testing full UX flow)  
**Risk:** Low (non-coding, but critical decision gate)  
**Handoffs:** `handoffs/STORY_03_validation_testing/agent-*.md`  
**Architect:** [handoffs/STORY_03_validation_testing/agent-0-architect.md](./handoffs/STORY_03_validation_testing/agent-0-architect.md)  
**Dev:** [handoffs/STORY_03_validation_testing/agent-1-dev.md](./handoffs/STORY_03_validation_testing/agent-1-dev.md)  
**CR:** [handoffs/STORY_03_validation_testing/agent-2-cr.md](./handoffs/STORY_03_validation_testing/agent-2-cr.md)  
**PM:** [handoffs/STORY_03_validation_testing/agent-3-pm.md](./handoffs/STORY_03_validation_testing/agent-3-pm.md)  
**Product decision:** see [VALIDATION_RESULTS.md](./VALIDATION_RESULTS.md) (`PENDING_OPERATOR`)

---

## Objective

Validate the Smart Triage pivot with real humans (wife, friends) before proceeding to Sprint 42. Gather qualitative feedback and quantitative metrics to confirm the pivot resonates.

## Why

You've built photo-first browse + priority ranking based on theory. Before investing in conversation starters (Sprint 42), validate that users:
1. Actually like the photo-first approach
2. Find priority rankings helpful (not ignored)
3. Would message HIGH priority matches more

**This is the kill/continue decision gate.**

---

## Current State

After Stories 1 & 2:
- Match browse is photo-dominant
- Matches sorted into HIGH / GOOD / OTHER sections
- Algorithm scores visible but not yet proven valuable

---

## Target State

**Documented answers to:**
1. Do users swipe faster with photo-first? (quantitative)
2. Do users expand "Why we matched" on HIGH priority? (behavioral)
3. Do users say they'd message HIGH first? (qualitative)
4. What feedback/concerns do they have? (qualitative)

**Decision criteria:**
- **PASS:** ≥3/5 testers say they'd use this, find priorities helpful
- **FAIL:** Testers ignore priorities, don't see value → reassess pivot

---

## Scope / Tasks

### Agent 0 (Architect)
1. ✅ Design test protocol:
   - How many test profiles to create? → **2 viewers + 10 candidates** (primary Viewer A pool)
   - What diversity (age, interests, scores)? → ages 26–38, varied interests/life goals; scores **2 HIGH / 4 GOOD / 4 OTHER**
   - What questions to ask testers? → locked script in architect handoff (observe → message-first → sections → HIGH-vs-photo → frustration)
2. ✅ Define success metrics (quantitative + qualitative) — stopwatch + expand rates + ≥3/5 positive
3. ✅ Lock test environment → **localhost only** (local Postgres + local photo storage); never prod/staging real users
4. ✅ Analytics → human worksheet **primary**; reuse existing `emitProductLog`; verify script for tier counts; **no** new persisted analytics

### Agent 1 (Senior Dev)
1. ✅ Create 10 diverse test profiles (×2 pools: female for A, male for B)
   - Mix of HIGH/GOOD/OTHER priority (2/4/4 via `MatchListRank`)
   - Varied photos, interests, life goals
   - Represent realistic dating pool
2. ✅ Seed test data in dev database (`npm run seed:sprint41-validation`)
3. ✅ Create 2 viewer test accounts (fixed session tokens)
4. ✅ Materialize ranks (upserted scores; not live engine luck)
5. ✅ Verify: Priority distribution 2/4/4 (`npm run verify:sprint41-validation` PASS)
6. ✅ Analytics: verify script + reuse existing `emitProductLog` (no new persistence)

### Agent 2 (Code Review)
1. ✅ Review test profiles for realism (not all 10/10s or edge cases)
2. ✅ Verify analytics capture plan (what to measure)
3. ✅ Check: Test doesn't pollute production data
4. ✅ Spot-check: HIGH priority matches make sense (shared goals, interests)
5. ✅ CR fix: materialized list overlays `MatchListRank` score/tier (otherwise UI all OTHER)

### Agent 3 (PM)
1. ✅ Engineering gate: verify fixtures, regression suites, live Viewer A list smoke (2/4/4)
2. ⏳ **Operator:** Run 5 × ~10 min human sessions (worksheet + script below)
3. ⏳ Fill quantitative + qualitative sections in `VALIDATION_RESULTS.md`
4. ⏳ Record Decision PASS / MIXED / FAIL — **required before Sprint 42**

#### Test Protocol

**Participants:** 5 people (wife + 4 friends/family)
**Duration:** 10 min per person
**Environment:** Localhost on laptop/phone

**Setup:**
1. Use Viewer A session cookie from `TEST_PROFILES.md` (shared fixture pool)
2. Pre-seeded 10 matches (mix of priorities) — `npm run seed:sprint41-validation`
3. Start on `/dating/me-matches`

**Tasks:**
1. "This is a dating app I'm building. Browse these matches naturally."
2. (Observe silently — no prompting)
3. After 2-3 min: "Which match would you message first? Why?"
4. "Did you notice the priority sections? Were they helpful?"
5. "Would you swipe right on someone just because they're HIGH priority, even if photo is 6/10?"
6. "Any confusion or frustration?"

**Capture:**
- Time to first swipe
- Do they expand "Why we matched"?
- Do they read HIGH priority explanations?
- Do they ignore GOOD/OTHER sections?
- Verbal feedback (record or take notes)

#### Quantitative Metrics

Track per tester:
- **Swipe speed:** Seconds from page load to first like/pass
- **Explanation expansion rate:** % of matches where they expand
- **Priority section engagement:** Do they open GOOD/OTHER?
- **Stated behavior:** "Which would you message first?" → HIGH vs. OTHER

#### Qualitative Feedback

Ask open-ended:
- "What do you like about this?"
- "What's confusing or annoying?"
- "Would you use this over Tinder? Why/why not?"
- "Does the priority ranking feel accurate or arbitrary?"

#### Document Results

Create `VALIDATION_RESULTS.md`:

```markdown
# Sprint 41 Validation Results

**Date:** [Date]
**Participants:** 5 (1 wife, 4 friends)
**Test duration:** 10 min each

## Quantitative Results

| Metric | Target | Actual |
|--------|--------|--------|
| Avg time to first swipe | <5s | 3.2s ✅ |
| Explanation expansion (HIGH) | >50% | 60% ✅ |
| Explanation expansion (OTHER) | <20% | 10% ✅ |
| Would message HIGH first | >60% | 80% ✅ |

## Qualitative Feedback

**What worked:**
- "Photos load fast, feels like Tinder"
- "Priority makes sense, saves time"
- "I like that I can ignore low matches"

**What didn't work:**
- "Score percentages feel arbitrary"
- "Some HIGH priority photos weren't my type"
- "Want to see more photos per match"

**Concerns:**
- "Would I trust the algorithm?"
- "What if all my HIGH matches reject me?"

## Recommendations

1. ✅ Proceed to Sprint 42 (conversation starters)
2. ⚠️ Consider hiding exact score (show tier only)
3. 📝 Add photo gallery (multiple photos per match)
4. 📝 Add algorithm transparency explainer
```

---

## Locked Policy (Architect)

| Item | Decision |
|------|----------|
| Pass threshold | ≥3/5 testers positive + metrics hit targets → PASS; 2–3/5 → MIXED; ≤1/5 → FAIL |
| Test environment | **Localhost only** (UI + API + local Postgres). Abort seed if `NODE_ENV=production` or prod-like `DATABASE_URL` |
| Test data | Synthetic `s41val_*` profiles only; `--cleanup` scoped to prefix; local photo files |
| Fixture mix | Viewer A sees **10** candidates: **2 HIGH / 4 GOOD / 4 OTHER** via upserted `MatchListRank` (not live engine luck) |
| Viewers | **2** accounts with fixed session tokens (protocol may use Viewer A for all 5 sessions) |
| Thresholds / UI | **Frozen** — do not retune 85/70 or change browse chrome in this story |
| Analytics | Stopwatch + observer worksheet **primary**; existing client `emitProductLog`; verify script for distribution; **no** new DB/server analytics |
| Docs | `TEST_PROFILES.md` + template `VALIDATION_RESULTS.md` (+ optional session worksheet) |
| Decision gate | If FAIL → pause Sprint 42, reassess pivot |

---

## Acceptance Criteria

- [x] 10 diverse test profiles created
- [ ] 5 people tested the UX (10 min each) — **operator**
- [ ] Quantitative metrics captured (swipe speed, expansions) — **operator**
- [ ] Qualitative feedback documented — **operator**
- [x] `VALIDATION_RESULTS.md` written (engineering filled; human Decision pending)
- [ ] Decision made: Proceed to Sprint 42 OR pivot again — **PENDING_OPERATOR**

---

## Possible Outcomes

### Outcome 1: PASS (Proceed to Sprint 42) ✅
- ≥3/5 testers positive
- Priority ranking seen as valuable
- Photo-first approach validated
- **Action:** Start Sprint 42 (conversation starters)

### Outcome 2: MIXED (Proceed with tweaks) ⚠️
- 2-3/5 testers positive
- Some confusion, but fixable
- **Action:** Address top concern (e.g., hide score %), then Sprint 42

### Outcome 3: FAIL (Reassess pivot) ❌
- ≤1/5 testers positive
- Priority ignored, not seen as valuable
- **Action:** STOP. Reassess core thesis. Options:
  - Pivot again (back to conversation-first?)
  - Change priority tiers (too aggressive/conservative?)
  - Fundamentally rethink product

---

## Testing

No unit tests (this is human validation).

**Manual only:**
- 5 people × 10 min = 50 min total testing
- 1-2 hours documenting + analyzing
- Half day total

---

## Suggested Documentation

Create in sprint folder:

**`VALIDATION_RESULTS.md`** (template above)

**`TEST_PROFILES.md`** (for reproducibility):
```markdown
# Test Profiles Created

## Viewer Profiles
- TestUser1 (Male, 32, wants kids, tech industry)
- TestUser2 (Female, 29, wants kids, creative field)

## Candidate Profiles (for TestUser1)
1. Sarah, 30 — HIGH priority (92%) — wants kids, tech
2. Maya, 28 — HIGH priority (88%) — wants kids, similar interests
3. Rachel, 31 — GOOD priority (76%) — some alignment
...
10. Dana, 27 — OTHER (58%) — low compatibility

[Include basic attributes: age, gender, interests, life goals]
```

---

## Follow-Up Actions

Based on validation results:

**If HIGH priority ignored:**
- Consider hiding score, show only "Recommended" label
- Add social proof: "93% of couples with this score are still together"

**If photos not enough:**
- Add multi-photo gallery (swipe within card)
- Add video prompt support

**If algorithm not trusted:**
- Add transparency explainer page
- Show how score is calculated

**If pivot validated:**
- Proceed to Sprint 42 (conversation intelligence)
- Start planning Sprint 43 (polish + notifications)

---

## Suggested Commit

```
test(product): sprint 41 user validation testing

- Created 10 test profiles (diverse priorities)
- Tested with 5 users (wife + friends)
- Documented results in VALIDATION_RESULTS.md
- Decision: [PASS/MIXED/FAIL]

Sprint 41 Story 3
```

---

## Critical Note

**This story is NON-NEGOTIABLE.** Do not skip to Sprint 42 without validation.

Building conversation starters (Sprint 42) is 1 week of work. If the priority ranking isn't valuable to users, that work is wasted.

**Validate first. Build second.**
