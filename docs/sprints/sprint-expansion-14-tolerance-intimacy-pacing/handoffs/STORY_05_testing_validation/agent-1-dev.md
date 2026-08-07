# Handoff: Agent 1 — Dev — Story 5

**Agent:** 1 dev  
**Story:** [README.md — STORY 5: Testing, Validation & Regression](../../README.md)  
**Sprint:** sprint-expansion-14-tolerance-intimacy-pacing  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Added `compare()` Expansion-14 E2E (**17** cases): three tensions (incl. monogamy dealbreaker), three positives (incl. both-slow pacing + both-mono/open monogamy), both-critical / mono-vs-open exclusivity, alignments exclusion, null guard, compatibility invariance, Exp-13/12 non-regression.
- Created rollout gate (`35/50/54/42/28/15` + meta + browse chip map + tension ids).
- Fixtures + optional live validator; UI tension passthrough for all three Exp-14 tension chips; chip registry **40**.
- Shadow preserved — **no** scoring promote. Agent 4 skipped.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `makeProfileWithExpansion14Shadow` + E2E describe (17 tests) |
| `dating-api/src/extraction/expansion-14-rollout.spec.ts` | **Created** — 6 tests |
| `dating-api/data/expansion-14-extraction-fixtures.json` | **Created** (force-add if committing; `/data` gitignored) |
| `dating-api/scripts/validate-expansion-14-extraction.ts` | **Created** |
| `dating-api/package.json` | `validate:expansion-14-extraction` |
| `dating-ui/.../match-why-section.spec.tsx` | Three Exp-14 tension passthroughs |
| `dating-ui/.../chip-evidence.spec.ts` | Already Story 4 (length 40) — confirmed |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | This file |

---

## Architect locks followed

- [x] ≥15 `compare()` E2E cases with exact tension/chip labels
- [x] Patience both-high ≥7 → Patience match; both-critical → no Patience match
- [x] Pacing dual-band (both fast / both slow); monogamy dual-band (both mono / both open)
- [x] Mono vs open → no Aligned structure positive; dealbreaker tension asserted
- [x] All three tensions covered; friction floors for patience (≥3) and monogamy (≥8)
- [x] Rollout counts 35/50/54/42/28/15 + meta + chip map + tension ids
- [x] Fixtures: README EN + Hebrew ≥3 + null/distinction (conflict / casual intimacy / clarity)
- [x] Validate script mirrors Exp-13; skip without API key; no regex
- [x] UI tension passthrough; chip registry still **40**
- [x] No promote / no Story 2–3 duplication

---

## Tests / verification

| Check | Result |
|-------|--------|
| match-engine `-t Expansion-14` | **17/17** |
| match-engine `-t Expansion-13` | **14/14** (non-regression) |
| match-engine `-t Expansion-12` | **14/14** (non-regression) |
| `expansion-14-rollout.spec.ts` | **6/6** |
| `npm run typecheck` (dating-api) | **pass** |
| UI match-why Exp-14 filter | **pass** (3 tension + positives/onboarding from Story 4) |
| UI chip-evidence Exp-14 | **pass** (length 40) |
| `npm run validate:expansion-14-extraction` | **100%** (15/15) — above 85% |

Live note: Hebrew monogamy low fixture needed explicit exclusive/not-open wording (plus brief EN polarity cue) after an earlier run inverted to high; EN/HE patience high texts strengthened for stable ≥7 bands.

---

## Explicit Non-Goals (this story)

- No scoring promote / `COMPATIBILITY_SIGNAL_KEYS`
- No new extraction prompts / tension / chip logic
- No Exp-08 work
- No HG hard filter
- Agent 4 skipped

---

## Next agent

```text
--agent 2 expansion 14 story 5
```

**Notes:** CR checklist in architect handoff. Do not commit unless user asks. Force-add fixtures if committing (`git add -f dating-api/data/expansion-14-extraction-fixtures.json`).

Suggested commit:

```
test(matching): Expansion-14 tolerance and intimacy pacing E2E validation and fixtures

Story 5 — compare E2E, rollout gate, optional live extraction validator; shadow preserved.
```
