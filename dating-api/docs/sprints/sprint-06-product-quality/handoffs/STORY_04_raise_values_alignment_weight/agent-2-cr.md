# Handoff: Agent 2 — Code review — Story 4

**Agent:** 2 code-review  
**Story:** [STORY_04_raise_values_alignment_weight.md](../../STORY_04_raise_values_alignment_weight.md)  
**Sprint:** sprint-06-product-quality  
**Date:** 2026-06-03  
**Status:** complete  
**Verdict:** approved (fixed)

---

## Summary

- Reviewed weight change in `engine/scoring.ts` — matches architect locked formula; production path uses `compatibilityFormula` from `engine/scoring` only.
- **`computeValuesAlignment` untouched**; blend input still capped at 85 in `match-engine.ts`.
- **Fixed:** import order in `engine.scoring.spec.ts`; asserted `valuesAlignment` on `compare()` in `match-engine.spec.ts`.
- **1271/1271** tests pass.

---

## Review findings

| Severity | Finding | Resolution |
|----------|---------|------------|
| Minor | `engine.scoring.spec.ts` had imports after `fullMap` helper | **Fixed** — moved imports to top |
| Minor | No integration assert that `compare()` exposes `valuesAlignment` | **Fixed** — extended existing shape test |
| Accepted | `matches/scoring.ts` still 0.20/0.10 | Deprecated header present; not production |
| Accepted | Golden pairs script not in package.json | Not run; no hard-coded blend literals in golden data |
| Accepted | Ranking shift globally | Expected per story; PM note in agent-3 |

**Logic:** Weights sum 1.0; Tier1 spirituality gap lowers `compatibility` vs Tier3-only gap when directionals held equal; display `valuesAlignment` uncapped, blend uses capped value.

---

## Acceptance criteria

| AC | Status |
|----|--------|
| Formula 0.30/0.30/0.25/0.15 | ✅ |
| Weights sum 1.0 | ✅ unit test |
| Engine tests updated | ✅ |
| Tier1 vs Tier3 regression | ✅ |
| match-engine-overview.md | ✅ |
| No computeValuesAlignment change | ✅ |
| Explain shows valuesAlignment | ✅ `CompareResultDto` + persistence |

---

## Artifacts (CR changes)

| Path | Change |
|------|--------|
| `dating-api/src/engine/engine.scoring.spec.ts` | import order |
| `dating-api/src/matches/match-engine.spec.ts` | `valuesAlignment` on compare result |

---

## Tests / verification

| Command | Result |
|---------|--------|
| `npm test` (dating-api) | **1271/1271** pass |
| `npm run build` | pass (Agent 1) |

---

## Open questions / blockers

- None blocking Agent 3.
- Operator: recompute stored matches if product wants rankings refreshed (out of scope).

---

## Next agent

```text
--agent 3 sprint 6 story 4
```

**Notes for PM:**

- Mark Story 4 Done; Sprint 6 **3/4** (only Story 3 LLM context left).
- Document **expected ranking shift** for values-divergent pairs.
- Sample delta in `agent-1-dev.md` blend table.
