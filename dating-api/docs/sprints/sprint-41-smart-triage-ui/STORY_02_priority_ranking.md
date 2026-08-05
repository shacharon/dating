# Story 02 — Match priority ranking backend + frontend

**Sprint 41 · Status: Planned**  
**Priority:** P0 (core pivot feature)  
**Estimated effort:** 2 days  
**Dependencies:** Story 1 (photo-first cards ready)  
**Repo:** Both `dating-api` (backend) and `dating-ui` (frontend)  
**Risk:** Medium (touches match algorithm surface, but no scoring changes)  
**Handoffs:** `handoffs/STORY_02_priority_ranking/agent-*.md`

---

## Objective

Surface existing match scores as "priority tiers" (HIGH / GOOD / OTHER) and display matches in ranked sections: "Message these first" → "Good matches" → "Other matches".

## Why

The Smart Triage pivot thesis: Users swipe on attractive people, then algorithm helps them prioritize which matches to message first. Without priority ranking, algorithm intelligence is invisible.

**This story makes the algorithm valuable AFTER the swipe.**

---

## Current State

Backend:
- Match comparison produces `finalScore` (0-100 range)
- `MatchListRank` table stores scores per viewer-candidate pair
- `/api/v1/me-matches` returns matches (probably unsorted or chronological)

Frontend:
- `me-matches-page-client.tsx` displays all matches in flat list
- No priority indicators visible

---

## Target State

### Backend (`dating-api`)

**Add to match DTO:**
```typescript
// In src/matches/dto/match-*.dto.ts
{
  ...existing fields,
  priorityScore: number,        // Same as finalScore (0-100)
  priorityTier: 'HIGH' | 'GOOD' | 'OTHER'
}
```

**Priority tier logic:**
```typescript
function calculatePriorityTier(score: number): 'HIGH' | 'GOOD' | 'OTHER' {
  if (score >= 85) return 'HIGH';
  if (score >= 70) return 'GOOD';
  return 'OTHER';
}
```

**API response structure:**
```typescript
GET /api/v1/me-matches
{
  status: 'ready',
  matches: {
    high: [Match, Match],      // priorityTier === 'HIGH'
    good: [Match, Match, ...], // priorityTier === 'GOOD'
    other: [Match, ...]        // priorityTier === 'OTHER'
  },
  viewerProfileAnalysisStale: boolean
}
```

**OR keep flat array (simpler):**
```typescript
{
  status: 'ready',
  matches: [Match, Match, ...],  // sorted by priorityScore DESC
  viewerProfileAnalysisStale: boolean
}
```

Architect decides: Grouped vs. flat+sorted. **Recommendation: Flat+sorted** (frontend can group).

---

### Frontend (`dating-ui`)

**Match list with sections:**
```tsx
// In me-matches-page-client.tsx

const highPriority = matches.filter(m => m.priorityTier === 'HIGH');
const good = matches.filter(m => m.priorityTier === 'GOOD');
const other = matches.filter(m => m.priorityTier === 'OTHER');

return (
  <div className="match-list">
    {highPriority.length > 0 && (
      <section className="priority-section">
        <h2 className="section-header">
          🔥 Message These First
          <span className="count">({highPriority.length})</span>
        </h2>
        <p className="section-description">
          Highest compatibility based on life goals, personality, and interests.
        </p>
        <div className="match-cards">
          {highPriority.map(m => <MatchCard key={m.id} match={m} priority="high" />)}
        </div>
      </section>
    )}

    {good.length > 0 && (
      <section className="priority-section collapsible">
        <button onClick={() => toggleSection('good')} className="section-header">
          ⭐ Good Matches
          <span className="count">({good.length})</span>
          <span className="chevron">{goodExpanded ? '⌄' : '›'}</span>
        </button>
        {goodExpanded && (
          <div className="match-cards">
            {good.map(m => <MatchCard key={m.id} match={m} priority="good" />)}
          </div>
        )}
      </section>
    )}

    {other.length > 0 && (
      <section className="priority-section collapsible">
        <button onClick={() => toggleSection('other')} className="section-header">
          ✨ Other Matches
          <span className="count">({other.length})</span>
          <span className="chevron">{otherExpanded ? '⌄' : '›'}</span>
        </button>
        {otherExpanded && (
          <div className="match-cards">
            {other.map(m => <MatchCard key={m.id} match={m} priority="other" />)}
          </div>
        )}
      </section>
    )}
  </div>
);
```

**Match card visual indicators:**
- HIGH priority: Subtle glow or accent border
- Score badge: "🎯 87%" visible on card
- Different card heights? (Architect decides)

---

## Scope / Tasks

### Agent 0 (Architect)
1. Review `MeMatchesService.getMyMatches()` — where does sorting happen?
2. Decide API response structure: Grouped vs. flat+sorted?
3. Define priority tier thresholds (85/70 ok? or 90/75?)
4. Lock DTO changes (`priorityScore`, `priorityTier`)
5. Design frontend section expand/collapse UX
6. Analytics: Which events to track?

### Agent 1 (Senior Dev)

**Backend:**
1. Add `calculatePriorityTier()` helper
2. Update match DTO to include `priorityScore` and `priorityTier`
3. Modify `getMyMatches()` to:
   - Add priority fields
   - Sort by `priorityScore` DESC
4. Update existing tests (match DTO changes)
5. Manual test: GET `/api/v1/me-matches` returns priority fields

**Frontend:**
1. Update match types to include `priorityScore` and `priorityTier`
2. Refactor `me-matches-page-client.tsx`:
   - Group matches by tier
   - Render sections (HIGH expanded, GOOD/OTHER collapsed)
3. Add expand/collapse state for sections
4. Style priority indicators (🔥⭐✨ emojis + colors)
5. Add analytics events:
   - `match.priority_section_viewed` (which tier)
   - `match.priority_section_expanded` (user curiosity)

### Agent 2 (Code Review)
1. Verify priority tier logic matches product intent
2. Check: HIGH priority threshold not too aggressive (users get ≥1-3 HIGH)
3. Verify: Sort order correct (highest score first)
4. Test: Empty states (no HIGH matches, no matches at all)
5. Check: Analytics events fire correctly
6. Verify: No performance regression (sorting 100+ matches)

### Agent 3 (PM)
1. Create diverse test profiles (some HIGH, some LOW)
2. Manual smoke:
   - HIGH section shows best matches
   - Scores make intuitive sense
   - Can expand/collapse sections
3. Measure: What % of test matches land in each tier?
   - Target: ~20% HIGH, ~40% GOOD, ~40% OTHER
   - If all HIGH or all OTHER → thresholds need tuning
4. Document: Priority distribution for sprint review

---

## Locked Policy (Architect)

| Item | Decision |
|------|----------|
| Priority tiers | HIGH ≥85, GOOD ≥70, OTHER <70 (tune if needed) |
| Sorting | Descending by `priorityScore` (highest first) |
| Score visibility | Show on card (e.g., "🎯 87%") |
| Section defaults | HIGH expanded, GOOD/OTHER collapsed |
| API change | Backward compatible (old clients ignore new fields) |
| Algorithm changes | **None** — reuse existing `finalScore` |

---

## Out of Scope

- Conversation starters (Sprint 42)
- Push notifications on HIGH match (Sprint 43)
- Premium features (boost, unlimited likes)
- Swipe gestures (defer)
- Match filtering by tier

---

## Acceptance Criteria

- [x] Backend returns `priorityScore` and `priorityTier` for each match
- [x] Matches sorted by score (highest first)
- [x] Frontend renders 3 sections: HIGH / GOOD / OTHER
- [x] HIGH section expanded by default
- [x] GOOD/OTHER sections collapsible
- [x] Priority distribution reasonable (~20/40/40 split)
- [x] Analytics tracks section views and expansions
- [x] No scoring algorithm changes (uses existing `finalScore`)
- [x] Existing tests pass (DTO changes handled)

---

## Testing

### Unit Tests
**Backend:**
- `calculatePriorityTier()` returns correct tier for edge cases (84.9, 85, 69.9, 70)
- Match DTO serialization includes new fields

**Frontend:**
- Matches grouped correctly by tier
- Expand/collapse state works
- Empty states render (no HIGH matches)

### Integration Test
1. Create 2 viewer profiles
2. Create 10 candidate profiles (mix of HIGH/GOOD/OTHER)
3. Run matching algorithm
4. GET `/api/v1/me-matches`
5. Verify: Matches returned with priority fields
6. Verify: Frontend renders sections correctly

### Manual Validation
1. Load `/dating/me-matches` with test data
2. Verify: HIGH priority matches at top, make sense
3. Verify: Can expand GOOD/OTHER sections
4. Ask wife: "Do these priorities feel right?"
5. Document feedback for tuning thresholds

---

## Tuning Triggers

**If priority distribution is skewed:**

| Issue | Threshold Adjustment |
|-------|---------------------|
| Too many HIGH (>50%) | Raise to 90/75 |
| Too few HIGH (<10%) | Lower to 80/65 |
| Everyone GOOD | Widen spread: 90/60 |

**Recommendation:** Start with 85/70, tune based on real data.

---

## Suggested Commits

**Backend:**
```
feat(matches): add priority ranking to match DTO

- Add priorityScore and priorityTier fields
- Sort matches by score (highest first)
- Tier thresholds: HIGH ≥85, GOOD ≥70

Sprint 41 Story 2
```

**Frontend:**
```
feat(ui): display matches in priority sections

- HIGH / GOOD / OTHER sections
- HIGH expanded by default
- Priority indicators (🔥⭐✨) and score badges
- Analytics: track section views

Sprint 41 Story 2
```

---

## Follow-Up (Sprint 42)

After this lands, Sprint 42 adds conversation starters:
- Generate smart openers using LLM
- Display on HIGH priority matches
- Pre-fill message input when user taps opener
