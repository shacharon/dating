# Handoff: Agent 2 — Code review — Story 4

**Agent:** 2 code-review  
**Story:** [README.md — STORY 4: User-Facing Chips, i18n & Interest Overlap](../../README.md)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)  
**Verdict:** **approved** (no code changes required)

---

## Summary

- Reviewed Story 4 against architect handoff — **aligned**.
- Shadow overlay: 3 standalone + 2 pair synthetic chips; no provider/recipient standalone; no scoring promote.
- `interestOverlapTags` max 2 with preferred tag set; distinct UI list; `sharedInterestNote` preserved.
- `CHIP_EVIDENCE_KEYS` **29**; EN/HE/ES chipEvidence + interestOverlap; `CHIP_TO_TRAIT` for five labels.
- Alignments still from official breakdown only; Exp-07 concat is chip-picker input only.

---

## Architect CR checklist

- [x] Shadow overlay only — no `COMPATIBILITY_SIGNAL_KEYS` / official `POSITIVE_CHIP_BY_SIGNAL` Exp-07 keys
- [x] Three standalone + two pair chips; no provider/recipient standalone
- [x] Pair predicates match README (exchange≤3 → non-transactional; ≥7 + provider↔recipient → financial alignment)
- [x] `assemble-result` concat includes Exp-07; alignments from `compatAB.breakdown` only
- [x] `interestOverlapTags` max 2; preferred tag set; distinct UI (`match-why-interest-chips`)
- [x] `CHIP_EVIDENCE_KEYS` **29**; EN/HE/ES for five labels
- [x] `CHIP_TO_TRAIT` for five labels
- [x] No keyword interest matching (normalized tag intersection + preferred filter only)
- [x] Tests + typecheck pass — CR re-run backend **12** matching + full explainability **11/11**; UI chip-evidence **8/8**; typecheck **pass**

---

## Issues

| Severity | Finding | Action |
|----------|---------|--------|
| Critical | None | — |
| Major | None | — |
| Minor | `match-why-section.spec.tsx` can emit post-teardown `window is not defined` (React scheduler) while tests still pass | Pre-existing flaky env; not introduced by Exp-07 logic |
| Minor | Pair chips compete in the 3-slot picker (`pairScore: 10`) and may displace weaker signal chips | **Intentional** per architect §10 |

---

## Review notes

- Both-high-provider correctly yields **no** financial alignment chip (tension remains Story 3).
- Virtual keys `supportFinancialAlignment` / `supportNonTransactional` are explainability-only — not in extraction allowlists.
- Frontend DTO + list-row DTO include optional `interestOverlapTags`.

---

## Artifacts

| Path | Change |
|------|--------|
| Backend Exp-07 explainability + wiring + traits + specs | Agent 1 (unchanged by CR) |
| Frontend chip-evidence / i18n / match-why / types | Agent 1 (unchanged by CR) |
| `handoffs/STORY_04_chips_i18n/agent-2-cr.md` | This handoff |

---

## Runtime topology

N/A

---

## Tests / verification

- [x] Backend Expansion-07 explainability — **11/11** (agent 1; CR filter **12** incl. related)
- [x] Typecheck — **pass**
- [x] UI `chip-evidence.spec.ts` — **8/8** (CR re-run)
- [x] Browser Network smoke: **N/A**

---

## E2E verification

N/A

---

## Open questions / blockers

- None for Story 4 close.

---

## Next agent

```text
--agent 3 expansion 07 story 4
```

**Notes:** PM closes Story 4, then Story 5 (live Hebrew fixtures, pair E2E, optional promote gate). Keep shadow / no scoring promote until explicit decision.
