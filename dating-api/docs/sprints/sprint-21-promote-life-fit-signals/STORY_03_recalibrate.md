# Story 3: Recalibrate scores + update golden/calibration tests

**Sprint:** 21
**Status:** Planned
**Depends on:** Stories 1, 2

---

## Why

Stories 1 and 2 change the score of every pair. Without recalibration, scores would drift and the golden/calibration suites would fail noisily. This story makes the shift deliberate and measured.

---

## What

**As an** engineer
**I want** weights tuned and golden expectations updated with documented deltas
**So that** the new signals improve ranking without unexplained score movement.

### Acceptance criteria

- [ ] Run the match diagnostics / score-stats scripts (`src/scripts/match-diagnostics.ts`, `src/scripts/score-stats.ts`) before/after; capture score-distribution deltas.
- [ ] Tune `conflictStyle` weight and the blend split (from Story 1/2 starting points) so the golden-pair bands still hold or are re-set intentionally.
- [ ] Update affected suites: `src/matches/match-engine.spec.ts`, `src/engine/engine.scoring.spec.ts`, `src/compatibility/compatibility-score.spec.ts`, calibration/coverage policy specs.
- [ ] Document before/after for each golden pair in the PM close note (no silent expectation edits).
- [ ] Confirm HG eligibility integration suite unchanged.

### Out of scope (this story)

- Backfill re-analysis of existing profiles.
- Deleting the HG five-signal ranker.

---

## Definition of done

- [ ] Full `dating-api` suite green.
- [ ] Score-distribution delta documented; golden changes justified.
- [ ] Two follow-up tickets filed: (1) backfill re-analysis, (2) retire HG five-signal ranker.
