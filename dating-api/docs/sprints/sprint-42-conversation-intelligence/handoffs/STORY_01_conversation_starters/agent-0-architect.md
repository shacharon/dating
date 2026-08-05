# Handoff: Agent 0 — Architect — Sprint 42 Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_conversation_starters.md](../../STORY_01_conversation_starters.md)  
**Sprint:** sprint-42-conversation-intelligence  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** Backend (`dating-api`) only. **Skip Agent 4** (no eligibility / preference / ranking change).

---

## Summary

- New **pure + injectable** conversation-starter module under `src/matches/conversation-starter/`, mirroring match-narrative (not a free-form `complete` under `src/llm/`).
- Cache keyed by **viewer/candidate profile + evaluation IDs + promptVersion** — **not** `MutualMatch.id`. Browse HIGH has no conversation until reciprocal LIKE.
- List DTO adds `suggestedOpener: string | null` for **HIGH only**, eager-capped (≤3 LLM gens / list request). GOOD/OTHER → always null.
- LLM via existing `LLMRouterService.completeJSON` (`purpose: 'conversation_starter'`, `modelKey: 'fast'`). Persist **LLM only**; on fail → deterministic interest template **or** null (never broken/empty string shown as opener).
- Bump `MATCH_LIST_CACHE_VERSION` when list payload gains the field. `used`/`edited` columns reserved for Story 3 (defaults only — no write path in Story 1).

---

## Baseline facts (verified)

| Fact | Detail |
|------|--------|
| LLM surface | `LLMRouterService.completeJSON` only — no free-text `complete` (`src/llm/`) |
| Narrative pattern | `src/matches/match-narrative/` — fact pack → prompt → Zod JSON → validate → fallback; cache service; wire in `MeMatchesService` |
| Narrative cache key | viewer/candidate profile IDs + eval IDs + `promptVersion` (`MatchNarrativeCache`) |
| List DTO | `MeMatchItemDto` has `priorityTier`, `explainability` (incl. `sharedInterestNote`), `whyTldr` — **no** `conversationId`, **no** `suggestedOpener` |
| Mutual / chat | `MutualMatch` is the conversation; created **only** after reciprocal LIKE. `Message.conversationId` → `MutualMatch.id` |
| Interests on list | `explainability.sharedInterestNote` present; raw shared tag array not on DTO — engine has `sharedInterestTags` / `interestAlignment.ts` |
| Redis list | `MATCH_LIST_CACHE_VERSION = 2`; full `MeMatchItemDto[]` cached |
| Priority | `HIGH` ≥ 85 (`match-priority.ts`) |
| whyTldr attach | `attachWhyTldrsToListItems` after tiers final — **mirror this** for openers |

---

## Decision 1 — Reject story sample schema keying on `conversationId` (locked)

Story draft SQL/Prisma keys openers on `conversation_id → mutual_matches(id)`.

| Reality | Implication |
|---------|-------------|
| Browse HIGH ≠ mutual | No `conversationId` on list items |
| Story 2 “Use this opener” → conversation | Story 2 problem (Like → mutual → message, or session prefill). **Out of Story 1** |

**Lock:** Cache like narratives — **profile pair + evaluation pair + promptVersion**. Optional nullable `mutualMatchId` column **out of scope** for v1 (add in Story 2/3 if needed for analytics join).

---

## Decision 2 — Module layout (locked)

**New folder** (do **not** dump a god service into `src/llm/`):

```text
src/matches/conversation-starter/
  conversation-starter.types.ts
  conversation-starter-fact-pack.ts      # pure
  conversation-starter-prompt.ts        # pure
  conversation-starter-validate.ts      # pure
  conversation-starter-fallback.ts      # pure, deterministic
  conversation-starter.generator.ts     # injectable; LLMRouterService
  conversation-starter-cache.service.ts # Prisma find/upsert
  conversation-starter.generator.spec.ts
  conversation-starter-fact-pack.spec.ts
  conversation-starter-fallback.spec.ts
  conversation-starter-validate.spec.ts
  conversation-starter-prompt.spec.ts
  conversation-starter-cache.service.spec.ts
  index.ts
```

Register cache + generator providers in `MatchesModule` (or wherever `MatchNarrative*` lives today) and inject into `MeMatchesService`.

**Do not** extend `MatchNarrativeGenerator` — different purpose, prompt, max length, and product surface.

---

## Decision 3 — Prisma schema (locked)

```prisma
model ConversationStarterCache {
  id                    String   @id @default(cuid())
  viewerProfileId       String
  candidateProfileId    String
  viewerEvaluationId    String
  candidateEvaluationId String
  promptVersion         String
  opener                String   @db.VarChar(200)
  /// Diagnostics only (model id string from LLM config).
  model                 String?
  /// Story 3 analytics — Story 1 writes false / never updates.
  used                  Boolean  @default(false)
  edited                Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([viewerProfileId, candidateProfileId, viewerEvaluationId, candidateEvaluationId, promptVersion])
  @@index([viewerProfileId, candidateProfileId])
  @@index([createdAt])
}
```

| Item | Lock |
|------|------|
| Table name | `ConversationStarterCache` (not story’s `conversation_starters` — align with `MatchNarrativeCache` naming) |
| FK to MutualMatch | **No** |
| Migration | Additive create only; no backfill |
| Rollback | Drop table |
| Invalidation | Eval IDs in unique key → new analysis = new cache row (same as narrative). No time-based TTL required for v1 |

---

## Decision 4 — Fact pack + PII (locked)

```ts
export const CONVERSATION_STARTER_PROMPT_VERSION = 'v1';

export interface ConversationStarterFactPack {
  finalScore: number;
  scoreBand: 'strong' | 'solid' | 'moderate' | 'partial' | 'weak'; // same bands as narrative
  positiveChips: string[];          // max ~5 in prompt
  tensionChip?: string;
  sharedInterests: string[];        // tags; prefer engine tags over parsing note
  sharedInterestNote?: string;
  /** Display nicknames only — no about* free text. */
  viewerNickname?: string;
  candidateNickname?: string;
}
```

**Forbidden in fact pack / prompts:** `aboutMe`, `aboutPartner`, `aboutRelationship`, raw prompt answers, emails/phones/URLs.

**Allowed:** nicknames, interest tags, chips, `sharedInterestNote`, score band (not raw “92% algorithm” sales copy in the opener itself — score is context for the model only).

**Builder input** (pure):

```ts
buildConversationStarterFactPack(input: {
  finalScore: number;
  explainability: MatchExplainabilityDto;
  sharedInterests?: string[];
  viewerNickname?: string | null;
  candidateNickname?: string | null;
}): ConversationStarterFactPack
```

- Prefer `sharedInterests` from compare/engine when caller can pass them.
- Else leave `sharedInterests: []` and still pass `sharedInterestNote` if present.
- Score-band mapping: copy narrative / recommendation bands (≥80 strong, ≥60 solid, ≥50 moderate, ≥40 partial, else weak).

---

## Decision 5 — LLM contract (locked)

| Knob | Value |
|------|--------|
| API | `LLMRouterService.completeJSON` |
| `modelKey` | `'fast'` (config → gpt-4o-mini today; matches narrative cost posture; story’s “start with 3.5” satisfied) |
| `purpose` | `'conversation_starter'` |
| Schema | `z.object({ opener: z.string().min(1).max(200) })` |
| Temperature | `0.7` |
| `maxTokens` | `80` |
| `timeoutMs` | `12_000` |
| Prompt version const | `CONVERSATION_STARTER_PROMPT_VERSION = 'v1'` |

**Prompt goals** (system + user from fact pack):
- ONE opener, **≤15 words**, casual, question preferred, references shared interest/chip.
- No “compatibility score”, no salesy match coach, no “Hey how are you”.
- Never invent facts not in the fact pack.

**Validate / clean:**
- Trim; strip wrapping quotes.
- Reject empty / >15 words / >160 chars → treat as failure → fallback path.
- Optional deny-list: “compatibility”, “algorithm”, “soulmate”, etc. (Agent 1 can keep light).

**Persist rule:** upsert cache **only** when `source === 'llm'` and validation passes (same as narrative). Fallback never written.

---

## Decision 6 — Fallback (locked)

```ts
buildFallbackConversationStarter(factPack): string | null
```

1. If `sharedInterests[0]` → `` `I saw you're into ${tag} too — what's your favorite part?` `` (ensure ≤15 words; shorten if needed).
2. Else if `sharedInterestNote` can yield a short safe line → use a single fixed template from note’s first interest phrase **only if** clean parse exists.
3. Else → **`null`** (hide opener — never empty string, never generic “Hey”).

List/DTO: `suggestedOpener` is `string | null`. UI (Story 2) hides when null.

---

## Decision 7 — API / list wiring (locked)

### DTO

Additive on `MeMatchItemDto` (+ UI type in Story 2; Agent 1 may add the field on the API now and leave UI untouched):

```ts
/**
 * LLM (or deterministic fallback) conversation opener for HIGH matches.
 * Null when not HIGH, hard-blocked, no context, or generation failed without fallback.
 */
suggestedOpener: string | null;
```

- Detail DTO: **optional same field** if cheap (reuse resolve) — **nice-to-have**, not required for Story 1 AC. Prefer list first.
- **Do not** add `conversationId` to list in Story 1.

### Attach algorithm (mirror `attachWhyTldrsToListItems`)

After priority tiers are final (incl. materialized rank overlay):

1. Init every item: `suggestedOpener = null`.
2. Eligible: `priorityTier === 'HIGH'`, not `hardBlocked`, has why-meta eval IDs (reuse same meta map or parallel opener meta).
3. Cache `find` by key → attach opener on hit.
4. Misses: sort stable by list order; take first **`LIST_SUGGESTED_OPENER_EAGER_MAX = 3`**; `Promise.allSettled` generate+upsert; attach successes.
5. Remaining HIGH misses → leave null (OK).
6. Never throw to client; never block GOOD/OTHER.

**Cap rationale:** Separate LLM call from WHY narrative — keep list latency/cost bounded. Do **not** raise to 8 without product+cost revisit.

**Nickname load:** If list select already has nickname on items, pass through. Do not batch-fetch about*.

**Redis:** Bump `MATCH_LIST_CACHE_VERSION` **2 → 3** so stale payloads without `suggestedOpener` are not served forever.

---

## Decision 8 — Generator / service signatures (locked)

```ts
// generator
async generate(args: {
  factPack: ConversationStarterFactPack;
  requestId: string;
}): Promise<{ opener: string; source: 'llm' | 'fallback'; model?: string }>

// cache
find(key: ConversationStarterCacheKey): Promise<{ opener: string } | null>
upsert(key & { opener: string; model?: string }): Promise<void>

// MeMatchesService private
attachSuggestedOpenersToListItems(args: {
  viewerProfileId: string;
  viewerEvaluationId: string;
  matches: MeMatchItemDto[];
  whyMetaByCandidateId: Map<string, ListWhyMeta>; // reuse eval ids + explainability + score
}): Promise<void>
```

Resolve helper (optional factor):

```ts
resolveSuggestedOpenerEntry(...): Promise<{ opener: string | null; source: 'cache' | 'llm' | 'fallback' | 'none' }>
```

---

## Decision 9 — Cost / rate (locked)

| Control | Lock |
|---------|------|
| Scope | HIGH only |
| Eager cap | ≤3 LLM calls per list HTTP request |
| Cache | Always check before LLM; key includes promptVersion + evals |
| No queue | Inline like narrative; fail-open to fallback/null |
| Story 3 | `used` / `edited` columns exist; **no** mark-used API in Story 1 |

---

## Artifacts (Agent 1 creates)

| Path | Change |
|------|--------|
| `src/matches/conversation-starter/**` | new module |
| `prisma/schema.prisma` + migration | `ConversationStarterCache` |
| `me-matches.service.ts` | `suggestedOpener` + attach |
| `cache/match-list-cache.ts` | version → 3 |
| `MatchesModule` / providers | wire generator + cache |
| Specs | unit + service attach + cache |
| `dating-ui` | **out of scope** (Story 2) |

---

## Decisions (do not reverse without discussion)

1. Cache key = profiles + evals + `promptVersion` — **not** MutualMatch id.
2. Module under `matches/conversation-starter/`, `completeJSON` only.
3. HIGH only; eager ≤3; null OK; scrub never shows broken opener.
4. No about* free text; nicknames + interests/chips only.
5. Persist LLM only; fallback in-memory for that response.
6. Redis list cache version bump to 3.
7. Skip Agent 4.

---

## Runtime topology

N/A — REST list field only; no socket / cookie / proxy change.

---

## E2E verification

N/A for Agent 4 (not eligibility/ranking).  

Agent 1 still: keep existing narrative / me-matches unit specs green; add opener unit + attach specs.

Suggested commands:

```bash
cd dating-api
npx jest src/matches/conversation-starter --runInBand
npx jest src/me-profile/me-matches.service.spec.ts --runInBand
npm run db:migrate
```

---

## Tests / verification

- [ ] Unit/integration: Agent 1 owns
- [ ] Result: not run (architect)
- [ ] `prisma migrate deploy`: yes (new table)
- [ ] Browser Network smoke: N/A this story (API field; Story 2 UI)
- [ ] Socket: N/A

---

## Open questions / blockers

1. **Story 2 UX gap (flag only):** “Use this opener” needs a conversation — browse HIGH often has none. Story 2 must lock Like→message / session prefill. Story 1 still ships `suggestedOpener` on list.
2. **Shared tags on list path:** Prefer passing `sharedInterestTags` from compare into meta when available; if awkward, `sharedInterestNote` + empty tags + fallback null is acceptable for v1.
3. **Hebrew nicknames / RTL:** LLM may handle; Agent 3 quality review samples. No special schema.

---

## Next agent

```text
--agent 1 sprint 42 story 1
```

**Notes for next agent:**

- Follow this handoff over the story’s sample `conversationId` Prisma / `src/llm/conversation-starter.service.ts` sketch — those are outdated vs codebase.
- Reuse `ListWhyMeta` / eval IDs already collected for `whyTldr`; do not re-compare the whole page for openers.
- Call attach **after** priority overlay on materialized list (same bug class as Story 41.4 CR).
- Do **not** implement UI or used/edited writes.
- Do **not** auto-run Agent 2.
