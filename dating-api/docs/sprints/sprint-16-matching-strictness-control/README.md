# Sprint 16: Evaluator foundation — UNKNOWN vs FAIL

**Epic:** Stop the evaluator from conflating "the fact is missing" with "the fact is known and wrong" — a single, contained correctness fix underneath all future eligibility work
**Duration:** ~3–5 days (1 story)
**Goal:** `eligibility.evaluator.ts` represents a missing/withheld counterparty fact as `UNKNOWN`, distinct from `FAIL`, with a per-dimension policy for whether `UNKNOWN` blocks. Zero user-visible behavior change — this sprint is purely the internal foundation the natural-language dealbreaker work in [Sprint 17](../sprint-17-natural-language-dealbreaker-classifier/README.md) depends on.
**Status:** Planned
**Depends on:** [Sprint 15](../sprint-15-match-preferences-simplification/README.md) (evaluator trimmed to `GENDER` / `AGE` / `PROXIMITY`)
**Superseded plan:** an earlier draft of this sprint proposed reintroducing education/religion/smoking/alcohol/children as user-facing preferences with a manual **Must match / Prefer / Don't care** toggle. That direction was **dropped** in favor of [Sprint 17](../sprint-17-natural-language-dealbreaker-classifier/README.md): the engine infers dealbreaker vs. soft preference from what a user already writes in free text, instead of asking them to fill in a second, parallel settings form. This sprint is now scoped to just the foundation both directions needed anyway.

---

## Why this sprint

`eligibility.evaluator.ts` currently has exactly one outcome for "the fact is missing" and "the fact is known but wrong" — both are `FAIL`:

```ts
// dating-api/src/holy-grail-matching/eligibility.evaluator.ts (current)
// evalGender: gid undefined or PREFER_NOT_TO_SAY  -> FAIL 'PARTNER_GENDER_MISSING_OR_WITHHELD'
// evalAge:    dob undefined                       -> FAIL 'PARTNER_DOB_MISSING'
//             age undefined (invalid dob)          -> FAIL 'PARTNER_DOB_INVALID'
```

This is the actual root cause behind the Sprint 15 removal: education/smoking/alcohol/religion/wants-has-children were deleted (not fixed) because a missing self-fact hard-failed every candidate on that dimension, and the only lever available was "delete the dimension." The same pattern is still live today on `GENDER` and `AGE` — any profile with an incomplete or malformed date of birth, or gender withheld, silently disappears from every candidate pool, with no operator visibility into how often that happens.

The design docs (`docs/HOLY_GRAIL_MATCHING.md`) already describe a conceptual `UNKNOWN` outcome distinct from `NO_MATCH`, but the implementation never built it. This sprint builds it, generically, once — with **zero** change to what any user sees today. Sprint 17 is what spends this new capability.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Missing-fact outcome | New internal `UNKNOWN` status in the evaluator, distinct from `FAIL` ("fact known, genuine mismatch") and `SKIPPED` ("no preference set") |
| Blocking policy | Per-dimension: does `UNKNOWN` block `overallHardEligibility`, or not — a function, not a hardcoded assumption |
| `GENDER` / `AGE` / `PROXIMITY` | `UNKNOWN` still blocks (unchanged net behavior) — these stay hard filters, not user-configurable, not touched by Sprint 17 either |
| Scope | Pure internal refactor + telemetry. No new preference field, no UI, no self-fact input — that's Sprint 17's job, on a different mechanism (inferred from text, not a settings toggle) |

---

## Story checklist

| # | Story | Priority | Depends on |
|---|--------|----------|------------|
| 1 | [Evaluator foundation: UNKNOWN vs FAIL + per-dimension strictness](./STORY_01_evaluator_unknown_and_strictness_foundation.md) | **P0** | Sprint 15 |

---

## Sprint-level definition of done

- [ ] Evaluator represents "counterparty fact missing/withheld" as `UNKNOWN`, distinct from `FAIL`, for every dimension
- [ ] `GENDER` / `AGE` / `PROXIMITY` behavior is bit-for-bit unchanged for existing callers (pure refactor, regression-tested)
- [ ] Production telemetry exists on the eligibility funnel: PASS / FAIL / SKIPPED / UNKNOWN counts per dimension
- [ ] Full `dating-api` test suite green
