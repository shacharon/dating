# Story 3: Recalibrate scores + update golden/calibration tests

**Sprint:** 21
**Status:** Done
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

- [x] Run the match diagnostics / score-stats scripts (`src/scripts/match-diagnostics.ts`, `src/scripts/score-stats.ts`) before/after; capture score-distribution deltas.
  - Note: `data/matches` / `data/golden-pairs.json` absent in this checkout; deltas captured via Sprint 21 fixtures + unit locks (see `STORY_03_CALIBRATION_NOTE.md`).
- [x] Tune `conflictStyle` weight and the blend split (from Story 1/2 starting points) so the golden-pair bands still hold or are re-set intentionally.
  - Decision: **lock starting weights** (no further tune); documented in calibration note.
- [x] Update affected suites: `src/matches/match-engine.spec.ts`, `src/engine/engine.scoring.spec.ts`, `src/compatibility/compatibility-score.spec.ts`, calibration/coverage policy specs.
- [x] Document before/after for each golden pair in the PM close note (no silent expectation edits).
  - Fixture table in `STORY_03_CALIBRATION_NOTE.md` (corpus golden pairs N/A locally).
- [x] Confirm HG eligibility integration suite unchanged.

### Out of scope (this story)

- Backfill re-analysis of existing profiles → `FOLLOWUP_backfill_conflictstyle.md`.
- Deleting the HG five-signal ranker → **Story 5**.

---

## Definition of done

- [x] Full related suites green (match-engine + scoring + HG eligibility).
- [x] Score-distribution / fixture delta documented; weight lock justified.
- [x] Follow-ups: backfill filed; HG-ranker deletion tracked as Story 5.
