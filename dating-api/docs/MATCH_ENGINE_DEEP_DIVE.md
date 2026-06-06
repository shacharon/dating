# Match Engine V1 - Deep Dive

Technical deep dive into the Match Engine V1 implementation, covering the complete data flow, explanation traits, quality audit system, and enrichment extraction.

---

## 1. Match Engine V1 Contract - Complete Data Flow

### The Full Journey (Step by Step)

#### A. Entry Point: HTTP Request

```
GET /api/v1/me/matches → list of scored matches
GET /api/v1/me/matches/:id → single match detail
```

#### B. Service Layer (`MeMatchesService`)

The service orchestrates everything:

**Step 1: Load viewer profile from session userId**
- Loads `UserProfile` with all text fields, HG preferences, photos
- Also loads `UserProfilePreference` for partner gender preferences
- Also loads `UserProfileSignal` and `UserProfileInterest` (normalized tables)

**Step 2: Guard - viewer must be ANALYZED status**
```typescript
if (viewer.status !== 'ANALYZED') {
  return { status: 'not_ready', reason: 'not_analyzed' };
}
```

**Step 3: Load viewer's latest evaluation**
```typescript
const viewerEval = await latestEvaluationForProfile(prisma, viewer.id);
// ORDER BY createdAt DESC, LIMIT 1
```

**Step 4: Load ALL analyzed candidates**
```typescript
// WHERE status = 'ANALYZED'
// Excludes UserProfile.interestsTop and sig* columns (those are write-only cache)
```

**Step 5: Load latest evaluations for all candidates** (batch query)

#### C. Read Model Assembly (`buildMeMatchesParticipantReadModel`)

This is the **ONLY** function `MeMatchesService` calls to build engine inputs.

**Enforced by:** `me-matches-read-model-policy.spec.ts` - prevents direct imports of lower-level mappers.

The mapper does two things:

**i. Assemble evaluation payload** (with optional normalized merge)

When `ENGINE_READ_NORMALIZED=1` is set, the assembler can override the evaluation JSON blob with data from normalized tables:

```typescript
export function assembleEvaluationPayload(
  evaluationJson: Prisma.JsonValue,
  signals: readonly NormalizedSignalRow[],
  interests: readonly NormalizedInterestRow[],
  useNormalized: boolean,
  evaluationVersion: string,
): EvaluateBatchResult {
  const base = evaluationJson as unknown as EvaluateBatchResult;

  // Guard: only merge if flag is on AND all rows match version
  if (!meMatchesEngineNormalizedMergeActive(
      signals, interests, useNormalized, evaluationVersion)) {
    return base; // Return blob unchanged
  }

  // Merge signals
  if (signals.length > 0) {
    const normalizedSignals: Record<string, number | null> = {};
    for (const s of signals) {
      normalizedSignals[s.signalKey] = s.signalValue;
    }
    result = {
      ...result,
      self: {
        ...base.self,
        signals: { ...base.self?.signals, ...normalizedSignals }
      }
    };
  }

  // Merge interests (top 3)
  if (interests.length > 0) {
    const top3 = interests.slice(0, 3).map((i) => i.tag);
    result = {
      ...result,
      enrichment: {
        ...baseEnrichment,
        signals: { ...baseEnrichment?.signals, interestsTop3: top3 }
      }
    };
  }

  return result;
}
```

**All-or-nothing merge rule:**
- If **any** normalized row has `evalVersion !== evaluation.version` → use blob only
- This prevents partial/stale data from mixing with fresh evaluation

**ii. Build ProfileJsonPayload** (for match engine) **and** HG row (for hard filters)

#### D. Gender Filter (`reciprocalProductGenderEligibility`)

Both directions must pass:
- Viewer accepts candidate's gender
- Candidate accepts viewer's gender

If either fails → skip candidate (list) or 404 (detail)

#### E. Holy Grail Hard Eligibility (`evaluateHolyGrailPairDirections`)

Checks dealbreakers in both directions:
- Age preferences
- Distance
- Kids timeline
- Smoking/alcohol/religion preferences

Result per direction: `PASS`, `WARN`, or `FAIL`

If **both directions FAIL** → skip candidate (list) or 404 (detail)

#### F. Match Engine Scoring (`compareWithStatus`)

Takes two `ProfileJsonPayload` objects, returns:

**Success case:**
```typescript
{
  matchScore: number, // 0-100
  explainability: {
    positiveChips: string[], // e.g., ["Emotional depth", "Social rhythm"]
    tensionChips: string[],  // e.g., ["Lifestyle pace"]
    positiveChipsByGroup: {...},
    tensionChipsByGroup: {...}
  },
  recommendation: {
    primaryTakeaway: string,
    secondaryTakeaway: string | null,
    cautions: string[]
  }
}
```

**Guard case:**
```typescript
{
  status: 'guard',
  reason: 'missing_evaluation' | 'incomplete_profile' | ...
}
```

#### G. Match Explanation Traits (Detail Only)

Only on `getById`, if compare succeeded:

```typescript
export function buildMatchExplanationTraits(
  positiveChips: readonly string[],
  finalScore: number,
): MatchExplanationTrait[] {
  const strength: MatchExplanationTraitStrength =
    finalScore >= 65 ? 'strong' : 'moderate';
  const out: MatchExplanationTrait[] = [];
  for (const chip of positiveChips.slice(0, 5)) {
    const meta = CHIP_TO_TRAIT[chip];
    if (!meta) continue;
    out.push({
      group: meta.group,
      label: chip,
      evidence: meta.evidence,
      strength,
    });
  }
  return out;
}
```

#### H. Response Assembly

**List vs Detail differences:**
- **List**: no `evaluationSummary`, no `matchExplanationTraits`
- **Detail**: includes both

**DTOs:**

```typescript
export interface MeMatchItemDto {
  id: string;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  hasEvaluation: boolean;
  matchScore: number | null;
  profileAnalysisStale?: boolean;
  primaryPhotoUrl: string | null;
  approvedPhotoCount: number;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
}

export interface MeMatchDetailDto extends MeMatchItemDto {
  evaluationSummary: string | null;
  matchExplanationTraits?: MatchExplanationTrait[];
}
```

### Key Guards in V1 Contract

| Guard | Behavior (summary) |
|-------|---------------------|
| **Viewer profile missing** | List: `not_ready` / `no_profile`. |
| **Viewer not `ANALYZED`** | List: `not_ready` / `not_analyzed`. |
| **Missing latest evaluation** (viewer or analyzed candidate) | `InternalServerErrorException` (list) or not applicable where candidate skipped. |
| **Reciprocal gender eligibility** | Candidate omitted from list; detail `404` if ineligible. |
| **HG hard eligibility** | Both directions `FAIL` → omit list row; detail `404`. |
| **`compareWithStatus` guard** (`'status' in result`) | `matchScore` null; no explainability/recommendation from engine; no `matchExplanationTraits` on detail. |
| **Normalized `evalVersion` vs `evaluation.version`** | All-or-nothing: mismatch → blob-only merge for that participant (`assembleEvaluationPayload`). |

### Data Flow Diagram

```
HTTP Request
    ↓
MeMatchesService
    ↓
Load UserProfile (viewer + candidates)
    ↓
Load UserProfilePreference
    ↓
Load UserProfileEvaluation (latest)
    ↓
Load UserProfileSignal + UserProfileInterest (if ENGINE_READ_NORMALIZED=1)
    ↓
buildMeMatchesParticipantReadModel
    ├─→ assembleEvaluationPayload (merge normalized tables OR use blob)
    ├─→ buildProfilePayloadFromNewModel (engine input)
    └─→ buildChildrenUnsureRowFromNewModel (HG input)
    ↓
reciprocalProductGenderEligibility (filter)
    ↓
evaluateHolyGrailPairDirections (hard eligibility)
    ↓
compareWithStatus (scoring)
    ↓
buildMatchExplanationTraits (detail only, if scored)
    ↓
Response DTO
```

---

## 2. Match Explanation Traits - How It Works

### Purpose
Convert technical engine "chips" into human-readable compatibility traits for users.

### The Mapping Dictionary

Each known positive chip label maps to a user-facing group + evidence line:

```typescript
export const CHIP_TO_TRAIT: Record<
  string,
  { readonly group: string; readonly evidence: string }
> = {
  'Ambition alignment': {
    group: 'Shared values',
    evidence: 'Your drive and ambition are well-matched.',
  },
  'Social rhythm': {
    group: 'Lifestyle match',
    evidence: 'Your social energy levels are well-matched.',
  },
  'Wellness focus': {
    group: 'Lifestyle match',
    evidence: 'Health and physicality matter to both of you.',
  },
  'Emotional depth': {
    group: 'Emotional connection',
    evidence: 'You both value depth and emotional presence in a relationship.',
  },
  'Secure attachment': {
    group: 'Emotional connection',
    evidence: 'You share a similar approach to closeness and emotional availability.',
  },
  'Direct communication': {
    group: 'How you communicate',
    evidence: "You're both direct, which reduces misread signals.",
  },
  'Independence fit': {
    group: 'Relationship vision',
    evidence: 'Your need for space and togetherness is mutually compatible.',
  },
  'Shared values': {
    group: 'Shared values',
    evidence: 'You share meaningful common ground on values that shape daily life.',
  },
  'Money mindset': {
    group: 'Shared values',
    evidence: 'Your approach to finances and security is compatible.',
  },
  'Relationship expectations': {
    group: 'Relationship vision',
    evidence: "You're both looking for something similar in how a relationship works.",
  },
  'Lifestyle pace': {
    group: 'Lifestyle match',
    evidence: 'You move at a similar pace — how you structure your days aligns.',
  },
  'Physical chemistry': {
    group: 'Lifestyle match',
    evidence: 'Physical attraction signals are strong and mutual.',
  },
  'Lifestyle & status': {
    group: 'Lifestyle match',
    evidence: "You're aligned on lifestyle and social positioning.",
  },
};
```

### The Algorithm

**Inputs:**
- `positiveChips: string[]` - from engine explainability
- `finalScore: number` - match score 0-100

**Logic:**
1. **Determine strength** based on score:
   - `finalScore >= 65` → `'strong'`
   - `finalScore < 65` → `'moderate'`

2. **Take first 5 chips** (cap at 5 traits max)

3. **Map each chip** to trait:
   - Look up chip label in `CHIP_TO_TRAIT` dictionary
   - If found → create trait object with `{group, label, evidence, strength}`
   - If not found → skip (unknown chips are silently ignored)

4. **Return array** of trait objects

**Example:**

```typescript
// Input
positiveChips = ["Emotional depth", "Social rhythm", "UnknownChip", "Money mindset"]
finalScore = 72

// Output
[
  {
    group: "Emotional connection",
    label: "Emotional depth",
    evidence: "You both value depth and emotional presence in a relationship.",
    strength: "strong"  // because 72 >= 65
  },
  {
    group: "Lifestyle match",
    label: "Social rhythm",
    evidence: "Your social energy levels are well-matched.",
    strength: "strong"
  },
  // "UnknownChip" skipped
  {
    group: "Shared values",
    label: "Money mindset",
    evidence: "Your approach to finances and security is compatible.",
    strength: "strong"
  }
]
```

### Trait Groups

- **Shared values** - ambition, values, money mindset
- **Lifestyle match** - social rhythm, wellness, pace, physical chemistry, status
- **Emotional connection** - depth, attachment style
- **How you communicate** - directness, expression style
- **Relationship vision** - independence fit, expectations

### Where It's Used

**Only on detail route** (`GET /api/v1/me/matches/:id`), **only when:**
1. Compare succeeded (not a guard result)
2. Trait builder returned non-empty array

If these conditions aren't met, the `matchExplanationTraits` property is **omitted entirely** from the response.

### Why Deterministic (No LLM)?

- **Fast**: No API calls, instant computation
- **Consistent**: Same inputs always produce same output
- **Testable**: Easy to verify correctness
- **No scoring side effects**: Doesn't change match scores, just presentation layer
- **Reliable**: No hallucinations or variability

---

## 3. Match Quality Audit System

### Purpose
Allow operators to inspect match quality in production **using the exact same V1 path** that powers the user-facing API.

### Architecture

#### CLI Entry Point

```bash
npx ts-node --project tsconfig.json scripts/match-quality-audit.ts \
  --viewer-user-id user_abc123 \
  --candidate-profile-id prof_xyz789 \
  --out tmp/audit-01.json \
  --skip-list  # optional: skip list() call for faster execution
```

#### Service Function

Located in `src/me-profile/match-quality-audit.ts`:

```typescript
export async function buildMatchQualityAuditJson(
  options: BuildMatchQualityAuditOptions,
): Promise<MatchQualityAuditReport>
```

**What it does:**
1. Calls `meMatches.getById()` - same path as user API
2. Loads normalized signal/interest rows for both participants
3. Loads latest evaluations
4. Determines engine input source mode (evaluationJson vs normalized)
5. Optionally calls `meMatches.list()` to get rank context
6. Assembles comprehensive JSON report

### What the JSON Report Contains

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-05-31T12:00:00.000Z",
  "env": {
    "ENGINE_READ_NORMALIZED": "1"
  },
  "viewer": {
    "userId": "user_abc123",
    "profileId": "prof_viewer_1"
  },
  "candidate": {
    "profileId": "prof_cand_1"
  },
  "engineInputSource": {
    "viewer": "normalized",
    "candidate": "evaluationJson"
  },
  "compare": {
    "outcome": "scored"
  },
  "matchScore": 78,
  "profileAnalysisStale": false,
  "explainability": {
    "positiveChips": ["Emotional depth", "Social rhythm"],
    "tensionChips": ["Lifestyle pace"],
    "positiveChipsByGroup": {...},
    "tensionChipsByGroup": {...}
  },
  "recommendation": {
    "primaryTakeaway": "Strong emotional alignment...",
    "secondaryTakeaway": null,
    "cautions": ["Different daily rhythms"]
  },
  "matchExplanationTraits": [
    {
      "group": "Emotional connection",
      "label": "Emotional depth",
      "evidence": "You both value depth...",
      "strength": "strong"
    }
  ],
  "evaluationSummary": "Values deep connection...",
  "listContext": {
    "viewerProfileId": "prof_viewer_1",
    "candidateRank": 3,
    "totalMatchesReturned": 15
  }
}
```

### The `engineInputSource` Field - Critical for Debugging

This tells you **how the engine got its data** for each participant:

- **`"evaluationJson"`** - read from `UserProfileEvaluation.evaluationJson` blob only
- **`"normalized"`** - merged data from `UserProfileSignal` + `UserProfileInterest` tables

**Why this matters:**
If you see weird scores, you need to know which data source was used. Maybe normalized tables are stale, or maybe the evaluation blob has old data.

**How it's determined:**

```typescript
export function resolveMeMatchesEngineInputSourceMode(
  signals: readonly NormalizedSignalRow[],
  interests: readonly NormalizedInterestRow[],
  useNormalized: boolean,
  evaluationVersion: string,
): MeMatchesEngineInputSourceMode {
  return meMatchesEngineNormalizedMergeActive(
    signals, interests, useNormalized, evaluationVersion
  ) ? 'normalized' : 'evaluationJson';
}
```

### Manual Review Template

For human quality assessment, use together with JSON output:

**Markdown format:**

| Field | Your notes |
|-------|------------|
| viewerProfileId | |
| candidateProfileId | |
| verdict | GOOD / OK / BAD |
| why | |
| score_vs_expectation | lower / higher / same |
| explanation_accurate | yes / no |
| chips_and_tension | Do positive chips and tension match real friction? |
| recommendation_fair | Does primary takeaway / caution feel fair? |
| stale_flag | Did `profileAnalysisStale` match your sense of outdated text? |
| engineInputSource (copy from JSON) | viewer: … / candidate: … |

**JSONL format (one object per reviewed pair):**

```jsonl
{"viewerProfileId":"prof_viewer_1","candidateProfileId":"prof_cand_1","verdict":"OK","why":"Strong lifestyle overlap; religion unclear from bios.","score_vs_expectation":"same","explanation_accurate":"yes","chips_and_tension":"Tension chip matches pace difference we see.","recommendation_fair":"yes","stale_flag":"n/a","engineInputSource":{"viewer":"evaluationJson","candidate":"normalized"}}
{"viewerProfileId":"prof_viewer_1","candidateProfileId":"prof_cand_2","verdict":"BAD","why":"Dealbreaker on kids not reflected.","score_vs_expectation":"higher","explanation_accurate":"no","chips_and_tension":"Positive chips too generic.","recommendation_fair":"no","stale_flag":"no","engineInputSource":{"viewer":"evaluationJson","candidate":"evaluationJson"}}
```

### Workflow

1. **Run CLI** for a viewer/candidate pair → generates JSON
2. **Read JSON** to see match score, explainability, traits, recommendations
3. **Manually review** the match quality by reading actual profile text
4. **Fill template** with your human judgment:
   - Is the score too high/low?
   - Are the chips accurate?
   - Is the recommendation fair?
5. **Save reviews** as JSONL for analysis

### Key Guarantees

- **Same code path** - uses `MeMatchesService.getById()`, not alternate scoring
- **Production-identical** - respects `ENGINE_READ_NORMALIZED` flag
- **Read-only** - no mutations, safe to run on live data
- **Traceable** - `engineInputSource` shows exactly what data was used

---

## 4. Enrichment V2/V3 Extensions - Signal Extraction

### What Enrichment Does

Takes raw profile text → extracts structured signals (closed-code enums):

**Core signals (V2):**
- `dailyRhythm`: `"early_bird"`, `"night_owl"`, `"stable_nine_to_five"`
- `autonomyTogethernessDepth`: `"interdependence"`, `"values_alone_time"`
- `kidsTimeline`: `"wants_kids_soon"`, `"childfree"`, `"open_to_kids"`
- `conflictStyleDetail`: `"repair_over_blame"`, `"escalates_quickly"`

**V3 extensions:**
- `relationshipPace`: `"fast_mover"`, `"slow_build"`, `"no_rush_explicit"`
- `communicationMode`: `"verbal_expressive"`, `"deep_talker"`, `"text_heavy"`

**V3/V4 interests:**
- `interestsTop3`: `["hiking", "reading", "cooking"]`

### The Canonical Label System

**Problem:** Earlier extraction produced inconsistent labels:
- Sometimes: `"early bird"` (spaces)
- Sometimes: `"Early Bird"` (title case)
- Sometimes: `"wants a family"` (legacy phrase)

**Solution:** Canonical coercion pipeline

#### Step 1: Accept Exact Canonical Labels

```typescript
expect(coerceEnrichmentDailyRhythm('early_bird')).toBe('early_bird');
expect(coerceEnrichmentKidsTimeline('childfree')).toBe('childfree');
```

#### Step 2: Normalize Spaced/Case Variants

```typescript
expect(coerceEnrichmentDailyRhythm('Early Bird')).toBe('early_bird');
expect(coerceEnrichmentDailyRhythm('stable nine to five')).toBe('stable_nine_to_five');
```

#### Step 3: Repair Known Legacy Phrases

```typescript
expect(coerceEnrichmentKidsTimeline('wants a family')).toBe('wants_kids');
expect(coerceEnrichmentConflictStyleDetail('repair over blame')).toBe('repair_over_blame');
expect(coerceEnrichmentAutonomyTogetherness('independent together')).toBe('interdependence');
```

#### Step 4: Reject Unknown Free Text

```typescript
expect(coerceEnrichmentDailyRhythm('I like long walks')).toBeNull();
expect(coerceEnrichmentKidsTimeline('maybe someday children')).toBeNull();
expect(coerceEnrichmentConflictStyleDetail('we just vibe')).toBeNull();
```

### Interest Extraction (V3/V4 Extension)

#### Allowlist Approach

Only extract recognized interests:

```typescript
const INTEREST_ALLOWLIST = new Set([
  // V2 interests
  'walking', 'hiking', 'music', 'reading', 'swimming',
  'lifting', 'cycling', 'cooking', 'travel', 'photography',
  'extreme_sports', 'journaling', 'yoga', 'gaming',
  'meditation', 'pilates', 'gym', 'running',
  
  // V3 closed codes only
  'fungi', 'pottery', 'model_building', 'boating',
  'fermentation', 'cartography',
]);
```

#### Context-Aware Filtering

Avoid false positives by checking surrounding context:

**Example 1: Cooking (Job vs Hobby)**

```typescript
const COOKING_JOB_HINT =
  /\b(pastry\s+cook|line\s+cook|in\s+kitchens|service\s+season|head\s+chef|sous\s+chef)\b/i;

function cookingAllowedAt(text: string, idx: number): boolean {
  const win = text.slice(Math.max(0, idx - 100), Math.min(text.length, idx + 100));
  return !COOKING_JOB_HINT.test(win);
}
```

- ❌ "I'm a **line cook** at a restaurant" → don't extract `"cooking"`
- ✅ "I love **cooking** new recipes" → extract `"cooking"`

**Example 2: Fermentation (Lab Work vs Hobby)**

```typescript
const BREWERY_YEAST_LAB_HINT = /\b(?:yeast\s+labs?|at\s+a\s+brewery|brewery)\b/i;

function fermentationAllowedAt(text: string, idx: number): boolean {
  const win = text.slice(Math.max(0, idx - 120), Math.min(text.length, idx + 120));
  if (/\bfermentation journals\b/i.test(win)) return true;
  if (BREWERY_YEAST_LAB_HINT.test(win)) return false;
  return true;
}
```

- ❌ "I work at a **brewery** testing yeast" → don't extract `"fermentation"`
- ✅ "I keep **fermentation journals**" → extract `"fermentation"`

**Example 3: Fungi (Lab Tech vs Forager)**

```typescript
function sporePrintsAllowedAt(text: string, idx: number): boolean {
  const win = text.slice(Math.max(0, idx - 140), Math.min(text.length, idx + 140));
  if (/\b(?:weekend|foray|guide|hobby|neighbor|porch|forays?)\b/i.test(win))
    return true;
  if (/\blab tech\b/i.test(win)) return false;
  return true;
}
```

- ❌ "**Lab tech** analyzing spore prints" → don't extract `"fungi"`
- ✅ "Weekend **forays** collecting mushrooms" → extract `"fungi"`

### Negation Detection

**Problem:** "I am **not** a night owl" should NOT extract `"night_owl"`

**Solution:**

```typescript
function isNegatedBefore(
  text: string,
  matchIndex: number,
  window = 48,
): boolean {
  const start = Math.max(0, matchIndex - window);
  const prefix = text.slice(start, matchIndex);
  return /\b(not|never|isn'?t|aren'?t|without|no\s+longer|am\s+not|wasn'?t)\s*$/i.test(prefix);
}
```

Looks at the 48 characters **before** a match and checks for negation words:
- `not`, `never`, `isn't`, `aren't`, `without`, `no longer`, `am not`, `wasn't`

**Examples:**
- ❌ "I am **not** a night owl" → skip extraction
- ✅ "I'm a night owl" → extract `"night_owl"`

### The Full Pipeline

```
1. Join text blocks
   └─→ aboutMe + aboutPartner + aboutRelationship

2. Search for patterns
   └─→ Regex matching for each signal/interest

3. Check context
   ├─→ Negation detection
   ├─→ Job hint detection
   └─→ Window-based context validation

4. Extract raw labels
   └─→ "early bird", "Early Bird", "wants a family"

5. Coerce to canonical
   └─→ "early_bird", "early_bird", "wants_kids"

6. Reject unknowns
   └─→ Free text → null

7. Return structured object
   └─→ EnrichmentMappedSignals
```

### Enrichment Output Structure

```typescript
export interface EnrichmentMappedSignals {
  dailyRhythm: string | null;
  autonomyTogethernessDepth: string | null;
  kidsTimeline: string | null;
  conflictStyleDetail: string | null;
  relationshipPace: string | null;
  communicationMode: string | null;
  interestsTop3: string[];
}
```

### Why Deterministic (No LLM)?

- **Fast**: Regex-based, runs in milliseconds
- **Testable**: Easy to write unit tests for edge cases
- **Debuggable**: You can see exactly which pattern matched
- **Consistent**: Same text always produces same signals
- **No hallucinations**: LLMs might invent signals that don't exist in the text
- **Cost-effective**: No API calls required
- **Reliable**: No rate limits or model availability issues

### Test Coverage

Complete test suite in `enrichment-canonical-labels.spec.ts`:

- ✅ Exact canonical labels accepted
- ✅ Spaced/case variants normalized
- ✅ Legacy phrases repaired
- ✅ Unknown free text rejected
- ✅ All six scalar fields coerced together
- ✅ New V3 fields validated
- ✅ Null inputs passed through correctly

---

## Summary

### V1 Contract Boundaries

**In scope:**
- `MeMatchesService` (list + detail endpoints)
- `buildMeMatchesParticipantReadModel` (single read model assembler)
- `UserProfile` + `UserProfileEvaluation` + normalized tables
- `compareWithStatus` match engine
- `evaluateHolyGrailPairDirections` hard filters

**Out of scope (legacy):**
- `MatchmakingProfile` tables — **retired** (removed from `schema.prisma`, 2026-06)
- Legacy `ProfilesPrismaService` paths
- `UserProfile.interestsTop` / `sig*` columns (write-only cache)
- Alternate scoring services

### Key Files

| Purpose | File Path |
|---------|-----------|
| **Service** | `src/me-profile/me-matches.service.ts` |
| **Read model** | `src/me-profile/me-profile-engine.mapper.ts` |
| **Latest eval** | `src/me-profile/me-profile-analysis.service.ts` |
| **Engine** | `src/matches/match-engine.ts` |
| **Traits** | `src/matches/match-explanation-traits.ts` |
| **Audit CLI** | `scripts/match-quality-audit.ts` |
| **Audit service** | `src/me-profile/match-quality-audit.ts` |
| **Enrichment** | `src/evaluate/enrichment-v2.ts` |
| **Canonical labels** | `src/evaluate/enrichment-canonical-labels.ts` |
| **Contract doc** | `docs/MATCH_ENGINE_V1_CONTRACT.md` |
| **Audit template** | `docs/match-quality-audit-manual-review.md` |

### Contract Tests

- `src/me-profile/me-matches-read-model-policy.spec.ts` - enforces import boundaries
- `src/me-profile/me-matches.v1-contract.spec.ts` - validates list vs detail field presence
- `src/evaluate/enrichment-canonical-labels.spec.ts` - validates label coercion
- `src/evaluate/enrichment-v2.spec.ts` - validates interest extraction

---

**Last Updated:** May 31, 2026  
**Schema Version:** V1  
**Feature Flags:** `ENGINE_READ_NORMALIZED` (optional normalized table merge)
