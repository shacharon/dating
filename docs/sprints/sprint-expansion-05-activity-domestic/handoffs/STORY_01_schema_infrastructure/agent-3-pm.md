# Handoff: Agent 3 — PM — Story 1

**Agent:** 3 pm  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 1 closed as Done (engineering gate).**
- Added **`physicalActivityLevel`** + **`domesticComfort`** to `SHADOW_SIGNAL_KEYS` (both net-new), with distinction comments.
- `MAX_EVIDENCE_ITEMS` 32 → **34** (15 shadow / 30 total).
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-05 progress: 1/5 stories done.** Phase 2 (Activity-Style) continues.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| New signal keys in type system | Done | Both keys in `SHADOW_SIGNAL_KEYS` |
| Distinction comments | Done | JSDoc vs wellness / looks / social energy / pace |
| Weights / tiers / domains | Deferred | Promotion-ready: activity **1.2** / Tier 3 / `lifestyle` / chip `Activity level match`; domestic **1.1** / Tier 3 / `lifestyle` / chip `Home/out balance` |
| `EnrichedSignals` extension | Deferred | Story 3 |
| DB migration | N/A | No Prisma change |
| Unit tests pass | Done | 26/26 `extracted-signals.spec.ts` |
| Typecheck | Done | pass (agent 1) |
| No scoring regression | Done | Both keys absent from `COMPATIBILITY_SIGNAL_KEYS`; Expansion-01–04 unchanged |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria (as-built vs README)

| README task | As-built | Notes |
|-------------|----------|-------|
| Add both keys to type system | ✅ | Both net-new on shadow allowlist |
| Add weights / Tier 3 / domain `lifestyle` | ⏭️ | **Architect override** — `SHADOW_SIGNAL_KEYS` only; constants documented |
| Files: `compatibility-score.ts`, `match-explainability.ts` | ⏭️ | Out of scope Story 1 |
| Document distinction in comments | ✅ | Present on `SHADOW_SIGNAL_KEYS` entries |
| Types compile, no regression | ✅ | 26/26 specs |

**Engineering AC for Story 1 (shadow infra): met** — with README scoring tasks deferred per architect.

---

## Sprint Expansion-05 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Schema & Infrastructure | **Done** |
| 2 | LLM Extraction Prompts | Planned |
| 3 | Tension Rules | Planned |
| 4 | User-Facing Chips & i18n | Planned |
| 5 | Testing & Validation | Planned |

**Sprint status:** In progress (1/5).

**Phase 2 context:** Activity-Style signals continue after Expansion-04. Interest tags (`gym`, `hiking`, `home_life`) remain orthogonal.

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | +`physicalActivityLevel`, +`domesticComfort`; `MAX_EVIDENCE_ITEMS` 34 |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Counts + Expansion-05 regression |
| `README.md` (sprint-expansion-05) | Story 1 marked Done |
| `handoffs/STORY_01_schema_infrastructure/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow-first matches Expansion-01–04 playbook — do not add to `COMPATIBILITY_SIGNAL_KEYS` in Story 2.
- Promotion-ready constants documented in architect handoff; chips/tension deferred Stories 3–4.
- Story 3 preview: `activity_level_gap` (penalty 3, ≥8 vs ≤3); `domestic_out_mismatch` (penalty 3, ≥8 vs ≤3).

Suggested commit (Expansion-05 Story 1):

```
feat(extraction): add physicalActivityLevel and domesticComfort as shadow signals

Expansion-05 Story 1 — allowlist only; no scoring impact.
```

---

## Tests / verification

- [x] `extracted-signals.spec.ts` — **26/26**
- [x] Typecheck — **pass**
- [x] Agent 4 E2E — **skipped**
- [x] CR — **approved** (agent 2)

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| LLM extraction prompts for both keys | Story 2 | Next |
| Tension rules + `EnrichedSignals` | Story 3 | After Story 2 |
| Shadow overlay chips + i18n | Story 4 | After Story 3 |
| Live LLM validation + distinction regression | Story 5 | After Story 4 |
| Stale “28 signals” comment in `extraction.service.spec.ts` | Story 2 (optional) | When prompts update |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 2 start.
- Story 2 default: **self-domain only**; must PROTECT against conflation with `healthBodyConsciousness`, `socialBattery`, `lifestylePace`, `physicalPriority`.

---

## Next story

```text
--agent 0 expansion 05 story 2
```

**Notes:** Mandatory read `LLM_FIRST_PRINCIPLE.md`. Architect will override README Story 2 paths (`evaluate-llm-prompts.ts` → `expansion-05-signal-definitions.ts` + `extraction.service.ts` pattern from Expansion-01–04). Scale **1–10 or null**, not 0–10.
