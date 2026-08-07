# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-02-regulation-affection  
**Date:** 2026-08-07  
**Status:** complete  

**Depends on:** Expansion-01 complete (shadow pattern established) — see `sprint-expansion-01-empathy-vulnerability/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for `emotionalRegulation` + `physicalAffectionStyle`. **No** scoring, tension, chips, or LLM prompt work in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Add two new keys to **`SHADOW_SIGNAL_KEYS`** so extraction can store them without touching `finalScore`, friction, valuesAlignment, or chips.
- Follow **Expansion-01 Story 1 lock** — **not** the naive README “add to `SignalKey` / `COMPATIBILITY_WEIGHTS` now”.
- **No Prisma migration:** `UserProfileSignal.signalKey` is free-form `String`; `evaluationJson` is `Json`.
- Document **promotion-ready** weights / tier / domains / chip labels for Stories 3–4 — do **not** wire them in Story 1.
- **`EnrichedSignals` / tension-rules:** Story 3 only (Expansion-01 precedent).
- Agent 4 **skipped** (no eligibility / ranking change).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | 15 in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-01) | 9 — includes `empathyCompassion`, `vulnerabilityOpenness` |
| Expansion-01 status | Complete in shadow mode; promote deferred |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |
| Story 1 scope | Allowlist + `MAX_EVIDENCE_ITEMS` + specs only |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `SignalKey` + `COMPATIBILITY_SIGNAL_KEYS` | **Wrong for Story 1** — `SHADOW_SIGNAL_KEYS` only |
| Update `COMPATIBILITY_WEIGHTS` | **Deferred** — promotion story |
| Extend `EnrichedSignals` in Story 1 | **Story 3** — tension rules (Expansion-01 pattern) |
| Files: `compatibility-score.ts`, `match-explainability.ts`, `tension-rules.ts` | **Out of scope** Story 1 — only `extracted-signals.interface.ts` |

Sprint README **DoD** explicitly says shadow mode until Phase 1 gate — aligns with shadow-first Story 1.

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append `emotionalRegulation`, `physicalAffectionStyle` to `SHADOW_SIGNAL_KEYS`; bump `MAX_EVIDENCE_ITEMS` **28 → 30**; update comment |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert new keys; shadow **9 → 11**; total **24 → 26**; `MAX_EVIDENCE_ITEMS === 30`; add Expansion-02 shadow-mode regression block |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` | Story 4 (or shadow overlay if still shadow at chip time) |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts`, prompts | Story 2 |
| `matches/expansion-01-explainability.ts` | Expansion-01 only |
| i18n, `CHIP_TO_TRAIT`, Prisma | Stories 4+ / N/A |

---

## Decisions (do not reverse without discussion)

### 1. Shadow-first (locked)

| Choice | Lock |
|--------|------|
| Allowlist location | `SHADOW_SIGNAL_KEYS` only |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still 15) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

### 2. Key names & scale (locked)

| Key | Scale (Story 2) | Meaning (for Story 2 prompts) |
|-----|-----------------|-------------------------------|
| `emotionalRegulation` | **1–10** or null | Managing emotions under stress; steady vs reactive/volatile |
| `physicalAffectionStyle` | **1–10** or null | Need for touch, cuddling, PDA, physical closeness |

**Override:** README scale “0–10” → use **1–10** (matches extraction stack; Expansion-01 Story 2 lock). CamelCase exact spelling.

### 3. Distinct from existing keys (locked — Story 2 must echo in PROTECTED lines)

| Existing | Distinct angle |
|----------|----------------|
| `emotionalDepth` (official) | Values depth/introspection |
| `empathyCompassion` (Expansion-01 shadow) | Care/attunement to partner feelings |
| `attachmentSecurity` (official) | Bonding / closeness style |
| `physicalPriority` (official) | Attraction / physical importance in partner |
| `emotionalAvailability` (shadow) | Behavioral presence |
| `emotionalSafety` (shadow) | Felt safety |

`physicalAffectionStyle` = **touch/PDA/closeness frequency**, not general attractiveness (`physicalPriority`).

### 4. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 28 = 15 official + 9 shadow + 4 buffer
After:  30 = 15 official + 11 shadow + 4 buffer
```

### 5. Interface edit (copy-paste ready)

```typescript
/** Shadow signals: extracted and stored but NOT wired into compatibility, friction, or finalScore. */
export const SHADOW_SIGNAL_KEYS = [
  'intellectualCuriosity',
  'noveltyVsRoutine',
  'structureChaosTolerance',
  /** Phase A expansion — not yet wired to chips, traits, or scoring. */
  'emotionalAvailability',
  'emotionalSafety',
  'commitmentIntentDepth',
  'practicalLifeReadiness',
  /** Expansion-01 — Empathy & Vulnerability (shadow until Phase 1 promote). */
  'empathyCompassion',
  'vulnerabilityOpenness',
  /** Expansion-02 — Emotional Regulation & Physical Affection (shadow until Phase 1 promote). */
  'emotionalRegulation',
  'physicalAffectionStyle',
] as const;

/** Max evidence items: 15 official + 11 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 30;
```

### 6. Promotion-ready constants (document only — do not implement)

| Key | Tier | Weight | Domain | Positive chip |
|-----|------|--------|--------|---------------|
| `emotionalRegulation` | Tier 2 (personality) | **1.4** | `emotional` | `Emotional balance` |
| `physicalAffectionStyle` | Tier 2 (personality) | **1.3** | `intimacy` | `Affection rhythm match` |

- **Not** Tier 1 (valuesAlignment).
- **Not** `HARD_MISMATCH_KEYS` initially.
- New domain `intimacy` for affection chip diversity (distinct from `emotional`, `lifestyle`).

**Story 4 note:** While shadow, positive chips require **overlay module** (Expansion-01 pattern: `expansion-01-explainability.ts`) or promote — do **not** add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` in Story 1.

### 7. DB / migration (locked)

| Item | Decision |
|------|----------|
| Prisma migration | **None** |
| Backfill | **Out of scope** — keys appear on re-analyze only |
| Expansion-01 keys | **Unchanged** — do not promote Expansion-01 in this story |

### 8. Agent 4

**Skip.**

---

## Service / module placement

Single source of truth: `dating-api/src/extraction/extracted-signals.interface.ts`

`EXTRACTION_SIGNAL_KEYS` / `EXTRACTION_SIGNAL_KEYS_SET` auto-union — no other wiring in Story 1.

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npm run typecheck
```

Agent 1 must update:

| Assert | Before → After |
|--------|----------------|
| `SHADOW_SIGNAL_KEYS.length` | 9 → **11** |
| `EXTRACTION_SIGNAL_KEYS.length` | 24 → **26** |
| `MAX_EVIDENCE_ITEMS` | 28 → **30** |
| Membership | `toContain('emotionalRegulation')`, `toContain('physicalAffectionStyle')` |

Add `describe('Expansion-02 shadow mode (no scoring wire-up)')` mirroring Expansion-01 block:

- Keys **not** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS`
- Keys **not** in `COMPATIBILITY_SIGNAL_KEYS`

Optional: assert Expansion-01 keys still shadow (no regression).

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Edit `SHADOW_SIGNAL_KEYS` + `MAX_EVIDENCE_ITEMS` per §5.
2. Update `extracted-signals.spec.ts` counts + Expansion-02 regression block.
3. Do **not** modify compatibility, explainability, tension, prompts, Prisma, or UI.
4. Run tests above; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add emotionalRegulation and physicalAffectionStyle as shadow signals

Expansion-02 Story 1 — allowlist only; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] Only `extracted-signals.interface.ts` + `extracted-signals.spec.ts` (+ handoff) changed
- [ ] Keys spelled `emotionalRegulation`, `physicalAffectionStyle`
- [ ] Still in `SHADOW_SIGNAL_KEYS`, **not** in official/scored arrays
- [ ] `MAX_EVIDENCE_ITEMS === 30`
- [ ] Specs: 11 shadow / 26 total
- [ ] Expansion-01 keys unchanged; no scoring/chip/tension drift

---

## Open questions / blockers

- None blocking Story 1.
- **Phase 1 promote:** Expansion-01 + Expansion-02 (and later sprints) may promote together — out of scope until explicit promote story.

---

## Next agent

```text
--agent 1 expansion 02 story 1
```

**Notes:** Same shadow playbook as Expansion-01 Story 1. Story 2 adds LLM prompts via `extraction.service.ts` (not `evaluate-llm-prompts.ts` — architect will override in Story 2 handoff).
