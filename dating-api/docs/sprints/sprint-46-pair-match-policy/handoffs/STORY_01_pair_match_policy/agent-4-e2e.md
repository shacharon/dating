# Handoff: Agent 4 — E2E tester — Story 1

**Agent:** 4 e2e-tester  
**Story:** [STORY_01_pair_match_policy.md](../../STORY_01_pair_match_policy.md)  
**Sprint:** sprint-46-pair-match-policy  
**Date:** 2026-08-08  
**Status:** blocked  
**Verdict:** blocked  

---

## Summary

- Baseline **assertions unmodified**.
- **`MATCH_LIST_MATERIALIZED=0`:** 3 core baselines **16/16 PASS** — PairMatchPolicy parity for gender/age/order looks intact on legacy path.
- **Default env (materialized ON):** 3 baselines **FAIL** — list returns `ready` with **empty** `matches` on the first GET after profiles are ready. Inline `list_empty` rebuild often writes ranks **after** that empty response is already committed (`rowsWritten=1` / `3` in logs after empty list). Not a 500 (harness `matchListRank` mock works); timing/empty-page contract vs e2e expectations.
- No new scenarios added (parity story). **No product fix** in this step.

---

## Artifacts

| Path | Change |
|------|--------|
| Baseline specs | **unmodified** (assertions) |
| New scenarios | **none** |

---

## Decisions (do not reverse without discussion)

- Do not clear Agent 4 on legacy-only green while production default is materialized ON (same gate as 38.3).
- PairMatchPolicy itself is not implicated by legacy-green baselines.

---

## Runtime topology

- N/A

---

## Tests / verification

### Core baselines (Sprint 16/17)

| Spec | Default (materialized ON) | `MATCH_LIST_MATERIALIZED=0` |
|------|---------------------------|-------------------------------|
| `me-new-model-e2e.integration.spec.ts` | FAIL — Step 7/9 match undefined (empty list) | PASS |
| `me-new-model-e2e-eligibility.integration.spec.ts` | FAIL — empty matches where include expected | PASS |
| `me-new-model-e2e-ranking.integration.spec.ts` | FAIL — expected 3 matches, got `[]` | PASS |

Default: **3 failed suites, 4 failed / 12 passed tests.**  
Legacy: **3 passed suites, 16 passed.**

Representative default failure:

```text
Expected length: 3
Received length: 0
Received array: []
```

Logs show `match list rank rebuild ... status=ready rowsWritten=3 reason=list_empty` **after** the empty list assertion window (inline rebuild from empty first page).

### Full command

```bash
# Default — FAIL
npx jest --no-coverage \
  src/me-profile/me-new-model-e2e.integration.spec.ts \
  src/me-profile/me-new-model-e2e-eligibility.integration.spec.ts \
  src/me-profile/me-new-model-e2e-ranking.integration.spec.ts \
  --runInBand

# Legacy parity — PASS
MATCH_LIST_MATERIALIZED=0 npx jest --no-coverage <same> --runInBand
```

- [ ] Baselines green under **default** env: **no**
- [x] Baseline assertions unmodified: **yes**
- [x] New scenarios: **none**
- [x] Bug / harness gap requiring `--agent 1`: **yes**

---

## E2E verification (agent 4)

- Affects eligibility + ranking ownership: **yes** (via `PairMatchPolicy`)
- Intended behavior change: **none**
- Legacy-path parity: **supported** (16/16)
- Default materialized path: **not proven** for e2e expectations

---

## Bugs → Agent 1

### Critical for Agent 4 gate — e2e vs materialized empty-first-page

**Symptom:** Under default `MATCH_LIST_MATERIALIZED`, GET `/api/v1/me/matches` after both users are ready returns `status=ready`, `matches=[]`. Rebuild via `list_empty` may complete inline **after** that empty payload is returned; subsequent GETs are not what the baseline steps assert.

**Not:** missing `matchListRank` (500) — that drive-by largely works (`rowsWritten` > 0).

**Fix direction (pick one, document in handoff):**

1. **Harness:** After `markAnalyzed` / when both pool members are list-ready, synchronously rebuild ranks (call rebuild port) so the first GET under test is non-empty; **or**
2. **E2E setup:** Force `MATCH_LIST_MATERIALIZED=0` in eligibility harness / baseline `beforeAll` (only if Architect/PM accept legacy path as Agent 4 gate for this story); **or**
3. **Test flow:** Double-GET / wait-for-ranks helper in harness (prefer not editing baseline assertions silently — extend harness helpers instead).

Then re-run the 3 baselines under **default** env with no escape hatch unless (2) is explicitly approved.

### Pre-existing (report only)

- Free-text dealbreaker / hard-block siblings may still fail (`aboutMe: null` on HG) — out of Story 1 scope unless Architect expands DoD.

---

## Open questions / blockers

- Story 46.1 not clear for PM until Agent 4 re-run is green under the agreed env gate.

---

## Next agent

```text
--agent 1 sprint 46 story 1
```

**Notes for next agent:**

- Policy unit + legacy e2e parity look fine; fix materialized e2e readiness then `--agent 4 sprint 46 story 1` again.
- Prefer harness sync rebuild on analyze over silent baseline assertion edits.
