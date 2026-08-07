# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-02-regulation-affection  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Created `expansion-02-explainability.ts` with shadow chip maps + `buildExpansion02ShadowBreakdown()`.
- Extended `assemble-result.ts` to concat Expansion-02 shadow breakdown with Expansion-01 (chip picker only).
- Extended `match-explainability.ts` shadow key resolution (import aliases `_01` / `_02`).
- Added `CHIP_TO_TRAIT` entries for `Emotional balance` and `Affection rhythm match`.
- Added i18n evidence (EN/HE/ES) + `CHIP_EVIDENCE_KEYS` entries.
- Added backend + frontend tests.
- No changes to `COMPATIBILITY_SIGNAL_KEYS`, `expansion-01-explainability.ts`, or scoring weights.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-02-explainability.ts` | **Created** — shadow maps + breakdown builder |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat Expansion-02 shadow breakdown |
| `dating-api/src/matches/match-explainability.ts` | Expansion-02 chip/domain resolution |
| `dating-api/src/matches/match-explanation-traits.ts` | 2 `CHIP_TO_TRAIT` entries |
| `dating-api/src/matches/expansion-02-explainability.spec.ts` | **Created** — 5 tests |
| `dating-api/src/matches/match-explainability.spec.ts` | Expansion-02 chip pick test |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | 2 trait mapping tests |
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | +2 keys |
| `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts` | `chipEvidence` entries |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | 2 Expansion-02 UI tests |
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | This handoff |

---

## Decisions honored

- Shadow overlay only — not `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`
- Domains: `emotionalRegulation` → `emotional`; `physicalAffectionStyle` → `intimacy`
- Shadow breakdown merged for explainability chip picker only; `alignments` unchanged
- Expansion-01 explainability module unchanged (maps/labels)
- `computePairScore` reused from Expansion-01 Story 4 (no re-export)

---

## Runtime topology

N/A

---

## Tests / verification

- [x] `expansion-02-explainability.spec.ts` + explainability + traits — **39/39 pass**
- [x] `npm run typecheck` (dating-api) — **pass**
- [x] `npm test -- chip-evidence.spec.ts match-why-section.spec.tsx` (dating-ui) — **pass**
- [x] Browser Network smoke: **N/A** (manual deferred to Story 5)

---

## E2E verification

N/A — Agent 4 skipped.

---

## Open questions / blockers

- None

---

## Next agent

```text
--agent 2 expansion 02 story 4
```

**Notes for next agent:** Verify shadow keys not in `COMPATIBILITY_SIGNAL_KEYS`; alignments DTO excludes shadow keys; Expansion-01 overlay unchanged; i18n strings match architect lock.
