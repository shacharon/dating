# Handoff: Agent 0 — Architect — Extra Story 1

**Agent:** 0 architect  
**Story:** Expansion-07 Extra Story 1 — Schema & Infrastructure (Provider / Recipient delta)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Track:** Extra — Provider / Recipient Support (`EXPANSION_AGENT_COMMANDS.md`)  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** Main Expansion-07 Stories 1–5 closed — see `../STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** **Audit / no-op.** Extra Story 1 is the schema delta for `supportProviderOrientation` + `supportRecipientOrientation` when base Sprint 07 shipped only **3** signals. This repo shipped **all 5** in the main track — Extra Story 1 work is **already done**.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Commands doc: Extra track is **only** for a 3-signal base → add 2 directional support keys + pair logic.
- **As-built audit:** Both Extra keys already exist on `SHADOW_SIGNAL_KEYS`, in `expansion-07-signal-definitions.ts` metadata, extraction prompts, friction, chips, and Story 5 E2E/fixtures.
- Extra Story 1 (schema) **requires no code changes**. Agent 1 = **verify-only**.
- Extra Stories 2–5 are likewise **already satisfied** by main Stories 2–5 for these two keys — do not re-implement; optional verification per extra story if the user continues the Extra pipeline.
- Shadow / **no promote** remains locked.
- Agent 4 **skipped**.

---

## Extra track intent (from commands)

| Extra signal | Role |
|--------------|------|
| `supportProviderOrientation` | Want to **give** ongoing financial support |
| `supportRecipientOrientation` | Want to **receive** ongoing financial support |

Depends on base key already present: `supportExchangeOrientation` (openness to arrangement at all).

**When Extra applies:** Base Exp-07 had only `casualIntimacyIntent`, `supportExchangeOrientation`, `religiousObservance`.  
**When Extra does not apply (this repo):** Full 5-key Exp-07 already complete.

---

## Baseline audit (do not reverse / do not re-add)

| Fact | Detail |
|------|--------|
| Scored keys | Still **15** — Extra keys ∉ `COMPATIBILITY_SIGNAL_KEYS` |
| Shadow keys | **20** (includes both Extra keys) |
| Total extraction | **35** |
| `MAX_EVIDENCE_ITEMS` | **39** |
| Self / partner `DOMAIN_ALLOWED` | **27** / **13** (includes both Extra keys) |
| Metadata | `EXPANSION_07_SHADOW_SIGNAL_KEYS` length **5**; weights provider/recipient **1.3** |
| Distinction JSDoc | Present on `SHADOW_SIGNAL_KEYS` (give ≠ receive ≠ exchange ≠ financialMindset) |
| Specs | `extracted-signals.spec.ts` asserts both keys + shadow-mode no-scoring |

### Evidence pointers

| Layer | Already delivered in |
|-------|----------------------|
| Schema allowlist + meta | Main Story 1 |
| LLM self + partner prompts | Main Story 2 |
| Tension `support_both_provider` / `support_both_recipient` | Main Story 3 |
| Pair chips (no standalone provider/recipient) | Main Story 4 |
| `compare()` E2E + Hebrew Profile C multi-signal | Main Story 5 |

---

## README / commands reconciliation (locked)

| Source | Lock |
|--------|------|
| Extra Story 1 = add 2 shadow keys + meta | **Already present** — agent 1 must **not** append duplicates |
| Extra would bump shadow 18→20 / total 33→35 | **N/A** — already at 20 / 35 |
| Promote Extra keys to scoring | **Forbidden** — same shadow lock as main Exp-07 |
| Re-run full Extra Stories 2–5 implementation | **Forbidden** unless audit finds a real gap |
| Continue Extra agent pipeline | Allowed as **verification / documentation close** only |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| Product / schema / extraction code | **None** (unless audit finds missing key — unexpected) |
| `handoffs/EXTRA_STORY_01_schema_infrastructure/agent-1-dev.md` | **Create** — verification report + test commands run |

### Explicitly out of scope

| Path | Why |
|------|-----|
| Re-append keys to `SHADOW_SIGNAL_KEYS` | Would duplicate / break length asserts |
| New `expansion-07-extra-*.ts` module | Unnecessary — keys live in Exp-07 definitions |
| `COMPATIBILITY_SIGNAL_KEYS` / weights | Promote forbidden |
| Tension / chips / LLM prompt edits | Extra Stories 2–4; already done in main |
| Keyword / regex extraction | Forbidden |

---

## Decisions (do not reverse)

### 1. Extra Story 1 = verify-only (locked)

Agent 1 must run and document:

```bash
cd dating-api
npx jest src/extraction/extracted-signals.spec.ts --runInBand
# Spot-check Extra keys present:
# - SHADOW_SIGNAL_KEYS contains supportProviderOrientation + supportRecipientOrientation
# - SHADOW_SIGNAL_KEYS.length === 20
# - MAX_EVIDENCE_ITEMS === 39
# - COMPATIBILITY_SIGNAL_KEYS.length === 15
# - neither Extra key in COMPATIBILITY_SIGNAL_KEYS
```

Optional one-liner assert script is **not** required if jest + handoff notes suffice.

### 2. No new schema work (locked)

Do **not**:
- Create parallel Extra allowlist
- Change `MAX_EVIDENCE_ITEMS`
- Split metadata into a second definitions file
- Touch Prisma

### 3. Extra Stories 2–5 preview (locked)

If user continues Extra pipeline:

| Extra story | Expected architect stance |
|-------------|---------------------------|
| Extra 2 (LLM) | Already in Exp-07 self/partner blocks — verify-only |
| Extra 3 (tension) | `support_both_*` already present — verify-only |
| Extra 4 (chips) | Pair chips only; no standalone — verify-only |
| Extra 5 (tests) | E2E + fixtures already cover provider/recipient — verify-only |

Each Extra story agent 0 may repeat this audit pattern; do not invent net-new product work without a real gap.

### 4. Shadow mode preserved (locked)

- Extra keys remain shadow
- No scoring / friction promote beyond what main Story 3 already did for display friction
- Friction already reads Extra keys (main Story 3) — that is intentional shadow friction/display, not scored compatibility

### 5. Agent 4

**Skip.**

---

## Definition of Done (Extra Story 1)

| Item | Gate |
|------|------|
| Audit confirms both Extra keys on shadow allowlist | Pass |
| Metadata + specs already green | Pass |
| No duplicate schema edits | Pass |
| Scored set still 15 | Pass |
| `agent-1-dev.md` verification handoff | Pass |
| Agent 2 CR approves no-op | Pass |
| Agent 3 documents Extra Story 1 N/A / Done (already shipped) | Pass |

---

## API contracts

No DTO changes.

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped.

---

## Agent 1 instructions

1. **Do not** modify schema/extraction/product code unless a key is literally missing (it should not be).
2. Run `extracted-signals.spec.ts` (and optionally Expansion-07 extraction filter) — confirm green.
3. Write `agent-1-dev.md` under `EXTRA_STORY_01_schema_infrastructure/` documenting audit evidence + “no code changes”.
4. Do not commit unless user asks.

Suggested commit (only if user insists on a docs-only commit for Extra close):

```
docs(expansion-07): mark Extra Story 1 provider/recipient schema as already shipped

Main Exp-07 Stories 1–5 already included both directional support keys.
```

---

## Agent 2 CR checklist

- [ ] No duplicate keys appended to `SHADOW_SIGNAL_KEYS`
- [ ] Both Extra keys present; scored set still 15
- [ ] Agent 1 handoff is verification-only (or justified gap fix only)
- [ ] No promote / weight wiring
- [ ] Specs still pass

---

## Open questions / blockers

- None. Extra Story 1 is closed by audit.
- Continuing Extra Stories 2–5 is optional documentation/verification; not required for product completeness.

---

## Next agent

```text
--agent 1 expansion 07 extra story 1
```

**Notes:** Verify-only. If agent 1 finds a real missing key, stop and escalate to architect before inventing a parallel Extra module — that would contradict the completed main sprint.
