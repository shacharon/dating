# Handoff: Agent 0 — Architect — Extra Story 3

**Agent:** 0 architect  
**Story:** Expansion-07 Extra Story 3 — Tension Rules (Provider / Recipient delta)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Track:** Extra — Provider / Recipient Support (`EXPANSION_AGENT_COMMANDS.md`)  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Extra Story 2 agent-3-pm.md](../EXTRA_STORY_02_llm_extraction_prompts/agent-3-pm.md), main [Story 3 agent-3-pm.md](../STORY_03_tension_rules/agent-3-pm.md)  
**Mode:** **Audit / no-op.** Extra Story 3 would add `support_both_provider` + `support_both_recipient` friction (and `EnrichedSignals` fields) on a 3-signal base. This repo already shipped them in **main Story 3**.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Extra Story 3 = tension delta for directional support pair clashes only.
- **As-built audit:** Both rules exist in `tension-rules.ts` (penalty **4** each), Extra keys on `EnrichedSignals`, English chips in `TENSION_CHIP_BY_ID`, unit coverage in `compute-friction.spec.ts`, and `compare()` E2E in main Story 5.
- Extra Story 3 **requires no code changes**. Agent 1 = **verify-only**.
- Do **not** re-add rules, change thresholds, or invent positive chips here (chips = Extra/main Story 4).
- Shadow / **no promote** remains locked (friction display ≠ scored compatibility).
- Agent 4 **skipped**.

---

## Extra Story 3 intent

| Deliverable (if 3-signal base) | This repo |
|--------------------------------|-----------|
| `EnrichedSignals` + provider/recipient fields | ✅ |
| `support_both_provider` (both exch ≥7, both prov ≥7) | ✅ penalty **4** |
| `support_both_recipient` (both exch ≥7, both rec ≥7) | ✅ penalty **4** |
| Null / mid-exchange guards | ✅ unit tested |
| `TENSION_CHIP_BY_ID` labels | ✅ `Both want to provide` / `Both seek support` |
| Friction unit tests | ✅ Expansion-07 describe |
| Positive pair chips | Main/Extra Story 4 — out of Extra 3 |

Depends on base key: `supportExchangeOrientation` (openness gate) — already present.

---

## Baseline audit (do not reverse / do not re-edit)

| Fact | Detail |
|------|--------|
| Rule IDs | `support_both_provider`, `support_both_recipient` |
| Penalties | **4** / **4** |
| Exchange gate | `aEx < 7 \|\| bEx < 7` → no fire |
| Direction threshold | provider/recipient ≥ **7** both sides |
| Chip labels | Exact English strings in `match-explainability.ts` |
| Related (not Extra-only) | `support_exchange_mismatch` already in main Exp-07 (exchange openness clash) |
| Scored set | Still **15** — Extra keys ∉ `COMPATIBILITY_SIGNAL_KEYS` |

### Evidence pointers

| Check | Location |
|-------|----------|
| Rules | `dating-api/src/engine/tension-rules.ts` |
| `EnrichedSignals` fields | same file |
| Chip map | `match-explainability.ts` → `TENSION_CHIP_BY_ID` |
| Units | `compute-friction.spec.ts` Expansion-07 / support_both_* |
| E2E | `match-engine.spec.ts` Expansion-07 (both providers / both recipients) |

---

## README / commands reconciliation (locked)

| Source | Lock |
|--------|------|
| Extra 3 = add both-provider / both-recipient tensions | **Already present** — do not duplicate |
| Change penalties / thresholds | **Forbidden** without product decision |
| Wire into scored compatibility | **Forbidden** |
| Positive Financial support alignment chip | Extra/main Story 4 — not Extra 3 |
| Re-write main Story 3 rules | **Forbidden** unless real gap (none found) |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `tension-rules.ts` / friction / explainability | **None** |
| `handoffs/EXTRA_STORY_03_tension_rules/agent-1-dev.md` | **Create** — verification report |

### Explicitly out of scope

| Path | Why |
|------|-----|
| Duplicate tension rules | Would double-fire / break ids |
| Chips / i18n / interest overlap | Extra 4 |
| Extraction prompts | Extra 2 (done) |
| Promote / weights | Forbidden |
| Keyword heuristics | Forbidden |

---

## Decisions (do not reverse)

### 1. Extra Story 3 = verify-only (locked)

Agent 1 must run and document:

```bash
cd dating-api
npx jest src/engine/compute-friction.spec.ts --runInBand -t "support_both"
npx jest src/matches/match-engine.spec.ts --runInBand -t "both providers|both recipients"
```

Confirm in handoff:

- Both rule ids present in `tension-rules.ts`
- Penalties are 4 / 4; exchange ≥7 gate intact
- `TENSION_CHIP_BY_ID` maps to exact labels
- Unit + E2E spot tests green
- No new tension rule files

### 2. No friction surgery (locked)

Do **not**:
- Lower exchange gate or direction thresholds
- Add standalone provider-vs-recipient mismatch rule (pair chips cover alignment; both-high covers clash)
- Move Extra keys into scored compatibility

### 3. Shadow / display friction preserved (locked)

Main Story 3 intentionally lets shadow keys drive friction/tension chips without scoring promote — do not reverse that architecture in Extra 3.

### 4. Agent 4

**Skip.**

---

## Definition of Done (Extra Story 3)

| Item | Gate |
|------|------|
| Audit confirms both Extra tension rules | Pass |
| Chip labels present | Pass |
| Friction + E2E spot tests green | Pass |
| No product code changes | Pass |
| `agent-1-dev.md` verification handoff | Pass |
| Agent 2 CR approves no-op | Pass |
| Agent 3 documents Extra Story 3 Done (already shipped) | Pass |

---

## API contracts

No DTO changes.

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped. Main Story 5 already covers Extra tensions via `compare()`.

---

## Agent 1 instructions

1. **Do not** modify tension/friction code unless a rule is literally missing (escalate if so).
2. Run friction + match-engine spot filters; document results.
3. Write `agent-1-dev.md` under `EXTRA_STORY_03_tension_rules/` — verification only.
4. Do not commit unless user asks.

---

## Agent 2 CR checklist

- [ ] No duplicate Extra tension rules
- [ ] `support_both_provider` + `support_both_recipient` present with penalty 4
- [ ] Chip labels exact; exchange gate intact
- [ ] Agent 1 verify-only
- [ ] No promote / weight wiring
- [ ] Friction + E2E spot tests pass

---

## Open questions / blockers

- None. Extra Story 3 closed by audit.
- Extra 4–5 remain optional verify-only.

---

## Next agent

```text
--agent 1 expansion 07 extra story 3
```

**Notes:** Verify-only. Do not invent additional support-direction tension rules beyond the main Story 3 pair.
