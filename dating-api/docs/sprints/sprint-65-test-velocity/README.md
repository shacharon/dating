# Sprint 65 — Test Velocity (Giant Spec Splits)

**Status:** In progress (Stories 01–02 Done on feature branches)  
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
| 01 | Split extraction.service.spec | 2 days | ⚡ LOW | Done (`feature/sprint-65-story-1`) |
| 02 | [Split match-engine.spec](./STORY_02_split_match_engine_spec.md) | 2 days | ⚡ LOW | Done |
| 03 | [Optional: thin remaining 1k+ specs](./STORY_03_thin_remaining_specs.md) | 1–2 days | ⚡ LOW | Planned |

**Order:** 01 → 02 → 03 (or 01+02 parallel).

**Merge branches:** `feature/sprint-65-story-1`, `feature/sprint-65-story-2` (Story 03 optional on `feature/sprint-65-story-3`).

---

## Success Criteria

- [x] `extraction.service.spec.ts` → focused files (≤779 non-empty LOC each) *(Story 01, branch story-1)*
- [x] `match-engine.spec.ts` → focused files (≤800 non-empty LOC each) *(Story 02)*
- [ ] No single spec file >2000 LOC *(remaining candidates in Story 03)*
- [ ] CI time improved (measure before/after)
- [x] All tests green *(per story scope)*

---

## Mobile Win

**Before:** Change match scoring → 3k test assertions run  
**After:** Change compare logic → ~11 test assertions run (`match-engine.compare.spec`)  
**Result:** Faster mobile feature iteration
