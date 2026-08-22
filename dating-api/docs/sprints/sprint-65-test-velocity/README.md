# Sprint 65 — Test Velocity (Giant Spec Splits)

**Status:** In progress (Story 01 Done)  
**Depends on:** Sprint 64 Done  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**Round:** 4 (Android prep — fast CI/test feedback)

---

## Goal

Split giant test files so CI is fast and mobile features don't break unrelated tests.

**Mobile impact:** Adding Android-specific match features shouldn't require running 3000-line test suites.

---

## Why Now

| File | LOC | Impact |
|------|-----|--------|
| `extraction.service.spec.ts` | 3160 | Slow prompt changes, flaky CI |
| `match-engine.spec.ts` | 3079 | Scoring tweaks run 3k assertions |
| Others | 1000-2300 | Slower than needed |

**Android velocity:** Quick test → quick deploy → quick mobile iteration.

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Split extraction.service.spec](./STORY_01_split_extraction_spec.md) | 2 days | ⚡ LOW | Done |
| 02 | [Split match-engine.spec](./STORY_02_split_match_engine_spec.md) | 2 days | ⚡ LOW | Planned |
| 03 | [Optional: thin remaining 1k+ specs](./STORY_03_thin_remaining_specs.md) | 1–2 days | ⚡ LOW | Planned |

**Order:** 01 → 02 → 03 (or 01+02 parallel).

**Preferred merge tip:** `feature/sprint-65-story-3`

---

## Success Criteria

- [x] `extraction.service.spec.ts` → focused files (≤779 non-empty LOC each) *(Story 01)*
- [ ] `match-engine.spec.ts` → 3–4 focused files (≤1000 LOC each)
- [ ] No single spec file >2000 LOC
- [ ] CI time improved (measure before/after)
- [ ] All tests green

---

## Mobile Win

**Before:** Change `/me/matches` → 3k test assertions run  
**After:** Change `/me/matches` → 600 test assertions run  
**Result:** 5× faster mobile feature iteration
