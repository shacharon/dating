# Story 2: Wire classifier output into Holy Grail eligibility + ranking

**Sprint:** 17
**Status:** Done
**Depends on:** Story 1 (`DealbreakerSignal` classifier), [Sprint 16](../../sprint-16-matching-strictness-control/README.md) (evaluator `UNKNOWN`/blocking-policy foundation)

---

## Why

Story 1 produces classified signals in memory; nothing reads them yet. This story is the actual behavior change: `HARD_EXCLUDE`/`HARD_REQUIRE` become real, dynamic eligibility dimensions (one per matched tag), and `SOFT`/`NEUTRAL` become a bounded ranking overlay — reusing Sprint 16's blocking-policy plumbing and the existing overlay pattern from `holy-grail-five-signal-ranking.ts`, rather than inventing new mechanisms.

---

## What

**As the** matching engine
**I want** classifier-derived hard signals to exclude/require candidates, and soft signals to only ever shift rank
**So that** stated dealbreakers are honored as real exclusions, nobody is excluded by mere silence on a topic, and everything else quietly improves ranking

### A. Persistence + canonical mapping

- [x] **Superseded (architect):** no Prisma JSON column this story — **extract-at-read** from `aboutMe` / `aboutPartner` / `aboutRelationship` in `buildHolyGrailProfileMappingInputFromDbRow` (same discipline as personality/lifestyle/interest). Durable analysis-time cache deferred (Story 3 / later).
- [x] `profile-to-canonical.mapper.ts`: map `dealbreakerSignals` / `dealbreakerSelfFacts` onto the canonical model — no widened defaults, absent tag = no signal for that tag (same sparse-preferences discipline as every other field in this mapper).

### B. Evaluator — dynamic per-tag dimensions

- [x] Extend with **dynamic** tag-keyed dimensions via parallel `dealbreakerDimensions` on `HolyGrailDirectionalEvaluationResult` (not a fixed enum growth per tag).
- [x] For each tag where the **searcher** has a `HARD_EXCLUDE` or `HARD_REQUIRE` classification (from their own partner-preference text):
  - Look up the **counterparty's own self-fact** for that tag (columns + `dealbreakerSelfFacts` hints).
  - Counterparty has an explicit, classified **conflicting** self-fact → `FAIL`.
  - Counterparty has an explicit, classified **matching** self-fact → `PASS`.
  - Counterparty said **nothing** on this topic → `UNKNOWN`.
- [x] **Blocking policy for these dynamic dimensions is `NEVER_BLOCKS` on `UNKNOWN`** (per the README's locked decision).
- [x] `overallHardEligibility` folds these dynamic dimensions into the same "no `FAIL`" rule as `GENDER`/`AGE`/`PROXIMITY`.

### C. Ranking overlay — SOFT / NEUTRAL

- [x] **Superseded (architect Option C):** soft ranking **deferred**. Live `/me/matches` sorts by V1 `compareWithStatus`, not five-signal ranking — a five-signal overlay would be dead code. Soft bonuses must not touch `compareWithStatus` this story. Tracked follow-up once ranking architecture is resolved.

### Acceptance criteria

- [x] Searcher states "I don't want smokers"; counterparty's own text says "I smoke" → directional evaluation `FAIL` on that tag; counterparty's text says nothing about smoking → not blocked; counterparty's text says "I don't smoke" → passes with a grounded match. (unit + HTTP E2E)
- [x] Searcher states "only smokers" (`HARD_REQUIRE`); counterparty silent on smoking → not blocked; counterparty explicitly non-smoker → `FAIL`; counterparty explicitly smoker → `PASS`. (unit; HTTP covers conflict exclusion)
- [x] Searcher states "don't care about smoking" or says nothing → no eligibility effect. (**Ranking overlay deferred** — Option C; SOFT has no live order impact.)
- [x] `computeHolyGrailRankingPurityRank` / five-signal / `compareWithStatus` **untouched** — purity path unchanged by construction (Option C).
- [x] Matrix tests: tag × {searcher classification} × {counterparty self-fact known-matching / known-conflicting / unknown} → correct `PASS`/`FAIL`/eligibility-only outcome (ranking-only rows N/A under Option C).

### Out of scope (this story)

- Promoting the soft overlay into the DB-only purity path (would need its own batch evidence, like the V2 enrichment freeze did)
- Soft ranking connection to live `/me/matches` order (Option C deferral)
- Auditability/telemetry surfacing and user-visible settings (Story 3)
- Any topic not in Story 1's revived taxonomy

---

## Definition of done

- [x] `HARD_EXCLUDE`/`HARD_REQUIRE` tags produce real `FAIL`/`PASS` via dynamic per-tag dimensions
- [x] Those dimensions use `NEVER_BLOCKS`-on-`UNKNOWN` — silence never excludes
- [x] `SOFT`/`NEUTRAL` do **not** affect eligibility; capped ranking overlay **deferred** (architect Option C — supersedes original DoD ranking bullet)
- [x] Production ranking modules (`compareWithStatus`, five-signal) **untouched** this story
- [x] Full `dating-api` test suite green, including matrix + HTTP harness E2E (`me-new-model-e2e-dealbreaker.integration.spec.ts`)

### Implementation notes (PM close)

- Live path: extract-at-read → canonical → `evaluateDealbreakerDimensions` → `dealbreakerDimensions` + `NEVER_BLOCKS` fold in `evaluateHolyGrailDirectional`.
- Agent 4: **complete** — 4 smoking HTTP scenarios; baselines unmodified; `integration.spec` 298 passed.
- Soft ranking remains a sprint-level open item (README Option C follow-up); Story 3 owns audit/visibility.
