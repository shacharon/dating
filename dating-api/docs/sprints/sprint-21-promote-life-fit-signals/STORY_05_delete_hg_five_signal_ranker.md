# Story 5: Delete HG five-signal ranker

**Sprint:** 21
**Status:** Done
**Depends on:** Stories 1, 2, 3 (live engine + calibration verified)

---

## Why

The product decision is locked: live ranking stays on `compareWithStatus` (now 15 signals + interestAlignment). The parallel Holy Grail five-signal ranker (`holy-grail-five-signal-ranking.ts` and call sites) is redundant and risks dual-path confusion. After Stories 1–3 ship and are verified, delete the unused ranker path.

---

## What

**As an** engineer
**I want** the dead HG five-signal ranking pipeline removed
**So that** there is one ranker and no accidental drift back to the parallel path.

### Acceptance criteria

- [x] Identify all production call sites of the five-signal ranking path (not eligibility / hard gates).
- [x] Remove or tombstone the ranker module and wire callers to the live engine only (or delete dead callers).
- [x] Keep HG **eligibility** / hard-block / admission gates **byte-for-byte** (kids/smoking/gender/age etc.) — this story deletes ranking only.
- [x] Update or delete tests that asserted the five-signal ranker; leave HG eligibility integration suites green and unchanged in behavior.
- [x] Grep/CI confirms no remaining imports of the deleted ranker entrypoints (under `src/`).

### Out of scope

- Changing HG eligibility semantics.
- Backfill re-analysis of profiles.
- UI work (Story 4).

---

## Definition of done

- [x] Five-signal ranker code path gone from production graph.
- [x] HG eligibility suite still green / behavior unchanged.
- [x] Related suites green; Bugbot + security review clean.

## Implementation notes

- Deleted `holy-grail-five-signal-ranking.ts` (+ unit + chain specs).
- `rankHolyGrailCandidatesAfterHardFilter` still hard-filters, then stable `profileId` sort with stub `rankScore: 0` / `hg_rank_retired:…`.
- Live `/api/v1/me/matches` unchanged (still `compareWithStatus` + HG hard-block directions).
- Active verify scripts retired with exit message; archive scripts may still reference the old module (not in `src` compile graph).
