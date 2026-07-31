# Story 4: Fallback — never blank, never chip soup

**Sprint:** 23  
**Status:** Done  
**Depends on:** Stories 1–3 Done

---

## Why

When the LLM fails or validation rejects, users still see something. Today leftovers can still look like chip lists or empty holes. List and detail must both degrade to **human** copy.

---

## What

**As a** user  
**I want** a usable why even when generation fails  
**So that** the match never feels broken or full of product labels.

### Acceptance criteria

- [x] **List:** if TLDR builder has thin facts, still show a plain band-based line (e.g. “Some real overlap — open to see why.”) — **no chip names**.
- [x] **Detail:** existing `buildFallbackMatchNarrative` stays evidence-first; no chip-label joins; tension via scrubbed `tensionNoteFromChip` (already Story 22.4 — verify still true after Stories 2–3).
- [x] Detail fallback **never** includes raw `about*` free-text (especially after Story 3).
- [x] Failed LLM output is **not** cached (Story 22.2 lock — reconfirm).
- [x] Unit tests: empty chips list TLDR; LLM fluff → fallback without chip labels; Phase 3 fail → structured fallback only.
- [x] UI: detail still prefers `matchNarrative` when present; list never shows long narrative. *(also: never display `reasonShort` on list/detail prose)*

### Out of scope

- New “Refresh explanation” button.
- Changing cache key shape.
- Scoring.

---

## Definition of done

- [x] Forced LLM fail in unit/integration → human strings on both surfaces.
- [x] No fixture output contains `Ambition alignment` as user-visible fallback text.
- [x] Agent 4: skip unless HTTP harness needs a fail-path assert (architect call).

## Suggested touchpoints

- List TLDR builder (Story 1)
- `match-narrative-fallback.ts` + generator
- `MeMatchesService` cache-on-fallback guard
- Specs list + narrative

## Agent pipeline

```text
--agent 0 sprint 23 story 4
--agent 1 sprint 23 story 4
--agent 2 sprint 23 story 4
--agent 3 sprint 23 story 4
```

## Close notes (Agent 3)

- Product me-matches UI never shows `reasonShort` (takeaway / narrative only).
- Thin-pack fallback uses human “shared detail” copy (Agent 2).
- Optional operator: force LLM fail once; eyeball list card + detail for same match.
