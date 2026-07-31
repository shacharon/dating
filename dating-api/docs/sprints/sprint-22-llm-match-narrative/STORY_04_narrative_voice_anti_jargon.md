# Story 4: Narrative voice — kill chip jargon and fluff

**Sprint:** 22  
**Status:** Done  
**Depends on:** Stories 1–3 Done

---

## Why

Live Phase 2 output is still garbage: it echoes chip labels (“ambition alignment”) and pads with dating-app filler (“solid foundation for a meaningful connection”, “promising basis for exploration”). Mechanically the path works (facts → LLM → cache → UI). Product voice fails. Users cannot tell this from the old template TLDR — only longer.

Root causes (locked for this story):

1. LLM user JSON still includes **chip label strings** (`positiveChips`, trait `label`) that the model copies.
2. Soft prompt (“prefer natural phrasing”) is ignored.
3. Validator **rewards** repeating chip words (e.g. “ambition”), so jargon prose is accepted as grounded.
4. Existing trait `evidence` strings are themselves template-y; the model expands them into fluff.

This is **not** Phase 3 (raw free-text). Fix voice inside Phase 2 first.

---

## What

**As a** user  
**I want** the match detail narrative to sound like a sharp human friend, not a product thesaurus  
**So that** I actually understand why this person showed up.

### Acceptance criteria

- [x] **Prompt input (LLM user JSON):** do **not** send raw chip labels or trait `label` / `group` as primary copy cues. Send:
  - `scoreBand`
  - trait **evidence** strings only (plain sentences)
  - optional `tensionChip` rewritten to plain English if needed, or a short `tensionNote`
  - `sharedInterests` / `sharedInterestNote` (human-readable tags / note)
  - optional `caution` / `suggestedNextAction`
  - Chip labels may stay on the internal fact-pack type for grounding/fallback, but must **not** appear in the user prompt JSON (or appear only under a clearly ignored debug key — prefer omit).
- [x] **System prompt harden:** explicit bans on phrases / patterns including (non-exhaustive): `alignment`, `ambition alignment`, `solid foundation`, `meaningful connection`, `promising basis`, `potential relationship`, `shared values and connections`, metric jargon (`compatibility`, `friction`, `score`). Instruct: concrete, specific, no padding; one idea per sentence; sound like a friend, not a brochure.
- [x] **Validator:** reject narratives that contain banned fluff/jargon substrings (case-insensitive); reject if prose is mostly generic filler with no concrete token from **evidence** / shared interest tags (tighten grounding to evidence + interest words — **not** chip-label tokens like “alignment”). On reject → fallback (existing path).
- [x] **Fallback:** scrub chip jargon from fallback sentences where easy (prefer evidence strings already on traits; avoid “The clearest shared signals so far are Ambition alignment, …”).
- [x] Bump `MATCH_NARRATIVE_PROMPT_VERSION` (e.g. `v1` → `v2`) so evaluation-keyed cache misses and regenerates under the new contract.
- [x] Unit tests: user prompt omits chip labels; banned phrases fail validation; good evidence-grounded prose passes; version constant bumped; generator falls back on fluff reject (mocked LLM).
- [x] Scoring / HG / Nest detail wiring / UI: **untouched** except regenerating via prompt version.

### Out of scope

- Phase 3 raw `about*` text.
- Redesigning `CHIP_TO_TRAIT` evidence copy across the whole product (optional tiny evidence tweaks only if required for narrative; prefer prompt/validator first).
- “Refresh explanation” button.
- Non-English narratives.
- Changing cache key shape beyond `promptVersion` bump.

---

## Definition of done

- [x] Sample LLM output for a typical ambition + emotional-depth + lifestyle fact pack does **not** contain “ambition alignment” or “solid foundation / meaningful connection” style filler (unit fixture +/or local smoke).
- [x] Fluff-laden mock LLM response → validation fail → fallback string (no cache of fluff).
- [x] `promptVersion` is `v2` (or agreed bump); old `v1` cache rows are simply unused.
- [x] Existing Story 1–2 unit/integration suites still green (or updated only where prompt/version expectations changed).

### Implementation notes (pipeline close)

- Shared bans + `tensionNoteFromChip` in `match-narrative-voice.ts`; lean `toLlmPromptFacts()`; validator bans then evidence/interest grounding; fallback uses evidence + scrubbed tension (Agent 2 fixed raw chip echo).
- Agent 4 skipped (no eligibility / ranking / Nest contract change).
- Deferred: optional live browser smoke after API restart; CHIP_TO_TRAIT evidence polish (architect §7).

## Suggested touchpoints

- `dating-api/src/matches/match-narrative/match-narrative-prompt.ts`
- `dating-api/src/matches/match-narrative/match-narrative-validate.ts`
- `dating-api/src/matches/match-narrative/match-narrative-fallback.ts`
- `dating-api/src/matches/match-narrative/match-narrative.types.ts` (`MATCH_NARRATIVE_PROMPT_VERSION`)
- Specs under `match-narrative/*.spec.ts`
- Optional: tiny evidence-string polish in `match-explanation-traits.ts` only if prompt alone cannot avoid echoing bad templates

## Agent pipeline

```text
--agent 0 sprint 22 story 4
--agent 1 sprint 22 story 4
--agent 2 sprint 22 story 4
--agent 3 sprint 22 story 4
```

**Skip Agent 4** — no eligibility / ranking / Nest matches contract change (prompt + validator + version bump only; cache key already includes `promptVersion`).
