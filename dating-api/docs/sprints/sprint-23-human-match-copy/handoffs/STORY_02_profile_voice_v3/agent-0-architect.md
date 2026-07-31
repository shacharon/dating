# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_profile_voice_v3.md](../../STORY_02_profile_voice_v3.md)  
**Sprint:** sprint-23-human-match-copy  
**Date:** 2026-07-31  
**Status:** complete  

---

## Summary

- Phase 2 **voice v3** only: expand shared bans (brochure CTAs), harden system prompt closers, bump `MATCH_NARRATIVE_PROMPT_VERSION` **v2 → v3**, sanitize soft `suggestedNextAction` before it enters the LLM JSON.
- No Prisma / Nest list wiring / UI / scoring / Phase 3 free-text. Cache invalidates via `promptVersion`.
- **Skip Agent 4.** Evidence polish **out of scope** unless Agent 1 cannot land green fixtures without it.

---

## Artifacts

| Path | Change |
|------|--------|
| `match-narrative.types.ts` | design — `MATCH_NARRATIVE_PROMPT_VERSION = 'v3'` |
| `match-narrative-voice.ts` | design — expand `BANNED_NARRATIVE_PHRASES` |
| `match-narrative-prompt.ts` | design — closer rules + sanitize next-action in lean facts |
| `match-narrative-validate.ts` | design — unchanged order (bans already via voice) |
| `match-narrative-fallback.ts` | design — scrub closers that hit new bans (see §6) |
| `match-narrative/*.spec.ts` | design — Agent 1/2 |
| `CHIP_TO_TRAIT` evidence / UI / Prisma | **no change** (default) |

---

## Decisions (do not reverse without discussion)

### 1. Version bump

```ts
export const MATCH_NARRATIVE_PROMPT_VERSION = 'v3' as const;
```

- `v2` cache rows remain but never hit. No migration / delete job.

### 2. Expanded ban list (locked — append to existing v2 bans)

Keep all current entries. **Add** (case-insensitive substrings; list longer/more specific first when overlapping):

| Phrase | Why |
|--------|-----|
| `worth a closer look` | Soft CTA from live output / product next-action |
| `one-on-one setting` | Brochure closer |
| `commonalities play out` | Brochure |
| `mutual appreciation` | Brochure |
| `meaningful conversations` | Brochure (v2 only banned `meaningful connection`) |
| `meaningful connections` | Brochure plural |
| `explore this further` | Soft CTA |
| `take a closer look` | Soft CTA variant |
| `in a one-on-one` | Soft CTA variant |

**Do not** add bare `meaningful` or bare `worth` (too broad; false positives).

Keep existing: `ambition alignment`, `alignment`, `solid foundation`, `meaningful connection`, `promising basis`, `potential relationship`, `shared values and connections`, `compatibility`, `friction`, `percent`, `%`, plus `\bscore(s)?\b`.

Single source: `BANNED_NARRATIVE_PHRASES` in `match-narrative-voice.ts` (prompt join + validator).

### 3. System prompt (locked intent — additive)

In addition to current sharp-friend / facts-only / 5–12 / banned list text, **must** include in substance:

- End with a **concrete** next beat (what to ask / what to watch) or honest tension — **not** soft brochure closers.
- Never pad with “mutual appreciation,” “meaningful conversations/connections,” or “worth a closer look / one-on-one setting” style endings.
- Prefer short verbs over essay transitions.

Lean user JSON shape **unchanged** (still no chips / labels / `finalScore`).

### 4. Sanitize `suggestedNextAction` in LLM projection (locked)

Today `toLlmPromptFacts` forwards `suggestedNextAction` unchanged. Product strings like **`Worth a closer look`** teach the model the banned CTA.

In `toLlmPromptFacts` (or a tiny helper colocated in prompt/voice):

```ts
function nextActionForLlm(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  if (containsBannedPhrase(raw)) {
    return 'Ask one concrete question tied to the evidence or shared interests.';
  }
  return raw.trim();
}
```

- Applies **only** to LLM fact projection — do **not** change `buildSuggestedNextAction` / UI recommendation DTOs in this story.
- Same helper may run on `caution` if caution text hits bans (optional; if easy).

### 5. Validator

- Order unchanged: empty → sentence band → banned → evidence/interest grounding.
- New bans automatically reject live fluff fixtures.
- Agent 1: add fixture with the user’s brochure paragraph (or equivalent) → `banned_phrase:…` → generator `source: 'fallback'`.

### 6. Fallback scrub (minimal)

Audit `OPENER_BY_BAND` / `CLOSER_BY_BAND` against the **new** ban list:

- Current risk: moderate closer `Worth a thoughtful look — …` — **OK** (not `worth a closer look`).
- If any opener/closer substring-hits a new ban, rewrite that one line only (plain, no chips).
- Do not reintroduce chip-label lists. Tension still via `tensionNoteFromChip`.

### 7. Evidence polish

**Out of scope by default.** Only touch `CHIP_TO_TRAIT.evidence` if a unit fixture cannot pass without it. Prefer prompt + bans.

### 8. Untouched

- List TLDR (Story 1).
- Phase 3 `about*` (Story 3).
- Nest HTTP shape, UI render priority, scoring / HG.
- LLM knobs (`temperature`, etc.) — leave unless fluff still dominates after bans (note in CR if changed).

---

## API contract

**No HTTP shape change.** Detail still `matchNarrative?: string`. First open after deploy → `v3` miss → regenerate; second open → `v3` hit.

---

## Service signatures

```ts
MATCH_NARRATIVE_PROMPT_VERSION = 'v3'

// voice — expanded BANNED_NARRATIVE_PHRASES + existing findBannedPhrase

// prompt
buildMatchNarrativeSystemPrompt(): string  // + closer rules
toLlmPromptFacts(pack): LlmPromptFacts     // sanitize suggestedNextAction
```

---

## Migration plan

**N/A.** Rollback = revert to `v2` constant.

---

## Integration points

| Component | Action |
|-----------|--------|
| `match-narrative-voice.ts` | Expand bans |
| `match-narrative-prompt.ts` | Closers + next-action sanitize |
| `match-narrative.types.ts` | `v3` |
| `match-narrative-fallback.ts` | Only if closer hits new ban |
| Specs | Fluff reject; v3; lean prompt still chip-free |

---

## Runtime topology

**N/A.**

---

## E2E verification (agent 4)

**Skip Agent 4** — prompt/validator/version only; no eligibility / ranking / Nest contract change.

---

## Tests / verification (plan for Agent 1–2)

- [ ] `MATCH_NARRATIVE_PROMPT_VERSION === 'v3'`
- [ ] Narrative with “mutual appreciation” / “worth a closer look” / “meaningful conversations” → validate fail
- [ ] Good evidence-grounded multi-sentence prose without new bans → ok
- [ ] Mock LLM brochure paragraph → `source: 'fallback'`
- [ ] Lean user JSON still omits chip labels; if pack has `suggestedNextAction: 'Worth a closer look'`, projected facts must **not** contain that string
- [ ] Existing match-narrative + me-matches narrative suites green (version asserts → v3)
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser smoke: deferred optional (detail ×2 after restart)
- [ ] Socket: N/A

---

## Open questions / blockers

- None. Phase 3 remains Story 3.

---

## Next agent

```text
--agent 1 sprint 23 story 2
```

**Notes for next agent:**

- Implement bans + prompt closers + `v3` + sanitize next-action in `toLlmPromptFacts`.
- Do not change list TLDR or Nest/UI beyond version-driven cache miss.
- After CR → `--agent 3 sprint 23 story 2` (skip 4).
