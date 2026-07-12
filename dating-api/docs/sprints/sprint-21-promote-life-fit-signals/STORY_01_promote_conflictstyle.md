# Story 1: Promote conflictStyle to an active compatibility signal

**Sprint:** 21
**Status:** Done
**Depends on:** —

---

## Why

`conflictStyle` is already extracted by the LLM (self + partner prompts) and stored as a shadow signal, but `computeCompatibility` never reads it. How a couple handles disagreement is one of the most predictive factors in relationship success and is the single biggest gap in the current 14 signals. Promoting it is wiring an existing signal, not building a new one.

---

## What

**As an** engineer
**I want** `conflictStyle` treated as a first-class numeric compatibility signal
**So that** the live match score reflects conflict-handling fit, like it already does for emotionalDepth, independence, etc.

### Acceptance criteria

- [x] Move `conflictStyle` from `SHADOW_SIGNAL_KEYS` to `OFFICIAL_EXTRACTION_SIGNAL_KEYS` in `src/extraction/extracted-signals.interface.ts`; update the shadow-count expectations in `src/extraction/extracted-signals.spec.ts` (currently asserts 8 shadow / 22 total).
- [x] Add `conflictStyle` to `SignalKey`, `COMPATIBILITY_SIGNAL_KEYS`, `COMPATIBILITY_WEIGHTS` (start 1.3), and `TIER2_KEYS` in `src/compatibility/compatibility-score.ts`.
- [x] Confirm signal-count policies still hold (`SIGNAL_COUNT_MAX = 12` counts official non-null; adding a 15th key does not break the cap logic in `src/extraction/extraction-signal-count-policy.ts` and `src/engine/signal-post-processing/signal-count-policy.ts`).
- [x] Verify it appears in explainability (`src/matches/match-explainability.ts`) alignments/tensions like other signals.
- [x] No change to the HG eligibility path.

### Out of scope (this story)

- Blend-weight rebalancing and golden-value updates (Story 3).
- Re-analyzing existing profiles (backfill follow-up).

---

## Definition of done

- [x] `conflictStyle` flows extraction → `computeCompatibility` → explainability.
- [x] Type/compile clean; unit tests for compatibility updated to include the new key.

## Implementation notes

**Files changed:**
- `src/extraction/extracted-signals.interface.ts` — promoted `conflictStyle`; `OFFICIAL_EXTRACTION_SIGNAL_KEYS` is now 15, `SHADOW_SIGNAL_KEYS` is now 7; total stays 22.
- `src/extraction/extracted-signals.spec.ts` — updated shadow-count assertions (8 → 7) and removed `conflictStyle` from shadow expectations.
- `src/compatibility/compatibility-score.ts` — added `conflictStyle` to `SignalKey`, `COMPATIBILITY_SIGNAL_KEYS`, `TIER2_KEYS`, and `COMPATIBILITY_WEIGHTS` (weight `1.3`).
- `src/compatibility/compatibility-score.spec.ts` — updated `matchedSignals` perfect-match assertion (14 → 15); added `conflictStyle: null` to low-coverage partner fixture.
- `src/matches/match-explainability.ts` — added chip label `'Conflict approach'` and domain `'communication'`.
- `src/evaluate/product-scores.ts` — replaced hardcoded `14 * 3` denominator with `OFFICIAL_EXTRACTION_SIGNAL_KEYS.length * 3` (Bugbot finding; keeps coverage score correct as signal count grows).

**Verification:** `tsc --noEmit` clean; 1,586/1,588 unit tests green (2 pre-existing failures unrelated to this story). Security review: no findings.
