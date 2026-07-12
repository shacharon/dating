# Sprint 21 Story 3 — Calibration note

**Date:** 2026-07-13  
**Decision:** Keep Story 1–2 starting weights; no further tune this sprint.

## Locked weights

| Knob | Value |
|------|-------|
| `conflictStyle` (Tier 2) | `1.3` |
| Blend `aToB` / `bToA` | `0.28` / `0.28` |
| Blend `relationshipFit` | `0.24` |
| Blend `valuesAlignment` | `0.12` |
| Blend `interestAlignment` | `0.08` |
| Blend sum | `1.00` |
| Coverage keys | `15` (`COMPATIBILITY_SIGNAL_KEYS`) |

## Why no further tune

1. Fixture field-check (Stories 1–2) passed and was accepted by product.
2. Related unit suites green (`match-engine`, `engine.scoring`, `compatibility-score`, coverage/calibration).
3. HG eligibility integration suite green (59 tests) — eligibility path unchanged.
4. `data/golden-pairs.json` / `data/matches` are **not present** in this workspace checkout, so the historical `validate:golden-pairs` / `score-stats` corpus could not be re-run here. Calibration is anchored on Sprint 21 fixtures + unit locks instead of silent band edits.

## Fixture before/after (measured)

In-memory `npm run verify:sprint21-fixtures` (post Stories 1–2):

| Pair | interestAlignment | sharedInterestNote | Conflict approach chip | coverage% | finalScore |
|------|-------------------|--------------------|------------------------|-----------|------------|
| conflict_same | 0 | — | yes | 100 | 78 |
| interests_overlap | 50 | `You both enjoy hiking, books.` | no | 93 | 82 |
| control | 0 | — | no | 93 | 78 |

**Intentional deltas vs pre–Sprint 21:**

- Coverage denom 14 → 15: pairs missing `conflictStyle` read ~93% when all other keys match (accepted; backfill follow-up).
- Blend rebalance + `interestAlignment`: shared interests raise `compatibility` vs empty-interest twins (unit-locked).
- `conflictStyle` alignment can surface **Conflict approach** chip (unit-locked).

## Follow-ups

| Item | Status |
|------|--------|
| Backfill re-analysis for `conflictStyle` | Still out of sprint — see `FOLLOWUP_backfill_conflictstyle.md` |
| Delete HG five-signal ranker | **Moved to Story 5** (in sprint) |

## HG eligibility

Verified unchanged via `me-new-model-e2e-eligibility` / related suites (2026-07-13).
