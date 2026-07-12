# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_fix_emotional_depth_floor.md](../../STORY_02_fix_emotional_depth_floor.md)  
**Sprint:** sprint-06-product-quality  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Replace** bilateral-low rule (`both emotionalDepth ≤ 3` → `EMOTIONAL_DEPTH_FLOOR`) with a **directional mismatch** rule: flag only when one side is very high (**≥ 8**) and the other very low (**≤ 2**).
- **Do not delete** the `EMOTIONAL_DEPTH_FLOOR` code — reuse the enum for explainability / `match-short-reason.ts`; change semantics and evidence string.
- **Also remove** hidden duplicate logic in `relationshipBalance.ts` (lines 110–115) that bumps `negativeScore` when both depths ≤ 3 — without this, Story 2 will not fix RED balance tier for reserved pairs (see `docs/biggest-misses-root-cause.md` pair 1).
- **Severity:** `PENALTY` (not `STRONG_FLAG`) for the new rule — same −15 in `applyDealbreakerCap` as STRONG_FLAG, but clearer intent; balance tier uses same weight (3) for PENALTY/STRONG_FLAG today.
- **No extraction / UI / tension-rule changes** — `emotional_depth_gap` tension (|Δ| ≥ 4) stays; orthogonal friction layer.

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/domain/dealbreakers.ts` | Replace rule #4; update block comment |
| `dating-api/src/domain/relationshipBalance.ts` | **Delete** bilateral `emotionalDepth <= 3` negativeScore bump (lines 110–115) |
| `dating-api/src/domain/dealbreakers.spec.ts` | Replace bilateral tests; add directional cases |
| `dating-api/src/domain/relationshipBalance.spec.ts` | Update “ratio < 2” fixture if it relied on bilateral bump + flag |
| `dating-api/docs/match-engine-overview.md` | Add short “Emotional depth dealbreaker” policy bullet |
| `dating-api/docs/biggest-misses-root-cause.md` | Optional one-line “fixed in Sprint 6 Story 2” on pair 1 |
| `handoffs/STORY_02_fix_emotional_depth_floor/agent-1-dev.md` | created by agent 1 |

**No changes:**

| Path | Reason |
|------|--------|
| `match-short-reason.ts` | Keep `EMOTIONAL_DEPTH_FLOOR: 'emotional depth'` label |
| `engine/tension-rules.ts` | `emotional_depth_gap` is separate; out of scope |
| `dealbreakers.ts` `DealbreakerCode` union | Keep `EMOTIONAL_DEPTH_FLOOR` name |

---

## Decision: directional mismatch (not delete)

**Rationale (vs delete block entirely):**

- Product still needs a signal when a depth-seeking partner (8–10) meets a pragmatic/low-depth partner (1–2).
- Deleting the rule removes all `EMOTIONAL_DEPTH_FLOOR` explainability for extreme gaps.
- Aligns with sprint README: “remove or **invert**” — invert = mismatch, not bilateral floor.

**Rejected: keep bilateral with WARNING severity** — still penalizes introvert pairs in balance ratio via duplicate `relationshipBalance` bump; does not meet AC.

**Rejected: delete only dealbreaker, keep balance bump** — incomplete fix.

---

## New rule #4 (canonical)

```typescript
// 4) Emotional depth directional mismatch (high vs low — not bilateral low)
const aDepth = n(a.signals.emotionalDepth, 5);
const bDepth = n(b.signals.emotionalDepth, 5);
const highVsLow =
  (aDepth >= 8 && bDepth <= 2) || (bDepth >= 8 && aDepth <= 2);
if (highVsLow) {
  out.push({
    code: 'EMOTIONAL_DEPTH_FLOOR',
    severity: 'PENALTY',
    evidence: [`emotionalDepth mismatch: ${aDepth} vs ${bDepth}`],
  });
}
```

**Thresholds (locked for Story 2):**

| Constant | Value | Meaning |
|----------|-------|---------|
| High | **≥ 8** | Values emotional depth / availability |
| Low | **≤ 2** | Reserved / pragmatic style |

**Truth table (examples):**

| A depth | B depth | EMOTIONAL_DEPTH_FLOOR |
|---------|---------|------------------------|
| 2 | 3 | No (bilateral low — compatible) |
| 2 | 7 | No (one low, not extreme gap) |
| 9 | 2 | Yes |
| 8 | 2 | Yes |
| 8 | 3 | No (3 > 2) |
| 7 | 2 | No (7 < 8) |

---

## relationshipBalance.ts — required second fix

Current hidden penalty (must **delete**):

```typescript
if (
  n(signalsA.emotionalDepth, 5) <= 3 &&
  n(signalsB.emotionalDepth, 5) <= 3
) {
  negativeScore += 1;
}
```

This was added independently of `computeDealbreakers` and causes RED tier even if dealbreaker is removed. **Agent 1 must remove this block** and add a spec that bilateral low depth **without** dealbreakers does not inflate `negativeScore` beyond baseline 0.5.

---

## Tests (agent 1)

### `dealbreakers.spec.ts`

| Test | Expect |
|------|--------|
| both depth 2 and 3 | **no** `EMOTIONAL_DEPTH_FLOOR` |
| depth 9 vs 2 | **yes**, severity `PENALTY`, evidence mentions mismatch |
| depth 8 vs 2 | **yes** |
| depth 8 vs 3 | **no** |
| depth 2 vs 7 | **no** (replaces old “only one low” test) |

### `relationshipBalance.spec.ts`

| Test | Expect |
|------|--------|
| both `emotionalDepth: 2`, `dealbreakers: []` | `negativeScore === 0.5` (no +1 bump) |
| Update “ratio < 2” test | Use directional dealbreaker + HARD flag, or visibility gap — do not rely on bilateral-low bump |

### Optional (recommended)

- `applyDealbreakerCap`: overall with bilateral-low dealbreakers removed — score **higher** than old STRONG_FLAG bilateral case (document delta in dev handoff).

### Regression commands

```bash
cd dating-api
npm test -- dealbreakers.spec.ts relationshipBalance.spec.ts
npm test
npm run validate:golden-pairs   # if time; no golden pairs cite EMOTIONAL_DEPTH_FLOOR today
```

---

## Documentation

### `docs/match-engine-overview.md`

Add under dealbreakers / balance section (≈5 lines):

- **Emotional depth:** `EMOTIONAL_DEPTH_FLOOR` fires on **directional** mismatch (one ≥ 8, other ≤ 2), not when both are low. Bilateral reserved/pragmatic pairs are not dealbroken. Tension rule `emotional_depth_gap` (|Δ| ≥ 4) may still add friction separately.

### `docs/biggest-misses-root-cause.md`

Optional footer on pair 1: fixed by Sprint 6 Story 2 (dealbreaker + balance bump).

---

## Scoring impact (expected)

| Pair type | Before | After |
|-----------|--------|-------|
| Both depth ≤ 3 | STRONG_FLAG (−15) + balance +1 + often RED friction floor | No flag, balance baseline |
| 9 vs 2 | No flag (if only one “low” by old rule) | PENALTY (−15) + may fire `emotional_depth_gap` tension |
| 8 vs 6 | No flag | No flag |

**Note:** `applyDealbreakerCap` treats `STRONG_FLAG` and `PENALTY` identically (−15 each). Main win for bilateral-low pairs is **removing flag + balance bump + RED friction floor chain** (`biggest-misses-root-cause.md`).

Pair 1 friction-floor issue (RED when `baseFriction === 0`) is **out of scope** — separate story if still needed after this fix.

---

## Import / grep checkpoints

```bash
cd dating-api
rg "emotionalDepth.*<= 3|<= 3 &&.*emotionalDepth" src/
# expect: zero after Story 2 (except archive/docs/handoffs)

rg "EMOTIONAL_DEPTH_FLOOR" src/
# expect: dealbreakers.ts, match-short-reason.ts, specs only
```

---

## Ordered implementation plan (agent 1)

1. Update `computeDealbreakers` rule #4 per spec above.
2. Remove bilateral bump in `computeRelationshipBalance`.
3. Rewrite `dealbreakers.spec.ts` tests.
4. Fix `relationshipBalance.spec.ts`.
5. Update `match-engine-overview.md` (+ optional `biggest-misses-root-cause.md`).
6. `npm test` full suite.
7. Write `agent-1-dev.md` with before/after score example for bilateral-low pair.

---

## Manual smoke (operator)

1. Compare/rebuild match with both profiles `emotionalDepth: 2` → explain output has **no** `EMOTIONAL_DEPTH_FLOOR`; balance tier not RED solely from depth.
2. Compare with depths **9** and **2** → `EMOTIONAL_DEPTH_FLOOR` present with mismatch evidence.

---

## Story AC mapping

| AC | How satisfied |
|----|----------------|
| Remove/rewrite rule #4 | Directional mismatch replaces bilateral |
| Alternative directional | Chosen (≥8 vs ≤2) |
| Tests updated | dealbreakers + relationshipBalance specs |
| Match regression higher for bilateral low | Remove flag + balance bump |
| match-engine-overview.md | Policy bullet |

---

## Risks / edge cases

| Risk | Mitigation |
|------|------------|
| Dev fixes dealbreaker only | Architect requires balance.ts change in same PR |
| 9 vs 3 gets no dealbreaker but tension gap | Acceptable; gap < 8/2 extreme |
| Golden pair drift | Run `validate:golden-pairs`; none reference this flag today |

---

## Next agent

```text
--agent 1 sprint 6 story 2
```
