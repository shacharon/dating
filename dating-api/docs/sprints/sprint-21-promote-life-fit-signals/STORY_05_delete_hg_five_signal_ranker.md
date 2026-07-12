# Story 5: Delete HG five-signal ranker

**Sprint:** 21
**Status:** Planned
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

- [ ] Identify all production call sites of the five-signal ranking path (not eligibility / hard gates).
- [ ] Remove or tombstone the ranker module and wire callers to the live engine only (or delete dead callers).
- [ ] Keep HG **eligibility** / hard-block / admission gates **byte-for-byte** (kids/smoking/gender/age etc.) — this story deletes ranking only.
- [ ] Update or delete tests that asserted the five-signal ranker; leave HG eligibility integration suites green and unchanged in behavior.
- [ ] Grep/CI confirms no remaining imports of the deleted ranker entrypoints.

### Out of scope

- Changing HG eligibility semantics.
- Backfill re-analysis of profiles.
- UI work (Story 4).

---

## Definition of done

- [ ] Five-signal ranker code path gone from production graph.
- [ ] HG eligibility suite still green / behavior unchanged.
- [ ] Full `dating-api` suite green.
