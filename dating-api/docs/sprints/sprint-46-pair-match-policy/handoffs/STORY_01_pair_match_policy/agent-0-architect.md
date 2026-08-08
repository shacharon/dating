# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_pair_match_policy.md](../../STORY_01_pair_match_policy.md)  
**Sprint:** sprint-46-pair-match-policy  
**Date:** 2026-08-08  
**Status:** complete  

**Mode:** Extract shared **HG gate + legacy rank** into `PairMatchPolicy` / `HgGateLegacyRankPolicy`. **Zero** product score / eligibility / HTTP change. Default contract stays `HG_GATE_LEGACY_RANK_V1`. **Agent 4 required.**

**Depends on:** Sprint 45 Done; Sprint 38.3 split **code** on main (`matches/` collaborators). Note: 38.3 PM DoD still **Blocked** on e2e harness / free-text HG — this story must not regress those paths; Agent 1 may need the same harness `matchListRank` fix to green Agent 4 (tracked in 38.3 `agent-4-e2e.md`).

---

## Summary

- Introduce `PairMatchPolicy` port + `HgGateLegacyRankPolicy` implementing today’s hybrid: `evaluateHolyGrailPairDirections` (gate) + `compareWithStatus` (rank).
- Wire **product** `MatchRankingService` + `MatchDetailService` through the policy (one call site shape for pair eval).
- Leave product-only admit/omit / `hardBlocked` DTO / reciprocal gender / narrative on existing collaborators.
- Do **not** route admin in this story (Story 02). Do **not** change default contract or ship HG-rank.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Contract | `MATCH_RANKING_CONTRACT = 'HG_GATE_LEGACY_RANK_V1'` in `src/matches/match-ranking-contract.ts` |
| Live order | `compareWithStatus` → `finalScore` only |
| HG role | Hard eligibility / diagnostics — **not** sort key |
| Product list | `MatchRankingService.buildFullRankedList` |
| Product detail | `MatchDetailService.getById` |
| Admit/omit | `MatchEligibilityService` (`isHgPairHardFail`, `shouldAdmitHgHardFailOnList`, `isExistingHardBlock`, `buildHardBlockedDto`) |
| HTTP | Unchanged `/api/v1/me/matches` list/detail JSON |
| Admin | Out of scope (Story 02) — design placement so admin can inject the same port later |

---

## Artifacts (locked layout)

```text
dating-api/src/matching-policy/
  pair-match-policy.ts              # interface + result/input types + injection token
  hg-gate-legacy-rank.policy.ts     # HgGateLegacyRankPolicy
  hg-gate-legacy-rank.policy.spec.ts
  matching-policy.module.ts         # provides PAIR_MATCH_POLICY → HgGateLegacyRankPolicy
```

Wire:

| Consumer | Change |
|----------|--------|
| `MeProfileModule` | `imports: [MatchingPolicyModule]` |
| `MatchRankingService` | Inject `PAIR_MATCH_POLICY`; replace inline HG+compare with `policy.evaluate(...)` |
| `MatchDetailService` | Same |
| `match-ranking-contract.ts` | Keep constant; optional one-line note that product pair eval goes through `PairMatchPolicy` |
| Prisma / controllers / DTOs | **N/A** |

Do **not** put the policy under `me-profile/matches/` (blocks Story 02 admin reuse).  
Do **not** create `FEATURE_PAIR_MATCH_POLICY` shadow path.

---

## Decisions (do not reverse without discussion)

### 1. Policy owns gate + score only (locked)

`PairMatchPolicy` does **not** decide list omit vs hardBlocked admit vs 404. Callers still use `MatchEligibilityService` with `result.gate`.

Rationale: admit rules differ (list LIKE/mutual, detail 404, admin later) — stuffing them into the policy couples Story 02 incorrectly.

### 2. Interface (locked)

```ts
// pair-match-policy.ts
import type { ChildrenUnsureProfileRow } from '../matches/children-unsure-profile-row.types';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import type {
  MatchExplainabilityDto,
  MatchRecommendationDto,
} from '../matches/match-engine';
import type { MatchRankingContractId } from '../matches/match-ranking-contract';
import type { HolyGrailDirectionalEvaluationResult } from '../holy-grail-matching/eligibility.evaluator';

export const PAIR_MATCH_POLICY = Symbol('PAIR_MATCH_POLICY');

export type PairMatchPolicyInput = {
  viewerHgRow: ChildrenUnsureProfileRow;
  candidateHgRow: ChildrenUnsureProfileRow;
  viewerEnginePayload: ProfileJsonPayload;
  candidateEnginePayload: ProfileJsonPayload;
};

/** HG directions missing/throw → treat as non-hard-fail (lenient), same as today. */
export type PairMatchGateResult = {
  hgDirections: {
    aToB: HolyGrailDirectionalEvaluationResult;
    bToA: HolyGrailDirectionalEvaluationResult;
  } | null;
  /** Either direction overallHardEligibility === 'FAIL' when directions non-null. */
  isHardFail: boolean;
};

export type PairMatchScoreResult = {
  matchScore: number | null;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /** true when compareWithStatus returned a guard (`'status' in result`). */
  scoreGuarded: boolean;
};

export type PairMatchPolicyResult = {
  contractId: MatchRankingContractId;
  gate: PairMatchGateResult;
  score: PairMatchScoreResult;
};

export interface PairMatchPolicy {
  readonly id: MatchRankingContractId;
  evaluate(input: PairMatchPolicyInput): PairMatchPolicyResult;
}
```

Story wording `{ eligible, score, … }` maps to: **`eligible` ≙ `!gate.isHardFail`** for simple callers; product keep using `isHardFail` + eligibility helpers for three-way admit.

### 3. `HgGateLegacyRankPolicy` behavior (locked — parity)

```text
hgDirections = evaluateHolyGrailPairDirections(viewerHgRow, candidateHgRow)
  // null on throw → isHardFail = false (lenient)
isHardFail = hgDirections != null && (
  aToB.overallHardEligibility === 'FAIL' ||
  bToA.overallHardEligibility === 'FAIL'
)
compareResult = compareWithStatus(viewerEnginePayload, candidateEnginePayload)
if ('status' in compareResult):
  score = { matchScore: null, explainability: null, recommendation: null, scoreGuarded: true }
else:
  score = { matchScore: finalScore, explainability, recommendation, scoreGuarded: false }
return { contractId: MATCH_RANKING_CONTRACT, gate, score }
```

- Pure / `@Injectable()` with **no** Prisma.  
- `id` / `contractId` always `HG_GATE_LEGACY_RANK_V1`.  
- Do **not** call reciprocal gender, BLOCK filters, or hardBlocked DTO builders inside the policy.

### 4. Call-site migration (locked)

**Before (inline):** `evaluateHolyGrailPairDirections` → eligibility helpers → `compareWithStatus`.

**After:**

```ts
const evaluated = this.pairMatchPolicy.evaluate({
  viewerHgRow: viewerRead.hg.row,
  candidateHgRow: candidateRead.hg.row,
  viewerEnginePayload: viewerRead.enginePayload,
  candidateEnginePayload: candidateRead.enginePayload,
});
// telemetry: still accumulate from evaluated.gate.hgDirections when non-null
if (evaluated.gate.isHardFail) { /* existing admit/omit / hardBlocked branch */ }
const { matchScore, explainability, recommendation } = evaluated.score;
```

Apply in **both** `MatchRankingService.buildFullRankedList` (eligible + hardBlocked pending branches) and `MatchDetailService.getById`.

Keep HG dimension / dealbreaker outcome counters in the ranking service (they need the loop context) — feed `evaluated.gate.hgDirections`.

### 5. Nest wiring (locked)

```ts
// matching-policy.module.ts
providers: [
  HgGateLegacyRankPolicy,
  { provide: PAIR_MATCH_POLICY, useExisting: HgGateLegacyRankPolicy },
],
exports: [PAIR_MATCH_POLICY, HgGateLegacyRankPolicy],
```

`MeProfileModule` imports `MatchingPolicyModule`.  
Inject `@Inject(PAIR_MATCH_POLICY) private readonly pairMatchPolicy: PairMatchPolicy`.

Update `me-matches.test-harness.ts` to construct `HgGateLegacyRankPolicy` and pass into Ranking + Detail ctors (or construct policy once and inject).

### 6. What stays out of the policy

| Concern | Owner |
|---------|--------|
| Reciprocal gender | `MatchEligibilityService` / Query prefilter |
| BLOCK omit | Eligibility + Ranking loop |
| Existing hard-block admit | Eligibility |
| `hardBlocked` DTO + about* batch | Eligibility + `match-list-hard-block-pending` |
| Traits / narrative | Detail |
| Admin HG-first retry / list admission env flags | Story 02 |

### 7. Tests (locked)

1. Unit: `hg-gate-legacy-rank.policy.spec.ts` — hard FAIL both directions; lenient null directions; score happy path; compare guard → null score.  
2. Existing: `me-matches.service.spec.ts`, materialized, V1 contract, hard-block unit cases — must stay green (parity).  
3. Optional: thin Ranking/Detail spy that `PAIR_MATCH_POLICY.evaluate` was called (not required for AC).

Commands (Agent 1):

```bash
cd dating-api
npx tsc --noEmit
npx jest --no-coverage src/matching-policy src/me-profile/me-matches.service.spec.ts src/me-profile/me-matches-materialized-list.spec.ts src/me-profile/me-matches.v1-contract.spec.ts --runInBand
```

### 8. Out of scope

- Admin `MatchesService` routing (Story 02)  
- Signal post-processing dedupe (Story 03)  
- `HG_GATE_HG_RANK` / changing `MATCH_RANKING_CONTRACT`  
- UI  
- Changing dealbreaker / free-text HG about* nulling (38.3 follow-up) unless required to green Agent 4 — prefer harness `matchListRank` first

---

## HTTP contracts (unchanged)

```
GET /api/v1/me/matches
GET /api/v1/me/matches/:id
```

---

## Runtime topology

- N/A

---

## E2E verification plan (Agent 4 required)

**Change class:** eligibility gating + ranking **ownership** moves into `PairMatchPolicy`; intended product effect **none** (parity).

| Item | Plan |
|------|------|
| Affects eligibility? | Gate computation relocates — outcomes must match |
| Affects ranking/order? | Score computation relocates — order must match |
| Baseline specs (unmodified, green) | `me-new-model-e2e.integration.spec.ts`, `me-new-model-e2e-eligibility.integration.spec.ts`, `me-new-model-e2e-ranking.integration.spec.ts` |
| Siblings (architect list) | pagination, dealbreaker, dealbreaker-guardrails, hard-block-existing, match-narrative, photo-moderation — stay green or fail only for **pre-documented** 38.3 harness / free-text HG gaps with explicit Agent 4 note |
| Harness | `me-matches-eligibility-harness.ts` — extend with `matchListRank` mock if still missing (required for default materialized ON) |
| New scenarios | **Optional** one policy parity scenario (same pair → same score + hardFail flag) via harness — not required if baselines prove parity |
| Agent 4 | `--agent 4 sprint 46 story 1` after CR |

---

## Agent 1 instructions

1. Create `src/matching-policy/` per §2–§5.  
2. Wire Ranking + Detail; update test harness.  
3. Parity: no score/eligibility drift; keep `MATCH_RANKING_CONTRACT` default.  
4. If Agent 4 cannot boot baselines under default materialized: add `matchListRank` to harness (same fix as 38.3 Agent 4 blocker).  
5. Commit; write `agent-1-dev.md`.

Suggested commit:

```
refactor(matching): introduce PairMatchPolicy (HG gate + legacy rank)

Sprint 46 Story 1
```

---

## Agent 2 instructions

- [ ] Policy module layout; product Ranking/Detail use `PAIR_MATCH_POLICY`
- [ ] Policy does not own admit/DTO/narrative
- [ ] Contract id unchanged; no wire drift
- [ ] Flag Agent 4 next  
→ `--agent 4 sprint 46 story 1`

---

## Agent 4 / 3

- Agent 4: baselines (+ siblings) under default env; blocked → Agent 1.  
- Agent 3: Done only if CR approved **and** Agent 4 non-blocked.

---

## Open questions / blockers

- Sprint 38.3 formally Blocked on e2e; proceeding on split code is intentional. Do not wait for 38.3 PM Done to implement this story, but **do** clear the harness gap when running Agent 4 here.

---

## Next agent

```text
--agent 1 sprint 46 story 1
```

**Notes for next agent:**

- Extract-only into `matching-policy/`; list/detail keep admit wrappers.  
- Agent 4 after CR; no feature flag.
