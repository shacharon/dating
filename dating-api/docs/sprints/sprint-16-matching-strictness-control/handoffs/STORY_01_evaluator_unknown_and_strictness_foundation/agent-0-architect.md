# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_evaluator_unknown_and_strictness_foundation.md](../../STORY_01_evaluator_unknown_and_strictness_foundation.md)  
**Sprint:** sprint-16-matching-strictness-control  
**Date:** 2026-07-11  
**Status:** complete  

---

## Summary

- Pure internal Layer-3 refactor: add `UNKNOWN` status + per-dimension blocking policy; **zero** user-visible / API / schema change.
- Story AC text still says 3-tier `MUST_MATCH`/`PREFER`/`DONT_CARE` — **superseded** by sprint README locked decisions. Implement the 2-value policy below.
- Affects **eligibility gating only**, not ranking order. Baseline E2E specs must stay green unmodified.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/holy-grail-matching/eligibility.evaluator.ts` | updated (design) |
| `dating-api/src/holy-grail-matching/eligibility.evaluator.spec.ts` | updated (design) |
| `dating-api/src/holy-grail-matching/evaluation-to-legacy-dimension-map.ts` | updated (design) |
| `dating-api/src/holy-grail-matching/evaluation-to-legacy-dimension-map.spec.ts` | updated (design) |
| `dating-api/src/me-profile/me-matches.service.ts` | updated (telemetry only) |
| `dating-api/src/logging/error-codes.ts` | updated (one new code) |
| Prisma / API / UI | **N/A — no changes** |

---

## Decisions (do not reverse without discussion)

### 1. Policy type is 2-value (README wins over story AC)

Story file AC still says `HolyGrailDimensionStrictness = 'MUST_MATCH' | 'PREFER' | 'DONT_CARE'`. Sprint README locked decisions + Sprint 17 both use a **blocking policy**, not a user toggle. Implement:

```ts
export type HolyGrailDimensionBlockingPolicy =
  | 'BLOCKS_ON_UNKNOWN'
  | 'NEVER_BLOCKS';
```

Mapping from outdated story names:

| Old story AC | Implement as |
|--------------|--------------|
| `MUST_MATCH` | `BLOCKS_ON_UNKNOWN` |
| `PREFER` / `DONT_CARE` | `NEVER_BLOCKS` (same bucket for blocking; Sprint 17 ranking magnitude is separate) |

### 2. No Prisma, no API, no UI

No migration. No new preference fields. No endpoint/DTO changes. `overallHardEligibility` stays `'PASS' | 'FAIL'` at the wire/caller level.

### 3. Status model

```ts
export type HolyGrailHardEligibilityStatus =
  | 'PASS'
  | 'FAIL'
  | 'UNKNOWN'   // NEW — fact missing/withheld
  | 'SKIPPED'
  | 'SOFT_PASS';
```

Reclassify only these branches (reason codes **unchanged**):

| Function | Condition | Today | After |
|----------|-----------|-------|-------|
| `evalGender` | `gid` undefined or `PREFER_NOT_TO_SAY` | `FAIL` | `UNKNOWN` (`PARTNER_GENDER_MISSING_OR_WITHHELD`) |
| `evalAge` | `dob` undefined | `FAIL` | `UNKNOWN` (`PARTNER_DOB_MISSING`) |
| `evalAge` | invalid dob → age undefined | `FAIL` | `UNKNOWN` (`PARTNER_DOB_INVALID`) |

Genuine mismatches stay `FAIL`: `GENDER_NOT_IN_ALLOWLIST`, `AGE_BELOW_MIN`, `AGE_ABOVE_MAX`.

### 4. Policy function + constant map

```ts
export const HOLY_GRAIL_DIMENSION_BLOCKING_POLICY: Record<
  HolyGrailDimensionKey,
  HolyGrailDimensionBlockingPolicy
> = {
  GENDER: 'BLOCKS_ON_UNKNOWN',
  AGE: 'BLOCKS_ON_UNKNOWN',
  PROXIMITY: 'BLOCKS_ON_UNKNOWN',
};

/**
 * Raw per-dimension status stays on `dimensions[k].status`.
 * Only overallHardEligibility uses the resolved status.
 */
export function resolveDimensionOutcome(
  rawStatus: HolyGrailHardEligibilityStatus,
  policy: HolyGrailDimensionBlockingPolicy,
): HolyGrailHardEligibilityStatus {
  if (rawStatus === 'UNKNOWN' && policy === 'BLOCKS_ON_UNKNOWN') {
    return 'FAIL';
  }
  return rawStatus;
}
```

`overallFromDimensions` must call `resolveDimensionOutcome` per key; treat resolved `FAIL` as blocking (same as today).

`NEVER_BLOCKS` is **not wired to any live dimension** this story — unit-test the matrix only so Sprint 17 can extend the map without rewriting the function.

### 5. Audit / legacy bridge

`MatchingDimensionResults.UNKNOWN` already exists in `matching-dimension-result.ts` but the adapter currently maps non-PASS/FAIL into `SKIPPED`.

**Required:** evaluator `UNKNOWN` → `MatchingDimensionResults.UNKNOWN` (not `SKIPPED`, not `NO_MATCH`).

`buildHolyGrailEligibilityAuditV1` / `eligibility-audit.types.ts` need **no interface change** — they already accept `MatchingDimensionResult`, which includes `UNKNOWN`.

`buildHolyGrailPairDecisionV1` already treats legacy `UNKNOWN` as blocking `MUTUAL_MATCH` (→ `INDETERMINATE`). Confirm via grep: no live production callers outside specs/bridge — still fix the adapter so dormant Layer-4 stays correct.

### 6. Telemetry (eligibility funnel evidence)

Keep evaluator **pure** (no DI / no logger inside `evaluateHolyGrailDirectional`).

Add pure helpers next to the evaluator:

- `emptyHolyGrailDimensionOutcomeCounts()`
- `accumulateHolyGrailDimensionOutcomeCounts(counts, evaluation)`
- `formatHolyGrailDimensionOutcomeCountsForLog(counts)` → greppable one-liner

Wire emit in `MeMatchesService.list` (and optionally detail if it already runs pair directions and has a natural end-of-request log site — **list is mandatory**):

- New error code: `ME_MATCHES_HG_DIMENSION_OUTCOMES`
- One `this.obs.trace(...)` per list request after the candidate loop, aggregating both directions for every evaluated candidate
- Message shape suggestion: `event=hg_dimension_outcomes profileId=... GENDER:PASS=..,FAIL=..,UNKNOWN=..,...;AGE:...;PROXIMITY:...`

### 7. Module placement

All new types/functions live in `eligibility.evaluator.ts` (or a tiny sibling only if the file becomes unwieldy — prefer same file). Re-export from `holy-grail-matching/index.ts` if other packages already import status types from there.

---

## Prisma schema

**N/A** — no DB changes.

## API contracts

**N/A** — no request/response shape changes. Callers continue to key off `overallHardEligibility === 'FAIL'` for exclusion.

## Service signatures (copy-paste ready)

```ts
// eligibility.evaluator.ts
export type HolyGrailHardEligibilityStatus =
  | 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIPPED' | 'SOFT_PASS';

export type HolyGrailDimensionBlockingPolicy =
  | 'BLOCKS_ON_UNKNOWN' | 'NEVER_BLOCKS';

export const HOLY_GRAIL_DIMENSION_BLOCKING_POLICY: Record<
  HolyGrailDimensionKey,
  HolyGrailDimensionBlockingPolicy
>;

export function resolveDimensionOutcome(
  rawStatus: HolyGrailHardEligibilityStatus,
  policy: HolyGrailDimensionBlockingPolicy,
): HolyGrailHardEligibilityStatus;

// evaluateHolyGrailDirectional — same signature; dimensions may now show UNKNOWN;
// overallHardEligibility still PASS|FAIL with identical net outcomes for GENDER/AGE/PROXIMITY.
```

## Migration plan

**N/A**

## Integration points

| Module | Action |
|--------|--------|
| `eligibility.evaluator.ts` | Core change |
| `evaluation-to-legacy-dimension-map.ts` | Map `UNKNOWN` → legacy `UNKNOWN` |
| `me-matches.service.ts` | Aggregate + emit telemetry on `list` |
| `error-codes.ts` | Add `ME_MATCHES_HG_DIMENSION_OUTCOMES` |
| Unit specs | Evaluator matrix + missing-fact UNKNOWN assertions; adapter UNKNOWN case |
| E2E baseline | **Do not modify assertions** |

## Runtime topology (architect — realtime / proxy / cookies only)

**N/A** — no realtime, proxy, cookie, or browser transport changes.

---

## E2E verification plan (mandatory — eligibility story)

**Affects:** eligibility (gating) only — **not** ranking order.

### Baseline specs that must stay green, unmodified

1. `dating-api/src/me-profile/me-new-model-e2e.integration.spec.ts`
2. `dating-api/src/me-profile/me-new-model-e2e-eligibility.integration.spec.ts`  
   - Especially scenarios 3 (missing DOB) and 4 (missing/withheld gender): still **excluded** from `matches` because `BLOCKS_ON_UNKNOWN` keeps net FAIL.
3. `dating-api/src/me-profile/me-new-model-e2e-ranking.integration.spec.ts`

### New scenarios this story needs

**Agent 1:** unit tests in `eligibility.evaluator.spec.ts` are enough for the internal status change (`UNKNOWN` on dimension + overall still `FAIL`).

**Agent 4:** prove “zero HTTP behavior change” by re-running the three baseline specs unmodified (no new scenario required if baselines already cover exclusion for missing DOB/gender). Optional add: a comment-only clarification in the eligibility spec that exclusion now routes through `UNKNOWN`→policy→overall FAIL — **do not change expected HTTP outcomes**.

If agent 4 finds baseline red → bug → send back to `--agent 1`. Do not silently edit baseline assertions.

---

## Tests / verification

- [ ] Unit/integration command: `npx jest eligibility.evaluator.spec.ts evaluation-to-legacy-dimension-map.spec.ts --no-coverage` (+ full suite before handoff)
- [ ] Result: not run (architect)
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: N/A
- [ ] Socket transport: not checked

---

## E2E verification (agent 4 — filled later)

- [ ] Baseline specs still green, unmodified: (agent 4)
- [ ] New scenario(s): none required beyond baseline re-run (optional comment only)
- [ ] `npx jest --no-coverage "integration.spec" --runInBand` result: (agent 4)
- [ ] Bug found requiring `--agent 1`: (agent 4)

---

## Open questions / blockers

- None for implementation. Story markdown AC still uses old 3-tier names — **agent 1 follows this handoff + sprint README**, not the outdated AC wording. Agent 3 / PM can sync story checkboxes to `BLOCKS_ON_UNKNOWN` / `NEVER_BLOCKS` when closing.

---

## Next agent

```text
--agent 1 sprint 16 story 1
```

**Notes for next agent:**

- Implement exactly the signatures and policy above.
- Keep reason codes stable.
- Do not change E2E baseline expected outcomes.
- Do not implement Sprint 17 classifier or wire `NEVER_BLOCKS` to a live dimension.
- After code: run unit specs + confirm baseline E2E still green; full suite preferred before handoff to agent 2.
