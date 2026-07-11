# Sprint 16: Evaluator foundation — UNKNOWN vs FAIL

**Epic:** Stop the evaluator from conflating "the fact is missing" with "the fact is known and wrong" — a single, contained correctness fix underneath all future eligibility work
**Duration:** ~3–5 days
**Goal:** `eligibility.evaluator.ts` represents a missing/withheld counterparty fact as `UNKNOWN`, distinct from `FAIL`, with a per-dimension policy for whether `UNKNOWN` blocks. Zero user-visible behavior change — internal foundation for [Sprint 17](../sprint-17-natural-language-dealbreaker-classifier/README.md).
**Status:** Done
**Depends on:** [Sprint 15](../sprint-15-match-preferences-simplification/README.md) (evaluator trimmed to `GENDER` / `AGE` / `PROXIMITY`)
**Superseded plan:** an earlier draft proposed reintroducing education/religion/smoking/alcohol/children with a manual **Must match / Prefer / Don't care** toggle. That was **dropped** in favor of Sprint 17 (infer from free text). This sprint stayed scoped to the foundation only.

---

## Why this sprint

Previously missing/withheld counterparty facts and genuine mismatches were both `FAIL`. Design docs already described `UNKNOWN`; implementation never built it. This sprint built it once, with zero user-visible change. Sprint 17 spends the capability.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Missing-fact outcome | Internal `UNKNOWN`, distinct from `FAIL` and `SKIPPED` |
| Blocking policy | `BLOCKS_ON_UNKNOWN` \| `NEVER_BLOCKS` per dimension |
| `GENDER` / `AGE` / `PROXIMITY` | `BLOCKS_ON_UNKNOWN` (unchanged net behavior) |
| Scope | Pure internal refactor + telemetry — no preference UI |

---

## Story checklist

| # | Story | Priority | Depends on | Status |
|---|--------|----------|------------|--------|
| 0 | [E2E characterization baseline](./STORY_00_e2e_characterization_baseline.md) | **P0** | — | Done |
| 1 | [Evaluator foundation: UNKNOWN vs FAIL + blocking policy](./STORY_01_evaluator_unknown_and_strictness_foundation.md) | **P0** | Story 0 | Done |

**Order:** 0 → 1. Story 1 kept Story 0 baseline assertions green unmodified.

---

## Sprint-level definition of done

- [x] Evaluator represents "counterparty fact missing/withheld" as `UNKNOWN`, distinct from `FAIL`
- [x] `GENDER` / `AGE` / `PROXIMITY` behavior unchanged for existing callers (unit + E2E baseline)
- [x] Production telemetry on eligibility funnel: PASS / FAIL / SKIPPED / UNKNOWN counts per dimension
- [x] Full `dating-api` test suite green (agent 2: 138 suites / 1441 tests; agent 4 integration: 17 / 294)

**Sprint 16 is complete.** Next: [Sprint 17](../sprint-17-natural-language-dealbreaker-classifier/README.md) (open ranking-signal decision still blocks Story 2’s soft half).

---

## Notes from Story 0 (characterization)

1. **`GENDER`'s evaluator FAIL branch is effectively dead on the live matches path** — redundant reciprocal gender check runs first.
2. **Truly missing gender is rare via normal signup** — submit rejects unset/`PREFER_NOT_TO_SAY`; later PATCH can withhold.
3. **Ranking:** `matchScore` comes from V1 `compareWithStatus`, not `holy-grail-five-signal-ranking.ts` — see Sprint 17 open decision.
