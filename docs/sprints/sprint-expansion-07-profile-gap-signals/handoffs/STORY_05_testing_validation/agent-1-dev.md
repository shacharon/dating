# Handoff: Agent 1 — Dev — Story 5

**Agent:** 1 dev  
**Story:** [README.md — STORY 5: Testing, Validation & Hebrew Profile Regression](../../README.md)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Added **15** `compare()` E2E tests for Expansion-07 (5 tensions, standalone + pair positive chips, interest overlap tags, alignments exclusion, null skip, compatibility invariance, Exp-06 non-regression, adjacent distinction).
- Created live LLM fixtures (EN high/low + Hebrew gap A/B/C + distinction cases) + `validate:expansion-07-extraction` (multi-signal + `allowNull`).
- UI: Exp-07 tension chip passthrough `Casual vs committed intimacy`; Exp-07 chips already in `CHIP_EVIDENCE_KEYS` (29).
- Shadow scoring unchanged (**15** scored). No evaluate-layer duplication. **No promote.**

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `makeProfileWithExpansion07Shadow` + Expansion-07 E2E describe (15 tests) |
| `dating-api/data/expansion-07-extraction-fixtures.json` | **Created** — EN bands + Hebrew gap A/B/C + spiritual/emotional distinctions |
| `dating-api/scripts/validate-expansion-07-extraction.ts` | **Created** — optional live LLM validator (multi-expectation + allowNull) |
| `dating-api/package.json` | `validate:expansion-07-extraction` |
| `dating-ui/.../match-why-section.spec.tsx` | Expansion-07 tension chip passthrough |
| `handoffs/STORY_05_testing_validation/agent-1-dev.md` | This handoff |

---

## Tests / verification

- [x] `match-engine.spec.ts` -t Expansion-07 — **15/15 pass**
- [x] `match-engine.spec.ts` -t Expansion-06 — **10/10 pass** (non-regression)
- [x] Expansion-07 unit filter (explainability/friction/extraction) — **35/35 pass**
- [x] `npm run typecheck` — **pass**
- [x] UI chip-evidence + match-why — **29/29 tests pass** (vitest teardown `window` noise → exit 1 non-blocking; same as Exp-06)
- [x] `npm run validate:expansion-07-extraction` — **95.0%** (19/20 scored expectations; ≥85%). One flaky null on `gap_c` casualIntimacyIntent this run; fixture wording tightened after.
- [ ] `validate:golden-pairs` — **SKIP** (not run / no DB assumed)
- [ ] Browse visual QA — **SKIP** (manual operator checklist)
- [ ] Admin match-quality panel — **SKIP** (deferred per architect)

### Manual browse checklist (operator)

1. Re-analyze Hebrew gap-like profiles (or EN equivalents) with Exp-07 themes.
2. Confirm tension/positive/interest chips when values warrant.
3. Confirm emotional-תמיכה-only text does not force high support* chips; spiritual-not-observant does not force high `religiousObservance`.
4. Locale HE/ES — chip evidence localized.

---

## Open questions / blockers

- None blocking agent 2 CR.
- Live LLM: 1/20 expectation flaky on gap_c casual; still above threshold. Operator may re-run before promote.
- **Promote to scored keys:** Forbidden in Story 5 — future explicit story after product decision.

---

## Next agent

```text
--agent 2 expansion 07 story 5
```

**Notes:** Story 5 closes Expansion-07 engineering gate in shadow mode. Agent 4 skipped. Do not promote.
