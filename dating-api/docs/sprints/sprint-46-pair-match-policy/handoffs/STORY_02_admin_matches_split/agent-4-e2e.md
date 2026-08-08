# Handoff: Agent 4 — E2E tester — Story 2

**Agent:** 4 e2e-tester  
**Story:** [STORY_02_admin_matches_split.md](../../STORY_02_admin_matches_split.md)  
**Sprint:** sprint-46-pair-match-policy  
**Date:** 2026-08-08  
**Status:** blocked  
**Verdict:** blocked  

---

## Summary

- Baseline **assertions unmodified**. Story 2 commits touch **admin `matches/` only** — no harness / me-profile product path edits.
- **`MATCH_LIST_MATERIALIZED=0`:** 3 core baselines **16/16 PASS** — product PairMatchPolicy gate+score parity still intact on legacy path after admin wire.
- **Default env (materialized ON):** same **empty-first-page** failure as Story 01 / 38.3 — `status=ready`, `matches=[]`, `list_empty` rebuild often after empty response. **Not** a Story 2 admin-compare regression.
- Admin HTTP smoke (`matches-api-smoke.integration.spec.ts`): **6/6 PASS** (service mocked — proves controller envelopes, not policy internals; those covered by Agent 2 unit specs).
- No new product E2E scenarios (Architect: product Ranking/Detail untouched; admin list pairwise out of scope).

---

## Artifacts

| Path | Change |
|------|--------|
| Baseline specs | **unmodified** |
| Harness | **unmodified** by Story 2 |
| New scenarios | **none** |

---

## Decisions (do not reverse without discussion)

- Do not clear Agent 4 on legacy-only green while production default is materialized ON (same gate as Story 01 / 38.3).
- Do not attribute default empty-list failures to `AdminPairMatchEvaluator` / Story 2 admin wiring.
- Admin compare HTTP smoke remains mocked-service; deeper policy parity stays in unit tests unless Architect asks for a real Nest+policy admin compare harness later.

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

Representative (ranking):

```text
Expected length: 3
Received length: 0
Received array: []
```

Log pattern: `match list rank rebuild ... status=ready rowsWritten=3 reason=list_empty` on the GET that still returned `[]` to the assertion (rebuild after empty first page).

### Admin compare smoke

```bash
npx jest --no-coverage src/matches/matches-api-smoke.integration.spec.ts --runInBand
```

→ **6 passed** (READY + INSUFFICIENT_DATA envelopes).

### Full command (required)

```bash
npx jest --no-coverage "integration.spec" --runInBand
```

→ **13 failed / 12 passed suites**; **29 failed / 313 passed tests.**  
Failures cluster on me-matches empty-list under default materialized (baselines + narrative + dealbreaker siblings, etc.). Not isolated to Story 2.

- [ ] Baselines green under **default** env: **no**
- [x] Baseline assertions unmodified: **yes**
- [x] New scenarios: **none** (product path unchanged by this story)
- [x] Bug / harness gap requiring Agent 1: **yes** (pre-existing; see below)
- [x] Story 2 admin wire product regression under legacy: **no** (16/16)

---

## E2E verification (agent 4)

| Item | Result |
|------|--------|
| Story touches shared gate+score policy | Yes (admin compare now via `PAIR_MATCH_POLICY`) |
| Intended product me-matches change | None |
| Legacy product parity | Supported (16/16) |
| Default materialized e2e gate | **Not cleared** (pre-existing empty-first-page) |
| Admin HTTP contract smoke | Pass (mocked service) |

---

## Bugs → Agent 1

### Critical for Agent 4 gate — e2e vs materialized empty-first-page (pre-existing)

**Same as Story 01 Agent 4.** Story 2 did **not** introduce it.

**Symptom:** Under default `MATCH_LIST_MATERIALIZED`, GET `/api/v1/me/matches` after pool is ready returns `status=ready`, `matches=[]`. Inline `list_empty` rebuild may write ranks after that empty payload.

**Fix direction (pick one; prefer harness — do not silently change baseline assertions):**

1. After `markAnalyzed` / when pool is list-ready, **synchronously rebuild ranks** in harness so first GET is non-empty; **or**
2. Force `MATCH_LIST_MATERIALIZED=0` in harness/`beforeAll` **only if** Architect/PM accept legacy as Agent 4 gate; **or**
3. Double-GET / wait-for-ranks helper in harness (extend helpers, not baseline expects).

Then re-run the 3 baselines under **default** env.

**Out of Story 2 admin scope unless PM expands DoD to include this harness fix on the Story 2 track.**

---

## Open questions / blockers

- Agent 4 matching gate remains blocked by Story 01 / 38.3 materialized readiness.
- Story 2 admin PairMatchPolicy wire is not implicated by legacy-green product baselines.

---

## Next agent

```text
--agent 1 sprint 46 story 2
```

**Notes for next agent:**

- Prefer harness readiness fix (options above) if clearing Agent 4 on this track; do **not** revert admin policy wiring.
- Alternate: clear via Story 01 Agent 1, then re-run `--agent 4 sprint 46 story 2`.
- After default baselines green → `--agent 4` again → then `--agent 3 sprint 46 story 2`.
