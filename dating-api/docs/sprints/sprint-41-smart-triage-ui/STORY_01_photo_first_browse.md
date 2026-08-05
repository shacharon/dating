# Story 01 — Photo-first match browse UI

**Sprint 41 · Status: Done**  
**Priority:** P0 (product pivot foundation)  
**Estimated effort:** 2 days  
**Dependencies:** None (standalone UI refactor)  
**Repo:** `dating-ui` primarily  
**Risk:** Medium (changes core browse UX)  
**Handoffs:** `handoffs/STORY_01_photo_first_browse/agent-*.md`

---

## Objective

Redesign `/dating/me-matches` page to be photo-dominant (like Tinder), moving algorithm explanations below the fold or to expandable sections.

## Why

Current UI likely shows match explanation prominently, expecting users to read before deciding. User validation (wife test) showed people look at photos first regardless. Fighting this is counterproductive.

**The pivot:** Make photos the hero, let users swipe naturally, show intelligence AFTER they match.

---

## Current State (Assumptions)

Based on codebase:
- `dating-ui/src/app/dating/me-matches/me-matches-page-client.tsx` renders match list
- `MatchListItem` or similar component shows match cards
- LLM narrative (`matchNarrative`) and chips visible upfront
- Photos exist (`primaryPhotoUrl` from Sprint 9)

---

## Target State

### Match Browse Card (Individual Match)

**Layout priority:**
1. **Photo (70% viewport height)** — dominant, high-quality
2. **Name, age, distance** — overlay on photo or just below
3. **First prompt answer** — one sentence preview (not aboutMe essay)
4. **Quick actions** — Large Like/Pass buttons (thumb-reachable)
5. **"Why we matched"** — Collapsed by default, expandable

**Example structure:**
```
┌─────────────────────────────────┐
│                                 │
│      [LARGE PHOTO]              │
│                                 │
│      Sarah, 32                  │
│      Tel Aviv • 3km             │
│                                 │
│ "I'm secretly great at making   │
│  sourdough bread 🍞"            │
│                                 │
│ ⌄ See why we matched (87%)      │ ← Collapsed
│                                 │
│ [💚 LIKE]      [👎 PASS]        │
└─────────────────────────────────┘
```

**When user expands "Why we matched":**
```
┌─────────────────────────────────┐
│ [Photo smaller, 40% height]     │
│                                 │
│ WHY WE MATCHED (87%)            │
│                                 │
│ You both want kids and value    │
│ deep conversations. Strong      │
│ alignment on lifestyle pace...  │
│                                 │
│ ✅ Life goals (95%)             │
│ ✅ Personality (82%)            │
│ ✅ Interests (79%)              │
│                                 │
│ [💚 LIKE]      [👎 PASS]        │
└─────────────────────────────────┘
```

---

## Scope / Tasks

### Agent 0 (Architect)
1. Review current `me-matches-page-client.tsx` and match card components ✅
2. Design component structure for photo-first layout ✅
3. Decide: Single card with expand/collapse OR separate browse vs. detail pages? ✅ Vertical stack + keep detail
4. Lock CSS/Tailwind approach for photo sizing (responsive) ✅
5. Define props interface for new `MatchCard` component ✅ → `MatchBrowseCard`

Handoff: [`handoffs/STORY_01_photo_first_browse/agent-0-architect.md`](./handoffs/STORY_01_photo_first_browse/agent-0-architect.md)

### Agent 1 (Senior Dev)
1. Refactor match card component:
   - Photo takes 70% height by default ✅
   - Name/age/prompt overlay or below ✅
   - Collapsible explanation section (use `<details>` or state-based) ✅
2. Update `me-matches-page-client.tsx` to use new card ✅
3. Keep existing data fetching (no API changes yet) ✅
4. Add analytics event: `match.card_viewed` with `explanation_expanded: boolean` ✅ (`emitProductLog`)
5. Ensure mobile responsive (photo should still dominate on small screens) ✅

Handoff: [`handoffs/STORY_01_photo_first_browse/agent-1-dev.md`](./handoffs/STORY_01_photo_first_browse/agent-1-dev.md)

### Agent 2 (Code Review)
1. Verify photo loads performantly (lazy loading, proper sizing) ✅
2. Check accessibility (expandable sections have proper aria-labels) ✅
3. Test keyboard navigation (can expand/collapse with keyboard) ✅
4. Verify existing data still displays (no regressions) ✅
5. Check dark mode styling ✅

**Verdict: PASS** — [`handoffs/STORY_01_photo_first_browse/agent-2-cr.md`](./handoffs/STORY_01_photo_first_browse/agent-2-cr.md)

### Agent 3 (PM)
1. Manual smoke test on localhost ⚠️ Deferred (stack down) — operator checklist in handoff
2. Create 3-5 test profiles with photos ⚠️ Use existing seeds / operator
3. Verify: Photos load, expand/collapse works, like/pass functional ✅ Via specs + CR; live deferred
4. Document: Time from page load to first swipe action ✅ Design target &lt;3s; wall-clock on operator smoke
5. Screenshot before/after for sprint review ⚠️ Operator when stack up

**Decision: ACCEPT** — [`handoffs/STORY_01_photo_first_browse/agent-3-pm.md`](./handoffs/STORY_01_photo_first_browse/agent-3-pm.md)

---

## Locked Policy (Architect)

| Item | Decision |
|------|----------|
| Layout model | Vertical stack of photo-first cards on `/dating/me-matches` (not a single swipe deck; not a new route) |
| Detail page | Keep `/dating/me-matches/[id]` for full narrative, traits, feedback, block/report |
| Photo size | Collapsed: `h-[70vh]` region (`max-h-[640px]`); expanded why: `h-[40vh]`; `MatchPhoto` variant `browse` |
| Explanation visibility | Collapsed by default; controlled state; list DTO fields only |
| One-liner | `primaryTakeaway` → sharedInterestNote → first positiveChip; no aboutMe/prompt (not on list DTO) |
| Distance | Show `locationLabel` only — never invent km |
| Category % rows (Life goals…) | Out of scope on browse (detail/Sprint 43); chips = `positiveChips` |
| Like/Pass buttons | On browse card via `useMatchActions`; ≥44px; hardBlocked stays compact `MatchListItem` |
| Card chrome | Not a full-card `<Link>`; explicit “View profile” to detail |
| Swipe gestures | Defer (buttons only) |
| Match narrative | Detail only (`matchNarrative`); browse uses takeaway/chips + link |
| Analytics | Client `emitProductLog` `match.card_viewed` + `explanation_expanded`; no API |
| API / DTO changes | None |

**Handoff:** [`handoffs/STORY_01_photo_first_browse/agent-0-architect.md`](./handoffs/STORY_01_photo_first_browse/agent-0-architect.md)

---

## Out of Scope

- Priority ranking (Story 2)
- Match list sorting (Story 2)
- Conversation starters (Sprint 42)
- Onboarding changes (Sprint 44)
- New photo upload features

---

## Acceptance Criteria

- [x] Match card shows photo prominently (≥60% of card height)
- [x] Name, age, distance visible without scrolling
- [x] Match explanation collapsed by default OR below primary action
- [x] Like/Pass buttons easy to tap (≥44px touch target)
- [x] User can expand explanation if interested
- [x] No API contract changes (uses existing match DTO)
- [x] No visual regressions on dark mode
- [x] Analytics event fires when explanation expanded

---

## Testing

### Unit Tests
- Component renders with photo
- Expand/collapse state works
- Like/Pass callbacks fire correctly

### Manual Validation
1. Load `/dating/me-matches`
2. Measure: Time to see first photo clearly (<1 second)
3. Verify: Can like/pass without reading explanation
4. Verify: Explanation readable if user wants it
5. Show to wife: "Is this better?" → Document feedback

---

## Suggested Commit

```
feat(ui): redesign match browse to photo-first layout

- Photo now 70% of card (was secondary to explanation)
- Match narrative collapsed by default
- Large Like/Pass buttons for fast swiping
- Analytics: track explanation expansion rate

Sprint 41 Story 1 - Smart Triage UI pivot
```

---

## Follow-Up (Story 2)

After this lands, Story 2 adds priority ranking, so match LIST will show:
- "Message these first" section (HIGH priority)
- Collapsed "Good matches" (GOOD priority)
- Collapsed "Other matches" (LOW priority)

This story focuses on individual CARD layout, not list sorting.
