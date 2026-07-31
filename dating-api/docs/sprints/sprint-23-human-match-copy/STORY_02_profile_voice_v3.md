# Story 2: Profile — kill leftover fluff (voice v3)

**Sprint:** 23  
**Status:** Done  
**Depends on:** —

---

## Why

Detail narrative no longer says “ambition alignment,” but still sounds like a brochure:

*mutual appreciation… meaningful conversations and connections… worth a closer look… one-on-one setting.*

Still Phase 2 facts only — fix **voice** before opening free-text (Story 3).

---

## What

**As a** user  
**I want** the match profile “why” to sound like a sharp friend  
**So that** I actually feel the overlap, not a dating-app essay.

### Acceptance criteria

- [x] Expand shared ban / reject list (examples): soft CTAs like `worth a closer look`, `one-on-one setting`, `commonalities play out`, `mutual appreciation`, `meaningful conversations`, `meaningful connections` (architect finalizes list with Agent 0).
- [x] System prompt: no soft brochure closers; end with a concrete next beat or honest tension — not “explore this further.”
- [x] Bump `MATCH_NARRATIVE_PROMPT_VERSION` → **`v3`** (cache miss → regenerate).
- [x] Optional: polish worst `CHIP_TO_TRAIT` evidence lines that force fluff expansion (only if needed). *(skipped — not required)*
- [x] Unit: fluff fixtures fail validation → fallback; good evidence-grounded prose passes; lean prompt still omits chip labels.
- [x] Nest wiring / UI / scoring untouched except version bump.

### Out of scope

- Raw `about*` in the prompt (Story 3).
- List TLDR (Story 1).
- Refresh-narrative button.
- Non-English.

---

## Definition of done

- [x] Mock fluff → fallback; `promptVersion === 'v3'`.
- [x] Sample ambition + depth + lifestyle pack does not produce brochure CTA endings in unit fixtures.
- [x] Agent 4: **skip** (prompt/validator only).

### Implementation notes (pipeline close)

- Expanded `BANNED_NARRATIVE_PHRASES`; closer rules in system prompt; `nextActionForLlm` on LLM facts + fallback (Agent 2).
- Evidence polish deferred; Phase 3 is Story 3.

## Suggested touchpoints

- `match-narrative-voice.ts`, `match-narrative-prompt.ts`, `match-narrative-validate.ts`, `match-narrative.types.ts`
- Optional: `match-explanation-traits.ts` evidence strings
- Specs under `match-narrative/*.spec.ts`

## Agent pipeline

```text
--agent 0 sprint 23 story 2
--agent 1 sprint 23 story 2
--agent 2 sprint 23 story 2
--agent 3 sprint 23 story 2
```

**Skip Agent 4.**

