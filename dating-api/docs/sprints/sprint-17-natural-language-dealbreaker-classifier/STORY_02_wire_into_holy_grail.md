# Story 2: Wire classifier output into Holy Grail eligibility + ranking

**Sprint:** 17
**Status:** Not started
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

- [ ] `HolyGrailStructuredFactsPersisted` / preferences JSON columns gain a slot for `dealbreakerSignals: DealbreakerSignal[]` per profile (self side only needed at read time — see below), written during profile analysis, following the same allow-list + validate pattern as every other structured HG key (`holy-grail-structured-contract.ts`).
- [ ] `profile-to-canonical.mapper.ts`: map persisted `dealbreakerSignals` onto the canonical model — no widened defaults, absent tag = no signal for that tag (same sparse-preferences discipline as every other field in this mapper).

### B. Evaluator — dynamic per-tag dimensions

- [ ] Extend `HOLY_GRAIL_DIMENSION_KEYS` conceptually with **dynamic** tag-keyed dimensions (not a fixed enum growth per tag — model as `Record<tag, HolyGrailDimensionEvaluation>` alongside the existing fixed `GENDER`/`AGE`/`PROXIMITY` dimensions, or a parallel `dealbreakerDimensions` map on `HolyGrailDirectionalEvaluationResult`).
- [ ] For each tag where the **searcher** has a `HARD_EXCLUDE` or `HARD_REQUIRE` classification (from their own partner-preference text):
  - Look up the **counterparty's own self-fact** for that tag (if the taxonomy has a matching self-fact field; for tags with no direct self-fact column, use the counterparty's own `DealbreakerSignal` self-domain output from Story 1, if any).
  - Counterparty has an explicit, classified **conflicting** self-fact → `FAIL`.
  - Counterparty has an explicit, classified **matching** self-fact → `PASS`.
  - Counterparty said **nothing** on this topic → `UNKNOWN`.
- [ ] **Blocking policy for these dynamic dimensions is `NEVER_BLOCKS` on `UNKNOWN`** (per the README's locked decision) — reuse Sprint 16's `resolveDimensionOutcome(rawStatus, 'NEVER_BLOCKS')` directly. This is the one line that prevents this story from recreating the Sprint 15 bug: a searcher's stated dealbreaker only excludes candidates who **said the conflicting thing**, never candidates who simply didn't bring up the topic.
- [ ] `overallHardEligibility` folds these dynamic dimensions into the same "no `FAIL`" rule as `GENDER`/`AGE`/`PROXIMITY` — no separate code path, one aggregation rule.

### C. Ranking overlay — SOFT / NEUTRAL

- [ ] New bounded overlay function (e.g. `computeDealbreakerSoftSignalRankBonus`), modeled directly on `computePersonalityTraitRankBonus` / `computeLifestyleSignalsRankBonus` / `computeInterestTagsRankBonus` in `holy-grail-five-signal-ranking.ts`: additive, capped (propose `DEALBREAKER_SOFT_RANK_BONUS_MAX = 2`, consistent with the existing locked caps), grounded evidence in the rank note, **never** touches `overallHardEligibility`.
- [ ] `SOFT` classifications (either direction — searcher's soft preference matching/mismatching counterparty's self-fact) contribute a small bonus/penalty within the cap. `NEUTRAL` (no signal at all) contributes nothing, same as today's "both sides empty" case in the existing overlays.
- [ ] This function participates in `computeHolyGrailFiveSignalRank` (`includeNonDbRankingOverlays = true` path) — **not** in `computeHolyGrailRankingPurityRank`, preserving the existing purity contract (production ordering stays DB-signal-only unless/until this overlay family is promoted the same way personality/lifestyle/interest tags were, with its own batch evidence).

### Acceptance criteria

- [ ] Searcher states "I don't want smokers"; counterparty's own text says "I smoke" → directional evaluation `FAIL` on that tag; counterparty's text says nothing about smoking → `PASS`-equivalent (not blocked); counterparty's text says "I don't smoke" → passes with a grounded match.
- [ ] Searcher states "only smokers" (`HARD_REQUIRE`); counterparty silent on smoking → not blocked; counterparty explicitly non-smoker → `FAIL`; counterparty explicitly smoker → `PASS`.
- [ ] Searcher states "don't care about smoking" or says nothing → no eligibility effect; any signal on either side flows only into the capped ranking overlay.
- [ ] `computeHolyGrailRankingPurityRank` output is **byte-identical** before/after this story for any pair with no classifier signals (regression guard on the production ordering path).
- [ ] Matrix tests: tag × {searcher classification} × {counterparty self-fact known-matching / known-conflicting / unknown} → correct `PASS`/`FAIL`/ranking-only outcome per the table above.

### Out of scope (this story)

- Promoting the soft overlay into the DB-only purity path (would need its own batch evidence, like the V2 enrichment freeze did)
- Auditability/telemetry surfacing and user-visible settings (Story 3)
- Any topic not in Story 1's revived taxonomy

---

## Definition of done

- [ ] `HARD_EXCLUDE`/`HARD_REQUIRE` tags produce real `FAIL`/`PASS` via dynamic per-tag dimensions
- [ ] Those dimensions use `NEVER_BLOCKS`-on-`UNKNOWN` — silence never excludes
- [ ] `SOFT`/`NEUTRAL` signals flow only into a new capped ranking overlay, modeled on the existing personality/lifestyle/interest-tag pattern
- [ ] Production purity ranking path is provably unchanged for pairs without classifier signals
- [ ] Full `dating-api` test suite green, including new matrix tests
