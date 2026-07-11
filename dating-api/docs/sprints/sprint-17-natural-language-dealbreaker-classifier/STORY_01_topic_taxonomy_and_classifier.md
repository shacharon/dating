# Story 1: Revive + extend the topic taxonomy and deterministic classifier

**Sprint:** 17
**Status:** Done
**Depends on:** — (can start in parallel with Sprint 16)

---

## Why

`dating-api/src/extraction/extracted-negatives.interface.ts` already defines almost exactly the shape this sprint needs — closed tags across 4 categories, a `hard`/`soft` strength, an evidence quote, a confidence score — but it has zero callers anywhere in `src/`. It's dead code, frozen with the rest of the old V2 extraction cluster (2026-04-06 retirement). Reviving and extending it is smaller and safer than designing a taxonomy from scratch, and matches the discipline already proven by the personality/lifestyle/interest-tag extractors (closed vocabulary, no hallucination, fully testable) — not open-ended text understanding.

---

## What

**As an** engineer
**I want** a deterministic classifier that reads a profile's free text and outputs, per closed-vocabulary topic, one of `HARD_EXCLUDE` / `HARD_REQUIRE` / `SOFT` / `NEUTRAL` with an evidence quote and confidence
**So that** later stories can turn stated dealbreakers/requirements into real eligibility, and everything else into a bounded ranking signal — without ever asking the user to fill in a form

### Acceptance criteria

- [x] **Revive the taxonomy:** restore `NegativeCategory`, `NEGATIVE_TAGS`, `ALL_NEGATIVE_TAGS`, `NEGATIVE_TAG_SET` from `extracted-negatives.interface.ts` into an active module (e.g. `dealbreaker-taxonomy.ts`), versioned like `INTEREST_TAG_SET` / `PERSONALITY_TRAIT_TAG_SET`.
- [x] **Extend with requirement counterparts** where sensible: `no_kids` ↔ `kids_required` and `no_pets` ↔ `pets_required` already exist as a pair; add symmetric pairs for behavioral tags where a "only X" product case is real (e.g. `only_non_smokers`), and extend `must_be_local` / `long_distance_impossible` similarly. Values/social tags (`political_incompatibility`, `jealousy`, `control`, `clingy`, `drama`, `emotional_unavailability`, `commitment_phobic`) stay **exclude-only** — do not invent a require-direction for tags where it has no real product meaning.
- [x] **New classification type:** `DealbreakerClassification = 'HARD_EXCLUDE' | 'HARD_REQUIRE' | 'SOFT' | 'NEUTRAL'` (replaces the old binary `hard`/`soft`).
- [x] **New extraction output shape**, per profile per domain (`self` / `partner` — reuse the existing self-vs-partner-text split, do **not** conflate a self-fact with a partner-preference):

  ```ts
  export interface DealbreakerSignal {
    readonly tag: string; // canonical tag, closed vocabulary
    readonly classification: DealbreakerClassification;
    readonly evidence: string; // exact quote
    readonly confidence: number; // 0-1
  }
  ```

- [x] **Deterministic detection, following the existing enrichment discipline** (`enrichment-v2.ts`, `interest-tags-text.extract.ts`):
  - Regex pattern per tag, matched against `aboutMe` + `aboutPartner` + `aboutRelationship`.
  - **Negation detection** reused from the existing `isNegatedBefore`-style window check.
  - **Polarity detection**: phrasing that unambiguously signals exclusion ("don't want", "won't date", "dealbreaker", "no smokers", explicit negation of the trait as a requirement) → `HARD_EXCLUDE`. Phrasing that unambiguously signals a positive-only requirement ("only", "must", "non-negotiable: X") → `HARD_REQUIRE`. Anything softer ("prefer not to", "not a huge fan of", "would be nice if") or ambiguous → `SOFT`. No match → `NEUTRAL` (tag absent from output, not an explicit zero).
  - **Context-window disambiguation** reused where a tag has known false-positive patterns (mirror the existing cooking-job / fermentation-lab / fungi-lab-tech patterns as the template for any topic that needs it).
- [x] **Self-fact carve-out:** a statement about the profile owner's own trait (e.g. "I smoke", domain = self) is captured separately as a self-fact update (existing `UserProfile` self-fact columns from Sprint 15 — `smokingFrequency`, etc.) and **never** enters `DealbreakerSignal` output, which is partner-preference-only.
- [x] **Tests:** table-driven spec covering every tag × the 4 classifications × at least one negation case and one context-disambiguation case per tag family, mirroring `enrichment-canonical-labels.spec.ts`'s structure. Include your exact examples as literal test cases:
  - "I smoke" → no `DealbreakerSignal` (self-fact only, not a preference)
  - "I don't want smokers" → `{ tag: 'smoking', classification: 'HARD_EXCLUDE' }`
  - "I don't care about smoking" → `{ tag: 'smoking', classification: 'SOFT' }`
  - "Only smokers" / "must be a smoker" → `{ tag: 'smoking', classification: 'HARD_REQUIRE' }`

### Out of scope (this story)

- Any change to Holy Grail's evaluator, canonical types, or ranking (Story 2)
- LLM-based extraction — deterministic only, per the locked decision; revisit only if this story's recall proves insufficient in real data
- Any UI or user-visible surface (Story 3)
- Open-ended/arbitrary topic detection beyond the closed taxonomy

---

## Definition of done

- [x] Taxonomy revived, extended with sensible requirement counterparts, versioned
- [x] Classifier is pure and deterministic; same input text always produces the same `DealbreakerSignal[]`
- [x] Table-driven tests cover all 4 classifications per tag family, including negation and disambiguation cases
- [x] Zero LLM calls, zero network calls in this module
- [x] Full `dating-api` test suite green

### Implementation notes (PM close)

- Live modules: `dealbreaker-taxonomy.ts`, `dealbreaker-signals-text.extract.ts` (+ spec); `extracted-negatives.interface.ts` deprecated and re-exports taxonomy.
- Self-fact carve-out emits `SelfFactHint[]` (not persisted yet — Story 2).
- Agent 4: **N/A** for new matches scenarios (classifier not wired); baseline E2E smoke green.
- Test surface verified this pipeline: holy-grail-matching **225** + baseline me-new-model E2E **16**.