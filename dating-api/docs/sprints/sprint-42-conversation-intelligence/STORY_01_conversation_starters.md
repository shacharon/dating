# Story 01 — LLM conversation starter generation

**Sprint 42 · Status: Done**  
**Priority:** P0 (core differentiator)  
**Estimated effort:** 3 days  
**Dependencies:** Sprint 41 complete, LlmModule exists (from Sprint 22)  
**Repo:** `dating-api` primarily  
**Risk:** Medium (LLM quality critical, cost management)  
**Handoffs:** `handoffs/STORY_01_conversation_starters/agent-*.md`  
**Closed:** 2026-08-05 — Agent 3 ACCEPT (live 50-opener quality batch tracked → Story 2 / beta)

---

## Objective

Build a service that generates natural, contextual conversation openers for HIGH priority matches using LLM, based on shared interests and compatibility signals.

## Why

Smart Triage prioritizes matches, but users still struggle with "what to say." Generic "Hey" messages get ignored. Contextual openers increase response rates and prove algorithm value.

**The differentiator:** "We help you start conversations with your best matches."

---

## Current State

- `LlmModule` exists (`src/llm/`) from Sprint 22 (match narratives)
- OpenAI client already configured
- Match comparison produces compatibility breakdown
- User profiles have interests, prompts, life goals

---

## Target State

**New service:** `ConversationStarterService`

**Input:**
```typescript
{
  viewerProfile: UserProfile,
  matchProfile: UserProfile,
  compatibility: {
    finalScore: number,
    sharedInterests: string[],
    positiveChips: CompatibilityChip[],
    matchExplanationTraits: TraitMatch[]
  }
}
```

**Output:**
```typescript
{
  opener: string,  // "I saw you love hiking - have you done the Israel Trail?"
  generatedAt: DateTime,
  promptVersion: string  // For tracking
}
```

**Cached in database** (new table or add to existing):
```sql
CREATE TABLE conversation_starters (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES mutual_matches(id),
  viewer_profile_id TEXT NOT NULL,
  match_profile_id TEXT NOT NULL,
  opener TEXT NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  prompt_version TEXT DEFAULT 'v1',
  used BOOLEAN DEFAULT false,
  edited BOOLEAN DEFAULT false
);

CREATE INDEX idx_conversation_starters_conversation 
  ON conversation_starters(conversation_id);
```

---

## LLM Prompt Design

**Goal:** Natural, casual, engaging opener that references shared context.

**Prompt template:**
```
You are a dating conversation coach helping someone start a conversation.

CONTEXT:
- Viewer: {viewerName}, interests: {viewerInterests}
- Match: {matchName}, interests: {matchInterests}
- Shared: {sharedInterests}
- Compatibility: {finalScore}% (strong match)
- Match reason: {matchReasonShort}

TASK:
Generate ONE conversation opener (max 15 words) that:
1. References a specific shared interest or prompt answer
2. Asks an engaging question
3. Feels natural and casual (not formal or salesy)
4. Is personalized (not generic)

GOOD EXAMPLES:
- "I saw you love hiking - have you done the Israel Trail?"
- "Fellow sourdough baker! What's your go-to recipe?"
- "Your trip to Japan looked amazing - where should I go first?"

BAD EXAMPLES:
- "Hey, how are you?" (too generic)
- "I think we'd be a great match based on our compatibility score." (too formal)
- "Your profile is interesting." (vague, boring)

Generate opener (15 words max):
```

---

## Scope / Tasks

### Agent 0 (Architect)
1. Review existing `LlmModule` structure (from Sprint 22)
2. Decide: New service vs. extend existing?
3. Design caching strategy:
   - Cache per `conversationId` or per profile pair?
   - Invalidation trigger: Profile update? Time-based?
4. Define database schema (`ConversationStarter` table)
5. Lock prompt version strategy (how to iterate prompts)
6. Cost controls: Rate limit, cache TTL?

### Agent 1 (Senior Dev)

**1. Create `ConversationStarterService`:**
```typescript
// src/llm/conversation-starter.service.ts

@Injectable()
export class ConversationStarterService {
  constructor(
    private llmClient: LlmClient,
    private prisma: PrismaService
  ) {}

  async generateOpener(
    viewerProfileId: string,
    matchProfileId: string,
    conversationId: string
  ): Promise<string> {
    
    // Check cache first
    const cached = await this.prisma.conversationStarter.findFirst({
      where: { conversationId, promptVersion: CURRENT_PROMPT_VERSION }
    });
    
    if (cached) return cached.opener;

    // Fetch profiles + compatibility
    const [viewer, match, compatibility] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { id: viewerProfileId } }),
      this.prisma.userProfile.findUnique({ where: { id: matchProfileId } }),
      this.getCompatibility(viewerProfileId, matchProfileId)
    ]);

    // Build prompt
    const prompt = this.buildPrompt(viewer, match, compatibility);

    // Call LLM
    const opener = await this.llmClient.complete(prompt, {
      maxTokens: 50,
      temperature: 0.7  // Some creativity, not too wild
    });

    // Validate + cache
    const cleaned = this.cleanOpener(opener);
    await this.cacheOpener(conversationId, viewerProfileId, matchProfileId, cleaned);

    return cleaned;
  }

  private buildPrompt(viewer, match, compat): string {
    // Build prompt using template above
  }

  private cleanOpener(raw: string): string {
    // Remove quotes, trim, validate length
    // If >15 words or empty → fallback
  }

  private async cacheOpener(...): Promise<void> {
    // Insert into conversation_starters table
  }
}
```

**2. Add Prisma schema:**
```prisma
model ConversationStarter {
  id               String      @id @default(cuid())
  conversationId   String
  conversation     MutualMatch @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  viewerProfileId  String
  matchProfileId   String
  opener           String      @db.Text
  generatedAt      DateTime    @default(now())
  promptVersion    String      @default("v1")
  used             Boolean     @default(false)
  edited           Boolean     @default(false)

  @@index([conversationId])
  @@index([viewerProfileId, matchProfileId])
}
```

**3. Wire into matches API:**
```typescript
// In MeMatchesService or controller
async getMyMatches(userId: string) {
  const matches = await this.fetchMatches(userId);
  
  // For HIGH priority matches, generate opener
  for (const match of matches) {
    if (match.priorityTier === 'HIGH') {
      try {
        match.suggestedOpener = await this.conversationStarterService.generateOpener(
          userId,
          match.candidateProfileId,
          match.conversationId  // if mutual, else null
        );
      } catch (err) {
        // Log error, don't block response
        this.logger.warn('Failed to generate opener', err);
      }
    }
  }
  
  return matches;
}
```

**4. Add fallback logic:**
```typescript
private getFallbackOpener(compatibility): string {
  // If LLM fails, use template
  if (compatibility.sharedInterests.length > 0) {
    const interest = compatibility.sharedInterests[0];
    return `I saw you're into ${interest} too!`;
  }
  return null;  // Don't show opener if no context
}
```

**5. Add tests:**
- Unit test: `buildPrompt()` includes correct context
- Unit test: `cleanOpener()` handles edge cases (too long, empty)
- Integration test: Generate opener for test profiles, check quality

### Agent 2 (Code Review)
1. Verify prompt includes rich context (not just interests)
2. Check: LLM failure doesn't block match API response
3. Verify: Cache key correct (profile pair + prompt version)
4. Check: No PII in LLM logs (interests ok, names ok, aboutMe NO)
5. Verify: Fallback logic exists (never show empty/broken opener)
6. Check: Database migration for new table
7. Verify: Cost controls (cache prevents repeated calls)

### Agent 3 (PM)
1. **Manual quality review:**
   - Generate 50 test openers (diverse profiles)
   - Rate each 1-10 (natural, relevant, engaging)
   - Target: ≥80% score 7+
2. **Edge case testing:**
   - No shared interests → fallback?
   - Empty profile → no opener?
   - Hebrew names → LLM handles correctly?
3. **Document sample openers:**
   - Create `SAMPLE_OPENERS.md` with 20 examples
   - Include good, mediocre, bad (for iteration)
4. **Cost validation:**
   - Check: OpenAI API cost for 50 gens
   - Confirm: Cache working (no duplicate calls)

---

## Locked Policy (Architect)

See [`handoffs/STORY_01_conversation_starters/agent-0-architect.md`](./handoffs/STORY_01_conversation_starters/agent-0-architect.md).

| Item | Decision |
|------|----------|
| LLM | `completeJSON`, `modelKey: 'fast'`, purpose `conversation_starter` |
| Max length | 15 words / ≤160 chars validated |
| Temperature | 0.7 |
| Cache key | profile pair + eval IDs + `promptVersion` (**not** MutualMatch id) |
| Scope | HIGH only; eager ≤3 LLM gens per list request |
| Fallback | Interest template or `null` (never broken/generic Hey) |
| PII | Nicknames + interests/chips OK; **no** about* free text |
| List field | `suggestedOpener: string \| null`; Redis list cache version → 3 |

---

## Out of Scope

- Multiple opener options (just 1 per match)
- User feedback on opener quality (defer to Story 3)
- Opener regeneration ("try another")
- Conversation AI coaching (way future)
- Opener for GOOD/OTHER priority

---

## Acceptance Criteria

- [x] `ConversationStarterGenerator` (+ cache) generates openers using LLM
- [x] Openers cached in database (LLM-only upsert; no duplicate on cache hit)
- [x] HIGH priority matches include `suggestedOpener` in API response
- [x] Fallback logic exists (LLM failure handled gracefully → template or null)
- [ ] Manual live quality review: ≥80% score 7+/10 — **deferred/tracked** ([SAMPLE_OPENERS.md](./SAMPLE_OPENERS.md), Story 2 / beta)
- [x] PII policy enforced (no free text / about* in LLM prompts)
- [x] Database migration for `ConversationStarterCache` table
- [x] Unit tests pass (128); HTTP integration smoke deferred to Story 2 UI path

---

## Definition of Done

- [x] Architect + Dev + CR handoffs complete; Agent 4 N/A
- [x] Schema migrated; list Redis cache version 3
- [x] Tests green; CR Major grounding fix landed
- [x] SAMPLE_OPENERS quality bar documented
- [x] Story status = Done in sprint README
- [x] Follow-ups tracked (live quality batch, Network smoke, Story 2 UX)

---

## Testing

### Unit Tests
- `buildPrompt()` includes viewer/match context
- `cleanOpener()` trims, validates length
- Fallback triggered on LLM failure

### Integration Tests
- Generate opener for 2 test profiles
- Verify: Cached on second call
- Verify: API response includes `suggestedOpener`

### Manual Quality Review
Generate 50 openers with diverse inputs:
1. Shared hiking interest → "hiking Israel Trail?"
2. Shared cooking + sourdough → "sourdough recipe?"
3. Travel + Japan → "where in Japan first?"
4. Generic interests → fallback or no opener
5. Hebrew names → handled correctly

Rate each 1-10, document in `SAMPLE_OPENERS.md`

---

## Cost Analysis

**Scenario:** 100 active users, 5 HIGH matches each
- Total HIGH matches: 500
- Openers to generate: 500 (first time)
- Cache hit rate: 80% (after profiles stable)
- New gens per week: 100

**Cost:**
- GPT-4-turbo: $0.01/call × 100 = $1/week
- GPT-3.5: $0.002/call × 100 = $0.20/week

**Recommendation:** Start with GPT-3.5, upgrade to GPT-4 if quality issues.

---

## Suggested Commits

**Backend:**
```
feat(llm): add conversation starter generation service

- New ConversationStarterService uses LLM to generate openers
- Cached per match pair + prompt version
- Fallback to template if LLM fails
- HIGH priority matches only

Sprint 42 Story 1
```

**Database:**
```
feat(db): add conversation_starters table

- Cache LLM-generated openers
- Track usage and edits (for Story 3 analytics)

Sprint 42 Story 1
```

---

## Follow-Up (Story 2)

After this lands, Story 2 displays openers in UI:
- Show on match cards (HIGH priority only)
- "Use this opener" button → pre-fills conversation
- Track usage rate
