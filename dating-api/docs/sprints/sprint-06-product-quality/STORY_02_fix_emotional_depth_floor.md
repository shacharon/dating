# Story 2: Fix EMOTIONAL_DEPTH_FLOOR logic

**Sprint:** 6  
**Status:** **Done** (engineering gate — 2026-06-03)  
**Closeout order:** 3  
**Depends on:** —

---

## Why

`dealbreakers.ts` flagged `EMOTIONAL_DEPTH_FLOOR` as `STRONG_FLAG` when **both** users had `emotionalDepth ≤ 3`. Two emotionally reserved or pragmatic people can be highly compatible — that rule unfairly suppressed their match score (−15 via dealbreaker cap, plus a duplicate balance bump).

---

## What

**As a** user with a reserved emotional style  
**I want** not to be penalized for matching with someone similarly reserved  
**So that** introvert/pragmatist pairs aren't incorrectly down-ranked

### Acceptance criteria

- [x] **Remove or rewrite rule #4** — no longer fires on "both low depth"
- [x] **Directional mismatch** — flag when one side ≥ 8 and other ≤ 2
- [x] **Tests updated** — `dealbreakers.spec.ts`, `relationshipBalance.spec.ts`
- [x] **Match engine regression** — bilateral low: `applyDealbreakerCap(70)` stays **70** (was 55 under old rule)
- [x] **Document in match-engine-overview.md** — policy updated

### Out of scope (this story)

- Changing `emotionalDepth` extraction prompt
- UI copy about emotional compatibility
- RED friction floor when `baseFriction === 0` (see `biggest-misses-root-cause.md` Option A)

---

## Shipped (engineering)

| Change | Detail |
|--------|--------|
| `dealbreakers.ts` rule #4 | Directional ≥8 vs ≤2; severity `PENALTY` |
| `relationshipBalance.ts` | Removed bilateral `emotionalDepth <= 3` negativeScore +1 |
| Docs | `match-engine-overview.md`, `biggest-misses-root-cause.md` |
| Tests | Truth-table coverage + `applyDealbreakerCap` regression |

---

## Definition of done

- [x] EMOTIONAL_DEPTH_FLOOR behavior changed per AC
- [x] Unit tests pass (**1268/1268** full suite)
- [x] No match-engine spec asserted old bilateral flag
- [x] No other dealbreaker rules regressed

---

## Agent run

```text
--agent 0 sprint 6 story 2   ✅
--agent 1 sprint 6 story 2   ✅
--agent 2 sprint 6 story 2   ✅
--agent 3 sprint 6 story 2   ✅
```

Handoffs: `handoffs/STORY_02_fix_emotional_depth_floor/agent-*.md`

---

## Manual smoke

1. Compare match where both profiles have `emotionalDepth: 2` → no `EMOTIONAL_DEPTH_FLOOR` in explain output  
2. Compare where depths are **9** and **2** → flag present with mismatch evidence

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Extraction quality for emotionalDepth | future |
| RED friction floor without tensions | separate story |
| Rename `EMOTIONAL_DEPTH_FLOOR` → mismatch code | optional |
