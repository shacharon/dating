# Handoff: Agent 0 — Architect — Extra Story 4

**Agent:** 0 architect  
**Story:** Expansion-07 Extra Story 4 — Chips & i18n (Provider / Recipient pair delta)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Track:** Extra — Provider / Recipient Support (`EXPANSION_AGENT_COMMANDS.md`)  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Extra Story 3 agent-3-pm.md](../EXTRA_STORY_03_tension_rules/agent-3-pm.md), main [Story 4 agent-3-pm.md](../STORY_04_chips_i18n/agent-3-pm.md)  
**Mode:** **Audit / no-op.** Extra Story 4 would add pair-level positive chips driven by provider↔recipient (no standalone provider/recipient chips) + EN/HE/ES evidence. This repo already shipped them in **main Story 4**.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Extra Story 4 = display delta for directional support **pair** chips only.
- **As-built audit:** `supportFinancialAlignment` → `Financial support alignment`; `supportNonTransactional` → `Non-transactional match`; wired via synthetic breakdown in `expansion-07-explainability.ts`; EN/HE/ES + `CHIP_EVIDENCE_KEYS` (**29**); `CHIP_TO_TRAIT` entries present.
- **No** standalone chips for `supportProviderOrientation` / `supportRecipientOrientation` (intentional).
- Extra Story 4 **requires no code changes**. Agent 1 = **verify-only**.
- Interest-overlap chips are main Exp-07 Story 4 (not Extra-specific) — do not re-scope Extra 4 to own them.
- Shadow / **no promote** remains locked.
- Agent 4 **skipped**.

---

## Extra Story 4 intent

| Deliverable (if 3-signal base) | This repo |
|--------------------------------|-----------|
| Pair chip: Financial support alignment | ✅ provider↔recipient when both exchange-open |
| Pair chip: Non-transactional match | ✅ both exchange ≤3 |
| No standalone provider/recipient chips | ✅ |
| Overlay for chip picker only (not alignments) | ✅ |
| EN/HE/ES chipEvidence | ✅ |
| `CHIP_EVIDENCE_KEYS` includes both pair labels | ✅ length **29** |
| Unit / explainability tests | ✅ main Story 4 |

---

## Baseline audit (do not reverse / do not re-edit)

| Fact | Detail |
|------|--------|
| Virtual keys | `supportFinancialAlignment`, `supportNonTransactional` (explainability-only) |
| Product labels | `Financial support alignment`, `Non-transactional match` |
| Alignment predicate | Both exch ≥7 + (A prov≥7 & B rec≥7) OR reverse |
| Non-transactional | Both exch ≤3 |
| Standalone Extra keys | **Forbidden** as positive chips |
| Scored set | Still **15** |
| Alignments DTO | Must exclude Extra shadow / virtual chip keys |

### Evidence pointers

| Check | Location |
|-------|----------|
| Pair chip builder | `expansion-07-explainability.ts` → `buildPairChipEntries` |
| Traits | `match-explanation-traits.ts` |
| UI registry | `dating-ui/.../chip-evidence.ts` |
| i18n | `en.ts` / `he.ts` / `es.ts` chipEvidence |
| Specs | `expansion-07-explainability.spec.ts`, `chip-evidence.spec.ts` |
| E2E | `match-engine.spec.ts` Expansion-07 pair chip cases |

---

## README / commands reconciliation (locked)

| Source | Lock |
|--------|------|
| Extra 4 = pair chips + i18n for provider/recipient | **Already present** — do not duplicate |
| Standalone “Financial support (giving/receiving)” chips | **Forbidden** — directional inputs only |
| Wire into official `POSITIVE_CHIP_BY_SIGNAL` / `SignalKey` | **Forbidden** until promote |
| Interest overlap as Extra 4 deliverable | **Out of Extra scope** (main Story 4) |
| Admin match-quality polish | Deferred / operator — not Extra 4 |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| Explainability / UI / i18n code | **None** |
| `handoffs/EXTRA_STORY_04_chips_i18n/agent-1-dev.md` | **Create** — verification report |

### Explicitly out of scope

| Path | Why |
|------|-----|
| New Extra chip module | Duplicate of Exp-07 overlay |
| Provider/recipient standalone chips | Product lock |
| Tension rule edits | Extra 3 (done) |
| Promote / scoring | Forbidden |
| Full interest-overlap rework | Main Story 4 |

---

## Decisions (do not reverse)

### 1. Extra Story 4 = verify-only (locked)

Agent 1 must run and document:

```bash
cd dating-api
npx jest src/matches/expansion-07-explainability.spec.ts --runInBand
npx jest src/matches/match-engine.spec.ts --runInBand -t "Financial support alignment|Non-transactional"

cd dating-ui
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
```

Confirm in handoff:

- Both pair labels in `SHADOW_POSITIVE_CHIP_BY_SIGNAL` / chip-evidence / EN+HE+ES
- No standalone provider/recipient chip labels in `CHIP_EVIDENCE_KEYS`
- `CHIP_EVIDENCE_KEYS.length === 29`
- Pair builder uses Extra directional keys
- Specs green

### 2. No chip surgery (locked)

Do **not**:
- Add standalone provider/recipient positive chips
- Promote virtual keys into extraction allowlists
- Merge Extra chips into `alignments` DTO
- Invent a third pair chip without product decision

### 3. Shadow display preserved (locked)

Pair chips remain overlay-only for explainability chip picker.

### 4. Agent 4

**Skip.**

---

## Definition of Done (Extra Story 4)

| Item | Gate |
|------|------|
| Audit confirms both pair chips + i18n | Pass |
| No standalone Extra directional chips | Pass |
| Backend + UI spot tests green | Pass |
| No product code changes | Pass |
| `agent-1-dev.md` verification handoff | Pass |
| Agent 2 CR approves no-op | Pass |
| Agent 3 documents Extra Story 4 Done (already shipped) | Pass |

---

## API contracts

No DTO changes (`interestOverlapTags` already from main Story 4).

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped.

---

## Agent 1 instructions

1. **Do not** modify chip/i18n code unless a pair label is literally missing (escalate if so).
2. Run explainability + match-engine + chip-evidence filters; document results.
3. Write `agent-1-dev.md` under `EXTRA_STORY_04_chips_i18n/` — verification only.
4. Do not commit unless user asks.

---

## Agent 2 CR checklist

- [ ] No duplicate Extra chip module
- [ ] Both pair chips present; no provider/recipient standalone
- [ ] EN/HE/ES + `CHIP_EVIDENCE_KEYS` **29**
- [ ] Agent 1 verify-only
- [ ] No promote / alignments pollution
- [ ] Specs pass

---

## Open questions / blockers

- None. Extra Story 4 closed by audit.
- Extra 5 remains optional verify-only.

---

## Next agent

```text
--agent 1 expansion 07 extra story 4
```

**Notes:** Verify-only. Keep pair chips only — Extra directional keys are inputs, not standalone display chips.
