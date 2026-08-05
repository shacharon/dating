# Story 01 — Algorithm transparency UI

**Sprint 43 · Status: Done (ACCEPT)**  
**Priority:** P0 (trust-building feature)  
**Estimated effort:** 2 days  
**Dependencies:** Sprint 41-42 complete (algorithm visible)  
**Repo:** `dating-api` + `dating-ui` (detail DTO mapping + UI)  
**Risk:** Medium (complexity could confuse users)  
**Handoffs:** `handoffs/STORY_01_algorithm_transparency/agent-*.md`  
**Architect lock:** [`handoffs/STORY_01_algorithm_transparency/agent-0-architect.md`](./handoffs/STORY_01_algorithm_transparency/agent-0-architect.md) — **Skip Agent 4**  
**Dev handoff:** [`handoffs/STORY_01_algorithm_transparency/agent-1-dev.md`](./handoffs/STORY_01_algorithm_transparency/agent-1-dev.md)  
**CR handoff:** [`handoffs/STORY_01_algorithm_transparency/agent-2-cr.md`](./handoffs/STORY_01_algorithm_transparency/agent-2-cr.md) — **approved**  
**PM handoff:** [`handoffs/STORY_01_algorithm_transparency/agent-3-pm.md`](./handoffs/STORY_01_algorithm_transparency/agent-3-pm.md) — **ACCEPT**

---

## Objective

Add UI that explains HOW the priority score was calculated, breaking down compatibility by life goals, personality, interests, etc. Makes the "black box" algorithm trustworthy.

## Why

Users see "🎯 92% match" but don't know why. Without transparency, they might not trust the algorithm or understand why someone is HIGH priority.

**Goal:** Users think "I trust this score because I can see how it was calculated."

---

## Current State

- Match cards show `priorityScore` (e.g., 87%)
- Match detail shows LLM narrative explaining compatibility
- No granular breakdown visible

---

## Target State

**Match detail expandable section: "How We Calculated This"**

```
┌─────────────────────────────────┐
│ Sarah, 32 (92% match)           │
│ [Photo]                         │
│                                 │
│ WHY WE MATCHED (expandable)     │
│ You both want kids and love...  │
│                                 │
│ ⌄ HOW WE CALCULATED THIS        │ ← NEW
└─────────────────────────────────┘

[When expanded:]

┌─────────────────────────────────┐
│ HOW WE CALCULATED 92%           │
│                                 │
│ ✅ Life Goals (95%)             │
│    • Both want 2+ children      │
│    • Similar timeline (2-3y)    │
│                                 │
│ ✅ Personality (88%)            │
│    • Emotional depth: High/High │
│    • Communication: Direct both │
│    • Lifestyle pace: Match      │
│                                 │
│ ✅ Interests (79%)              │
│    • Hiking, cooking, travel    │
│    • 8 shared tags              │
│                                 │
│ ⚠️  Potential Challenge (64%)   │
│    • Conflict resolution styles │
│      differ slightly            │
│                                 │
│ [Learn more about our algorithm]│
└─────────────────────────────────┘
```

**Plus: "About Our Algorithm" info page**

```
/about/algorithm

How We Match You
================

We analyze 3 core dimensions:

1. Life Goals (40% weight)
   - Children plans
   - Timeline to commitment
   - Location preferences
   
2. Personality Fit (40% weight)
   - 5 key dimensions:
     • Emotional depth
     • Lifestyle pace
     • Conflict style
     • Independence
     • Social battery
     
3. Shared Interests (20% weight)
   - Hobbies, activities, values
   
Match Score = Weighted average
Priority Tiers:
- HIGH: ≥85% (message these first!)
- GOOD: 70-84%
- OTHER: <70%

[Why we show potential challenges]
[How to interpret your matches]
```

---

## Scope / Tasks

### Agent 0 (Architect)
1. Review compatibility breakdown data structure (from match engine)
2. Design UI component: expandable vs separate page?
3. Decide: How much detail to show? (all signals vs top 3)
4. Lock visual design (colors for high/medium/low compatibility)
5. Define "Learn more" page structure + copy
6. Analytics: Track expansion rate (do users care?)

### Agent 1 (Senior Dev)

**1. Backend: Expose breakdown in API**

```typescript
// In match DTO (if not already exposed)
export interface Match {
  ...existing,
  compatibilityBreakdown?: {
    lifeGoals: {
      score: number,        // 0-100
      signals: Array<{
        label: string,      // "Both want children"
        match: 'high' | 'medium' | 'low',
        evidence?: string   // "You: Yes, Them: Yes"
      }>
    },
    personality: {
      score: number,
      signals: Array<{
        dimension: string,  // "Emotional depth"
        yourValue: string,  // "High"
        theirValue: string, // "High"
        match: 'high' | 'medium' | 'low'
      }>
    },
    interests: {
      score: number,
      shared: string[],     // ["Hiking", "Cooking"]
      sharedCount: number
    },
    challenges?: {
      score: number,
      areas: Array<{
        dimension: string,  // "Conflict resolution"
        note: string        // "Different approaches"
      }>
    }
  }
}
```

**Pull from existing match engine** (Sprint 40 already has this data):
```typescript
// In MeMatchesService
async getMatchWithBreakdown(viewerId: string, candidateId: string) {
  const comparison = await this.matchEngine.compareWithStatus(...);
  
  return {
    ...match,
    compatibilityBreakdown: {
      lifeGoals: this.buildLifeGoalsBreakdown(comparison),
      personality: this.buildPersonalityBreakdown(comparison),
      interests: this.buildInterestsBreakdown(comparison),
      challenges: comparison.frictionScore >= 3 
        ? this.buildChallengesBreakdown(comparison) 
        : undefined
    }
  };
}
```

**2. Frontend: Breakdown component**

```tsx
// components/match-compatibility-breakdown.tsx

export function CompatibilityBreakdown({ breakdown }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} className="expand-btn">
        ⌄ How we calculated this match
      </button>
    );
  }

  return (
    <div className="compatibility-breakdown">
      <h3>How We Calculated {breakdown.finalScore}%</h3>

      {/* Life Goals */}
      <Section
        title="Life Goals"
        score={breakdown.lifeGoals.score}
        icon="✅"
      >
        {breakdown.lifeGoals.signals.map(s => (
          <SignalItem
            key={s.label}
            label={s.label}
            match={s.match}
            evidence={s.evidence}
          />
        ))}
      </Section>

      {/* Personality */}
      <Section
        title="Personality Fit"
        score={breakdown.personality.score}
        icon="✅"
      >
        {breakdown.personality.signals.map(s => (
          <DimensionItem
            key={s.dimension}
            dimension={s.dimension}
            yourValue={s.yourValue}
            theirValue={s.theirValue}
            match={s.match}
          />
        ))}
      </Section>

      {/* Interests */}
      <Section
        title="Shared Interests"
        score={breakdown.interests.score}
        icon="✅"
      >
        <p>{breakdown.interests.sharedCount} shared interests:</p>
        <TagList tags={breakdown.interests.shared} />
      </Section>

      {/* Challenges */}
      {breakdown.challenges && (
        <Section
          title="Potential Challenges"
          score={breakdown.challenges.score}
          icon="⚠️"
        >
          {breakdown.challenges.areas.map(a => (
            <ChallengeItem key={a.dimension} area={a} />
          ))}
        </Section>
      )}

      <Link href="/about/algorithm">
        Learn more about our algorithm →
      </Link>
    </div>
  );
}
```

**3. Create algorithm explanation page**

```tsx
// app/about/algorithm/page.tsx

export default function AlgorithmExplainerPage() {
  return (
    <article className="prose">
      <h1>How We Match You</h1>
      
      <section>
        <h2>The Three Dimensions</h2>
        <p>We analyze compatibility across 3 core areas...</p>
        {/* Full explanation with examples */}
      </section>

      <section>
        <h2>Priority Tiers</h2>
        <p>HIGH (≥85%): These are your best matches...</p>
      </section>

      <section>
        <h2>Why Show Challenges?</h2>
        <p>Perfect matches don't exist. We show potential friction areas...</p>
      </section>
    </article>
  );
}
```

**4. Add analytics**

```typescript
// Track when users expand breakdown
trackEvent('match.breakdown_expanded', {
  matchId,
  priorityScore,
  priorityTier
});

// Track clicks to algorithm explainer
trackEvent('algorithm.explainer_viewed');
```

### Agent 2 (Code Review)
1. Verify breakdown data accurate (matches engine calculations)
2. Check: No confusion between score types (life goals % vs final %)
3. Verify: Mobile responsive (breakdown readable on small screens)
4. Check: Empty states handled (no breakdown data available)
5. Verify: Colors accessible (color-blind friendly)
6. Check: Copy is clear, not jargon-heavy
7. Verify: Link to explainer page works

### Agent 3 (PM)
1. **User testing:**
   - Show breakdown to 5 people
   - Ask: "Does this make sense?"
   - Ask: "Do you trust this score more now?"
   - Document feedback
2. **Copy review:**
   - Read algorithm explainer page
   - Check: Tone friendly, not academic
   - Check: No dating industry jargon
3. **Screenshot documentation:**
   - Before/after (with/without transparency)
4. **Measure:**
   - Expansion rate (% who click "How we calculated")
   - Target: >30% of HIGH priority views

---

## Locked Policy (Architect)

Full lock: [`handoffs/STORY_01_algorithm_transparency/agent-0-architect.md`](./handoffs/STORY_01_algorithm_transparency/agent-0-architect.md).

| Item | Decision |
|------|----------|
| Blend truth | **Reject** story 40/40/20 — real weights in `COMPATIBILITY_BLEND_WEIGHTS`; section %s are component/derived, not blend weights |
| Buckets | Values ← `valuesAlignment` + TIER1; Personality ← TIER2 mean×10 + TIER2 signals; Interests ← `interestAlignment` + shared tags; Challenges ← tensionMatrix when `friction ≥ 3` (**no** challenge %) |
| Signals | Top **3** per section; labels from `POSITIVE_CHIP_BY_SIGNAL` / tension chips |
| API | Build in assemble pipeline → `CompareResultDto.compatibilityBreakdown` → **detail DTO only** (not list); no Prisma; no list-cache bump |
| Surface | Detail expandable (collapsed default); browse = link to explainer only |
| Visual | Emerald strong / amber challenges; **no** emoji chrome; no detail header score badge |
| Explainer page | `/about/algorithm` public; honest qualitative (or rounded real) weights |
| Analytics | `emitProductLog`: `match_breakdown_expanded`, `algorithm_explainer_viewed` |
| Agent 4 | **Skip** |

---

## Copy Guidelines

**Good (plain language):**
- "Both want children" ✅
- "You both communicate directly" ✅
- "8 shared interests" ✅

**Bad (jargon):**
- "Dealbreaker alignment coefficient: 0.95" ❌
- "Neuroticism delta within tolerance" ❌
- "Interest tag cosine similarity: 0.79" ❌

**Tone:** Friendly, informative, trustworthy (not salesy or academic)

---

## Out of Scope

- User-editable weights ("I care more about X than Y")
- Comparison to other matches ("This is your #3 match")
- Historical score changes ("Was 85%, now 92%")
- Sharing breakdown externally (privacy concern)

---

## Acceptance Criteria

- [x] Match detail includes expandable compatibility breakdown
- [x] Breakdown shows life goals, personality, interests, challenges
- [x] Scores and signals match engine calculations
- [x] `/about/algorithm` explainer page exists
- [x] Plain language, no jargon
- [x] Mobile responsive
- [x] Analytics track expansion rate (events wired; rate measured in beta)
- [ ] User testing: ≥4/5 say it's helpful — **deferred to beta** (engineering gate accepted)

---

## Testing

### Unit Tests
- Breakdown component renders all sections
- Empty breakdown handled gracefully
- Score colors correct (high/medium/low)

### Manual Validation
1. Load match detail with HIGH priority
2. Expand "How we calculated this"
3. Verify: Breakdown makes intuitive sense
4. Tap "Learn more" → verify explainer page loads
5. Show to wife: "Is this helpful or confusing?"

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Expansion rate | >30% (users curious about breakdown) |
| Time on breakdown | >10s (reading, not skimming) |
| Explainer page views | >20% of active users |
| User feedback | "I trust the score more" ≥4/5 |

---

## Suggested Commits

**Backend:**
```
feat(matches): expose compatibility breakdown in API

- Add lifeGoals, personality, interests scores + signals
- Pull from existing match engine data
- Include challenges if friction ≥3

Sprint 43 Story 1
```

**Frontend:**
```
feat(ui): add algorithm transparency breakdown

- Expandable "How we calculated" section on match detail
- Shows life goals, personality, interests breakdown
- Link to /about/algorithm explainer page
- Analytics: track expansion rate

Sprint 43 Story 1
```

**Content:**
```
docs: add algorithm explainer page

- /about/algorithm public page
- Explains 3 dimensions, priority tiers, challenges
- Plain language, user-friendly tone

Sprint 43 Story 1
```

---

## Follow-Up (Story 2)

After transparency builds trust, Story 2 adds notifications to bring users back when HIGH priority matches appear.
