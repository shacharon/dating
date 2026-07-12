# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_wire_into_holy_grail.md](../../STORY_02_wire_into_holy_grail.md)  
**Sprint:** sprint-17-natural-language-dealbreaker-classifier  
**Date:** 2026-07-11  
**Status:** complete  

---

## Summary

- Wire Story 1’s `DealbreakerSignal` / `SelfFactHint` into **live Holy Grail eligibility** on `GET /api/v1/me/matches`, with **`NEVER_BLOCKS` on `UNKNOWN`**.
- **Lock ranking decision (C):** ship **hard eligibility only** this story. Do **not** plug soft bonuses into dead `holy-grail-five-signal-ranking` overlays or into V1 `compareWithStatus`. Soft ranking deferred (tracked follow-up).
- **No Prisma migration.** Live path = extract-at-read from `aboutMe` / `aboutPartner` / `aboutRelationship` (same discipline as personality/lifestyle/interest map-time extract). Optional analysis-time cache is out of scope unless trivial and already have a home — prefer extract-at-read for correctness.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/canonical/matching-canonical.types.ts` | updated — sparse `dealbreakerSignals` on preferences (and/or ranking-safe sidecar) |
| `dating-api/src/holy-grail-matching/profile-to-canonical.mapper.ts` | updated — map signals onto canonical |
| `dating-api/src/holy-grail-matching/eligibility.evaluator.ts` | updated — `dealbreakerDimensions` + fold into overall |
| `dating-api/src/holy-grail-matching/dealbreaker-eligibility.ts` (new) | create — pure per-tag PASS/FAIL/UNKNOWN vs counterparty facts |
| `dating-api/src/me-profile/me-profile-engine.mapper.ts` | updated — run extractors when building matches participant / HG input |
| `dating-api/src/matches/holy-grail-pair-directions.ts` | updated only if pair wrapper needs to pass new fields through |
| `dating-api/src/holy-grail-matching/*dealbreaker*.spec.ts` | matrix unit tests |
| `dating-api/src/me-profile/me-new-model-e2e-dealbreaker.integration.spec.ts` (new) | E2E via shared harness (Agent 4 owns scenarios; Agent 1 may stub harness helpers) |
| Prisma / UI / `compareWithStatus` / five-signal live reconnect | **N/A — out of scope** |

---

## Decisions (do not reverse without discussion)

### 1. Soft ranking = Option **(C)** — locked for this story

Sprint README A/B/C is unresolved. Architect locks **(C)** for Story 2:

| Option | Why not / why |
|--------|----------------|
| **(A)** soft into `compareWithStatus` | Contaminates legacy V1 scoring we’re retiring |
| **(B)** reconnect five-signal ranking to `/me/matches` | Separate epic; too large for this story |
| **(C)** hard eligibility only | **Chosen.** Live path already gates on `evaluateHolyGrailPairDirections`; soft overlay on five-signal would be **dead code** (five-signal is not used by `MeMatchesService.list`) |

**Story AC §C (ranking overlay) is superseded for this story** — implement eligibility + matrix tests only; leave a one-line `// DEFERRED: soft ranking (sprint 17 open decision C)` stub comment optional, **do not** ship unused overlay functions pretending to be live.

Update expectation: purity-rank “byte-identical” AC is **N/A** if we don’t touch ranking modules; if agent 1 accidentally edits five-signal file, still keep purity path unchanged.

### 2. No Prisma migration — extract-at-read on the live matches path

Today there is **no** live `holyGrailStructuredPreferences` JSON column on `UserProfile`. Matches synthesize HG input from columns + free text (`me-profile-engine.mapper.ts`).

**Story 2 persistence strategy:**

1. **Required (live):** When building the HG mapping input / matches participant read model, call:
   - `extractDealbreakerSignalsFromFreeText({ aboutMe, aboutPartner, aboutRelationship })` → searcher’s partner-preference signals
   - `extractSelfFactHintsFromFreeText(...)` → counterparty (and self) trait hints
2. Merge hints with existing columns (`smokingFrequency`, `alcoholUse`, `childrenStatus`, `wantsChildren`, `religion`) — **column wins** when non-null; hint fills gaps.
3. **Do not** invent a new JSON column this story (Story 3 audit can add durable storage).

This preserves “evaluator never reads raw text at request time” **if** extraction runs in the mapper/read-model builder (Layer 1 territory adjacent), and evaluator only sees structured `DealbreakerSignal[]` + facts — same pattern as personality extract-at-map.

### 3. Canonical shape (sparse)

```ts
// On MatchingPreferences (or a dedicated field on MatchingCanonicalModel):
readonly dealbreakerSignals?: readonly DealbreakerSignal[]; // partner-preference only

// Facts: continue using existing MatchingFacts smoking/alcohol/children/…
// Plus optional resolved map for tags without columns:
readonly dealbreakerSelfFacts?: Readonly<
  Partial<Record<DealbreakerTag, 'AFFIRMED' | 'DENIED'>>
>;
```

Absent tag = no constraint (NEUTRAL). No widened defaults.

### 4. Evaluator — parallel `dealbreakerDimensions`, not enum explosion

Do **not** grow `HOLY_GRAIL_DIMENSION_KEYS` with every tag.

```ts
export interface HolyGrailDirectionalEvaluationResult {
  readonly dimensions: Record<HolyGrailDimensionKey, HolyGrailDimensionEvaluation>;
  /** Dynamic tag → evaluation; only tags with searcher HARD_* appear. */
  readonly dealbreakerDimensions: Readonly<
    Record<string, HolyGrailDimensionEvaluation>
  >;
  readonly overallHardEligibility: 'PASS' | 'FAIL';
  readonly eligibilityFlags: HolyGrailEligibilityFlags;
}
```

**Aggregation:** `overallHardEligibility === 'FAIL'` if **any** fixed dimension resolves to FAIL **or** any dealbreaker dimension resolves to FAIL.

**Policy:** every dealbreaker dimension uses `resolveDimensionOutcome(raw, 'NEVER_BLOCKS')`.

### 5. Per-tag evaluation rules (copy-paste contract)

For each searcher signal with `classification ∈ { HARD_EXCLUDE, HARD_REQUIRE }`:

| Searcher | Counterparty self-fact | Raw status |
|----------|------------------------|------------|
| `HARD_EXCLUDE` (e.g. smoking) | Affirmed conflicting trait (smokes) | `FAIL` |
| `HARD_EXCLUDE` | Explicitly denied trait (doesn’t smoke) | `PASS` |
| `HARD_EXCLUDE` | Unknown / silent | `UNKNOWN` → not blocking |
| `HARD_REQUIRE` (must be smoker) | Affirmed match | `PASS` |
| `HARD_REQUIRE` | Explicit conflict (non-smoker) | `FAIL` |
| `HARD_REQUIRE` | Unknown / silent | `UNKNOWN` → not blocking |
| `SOFT` / absent | anything | **skip** — no dealbreaker dimension row |

Map Story 1 tags ↔ facts:

| Tag / family | Affirmed self-fact | Denied self-fact |
|--------------|--------------------|------------------|
| `smoking` | `smokingFrequency` ∈ {REGULAR, SOCIAL} **or** hint REGULAR | `smokingFrequency === NEVER` **or** hint NEVER |
| `excessive_drinking` | alcohol frequent/moderate (define allowlist) | `alcoholUse === NEVER` |
| `no_kids` / `kids_required` | use `wantsChildren` / `childrenStatus` + hints | as appropriate |
| values/social tags | only if counterparty text yields an explicit self-domain affirmation of that trait (rare); else usually `UNKNOWN` | — |

Implement mapping in `dealbreaker-eligibility.ts` as a pure function; keep magic strings centralized.

### 6. Reciprocal evaluation

`evaluateHolyGrailPairDirections` already runs A→B and B→A. Each direction uses **that** searcher’s `dealbreakerSignals` vs **that** counterparty’s facts. `MeMatchesService.list` already drops if **either** direction FAIL — keep that.

### 7. Soft / SOFT signals this story

Searcher `SOFT` → **no eligibility effect** (AC). Do not change `matchScore` / `compareWithStatus`. Document deferred soft ranking in handoff notes for Story 2 PM / future epic.

### 8. Telemetry (minimal)

Extend Sprint 16 outcome counters **or** add a parallel counter for dealbreaker tag outcomes (`PASS`/`FAIL`/`UNKNOWN`/`SKIPPED`) in `MeMatchesService.list` — keep log volume bounded (aggregate counts, not per-candidate spam). Full audit UI is Story 3.

### 9. No API / UI contract change

No new endpoints. Response shape of `/me/matches` unchanged (candidates simply appear/disappear). Story 3 owns user-visible inferred dealbreakers.

---

## Service / function signatures

```ts
// dealbreaker-eligibility.ts
export function evaluateDealbreakerDimensions(input: {
  readonly searcherSignals: readonly DealbreakerSignal[];
  readonly counterpartyFacts: MatchingFacts;
  readonly counterpartySelfFacts?: Readonly<
    Partial<Record<string, 'AFFIRMED' | 'DENIED'>>
  >;
}): Readonly<Record<string, HolyGrailDimensionEvaluation>>;

export function foldDealbreakerIntoOverall(
  fixedOverall: 'PASS' | 'FAIL',
  dealbreakerDimensions: Readonly<Record<string, HolyGrailDimensionEvaluation>>,
): 'PASS' | 'FAIL';
```

Wire inside `evaluateHolyGrailDirectional` after fixed dims.

```ts
// me-profile-engine.mapper / HG mapping input builder
function attachDealbreakerExtraction(row: {
  aboutMe, aboutPartner, aboutRelationship,
  smokingFrequency, alcoholUse, childrenStatus, wantsChildren, religion
}): {
  dealbreakerSignals: DealbreakerSignal[];
  dealbreakerSelfFacts: Partial<Record<string, 'AFFIRMED' | 'DENIED'>>;
}
```

---

## Migration plan

- **Forward:** none
- **Backfill:** none (extract-at-read)
- **Rollback:** revert mapper + evaluator wiring

---

## Integration points

| Component | Action |
|-----------|--------|
| Story 1 extractors | **call** from mapper/read-model |
| `eligibility.evaluator.ts` | dealbreakerDimensions + NEVER_BLOCKS fold |
| `MeMatchesService.list` | should automatically pick up via `evaluateHolyGrailPairDirections` — verify; add telemetry if needed |
| `compareWithStatus` | **do not touch** |
| `holy-grail-five-signal-ranking.ts` | **do not add soft overlay this story** (C) |
| Analysis service | optional no-op; extract-at-read is sufficient |

---

## Runtime topology

N/A — no cookie/proxy/socket changes.

---

## E2E verification plan

**Affects:** **eligibility gating** (live). **Not** ranking order (Option C).

| Item | Plan |
|------|------|
| Baseline keep green | `me-new-model-e2e.integration.spec.ts`, `me-new-model-e2e-eligibility.integration.spec.ts`, `me-new-model-e2e-ranking.integration.spec.ts` — unmodified assertions |
| New scenarios (Agent 4) | New sibling e.g. `me-new-model-e2e-dealbreaker.integration.spec.ts` using `me-matches-eligibility-harness.ts` |
| Scenario matrix (HTTP) | (1) searcher “don’t want smokers” + counterparty “I smoke” → **excluded** from `matches`; (2) same searcher + counterparty silent → **included**; (3) searcher “only smokers” + counterparty “I don’t smoke” → **excluded**; (4) searcher “don’t care about smoking” + smoker counterparty → **included** (no eligibility effect) |
| Agent 4 | **Required** after agent 2 |

---

## Tests / verification (for agent 1)

- [ ] Unit matrix: tag × HARD_EXCLUDE/REQUIRE × affirmed/denied/unknown
- [ ] Smoking AC literals from story
- [ ] `npx jest` holy-grail + me-profile unit paths green
- [ ] Do not silently change baseline E2E assertions
- [ ] `prisma migrate deploy`: **N/A**
- [ ] Browser Network: **N/A**

---

## Open questions / blockers

- Soft ranking A/B/C: **locked to C for Story 2** — no longer a blocker for this story’s eligibility half.
- Exact alcohol enum → AFFIRMED/DENIED mapping: agent 1 pick conservative allowlist; document in code comment.
- Values/social tags may almost always `UNKNOWN` on counterparty (no self-fact columns) — expected; silence never blocks.

---

## Next agent

```text
--agent 1 sprint 17 story 2
```

**Notes for next agent:**

- Implement eligibility wiring + extract-at-read; **skip** soft ranking overlay (Option C).
- Agent 4 is required after CR.
- Prefer new `dealbreaker-eligibility.ts` pure module; keep evaluator thin.
- Do not edit `compareWithStatus` or reconnect five-signal ranking.
