# Story 2: Add interestAlignment blend component

**Sprint:** 21
**Status:** Done
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

- [x] Add `computeInterestAlignment(interestsA, interestsB): number` (0–100) using normalized Jaccard overlap; deterministic; empty/one-sided sets score 0 (or a small floor) — mirror the overlap logic already in `src/holy-grail-matching/holy-grail-five-signal-ranking.ts` (`interestsPairScore`).
- [x] Thread the interest lists from the evaluation payload (`src/evaluate/enrichment-signals.ts` output) into `src/matches/match-engine.ts` `compare()`.
- [x] Add `interestAlignment` to `COMPATIBILITY_BLEND_WEIGHTS` in `src/engine/scoring.ts` and extend `compatibility()` to include it; assert weights sum to 1.
- [x] Surface shared interests in explainability as a positive reason ("you both like X").
- [x] No change to the HG eligibility path.

### Out of scope (this story)

- Final weight tuning and golden updates (Story 3).

---

## Definition of done

- [x] `interestAlignment` is a named, bounded blend term; blend sums to 1.
- [x] Deterministic unit tests for the overlap function (identical, disjoint, partial, empty).

## Implementation notes

**Files changed:**
- `src/matches/interest-alignment.ts` *(new)* — `computeInterestAlignment()` (Jaccard 0–100, case-insensitive, one-sided floor `round(10 × min(1, k/5))`); `sharedInterestTags()` returning the intersection for explainability.
- `src/matches/interest-alignment.spec.ts` *(new)* — 15 deterministic tests: identical, disjoint, partial (1/3, 2/4), both empty, one-sided (k=1, k=5), case/trim, integer output, 0–100 bounds.
- `src/engine/scoring.ts` — Rebalanced `COMPATIBILITY_BLEND_WEIGHTS` (`aToB 0.28 / bToA 0.28 / relationshipFit 0.24 / valuesAlignment 0.12 / interestAlignment 0.08`; sum = 1.00). `compatibility()` gains a 5th param `interestAlignment`.
- `src/matches/match-engine.ts` — Reads `enrichment?.signals?.interestsTop3` (fully optional-chained) from both profiles; computes `interestAlignmentValue` and `sharedInterestTags`; passes both into `computeCompatibilityAndNuancePenalties()` and `buildMatchExplainability()`; exposes `interestAlignment: number` on `CompareResultDto`.
- `src/matches/match-explainability.ts` — Added `sharedInterests?: string[]` to `MatchExplainabilityInput`; added `sharedInterestNote?: string` to `MatchExplainabilityDto`; `buildSharedInterestNote()` produces `"You both enjoy X, Y."` (≤ 3 tags).
- `src/engine/engine.scoring.spec.ts` — Updated all `compatibility()` call-sites to pass the 5th arg; updated hardcoded expected values to match rebalanced weights.

**Bugbot finding (fixed):** Optional chaining on `enrichment?.signals.interestsTop3` was incomplete; fixed to `enrichment?.signals?.interestsTop3` so partial enrichment objects on legacy payloads fall back to `[]` instead of throwing.

**Security review:** No medium+ findings. Optional hardening noted: run shared tags through `labelInterest()` before display; clamp at read time in `match-engine.ts`.

**Verification:** `tsc --noEmit` clean; 1,602/1,604 tests green (2 pre-existing failures unrelated to this story).
