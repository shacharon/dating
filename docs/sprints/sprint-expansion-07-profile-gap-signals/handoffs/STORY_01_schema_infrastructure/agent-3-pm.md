# Handoff: Agent 3 — PM — Story 1

**Agent:** 3 pm  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 1 closed as Done (engineering gate).**
- Five **net-new** Profile Gap shadow keys + promotion-ready metadata module (no LLM prompts, no scoring).
- Counts: shadow **20** / total **35** / `MAX_EVIDENCE_ITEMS` **39**; official scored remains **15**; self `DOMAIN_ALLOWED` still **22**.
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-07 progress: 1/5 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Five keys in type system | Done | All five in `SHADOW_SIGNAL_KEYS` |
| Distinction comments | Done | JSDoc vs `physicalPriority` / `relationshipClarity` / `financialMindset` / `spirituality` / `traditionalism` |
| Metadata module | Done | `expansion-07-signal-definitions.ts` — weights/domains/chip labels; **no** prompt block |
| Weights / tiers / domains wired to scoring | Deferred | Document-only until promote |
| `EnrichedSignals` / tension | Deferred | Story 3 |
| LLM prompts / `DOMAIN_ALLOWED` | Deferred | Story 2 |
| Interest-overlap chips | Deferred | Story 4 |
| DB migration | N/A | No Prisma change |
| Unit tests pass | Done | **35/35** `extracted-signals.spec.ts` (PM re-check); CR **96/96** with `extraction.service.spec.ts` |
| Typecheck | Done | pass (CR) |
| No scoring regression | Done | Keys absent from `COMPATIBILITY_SIGNAL_KEYS`; Expansion-01–06 intact |
| CR approved | Done | agent-2-cr.md **approved** |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria (as-built vs README)

| README task | As-built | Notes |
|-------------|----------|-------|
| Five keys on shadow allowlist | ✅ | Exact spellings locked |
| Weights/tiers/domains in Exp-07 module | ✅ | Metadata only — not `COMPATIBILITY_WEIGHTS` / `SignalKey` |
| Update signal count docs (30 after promote) | ⏭️ | Not a Story 1 gate; runtime **15 scored + 20 shadow** |
| Promote to scoring registries | ⏭️ | Story 5 optional gate — keep shadow until explicit promote |
| Unit tests | ✅ | Shadow-mode + meta asserts |

**Engineering AC for Story 1 (shadow infra): met** — with README scoring/doc tasks deferred per architect.

---

## Sprint Expansion-07 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Schema & Infrastructure | **Done** |
| 2 | LLM Extraction Prompts | Planned |
| 3 | Tension Rules | Planned |
| 4 | User-Facing Chips & i18n (+ interest overlap) | Planned |
| 5 | Testing & Validation | Planned |

**Sprint status:** In progress (1/5).

**Milestone context:** Expansion-07 adds profile-gap coverage beyond the Exp-01–06 set. Scored count stays **15** until an explicit promote decision (README “30” is a promote-era product target, not Story 1).

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | 5 shadow keys + `MAX_EVIDENCE_ITEMS` 39 |
| `dating-api/src/extraction/expansion-07-signal-definitions.ts` | Metadata only |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Counts + Exp-07 no-scoring + meta |
| `dating-api/src/extraction/extraction.service.spec.ts` | Coverage floor for 35 keys |
| `README.md` (sprint-expansion-07) | Story 1 marked Done + as-built notes |
| `handoffs/STORY_01_schema_infrastructure/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow-first — do **not** add Exp-07 keys to `COMPATIBILITY_SIGNAL_KEYS` / `COMPATIBILITY_WEIGHTS` until explicit promote.
- Scale **1–10 or null** (not README “0–10” elsewhere) for Story 2 prompts.
- Provider/recipient: no standalone positive chips — pair-level in Stories 3–4.
- No aliases for Exp-07 keys (unlike Exp-06 rename).
- Agent 4 skipped.

Suggested commit (Expansion-07 Story 1):

```
feat(extraction): add Expansion-07 profile-gap signals as shadow keys

Story 1 — allowlist + promotion metadata; no scoring impact.
```

---

## Tests / verification

- [x] `extracted-signals.spec.ts` — **35/35** (PM re-check)
- [x] Combined extraction specs — **96/96** (CR)
- [x] Typecheck — **pass** (CR)
- [x] Agent 4 E2E — **skipped**
- [x] CR — **approved** (agent 2)

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| `EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK` + wire `SELF_EXTRACTOR_PROMPT` | Story 2 | Next |
| Sync `DOMAIN_ALLOWED` (self ± partner per README) | Story 2 | With prompts |
| Tension rules + `EnrichedSignals` (5 rules previewed in architect) | Story 3 | After Story 2 |
| Shadow overlay chips + pair support chips + interest overlap + i18n | Story 4 | After Story 3 |
| Live LLM validation + optional promote gate | Story 5 | After Story 4 |
| Fix Agent 1 handoff distinction-table wording (wrong adjacent keys) | Docs hygiene | If touched in Story 2 |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 2 start.
- Story 2 default: Hebrew-aware semantic examples; PROTECT vs adjacent keys (`physicalPriority`, `relationshipClarity`, `financialMindset`, `spirituality`, `traditionalism`); no regex/keywords; keep shadow / no scoring.

---

## Next story

```text
--agent 0 expansion 07 story 2
```

**Notes:** Mandatory read `LLM_FIRST_PRINCIPLE.md`. Architect will own prompt block design in `expansion-07-signal-definitions.ts` + `extraction.service.ts` (not `evaluate-llm-prompts.ts`) and `DOMAIN_ALLOWED` expansion.
