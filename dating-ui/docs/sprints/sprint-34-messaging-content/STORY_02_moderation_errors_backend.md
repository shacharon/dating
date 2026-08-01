# Story 34.2 Backend — Richer Content Moderation Errors (LOCKED)

**Sprint:** 34 — Messaging & Content  
**Story:** 2 — Moderation error transparency (backend phase)  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** Done (ACCEPT)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` for this phase only; frontend is a **separate** waterfall after ACCEPT.

---

## Goal

Enrich **existing** moderation 400 payloads so clients can show field, flagged span, why, and how to fix — without inventing a parallel moderation stack.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Pipeline | `OpenAIModerationClient.checkContent` → `evaluateContentPolicy` → record violation → HTTP 400 |
| OpenAI result type | `ModerationResult` = `{ flagged, categories, primaryCategory, score, sexualScore, failOpen }` — **not** a `clean` boolean |
| Policy decision | `ContentPolicyDecision` = allow \| `{ allow:false, source, category, score, action }` |
| Profile error | `error: 'content_moderation_failed'` + `details: { field, category, suggestion }` |
| Message error | `error: 'message_content_moderation_failed'` + `details: { category, suggestion, muted? }` |
| Blocklist | `matchesDatingBlocklist(text): boolean` — no match span today |
| Violation DB | Already stores full `flaggedText` (trimmed field / message) |

### AGENT_COMMANDS corrections (outdated — ignore these)

- ❌ Replacing `ModerationResult` with `{ clean, flaggedText, … }` — keep OpenAI client shape
- ❌ Rewriting `matchesDatingBlocklist` to return a fake full `ModerationResult`
- ❌ Putting enrichment inside OpenAI HTTP client as the sole source of truth
- ❌ Changing error codes or removing `muted` on message enforcement
- ❌ Exposing raw OpenAI `score` / `sexualScore` on the public 400 body

---

## Locked public API (HTTP 400)

### Profile (`POST`/`PATCH` `/api/v1/me/profile`)

```typescript
{
  error: 'content_moderation_failed';
  message: 'Your profile contains inappropriate content',
  details: {
    field: 'aboutMe' | 'aboutPartner' | 'aboutRelationship',
    category: string,           // e.g. sexual, harassment, dating_policy
    source: 'openai' | 'dating_blocklist' | 'dating_score',
    flaggedText: string,        // span or full field text (see rules)
    flaggedTextIndex: number,   // UTF-16 index into trimmed field value
    flaggedTextLength: number,  // length of flaggedText
    reason: string,             // human why
    suggestion: string,         // how to fix
    exampleAlternative?: string // optional; when we have a solid example
  }
}
```

### Message (`POST` `/api/v1/me/conversations/:id/messages`)

```typescript
{
  error: 'message_content_moderation_failed',
  message: 'Your message contains inappropriate content',
  details: {
    category: string,
    source: 'openai' | 'dating_blocklist' | 'dating_score',
    flaggedText: string,
    flaggedTextIndex: number,
    flaggedTextLength: number,
    reason: string,
    suggestion: string,
    exampleAlternative?: string,
    muted?: string              // existing mute label when enforcement mutes
  }
}
```

Keep `profile_edit_blocked` / `messaging_muted` **403** shapes unchanged.

---

## Locked enrichment rules

Add helper module (preferred path):

`dating-api/src/content-moderation/moderation-user-facing.ts`

```typescript
export type ModerationUserFacingDetails = {
  flaggedText: string;
  flaggedTextIndex: number;
  flaggedTextLength: number;
  reason: string;
  suggestion: string;
  exampleAlternative?: string;
};

export function buildModerationUserFacingDetails(input: {
  text: string; // trimmed submitted text
  decision: Extract<ContentPolicyDecision, { allow: false }>;
  surface: 'profile' | 'message';
}): ModerationUserFacingDetails;
```

| `decision.source` | `flaggedText` / index / length | reason / suggestion |
|-------------------|--------------------------------|---------------------|
| `dating_blocklist` | **Matched substring** from first blocklist hit; index = `match.index` on trimmed text | Phrase-specific reason when known; else generic dating-policy copy |
| `openai` | **Full** trimmed text; index `0`; length = text.length | Map `decision.category` → reason + suggestion |
| `dating_score` | **Full** trimmed text; index `0`; length = text.length | Dating sexual-score copy (not OpenAI category map) |

### Copy tables (EN, locked for API strings — i18n is frontend)

**OpenAI categories** (fallback → generic):

| category contains / equals | reason | suggestion |
|---------------------------|--------|------------|
| `sexual` | Contains explicit sexual content | Please rephrase without explicit sexual content. Focus on personality and interests. |
| `violence` | Contains violent or threatening language | Please rephrase without threatening or violent language. |
| `hate` | Contains hateful or discriminatory language | Please rephrase without discriminatory language. |
| `harassment` | Contains harassing or bullying language | Please rephrase respectfully without targeting others. |
| other | Contains language that violates our community guidelines | Please rephrase your text. |

**Dating blocklist** (match known patterns; else generic):

| Pattern family | reason | suggestion | exampleAlternative |
|----------------|--------|------------|--------------------|
| fuck / wanna fuck | Direct sexual solicitation | Describe connection or interests without explicit sexual language | Looking for someone adventurous and open-minded |
| send nudes | Request for sexual images | Do not ask for nude photos | Happy to chat and get to know each other first |

**Dating score:**

| reason | suggestion | exampleAlternative |
|--------|------------|--------------------|
| Content looks like a sexual solicitation | Soften the wording; focus on personality and shared interests | Looking for a genuine connection and good conversation |

`exampleAlternative` **omit** when we lack a solid example (prefer omit over inventing).

### Blocklist API change

Replace boolean-only helper with span-aware API (keep thin wrapper if needed):

```typescript
export type DatingBlocklistHit = {
  matchedText: string;
  index: number;
  length: number;
  patternSource: string;
};

export function findDatingBlocklistHit(text: string): DatingBlocklistHit | null;
export function matchesDatingBlocklist(text: string): boolean; // = hit != null
```

Wire `evaluateContentPolicy` to keep using boolean/hit; enrichment uses `findDatingBlocklistHit`.

---

## Locked service wiring

1. After deny decision in `me-profile.service.ts` / `me-conversation-messages.service.ts`, call `buildModerationUserFacingDetails`.
2. Merge into `details` **alongside** existing `field` (profile) and `muted` (message).
3. Add `source` from `decision.source`.
4. Violation `recordViolation` continues to store full trimmed text (unchanged).
5. Do **not** change fail-open, feature flags, or enforcement thresholds.

### Out of scope (this phase)

- Frontend UI / i18n (Story 34.2 **frontend**)
- Photo moderation
- Changing OpenAI request/timeouts
- New Prisma fields
- Localizing API `reason`/`suggestion` (English product strings on API; UI may map later)

---

## Files Agent 1 should touch

| Path | Change |
|------|--------|
| `content-moderation/dating-policy.ts` (+ spec) | `findDatingBlocklistHit`; keep evaluate |
| `content-moderation/moderation-user-facing.ts` (+ spec) | **new** enrichment helper + copy tables |
| `me-profile.service.ts` (+ unit/HTTP specs) | Richer `content_moderation_failed` details |
| `me-conversation-messages.service.ts` (+ specs) | Richer `message_content_moderation_failed` details |

Optional: thin re-export from types if useful. **Do not** reshape `ModerationResult`.

---

## Tests (required)

- Blocklist hit → details include matched `flaggedText` + correct index/length + source `dating_blocklist`
- OpenAI deny → full-text span, category-based reason/suggestion, source `openai`
- Dating score deny → dating_score copy, source `dating_score`
- Profile includes `field`
- Message preserves `muted` when enforcement sets muteLabel
- Existing fail-open / flag-off paths unchanged
- No `score` / `sexualScore` in HTTP body

---

## Acceptance criteria

- [x] Profile + message 400s include `source`, `flaggedText`, index/length, `reason`, `suggestion`
- [x] Blocklist returns matched span (not only full text) when possible
- [x] `exampleAlternative` present when locked tables provide one
- [x] Error codes unchanged; mute details preserved
- [x] No public score leakage; no ModerationResult rewrite
- [x] Unit + integration/spec coverage

---

## Agent 3 next

```
--agent 3 sprint 34 story 2 backend
```

## Done — next phase

Backend ACCEPT complete. Start frontend waterfall:

```
--agent 0 sprint 34 story 2 frontend
```
