# Handoff: Agent 3 — PM — Story 1

**Agent:** 3 pm  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 1 closed as Done (engineering gate).**
- Renamed shadow **`noveltyVsRoutine` → `adventureNovelty`** + `KEY_ALIASES`; self domain allowlist updated.
- Counts **unchanged:** 15 shadow / 30 total / `MAX_EVIDENCE_ITEMS` 34 / self allowlist 22.
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-06 progress: 1/5 stories done.** Final expansion signal (closes the 10-signal set in shadow).

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Product key in type system | Done | `adventureNovelty` in `SHADOW_SIGNAL_KEYS` |
| Legacy twin consolidated | Done | `noveltyVsRoutine` removed from allowlist; aliased → `adventureNovelty` |
| Distinction comments | Done | JSDoc vs pace / domestic / travel tags |
| Weights / tiers / domains | Deferred | Promotion-ready: **1.2** / Tier 3 / `lifestyle` / chip `Adventure & novelty` |
| `EnrichedSignals` extension | Deferred | Story 3 |
| DB migration | N/A | No Prisma change |
| Unit tests pass | Done | 31/31 `extracted-signals.spec.ts`; 87/87 with `extraction.service.spec.ts` (CR) |
| Typecheck | Done | pass (agent 1) |
| No scoring regression | Done | Key absent from `COMPATIBILITY_SIGNAL_KEYS`; Expansion-01–05 unchanged |
| CR approved | Done | agent-2-cr.md |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria (as-built vs README)

| README task | As-built | Notes |
|-------------|----------|-------|
| Add to `SignalKey` + weight 1.2 / Tier 3 / `lifestyle` | ⏭️ | **Architect override** — shadow rename + alias only |
| Final audit: 25 signals in all registries | ⏭️ | Product milestone when promoted; runtime still 15 scored + 15 shadow |
| Update signal count docs | ⏭️ | Not a Story 1 gate |
| Types compile, no regression | ✅ | Specs + typecheck green |

**Engineering AC for Story 1 (shadow infra rename): met** — with README scoring/audit tasks deferred per architect.

---

## Sprint Expansion-06 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Schema & Infrastructure | **Done** |
| 2 | LLM Extraction Prompts | Planned |
| 3 | Tension Rules | Planned |
| 4 | User-Facing Chips & i18n | Planned |
| 5 | Testing & Validation | Planned |

**Sprint status:** In progress (1/5).

**Milestone context:** Expansion-06 is the last of the 10 expansion signals (`adventureNovelty`). Promote to scored “25” only after Story 5 validation + explicit promote story.

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Rename to `adventureNovelty` |
| `dating-api/src/extraction/extraction-normalization.ts` | Alias `noveltyVsRoutine` → `adventureNovelty` |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Self allowlist swap |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Expansion-06 regression + counts |
| `dating-api/src/extraction/extraction.service.spec.ts` | Post-pipeline expects + coverage floor |
| `README.md` (sprint-expansion-06) | Story 1 marked Done + as-built notes |
| `handoffs/STORY_01_schema_infrastructure/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow-first rename (not duplicate key) — do not add to `COMPATIBILITY_SIGNAL_KEYS` in Story 2.
- Keep `KEY_ALIASES.noveltyVsRoutine` permanently for old LLM/storage outputs.
- Promotion-ready constants documented in architect handoff; chips/tension deferred Stories 3–4.
- Story 3 preview: `novelty_routine_clash` (penalty **4**, ≥8 vs ≤3) → chip `Novelty vs routine`.

Suggested commit (Expansion-06 Story 1):

```
feat(extraction): rename noveltyVsRoutine to adventureNovelty shadow key

Expansion-06 Story 1 — allowlist rename + alias; no scoring impact.
```

---

## Tests / verification

- [x] `extracted-signals.spec.ts` — **31/31** (PM re-check)
- [x] `extraction.service.spec.ts` — **pass** (CR 87/87 combined)
- [x] Typecheck — **pass**
- [x] Agent 4 E2E — **skipped**
- [x] CR — **approved** (agent 2)

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| LLM prompts: `expansion-06-signal-definitions.ts` + migrate key name in `SELF_EXTRACTOR_PROMPT` | Story 2 | Next |
| Update Exp-03/04/05 distinction lines still naming `noveltyVsRoutine` | Story 2 | With prompt migrate |
| Tension `novelty_routine_clash` + `EnrichedSignals` | Story 3 | After Story 2 |
| Shadow overlay chips + i18n | Story 4 | After Story 3 |
| Live LLM validation + full expansion gate | Story 5 | After Story 4 |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 2 start.
- Story 2 default: **self-domain**; scale **1–10 or null**; PROTECT vs `lifestylePace`, `domesticComfort`, interest tags. Keep alias.

---

## Next story

```text
--agent 0 expansion 06 story 2
```

**Notes:** Mandatory read `LLM_FIRST_PRINCIPLE.md`. Architect will override README Story 2 paths to `expansion-06-signal-definitions.ts` + `extraction.service.ts` (not `evaluate-llm-prompts.ts`). Replace prompt key `noveltyVsRoutine` with `adventureNovelty`.
