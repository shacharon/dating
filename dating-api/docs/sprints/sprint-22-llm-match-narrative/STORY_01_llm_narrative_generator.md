# Story 1: Fact pack + constrained LLM narrative generator + fallback

**Sprint:** 22  
**Status:** Done  
**Depends on:** —

---

## Why

`buildMatchRecommendation` / `buildPrimaryTakeaway` produce short, jargon-heavy one-liners from chip labels. Users cannot understand them. We need a dedicated generator that (a) assembles a structured fact pack from existing explainability outputs, (b) asks the LLM to write a 5–12 sentence narrative using **only** those facts, and (c) falls back to templates if the LLM fails — without touching scores.

---

## What

**As an** engineer  
**I want** a pure `generateMatchNarrative(factPack)` module with LLM + fallback  
**So that** Story 2 can wire it into the match detail path without reinventing prompts or guardrails.

### Acceptance criteria

- [x] Define a `MatchNarrativeFactPack` (TypeScript) containing only allowed fields:
  - `finalScore` (number) and/or a derived score band label (`strong` / `solid` / `moderate` / `partial` / `weak`)
  - `positiveChips: string[]`
  - `traits: Array<{ group, label, evidence, strength }>` (reuse `matchExplanationTraits` shape)
  - `tensionChip?: string` (only when friction ≥ 3)
  - `sharedInterests?: string[]` (or preformatted `sharedInterestNote`)
  - optional tone hints: `caution?`, `suggestedNextAction?`
- [x] Builder: `buildMatchNarrativeFactPack(...)` from existing compare/explainability/recommendation inputs — **no** `aboutMe` / `aboutPartner` / `aboutRelationship` fields on the type or in the builder.
- [x] Prompt contract (system + user):
  - Use only the provided facts; do not invent signals, scores, or quotes.
  - Write **5–12 sentences** of plain English; length scales with how many chips/traits/interests/tension facts are present (never pad).
  - Prefer human phrasing over chip jargon (e.g. "you're both driven" not "ambition alignment alignment").
  - If tension is present, include it honestly in 1–2 sentences.
  - No numeric scores, no "compatibility %", no "friction" jargon in the user-facing text.
- [x] LLM call via existing `LlmModule` / OpenAI client with a dedicated purpose key (e.g. `match_narrative`).
- [x] Output validator: non-empty; sentence count in band (soft: prefer 5–12; reject empty / clearly truncated); optional light check that at least one chip/trait keyword appears (or fall back if completely ungrounded).
- [x] Fallback: if LLM errors, times out, returns empty, or fails validation → multi-sentence template assembled from traits/chips (or extend today's `primaryTakeaway` into a short paragraph). Must be deterministic.
- [x] Unit tests: fact-pack builder excludes free-text; prompt contains chips/traits and never aboutMe; fallback path; mocked LLM success path returns narrative string.

### Out of scope (this story)

- Persistence / cache (Story 2).
- HTTP / match-engine wiring (Story 2).
- UI (Story 3).
- Raw profile text in the prompt (Phase 3 follow-up).
- Non-English narratives.

---

## Definition of done

- [x] Module exists and is unit-tested in isolation (mock LLM client).
- [x] Forbidden free-text cannot be passed without a TypeScript compile error (fact-pack type has no about\* fields).
- [x] Fallback always returns a usable string.

## Implementation notes

**Handoffs:** architect → dev → CR (Agent 4 N/A).

**Delivered:**
- `src/matches/match-narrative/` — types, fact-pack, prompt, validate, fallback, `MatchNarrativeGenerator`, barrel (`MATCH_NARRATIVE_PROMPT_VERSION = v1`).
- `CHIP_TO_TRAIT['Conflict approach']` added.
- Purpose `match_narrative`; Zod `{ narrative }`; fallback on throw/empty/ungrounded.
- CR tightened grounding stopwords; 25 unit tests green; `tsc` clean.

**Deferred to Story 2:** Nest DI registration, HTTP detail wiring, evaluation-keyed cache, observability on fallback.
