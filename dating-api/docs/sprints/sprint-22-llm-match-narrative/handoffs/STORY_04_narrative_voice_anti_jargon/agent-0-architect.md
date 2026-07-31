# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_narrative_voice_anti_jargon.md](../../STORY_04_narrative_voice_anti_jargon.md)  
**Sprint:** sprint-22-llm-match-narrative  
**Date:** 2026-07-30  
**Status:** complete  

---

## Summary

- Fix Phase 2 **voice** only: stop feeding chip labels into the LLM prompt, harden bans, ground on **evidence + interests** (not chip tokens), scrub fallback chip lists, bump `MATCH_NARRATIVE_PROMPT_VERSION` → **`v2`**.
- No Prisma / Nest wiring / UI / scoring changes. Cache invalidates naturally via existing `promptVersion` in the unique key.
- **Skip Agent 4.**

---

## Artifacts

| Path | Change |
|------|--------|
| `src/matches/match-narrative/match-narrative.types.ts` | design — `MATCH_NARRATIVE_PROMPT_VERSION = 'v2'` |
| `src/matches/match-narrative/match-narrative-prompt.ts` | design — lean user JSON + hardened system prompt |
| `src/matches/match-narrative/match-narrative-validate.ts` | design — ban list + evidence/interest grounding only |
| `src/matches/match-narrative/match-narrative-fallback.ts` | design — no chip-label join sentence |
| `src/matches/match-narrative/*.spec.ts` | design — Agent 1/2 |
| `prisma/*` / `me-matches.service.ts` / UI | **no change** |

---

## Decisions (do not reverse without discussion)

### 1. Version bump (cache invalidation)

```ts
export const MATCH_NARRATIVE_PROMPT_VERSION = 'v2' as const;
```

- Existing `v1` `MatchNarrativeCache` rows remain in DB but never hit (unique key includes `promptVersion`).
- No migration / backfill / delete job.

### 2. Fact pack type — keep; prompt projection — strip

- Keep `MatchNarrativeFactPack` fields (`positiveChips`, trait `group`/`label`) for fallback / internal use.
- **`buildMatchNarrativeUserPrompt` must project a lean payload** (new helper ok, e.g. `toLlmPromptFacts(pack)` colocated in prompt file):

```ts
{
  scoreBand: pack.scoreBand,
  evidence: string[],           // trait.evidence only, order preserved, cap 5
  ...(tensionNote?),            // see §3
  ...(sharedInterests?),
  ...(sharedInterestNote?),
  ...(caution?),
  ...(suggestedNextAction?),
}
```

- **Omit:** `positiveChips`, trait `label` / `group` / `strength`, `finalScore`.
- Do not add a debug key with chip labels in the user prompt.

### 3. Tension

- Prefer `tensionNote`: plain English one-liner derived from `tensionChip` without the word “alignment” (e.g. map known chips → short note, else `Something to watch: ${tensionChip.toLowerCase()}` only if chip text is already human — if chip looks like jargon, paraphrase generically: `One area may need an early honest conversation.`).
- Agent 1: simple map for known tension chips if any; otherwise omit chip string from prompt if it contains `alignment` / looks like a label.

### 4. System prompt (locked intent)

Must include, in substance:

- Write like a sharp friend texting why these two should meet — concrete, specific, no brochure.
- Use **only** `evidence` / shared interests / tension / caution / next action from the JSON.
- Never invent biography or quotes.
- 5–12 sentences; never pad.
- **Banned** (case-insensitive; non-exhaustive list Agent 1 encodes as shared constant used by prompt text + validator):
  - `alignment` (including `ambition alignment`)
  - `solid foundation`
  - `meaningful connection`
  - `promising basis`
  - `potential relationship`
  - `shared values and connections`
  - metric jargon: `compatibility`, `friction`, `score`, `percent`, `%`
- Prefer verbs people use (“you both go hard on goals”) over product nouns.

Export banned list from one module (e.g. `match-narrative-voice.ts` or top of validate) so prompt + validate stay in sync.

### 5. Validator (order of checks)

1. empty → fail  
2. sentence count `<3` or `>16` → fail (unchanged soft band)  
3. **banned substring** hit → fail `reason: 'banned_phrase:…'`  
4. If pack has traits with evidence **or** shared interest tags/note → require ≥1 **grounding token** from:
   - `evidenceTokens(trait.evidence)` for each trait, and/or
   - significant tokens from `sharedInterests` / `sharedInterestNote` (≥5 chars, stopwords)
   - **Do not** treat `positiveChips` or trait `label` as grounding sources  
5. If no evidence and no interests → pass after bans + length (same as today’s empty-signal path)

On fail → generator returns fallback (existing); **do not cache** (Story 2 lock).

### 6. Fallback

- Prefer trait `evidence` sentences (already the path when traits exist).
- **Remove** (or never use) the branch that joins chip labels:  
  `The clearest shared signals so far are ${chips}`  
  Replace with a neutral line if no traits: e.g. band opener + closer only, or one line from `sharedInterestNote` if present.
- Openers/closers must not use banned phrases (`alignment`, etc.).

### 7. Optional evidence polish

- Out of scope by default. Only touch `CHIP_TO_TRAIT` evidence if a unit fixture still cannot pass voice rules without it. Prefer prompt/validator first.

### 8. Untouched

- `MeMatchesService`, Prisma schema, UI, HG, scores, list DTO.
- Generator DI / purpose `match_narrative` / temperature knobs — keep unless Agent 1 finds fluff persists; optional `temperature: 0.5` only with CR note (default: leave knobs).

---

## API contract

**No HTTP shape change.** Detail still returns `matchNarrative?: string`. After deploy, first open post-`v2` regenerates; second open hits `v2` cache.

---

## Service signatures

```ts
// types
MATCH_NARRATIVE_PROMPT_VERSION = 'v2'

// prompt
buildMatchNarrativeSystemPrompt(): string  // hardened
buildMatchNarrativeUserPrompt(pack): string // lean JSON only

// optional internal
toLlmPromptFacts(pack): LlmPromptFacts

// validate
validateLlmNarrative(narrative, pack): { ok: true } | { ok: false; reason: string }
// + shared BANNED_NARRATIVE_PHRASES / containsBannedPhrase()

// fallback
buildFallbackMatchNarrative(pack): string  // no chip-label list sentence
```

---

## Migration plan

**N/A** (no schema). Rollback = revert code to `v1` prompt constant (old cache rows reusable again).

---

## Integration points

| Component | Action |
|-----------|--------|
| `match-narrative-prompt.ts` | Lean user JSON + hard system prompt |
| `match-narrative-validate.ts` | Bans + evidence/interest grounding |
| `match-narrative-fallback.ts` | Drop chip join |
| `match-narrative.types.ts` | `v2` |
| Specs | Prompt omit chips; ban reject; fluff → fallback |
| Cache / getById | Unchanged (version in key) |

---

## Runtime topology

**N/A** for transport. Smoke (Agent 1 notes): open a scored match detail after API restart; Network one `GET .../matches/:id`; narrative must not contain “ambition alignment” / “solid foundation…”; second open = cache hit (`v2`).

---

## E2E verification (agent 4)

**N/A — skip Agent 4.**

No eligibility / ranking / Nest contract change. Unit coverage of prompt/validate/generator is enough; Story 2 harness stays green without assertion changes (narrative text may change — harness stubs generator, so unaffected).

---

## Tests / verification (plan for Agent 1–2)

- [ ] User prompt JSON has no `positiveChips` / trait `label` / `Ambition alignment`
- [ ] Narrative with “solid foundation for a meaningful connection” → validate fail
- [ ] Narrative using evidence tokens (e.g. “driven”, “emotional presence”) without banned phrases → ok
- [ ] Mock LLM returns fluff → `source: 'fallback'`
- [ ] `MATCH_NARRATIVE_PROMPT_VERSION === 'v2'`
- [ ] Existing match-narrative + me-matches narrative unit suites green
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser smoke: deferred or Agent 1 note
- [ ] Socket: N/A

---

## Open questions / blockers

- None. Phase 3 still deferred.

---

## Next agent

```text
--agent 1 sprint 22 story 4
```

**Notes for next agent:**

- Implement prompt projection + bans + validator + fallback scrub + `v2`.
- Do not change Nest/UI/Prisma.
- After CR → `--agent 3` (skip 4).
