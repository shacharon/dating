# Story 3: Remove LOW_INFO_PROFILE_IDS hardcode

**Sprint:** 5  
**Status:** **Done** (engineering gate — 2026-06-03)  
**Closeout order:** 5  
**Depends on:** —

---

## Why

`match-engine.ts` hardcoded profile `19` (SHORT stub) to cap `finalScore` at 55. That was not maintainable and did not generalize to other sparse profiles.

---

## What

**As a** match engine maintainer  
**I want** low-information profiles capped by coverage rules, not hardcoded ids  
**So that** score quality degrades predictably for any sparse profile

### Acceptance criteria

- [x] **Remove `LOW_INFO_PROFILE_IDS`** — deleted from `match-engine.ts`
- [x] **Coverage-based cap** — `coveragePercent < 50` OR `minPresent <= 5` → `finalScore ≤ 55` (`coverage-policy.ts`)
- [x] **Document in match-engine-overview.md** — sparse final cap rule
- [x] **No profile-id special cases** — grep clean in `src/matches/`
- [x] **Tests updated** — `coverage-policy.spec.ts` + `match-engine.spec.ts`
- [x] **Backward compat** — full-coverage pairs unaffected

### Out of scope (this story)

- Changing coverage factor formula itself
- UI display of "low confidence" badge (future)

---

## Shipped (engineering)

| Deliverable | Detail |
|-------------|--------|
| `coverage-policy.ts` | `LOW_COVERAGE_PERCENT_THRESHOLD=50`, `SPARSE_MIN_PRESENT_SIGNALS=5`, `SPARSE_FINAL_SCORE_CAP=55` |
| `match-engine.ts` | `applySparseFinalScoreCap`; provenance `sparse_final_cap` |
| Docs | `match-engine-overview.md` updated |

---

## Definition of done

- [x] `LOW_INFO_PROFILE_IDS` removed
- [x] Coverage-based cap implemented and documented
- [x] `match-engine.spec.ts` updated — all pass
- [x] `docs/match-engine-overview.md` updated
- [x] `npm run build` + tests — **1280/1280**

---

## Agent run

```text
--agent 0 sprint 5 story 3   ✅
--agent 1 sprint 5 story 3   ✅
--agent 2 sprint 5 story 3   ✅
--agent 3 sprint 5 story 3   ✅
```

Handoffs: `handoffs/STORY_03_remove_low_info_profile_ids/agent-*.md`

---

## Manual smoke

1. Rebuild matches for sparse profile → `finalScore ≤ 55`, `sparse_final_cap` in provenance  
2. Rebuild matches for full profile → score unchanged (within rounding)

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| UI "low confidence" indicator | future sprint |
| Golden pairs validate + bulk recompute | operator |
