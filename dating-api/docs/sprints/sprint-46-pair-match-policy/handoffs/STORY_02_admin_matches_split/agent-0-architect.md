# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_admin_matches_split.md](../../STORY_02_admin_matches_split.md)  
**Sprint:** sprint-46-pair-match-policy  
**Date:** 2026-08-08  
**Status:** complete  

**Mode:** Route admin **pair compare hub** through Story 1 `PairMatchPolicy` / `PAIR_MATCH_POLICY`. Keep admin-only HG-first retry, list admission env, diagnostics, and DTO assembly outside the policy. **Zero** admin HTTP contract change. **Zero** product me-matches / scoring-weight change. **Agent 4 required** (shared gate+score path).

**Depends on:** Story 01 policy code on main (`dcb772b`). Note: Story 01 PM DoD still **Blocked** on materialized e2e readiness — do not regress product Ranking/Detail; Story 02 may proceed on admin module independently.

---

## Summary

- Inject `PAIR_MATCH_POLICY` into `MatchesService` (via `MatchesModule` → `MatchingPolicyModule`).
- Replace inline `evaluateHolyGrailPairDirections` + first `compareWithStatus` in `runCompareOnLoadedBundle` with `policy.evaluate(...)`.
- Keep **HG-first neutral-signal retry** as an admin-only wrapper **after** the policy baseline score (same gates as today).
- Do **not** put list pairwise scoring, HG diagnostic, shadow metrics, or list admission env into the policy.
- Do **not** import `MeProfileModule` from `MatchesModule`.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Shared policy | `src/matching-policy/` — `HgGateLegacyRankPolicy`, token `PAIR_MATCH_POLICY`, contract `HG_GATE_LEGACY_RANK_V1` |
| Admin compare hub | `MatchesService.runCompareOnLoadedBundle` → used by `compare` + `getReadyMatchDetailContext` |
| Admin HG-first retry | `INSUFFICIENT_DATA` + `directionsMutualHardPass` → neutral self-signal fallback + second `compareWithStatus` + provenance `HG_FIRST_NEUTRAL_SIGNAL_LEGACY_FALLBACK` |
| Admin list pairwise | `matches-list.pipeline.ts` `buildMatchRecordsFromProfiles` — **score-only** `compareWithStatus` today (no HG in loop) |
| List admission | `ENABLE_HG_LIST_ADMISSION_GATE` / `hideChildrenUnsure` — membership filters after score |
| Product | `MatchRankingService` / `MatchDetailService` / hardBlocked — **untouched** |

---

## Artifacts (locked layout)

```text
dating-api/src/matches/
  matches.module.ts                 # import MatchingPolicyModule
  matches.service.ts                # inject PAIR_MATCH_POLICY; runCompareOnLoadedBundle uses policy
  admin-pair-match.evaluator.ts     # NEW (preferred) — policy + HG-first retry wrapper
  admin-pair-match.evaluator.spec.ts
  # OR keep retry private on MatchesService if evaluator feels heavy — see §5
```

| Path | Change |
|------|--------|
| `matches.module.ts` | `imports: [MatchingPolicyModule, ...]` |
| `matches.service.ts` | Compare hub via policy/evaluator; remove duplicate inline HG+first compare |
| `admin-pair-match.evaluator.ts` | Preferred thin adapter |
| `matches.service.spec.ts` / compare specs | Assert policy used; HG-first retry still fires |
| Product me-profile / matching-policy impl | **N/A** unless bugfix |
| Prisma / admin HTTP controllers | **N/A** — no contract change |

---

## Decisions (do not reverse without discussion)

### 1. What must go through `PairMatchPolicy` (locked)

| Path | Through policy? |
|------|-----------------|
| `runCompareOnLoadedBundle` (→ `compare`, `getReadyMatchDetailContext`) | **Yes** — gate + baseline score |
| HG-first neutral retry | **No** — admin wrapper after policy |
| `compareHgDiagnostic` | **No** — HG-only lab |
| `buildMatchRecordsFromProfiles` (admin list pairwise) | **No this story** — remains `compareWithStatus` only; document as score-only bulk path (not dual HG+legacy hub) |
| List admission / children-unsure / shadow metrics | **No** |
| Detail UI / list item mappers | **No** |

Rationale for leaving list pairwise off policy: adding `policy.evaluate` would run HG for every admin list pair (cost + unused gate). AC “admin pair eval” means the **compare hub**, not bulk list scoring.

### 2. Compare-hub migration shape (locked)

```ts
// Pseudocode — runCompareOnLoadedBundle
const evaluated = this.pairMatchPolicy.evaluate({
  viewerHgRow: bundle.rowA,
  candidateHgRow: bundle.rowB,
  viewerEnginePayload: profileA,
  candidateEnginePayload: profileB,
});
const hgDirections = evaluated.gate.hgDirections;

let result: CompareResultDto | CompareGuardFailureResultDto =
  evaluated.score.scoreGuarded
    ? /* rebuild guard DTO compatible with today — see §3 */
      toGuardFromPolicy(evaluated)
    : toCompareResultFromPolicy(evaluated);

// Admin-only: unchanged HG-first retry
if (
  'status' in result &&
  result.status === 'INSUFFICIENT_DATA' &&
  hgDirections &&
  directionsMutualHardPass(hgDirections)
) {
  // existing profileWithNeutralSelfSignalsFallback + compareWithStatus retry + provenance
}
// … existing MatchRecordDto assembly unchanged
```

Policy input field names (`viewer*` / `candidate*`) map to admin A/B as **A = viewer side, B = candidate side** for the shared port (same as product orientation). Do not invent a second policy interface.

### 3. Guard / READY mapping (locked — parity)

Today `compareWithStatus` returns either a full `CompareResultDto` or a guard with `status`. Policy returns `scoreGuarded` + null fields.

Agent 1 must preserve **HTTP/service result envelopes** (`READY` / `NOT_ANALYZED` / `INSUFFICIENT_DATA`) byte-compatible with current `runCompareOnLoadedBundle` returns. Prefer:

- If `scoreGuarded`: call `compareWithStatus` only to recover the same guard `status`/`message` **or** map known guards without drift (prefer re-using one compare call for guard identity if cheaper than inventing a parallel map — **parity over purity**).
- Simplest parity-safe approach: `policy.evaluate` for gate + happy-path score; on `scoreGuarded`, fall back to existing `compareWithStatus` once to obtain the guard DTO (HG already from `evaluated.gate`). Document if that means a double compare on guard paths only.

Do **not** change success-path field population on `MatchRecordDto`.

### 4. Nest wiring (locked)

```ts
// matches.module.ts
imports: [
  SimpleLoggerModule,
  ProfilesModule,
  AuthModule,
  AdminAuthModule,
  MatchingPolicyModule, // leaf — no MeProfile
],
providers: [
  MatchesService,
  AdminPairMatchEvaluator, // if extracted
  ...
],
```

**Forbidden:** `MatchesModule` ↔ `MeProfileModule` imports; moving policy under `me-profile/`.

### 5. Adapter preference (locked)

Prefer `AdminPairMatchEvaluator` (`@Injectable`) that:

1. Injects `PAIR_MATCH_POLICY`
2. Exposes `evaluateCompare(bundle) → { hgDirections, result: CompareResultDto | Guard }` including HG-first retry
3. Is called from `runCompareOnLoadedBundle`

Acceptable alternative: inject policy directly into `MatchesService` and keep retry private — same behavior, slightly fatter service.

### 6. Product / contract locks

| Do not |
|--------|
| Change `MATCH_RANKING_CONTRACT` / ship HG-rank |
| Change `compareWithStatus` weights or stages |
| Touch product Ranking/Detail/Eligibility/hardBlocked |
| Change admin HTTP paths or JSON keys |
| Delete admin tooling / diagnostic endpoints |
| Story 03 signal dedupe |

### 7. Tests (locked)

1. Unit: admin evaluator / `runCompareOnLoadedBundle` — policy happy path; HG-first retry still applies when `INSUFFICIENT_DATA` + mutual hard PASS; diagnostic endpoint untouched.  
2. Existing `matches.service.spec.ts` / compare specs green.  
3. Optional fixture: same A/B payloads → policy `matchScore` equals pre-change admin READY `finalScore` (characterization).

```bash
cd dating-api
npx tsc --noEmit
npx jest --no-coverage src/matches/matches.service.spec.ts src/matches/compare-hg-first-helpers.spec.ts src/matching-policy --runInBand
```

### 8. Out of scope

- Admin UI rewrite  
- Routing list pairwise through policy  
- Product materialized e2e harness fix (Story 01 Agent 4 blocker) — unless blocking admin tests  
- Signal post-processing dedupe (Story 03)

---

## HTTP contracts (unchanged)

```
POST /api/.../matches/compare   (admin compare — existing paths)
GET  admin/public match list/detail as today
POST/GET HG diagnostic endpoints as today
```

Exact routes: keep whatever `MatchesController` / `MatchesApiController` already expose — no renames.

---

## Runtime topology

- N/A

---

## E2E verification plan (Agent 4 required)

**Change class:** shared **eligibility gate + ranking score** ownership for admin compare now goes through `PairMatchPolicy` (same object as product). Intended product me-matches effect: **none**. Admin compare score/gate for READY pairs: **parity**.

| Item | Plan |
|------|------|
| Affects eligibility? | Gate computation for admin compare relocates — outcomes must match |
| Affects ranking/order? | Baseline score relocates; HG-first retry must still apply |
| Product baselines | Keep green if run; do not require fixing Story 01 materialized empty-list gap in this story unless Agent 1 touches shared harness |
| Admin / compare specs | `matches.service.spec.ts` + any integration covering admin compare |
| New scenarios | Optional: one shared-fixture assert admin READY `finalScore` == `HgGateLegacyRankPolicy.evaluate(...).score.matchScore` before retry |
| Agent 4 | `--agent 4 sprint 46 story 2` after CR |

---

## Agent 1 instructions

1. Import `MatchingPolicyModule` into `MatchesModule`.  
2. Implement evaluator (preferred) or inline policy call in `runCompareOnLoadedBundle` per §2–§3; preserve HG-first retry + DTO assembly.  
3. Leave list pipeline, diagnostics, admission filters alone.  
4. Do not modify product me-matches collaborators.  
5. Run locked Jest + typecheck; commit; write `agent-1-dev.md`.

Suggested commit:

```
refactor(matches): route admin compare through PairMatchPolicy

Sprint 46 Story 2
```

---

## Agent 2 instructions

- [ ] Admin compare hub uses `PAIR_MATCH_POLICY`; retry still admin-only  
- [ ] No MeProfile ↔ Matches cycle; policy not under me-profile  
- [ ] HTTP/DTO parity; list pairwise / diagnostic unchanged  
- [ ] Flag Agent 4 next  
→ `--agent 4 sprint 46 story 2`

---

## Agent 4 / 3

- Agent 4: compare/eligibility–ranking parity for admin hub; blocked → Agent 1.  
- Agent 3: Done only if CR approved **and** Agent 4 non-blocked.

---

## Open questions / blockers

- Story 01 formally Blocked on product e2e materialized readiness — independent of this admin wire. If Agent 4 for Story 02 is asked to re-run product baselines, note the known empty-first-page gap.

---

## Next agent

```text
--agent 1 sprint 46 story 2
```

**Notes for next agent:**

- Compare hub only; keep HG-first retry outside policy.  
- Agent 4 after CR.
