# Story 1: Narrative breathes — paragraph breaks

**Sprint:** 25  
**Status:** Done  
**Depends on:** —

---

## Why

Detail why often arrives as one dense paragraph. On mobile it reads like an essay, not a dating card.

---

## What

**As a** user  
**I want** the long why split into short paragraphs  
**So that** I can skim without a wall of text.

### Acceptance criteria

- [x] When narrative has blank-line / newline breaks, UI still respects them.
- [x] When narrative is a **single block** (typical LLM JSON paragraph), UI groups sentences into **~2–3 short paragraphs**.
- [x] Quotes / profile excerpts still render inside the prose (no stripping).
- [x] Unit tests cover single-block → multi-paragraph and newline-preserving paths.
- [x] No API / prompt / `v4` change required for this story (UI-side split is enough).

### Out of scope

- Shortening or rewriting narrative copy (Sprint 24 was reverted).
- Changing takeaway (short) layout.

## Suggested touchpoints

- `dating-ui/.../match-detail-prose.ts` (`splitNarrativeParagraphs`)
- `match-detail-prose.spec.ts`
- Optional eyeball on `page.tsx` narrative render (already maps `<p>`s)
