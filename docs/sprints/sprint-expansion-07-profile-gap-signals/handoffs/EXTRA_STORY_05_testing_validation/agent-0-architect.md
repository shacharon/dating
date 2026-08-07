# Handoff: Agent 0 — Architect — Extra Story 5

**Agent:** 0 architect  
**Story:** Expansion-07 Extra Story 5 — Testing & Validation (Provider / Recipient delta)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Track:** Extra — Provider / Recipient Support (`EXPANSION_AGENT_COMMANDS.md`)  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Extra Story 4 agent-3-pm.md](../EXTRA_STORY_04_chips_i18n/agent-3-pm.md), main [Story 5 agent-3-pm.md](../STORY_05_testing_validation/agent-3-pm.md)  
**Mode:** **Audit / no-op.** Extra Story 5 would add `compare()` E2E + fixtures for provider/recipient pair logic on a 3-signal base. This repo already shipped them in **main Story 5** (and Stories 2–4 units).

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Extra Story 5 = validation gate for the two directional support keys + pair behaviors.
- **As-built audit:** Expansion-07 `compare()` E2E covers both-providers / both-recipients / Financial support alignment; fixtures include EN provider/recipient high-low + Hebrew `gap_c` multi-signal; live script `validate:expansion-07-extraction` already hit ≥85% (**95%** main Story 5).
- Extra Story 5 **requires no code changes**. Agent 1 = **verify-only** (re-run Extra-focused filters; optional live script — document SKIP or %).
- **Do not promote** Extra keys to `COMPATIBILITY_SIGNAL_KEYS`.
- Closing Extra Story 5 closes the **entire Extra track** (1–5 Done via audit).
- Agent 4 **skipped**.

---

## Extra Story 5 intent

| Deliverable (if 3-signal base) | This repo |
|--------------------------------|-----------|
| `compare()` E2E both providers / both recipients | ✅ |
| `compare()` E2E Financial support alignment | ✅ |
| Extraction unit high/low provider & recipient | ✅ main Story 2 |
| Friction unit `support_both_*` | ✅ main Story 3 |
| Live fixtures EN provider/recipient bands | ✅ |
| Hebrew Profile C multi-signal (provider high / recipient low) | ✅ `gap_c_he_transactional` |
| Live LLM ≥85% (optional gate) | ✅ main Story 5 **95%** |
| Promote to scored | **Forbidden** — deferred |

---

## Baseline audit (do not reverse / do not re-add)

| Fact | Detail |
|------|--------|
| E2E helper | `makeProfileWithExpansion07Shadow` includes Extra keys |
| Pair E2E cases | both providers, both recipients, Financial support alignment, Non-transactional |
| Fixtures | `provider_*` / `recipient_*` + gap_c expectations |
| Script | `validate:expansion-07-extraction` (multi-signal + allowNull) |
| Scored set | Still **15** |
| Shadow / total | **20** / **35** |

### Evidence pointers

| Check | Location |
|-------|----------|
| E2E | `match-engine.spec.ts` → Expansion-07 describe |
| Fixtures | `data/expansion-07-extraction-fixtures.json` |
| Script | `scripts/validate-expansion-07-extraction.ts` |
| Main Story 5 CR/PM | `../STORY_05_testing_validation/` |

---

## README / commands reconciliation (locked)

| Source | Lock |
|--------|------|
| Extra 5 = provider/recipient validation | **Already present** — do not duplicate tests |
| New Extra-only fixture file | **Forbidden** — use Exp-07 fixtures |
| Re-run promote at Extra 5 close | **Forbidden** |
| Duplicate evaluate-layer extraction tests | **Forbidden** |
| Extra track complete after Extra 5 PM | **Yes** — all Extra stories Done (audit) |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| Tests / fixtures / scripts | **None** (unless a real Extra gap — unexpected) |
| `handoffs/EXTRA_STORY_05_testing_validation/agent-1-dev.md` | **Create** — verification report |

### Explicitly out of scope

| Path | Why |
|------|-----|
| New Extra E2E describe | Duplicate of Expansion-07 |
| Promote / weight wiring | Forbidden |
| Admin panel / golden-pairs / browse QA | Operator — already deferred in main Story 5 |
| Keyword / regex extraction | Forbidden |

---

## Decisions (do not reverse)

### 1. Extra Story 5 = verify-only (locked)

Agent 1 must run and document:

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "both providers|both recipients|Financial support alignment|Non-transactional"
npx jest src/engine/compute-friction.spec.ts --runInBand -t "support_both"
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "supportProvider|supportRecipient|Profile-C"
```

Optional:

```bash
npm run validate:expansion-07-extraction
```

Document SKIP (no API key) or agreement % (main Story 5 was **95%** — re-run optional).

Confirm fixtures include provider/recipient EN bands + `gap_c` Extra expectations.

### 2. No new test surface (locked)

Do **not**:
- Add `describe('Expansion-07 Extra...')` parallel suite
- Create `expansion-07-extra-extraction-fixtures.json`
- Change agreement threshold
- Promote scoring as part of Extra close

### 3. Extra track close (locked)

After Extra Story 5 PM: Extra 1–5 all Done (already shipped). Main Exp-07 remains Complete (5/5). Next product focus = promote sprint (separate), not more Extra work.

### 4. Agent 4

**Skip.**

---

## Definition of Done (Extra Story 5)

| Item | Gate |
|------|------|
| Audit confirms Extra E2E + fixtures + units | Pass |
| Spot filters green | Pass |
| Optional live script documented | Pass (SKIP or %) |
| No product / test code changes | Pass |
| `agent-1-dev.md` verification handoff | Pass |
| Agent 2 CR approves no-op | Pass |
| Agent 3 closes Extra Story 5 + Extra track | Pass |

---

## API contracts

No DTO changes.

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped. Main Story 5 already closed engineering validation.

---

## Agent 1 instructions

1. **Do not** add/modify tests unless Extra coverage is literally missing (escalate if so).
2. Run Extra-focused filters; optionally live validator; document.
3. Write `agent-1-dev.md` under `EXTRA_STORY_05_testing_validation/` — verification only.
4. Do not commit unless user asks.

---

## Agent 2 CR checklist

- [ ] No duplicate Extra test suites / fixture files
- [ ] Extra E2E + friction + extraction spot coverage present
- [ ] Fixtures include provider/recipient + gap_c
- [ ] Agent 1 verify-only
- [ ] No promote
- [ ] Spot tests pass

---

## Open questions / blockers

- None. Extra Story 5 closed by audit.
- Extra track ends at Extra 5 PM.

---

## Next agent

```text
--agent 1 expansion 07 extra story 5
```

**Notes:** Verify-only. Closing Extra 5 completes the Extra track documentation loop — product completeness already achieved by main Exp-07 Stories 1–5.
