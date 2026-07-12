# Story 2: Add interestAlignment blend component

**Sprint:** 21
**Status:** Planned
**Depends on:** —

---

## Why

Shared interests drive the first spark and are great for "why you matched" explanations, but they're extracted and then ignored by scoring. Interests are a set of tags, not a 1–10 value, so they can't be a compatibility signal slot — they need a dedicated overlap term.

---

## What

**As an** engineer
**I want** a bounded `interestAlignment` score folded into the blend
**So that** shared interests raise match quality without hacking the numeric-signal path.

### Acceptance criteria

- [ ] Add `computeInterestAlignment(interestsA, interestsB): number` (0–100) using normalized Jaccard overlap; deterministic; empty/one-sided sets score 0 (or a small floor) — mirror the overlap logic already in `src/holy-grail-matching/holy-grail-five-signal-ranking.ts` (`interestsPairScore`).
- [ ] Thread the interest lists from the evaluation payload (`src/evaluate/enrichment-signals.ts` output) into `src/matches/match-engine.ts` `compare()`.
- [ ] Add `interestAlignment` to `COMPATIBILITY_BLEND_WEIGHTS` in `src/engine/scoring.ts` and extend `compatibility()` to include it; assert weights sum to 1.
- [ ] Surface shared interests in explainability as a positive reason ("you both like X").
- [ ] No change to the HG eligibility path.

### Out of scope (this story)

- Final weight tuning and golden updates (Story 3).

---

## Definition of done

- [ ] `interestAlignment` is a named, bounded blend term; blend sums to 1.
- [ ] Deterministic unit tests for the overlap function (identical, disjoint, partial, empty).
