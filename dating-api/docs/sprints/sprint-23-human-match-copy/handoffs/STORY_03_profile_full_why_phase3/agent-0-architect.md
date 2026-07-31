# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_profile_full_why_phase3.md](../../STORY_03_profile_full_why_phase3.md)  
**Sprint:** sprint-23-human-match-copy  
**Date:** 2026-07-31  
**Status:** complete  

---

## Summary

- Phase 3: detail narrative may use **redacted, capped** profile free-text excerpts (viewer + candidate `aboutMe` / `aboutPartner` / `aboutRelationship`) for “music,” while keeping v3 voice bans and structured evidence.
- New redaction helper; fact pack gains `profileExcerpts` (never raw about\* field names on the LLM type); bump `MATCH_NARRATIVE_PROMPT_VERSION` → **`v4`**; wire excerpts only in `resolveMatchNarrative` (detail).
- Fallback / list / scoring untouched for free-text. **Skip Agent 4.**

---

## Product / legal note (required)

**Purpose expansion:** Profile free-text written for matching may be processed by the match-narrative LLM **solely** to explain why two users match on the detail surface. Excerpts are redacted, capped, never logged at info as full blobs, never returned on list or as raw about\* on HTTP. Product + legal accept this before ship (Agent 3 confirms in close notes).

---

## Artifacts

| Path | Change |
|------|--------|
| `match-narrative.types.ts` | design — `v4`; `profileExcerpts?` on fact pack |
| `match-narrative-redact.ts` (new) | design — redact + truncate + build excerpts |
| `match-narrative-fact-pack.ts` | design — accept optional profile texts → excerpts |
| `match-narrative-prompt.ts` | design — include excerpts in lean JSON; update system rules |
| `match-narrative-validate.ts` | design — ground on excerpt tokens too |
| `match-narrative-fallback.ts` | design — **must ignore** excerpts |
| `me-matches.service.ts` | design — pass viewer/candidate about\* into `resolveMatchNarrative` only |
| Specs | design — Agent 1/2 |
| Prisma / list TLDR / UI DTO shape | **no change** |

---

## Decisions (do not reverse without discussion)

### 1. Version bump

```ts
export const MATCH_NARRATIVE_PROMPT_VERSION = 'v4' as const;
```

- Cache key shape unchanged; `v3` rows unused after deploy. No migration.

### 2. Fact pack shape — excerpts, not raw about\*

Do **not** add `aboutMe` / `aboutPartner` / `aboutRelationship` onto `MatchNarrativeFactPack` (keeps “no raw dump” enforceable).

```ts
export type MatchNarrativeProfileExcerpt = {
  role: 'viewer' | 'candidate';
  field: 'aboutMe' | 'aboutPartner' | 'aboutRelationship';
  /** Already redacted + truncated. */
  text: string;
};

// on MatchNarrativeFactPack:
profileExcerpts?: MatchNarrativeProfileExcerpt[];
```

### 3. Caps (locked)

| Cap | Value |
|-----|--------|
| Max chars per excerpt after redact | **180** |
| Max excerpts total in pack | **4** |
| Fields considered (both sides) | `aboutMe`, `aboutPartner`, `aboutRelationship` (6 candidates) |
| Selection order | Prefer non-empty after redact; priority: both `aboutMe`, then both `aboutPartner`, then both `aboutRelationship`; stop at 4 |
| Empty / all-redacted | omit `profileExcerpts` (Phase 2 behavior) |

Prefer **short sentences** when truncating: cut at last `.` / `!` / `?` / space before cap; append `…` if truncated mid-sentence.

### 4. Redaction module (locked)

New: `src/matches/match-narrative/match-narrative-redact.ts`

```ts
export const EXCERPT_MAX_CHARS = 180;
export const EXCERPT_MAX_COUNT = 4;

/** Strip/replace PII + deny patterns; return cleaned string (may be empty). */
export function redactProfileFreeText(raw: string): string;

/** Build ≤4 excerpts from viewer+candidate about* fields. */
export function buildProfileExcerpts(input: {
  viewer: { aboutMe?: string | null; aboutPartner?: string | null; aboutRelationship?: string | null };
  candidate: { aboutMe?: string | null; aboutPartner?: string | null; aboutRelationship?: string | null };
}): MatchNarrativeProfileExcerpt[];
```

**Deny / scrub (case-insensitive; replace match with `[redacted]` or drop span):**

- Email-like: `\b\S+@\S+\.\S+\b`
- Phone-like: sequences of ≥7 digits with optional separators
- URLs / `http(s)://` / `www.`
- Social handles: `@username` (word-ish)
- Explicit deny substrings (non-exhaustive starter set Agent 1 may extend slightly): `ssn`, `passport`, `credit card`, `bank account`
- Collapse whitespace after scrub; if remaining length &lt; 20 → treat as empty (too thin)

**Not in v1:** ML toxicity classifier, language detection — English-first product already.

### 5. Prompt (locked intent)

`toLlmPromptFacts` adds optional:

```ts
profileExcerpts?: Array<{ role; field; text }>
```

System prompt **additive** rules (keep all v3 bans/closers):

- You may lightly paraphrase or quote **short phrases only** from `profileExcerpts` when they support the structured evidence.
- Never invent biography, quotes, or details not in evidence / interests / excerpts.
- Never repeat redacted markers or speculate what was removed.
- Prefer music (tone/overlap) over long block quotes; 1–2 short echoes max.

User prompt: drop absolute “Do not use any profile free-text” line; replace with “Use structured facts; you may use profileExcerpts only as listed (already redacted).”

### 6. Validator

Order unchanged, grounding sources expand:

1. empty / sentence band / banned (v3 list)
2. Grounding tokens from: trait evidence + shared interests/note + **each `profileExcerpts[].text`**
3. If any grounding tokens exist → require ≥1 hit; else pass after bans (thin packs)

Invented long quotes with no excerpt/evidence tokens → `ungrounded` → fallback.

### 7. Fallback (locked)

`buildFallbackMatchNarrative` **must not** read or append `profileExcerpts`. Structured evidence / interests / sanitized next-action only (current path).

### 8. Nest wiring (detail only)

Extend `resolveMatchNarrative` args:

```ts
viewerAbout?: { aboutMe?: string | null; aboutPartner?: string | null; aboutRelationship?: string | null };
candidateAbout?: { aboutMe?: string | null; aboutPartner?: string | null; aboutRelationship?: string | null };
```

`getById` already has viewer + candidate profile rows with about\* — pass them in.  
`buildMatchNarrativeFactPack({ …, viewerAbout, candidateAbout })` calls `buildProfileExcerpts` internally.

**List:** do not call narrative; do not pass about\* into list TLDR. Scoring/HG usage of about\* unchanged.

### 9. Observability / logging

- Do not log full excerpt text or raw about\* at info.
- Existing purpose `match_narrative` stays; optional debug-only length counts ok.

### 10. Untouched

- List TLDR, scoring, HG, blend weights, HTTP DTO shape (`matchNarrative?: string` only).
- Prisma schema.
- UI (already renders `matchNarrative` string).

---

## API contract

**No new fields.** Detail `matchNarrative` string may become more specific. about\* still **not** on match detail DTO.

---

## Service signatures

```ts
MATCH_NARRATIVE_PROMPT_VERSION = 'v4'

redactProfileFreeText(raw): string
buildProfileExcerpts({ viewer, candidate }): MatchNarrativeProfileExcerpt[]

buildMatchNarrativeFactPack({ …, viewerAbout?, candidateAbout? }): MatchNarrativeFactPack
toLlmPromptFacts(pack): includes profileExcerpts? when present
validateLlmNarrative(narrative, pack): grounding includes excerpts
buildFallbackMatchNarrative(pack): ignores excerpts

// MeMatchesService.resolveMatchNarrative — pass about* from loaded profiles
```

---

## Migration plan

**N/A** (no schema). Rollback = revert to `v3` constant + omit excerpts wiring.

---

## Integration points

| Component | Action |
|-----------|--------|
| `match-narrative-redact.ts` | New |
| types / fact-pack / prompt / validate | Excerpts + v4 |
| fallback | Ignore excerpts |
| `me-matches.service.ts` | Detail-only about\* → fact pack |
| Specs | Redact PII; empty omit; ungrounded invent; success with excerpt cue; fallback no about blob |

---

## Runtime topology

**N/A** (no realtime/proxy/migration). Cache: first detail open after deploy → `v4` miss.

---

## E2E verification (agent 4)

**Skip Agent 4** — narrative string content only; no eligibility / ranking / list DTO shape change.

If Agent 1 changes Nest response shape beyond `matchNarrative` content → revisit (not planned).

---

## Tests / verification (plan for Agent 1–2)

- [ ] `MATCH_NARRATIVE_PROMPT_VERSION === 'v4'`
- [ ] Email/phone/URL in aboutMe → redacted / omitted from excerpts
- [ ] Empty about\* → no `profileExcerpts` key (or empty omitted)
- [ ] Lean user prompt may contain excerpt text but never chip labels
- [ ] Narrative using an excerpt token grounds; invented biography without tokens → ungrounded → fallback
- [ ] Fallback string has no raw about\* paragraph
- [ ] List path still never calls generator (existing assert OK)
- [ ] me-matches narrative unit suites green with about\* stubs
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser smoke: deferred optional
- [ ] Socket: N/A

---

## Open questions / blockers

- None for Agent 1. Legal/product acknowledgment tracked for Agent 3 close.

---

## Next agent

```text
--agent 1 sprint 23 story 3
```

**Notes for next agent:**

- Implement redact + excerpts + v4 + detail-only wire; keep fallback free-text-free; keep list LLM-free.
- Do not expose about\* on HTTP match DTOs.
- After CR → `--agent 3 sprint 23 story 3` (skip 4).
