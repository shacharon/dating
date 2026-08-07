# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-08-education-integrity-lifestyle  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Added four **net-new** Expansion-08 shadow keys to `SHADOW_SIGNAL_KEYS`.
- Created metadata-only `expansion-08-signal-definitions.ts` (weights / tiers / domains / chip labels).
- Bumped `MAX_EVIDENCE_ITEMS` **39 → 43**.
- **No** LLM prompt block, **no** `DOMAIN_ALLOWED` expansion, **no** scoring promote.
- Official scored set remains **15**.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Appended 4 keys + Exp-08 distinction/ethical JSDoc; `MAX_EVIDENCE_ITEMS` **39 → 43** |
| `dating-api/src/extraction/expansion-08-signal-definitions.ts` | **Created** — metadata only (no LLM block) |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Shadow **24**, total **39**, evidence **43**, Exp-08 no-scoring + meta asserts |
| `dating-api/src/extraction/extraction.service.spec.ts` | Coverage floor comment/assert for **39** keys (5/39 ≈ 12%) |

---

## Counts After Story 1

| Metric | Value |
|--------|-------|
| Official scored (`COMPATIBILITY_SIGNAL_KEYS`) | **15** (unchanged) |
| Shadow (`SHADOW_SIGNAL_KEYS`) | **24** (was 20) |
| Total extraction (`EXTRACTION_SIGNAL_KEYS`) | **39** |
| `MAX_EVIDENCE_ITEMS` | **43** (= 15 + 24 + 4) |
| Self `DOMAIN_ALLOWED` | still **27** (Story 2 expands) |
| Partner `DOMAIN_ALLOWED` | still **13** (Story 2) |

---

## New Shadow Keys (order)

1. `educationLevel`
2. `honestyIntegrity`
3. `chronotype`
4. `physicalTypePreference`

---

## Distinction From Existing Signals (locked)

| New key | Must not collapse into |
|---------|------------------------|
| `educationLevel` | `intellectualCuriosity` / `ambition` |
| `honestyIntegrity` | `directness` |
| `chronotype` | `lifestylePace` |
| `physicalTypePreference` | `physicalPriority` / `healthBodyConsciousness` |

Ethical: no race/ethnicity or sexual-anatomy keys added.

---

## Tests / verification

- [x] Unit: `npx jest src/extraction/extracted-signals.spec.ts --runInBand` → **40/40** passed
- [x] Typecheck: `npm run typecheck` → exit 0
- [x] Coverage floor: `npx jest src/extraction/extraction.service.spec.ts --runInBand -t "coverage between short"` (assert ≥12)
- [x] `prisma migrate deploy`: N/A
- [x] Browser Network smoke: N/A
- [x] Socket transport: N/A

---

## Explicit Non-Goals (this story)

- No `EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK` / prompt wiring
- No `DOMAIN_ALLOWED` / strict-validation allowlist sync
- No tension rules, explainability, i18n, fixtures
- No `SignalKey` / `COMPATIBILITY_WEIGHTS` promote
- No physical-type category metadata storage

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped

---

## Open questions / blockers

- None

---

## Next agent

```text
--agent 2 expansion 08 story 1
```

**Notes:** CR checklist in architect handoff § Agent 2. Story 2 owns LLM prompts + `DOMAIN_ALLOWED`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add Expansion-08 education/integrity/lifestyle signals as shadow keys

Story 1 — allowlist + promotion metadata; no scoring impact.
```
