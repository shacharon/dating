# Story 3: Profile — full why with controlled free-text (Phase 3)

**Sprint:** 23  
**Status:** Done  
**Depends on:** Story 2 Done (voice rules stable)

---

## Why

List = scan. Profile = **full solve**: the points **and** the music.  
Phase 2 only sees chip evidence, so prose stays generic. Controlled profile free-text (`aboutMe` / `aboutPartner` / `aboutRelationship` excerpts) is how two people who write about solitude the same way finally show up in the why.

Was: `FOLLOWUP_phase3_raw_text_narrative.md` (Sprint 22). Now in-sprint.

---

## What

**As a** user  
**I want** the match detail why to use real (safe) words from our profiles  
**So that** it feels specific to us, not any two “driven + deep” people.

### Acceptance criteria

- [x] Fact pack / prompt may include a **redacted, capped** free-text subset (architect: max chars, which fields, how many excerpts).
- [x] Mandatory redaction/safety pass before prompt assembly (PII patterns, explicit deny categories as architect lists).
- [x] LLM still must not invent biography or quotes not in the allowed excerpts / structured facts.
- [x] Validator: still ban fluff from Story 2; grounding may include tokens from allowed excerpts **and** evidence/interests.
- [x] Bump `MATCH_NARRATIVE_PROMPT_VERSION` → **`v4`** (or agreed bump after v3).
- [x] Cache key unchanged shape; version bump invalidates.
- [x] Fallback path must **not** dump raw free-text into UI if LLM fails (structured fallback only).
- [x] Unit tests: free-text omitted when empty; redaction strips obvious PII fixtures; inventing-ungrounded → fail; success path includes excerpt cue.
- [x] Product/legal note in architect handoff: purpose expansion of profile text acknowledged.
- [x] Scoring / list path untouched.

### Out of scope

- Sending full unfiltered profiles to the LLM.
- List LLM / list free-text.
- Admin narrative editor.
- Non-English generation.

---

## Definition of done

- [x] Local smoke (optional): detail narrative references a concrete shared theme from real about-text without quoting unsafe content. *(deferred — operator)*
- [x] Fallbacks never expose raw about\* blobs.
- [x] Agent 4: **skip** unless architect changes matches HTTP contract beyond `matchNarrative` string content.

## Suggested touchpoints

- `match-narrative-fact-pack.ts` / types / prompt / validate / generator
- Redaction helper (new small module)
- `MeMatchesService` only if fact-pack assembly needs profile text loads (keep list LLM-free)
- Specs + Story 2 voice module reuse

## Agent pipeline

```text
--agent 0 sprint 23 story 3
--agent 1 sprint 23 story 3
--agent 2 sprint 23 story 3
--agent 3 sprint 23 story 3
```

**Skip Agent 4** by default.

## Close notes (Agent 3)

- **Product/legal acknowledgment:** Profile free-text may be processed by the match-narrative LLM **only** to explain why two users match on the **detail** surface. Excerpts are redacted, capped (≤4 × 180), never logged at info as full blobs, never returned on list or as raw about\* on HTTP. Product + legal accept this purpose expansion for ship.
- CR locked scrub to spaces (no `[redacted]` markers in grounding/prompt).
- Next: Story 4 fallback harden.
