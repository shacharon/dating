# Sprint 65 — Test Velocity (Giant Spec Splits)

**Status:** Done  
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

| File | LOC (before) | Impact |
|------|--------------|--------|
| `extraction.service.spec.ts` | 3160 | Slow prompt changes, flaky CI |
| `match-engine.spec.ts` | 3079 | Scoring tweaks run 3k assertions |
| `me-profile-http-matches.integration.spec.ts` | 2360 | `/me/matches` edits run full HTTP family |
| Others | 1000–1400 | Deferred — under 2000 LOC threshold |

**Android velocity:** Quick test → quick deploy → quick mobile iteration.

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Split extraction.service.spec](./STORY_01_split_extraction_spec.md) | 2 days | ⚡ LOW | Done |
| 02 | [Split match-engine.spec](./STORY_02_split_match_engine_spec.md) | 2 days | ⚡ LOW | Done |
| 03 | [Thin matches HTTP spec](./STORY_03_thin_remaining_specs.md) | 1–2 days | ⚡ LOW | Done |

**Order:** 01 → 02 → 03.

---

## Success Criteria

- [x] `extraction.service.spec.ts` → focused files (≤779 non-empty LOC each) *(Story 01)*
- [x] `match-engine.spec.ts` → focused files (≤800 non-empty LOC each) *(Story 02)*
- [x] `me-profile-http-matches.integration.spec.ts` → 4 sub-specs (≤748 non-empty LOC each) *(Story 03, Scope A)*
- [x] No single spec file >2000 LOC *(matches was only file above threshold; now split)*
- [ ] CI time improved (measure before/after — informal velocity wins documented per story)
- [x] All tests green *(per story scope)*

---

## Mobile Win

**Before:** Change match scoring → 3k test assertions run  
**After:** Change compare logic → ~11 test assertions run (`match-engine.compare.spec`)

**Before:** Edit `/me/matches` list → 73-test monolith (~8–24s)  
**After:** Edit list/detail only → `me-profile-http-matches-list-detail` (~606 LOC tranche)

**Result:** Faster mobile feature iteration

---

## Deferred (Story 03 out-of-scope)

| File | LOC | Notes |
|------|-----|-------|
| `me-profile-http-crud.integration.spec.ts` | ~1390 | Under 2000 threshold |
| `me-profile-http-conversations.integration.spec.ts` | ~1283 | Under 2000 threshold |
| `me-profile.service.spec.ts` | ~1347 | Under 2000 threshold |

Revisit only if CI remains slow after merging Stories 01–03.
