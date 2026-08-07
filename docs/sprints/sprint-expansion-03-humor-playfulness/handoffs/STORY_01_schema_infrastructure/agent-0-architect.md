# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-03-humor-playfulness  
**Date:** 2026-08-07  
**Status:** complete  

**Depends on:** Expansion-01 + Expansion-02 complete in shadow mode — see `sprint-expansion-02-regulation-affection/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for `humorPlayfulness`. **No** scoring, tension, chips, or LLM prompt work in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Add one new key to **`SHADOW_SIGNAL_KEYS`** so extraction can store it without touching `finalScore`, friction, valuesAlignment, or chips.
- Follow **Expansion-01/02 Story 1 lock** — **not** the naive README “add to `SignalKey` / `COMPATIBILITY_WEIGHTS` now”.
- **No Prisma migration:** `UserProfileSignal.signalKey` is free-form `String`; `evaluationJson` is `Json`.
- Document **promotion-ready** weight / tier / domain / chip label for Stories 3–4 — do **not** wire them in Story 1.
- **`EnrichedSignals` / tension-rules:** Story 3 only (Expansion-01/02 precedent).
- Agent 4 **skipped** (no eligibility / ranking change).
- **Milestone context:** After this sprint completes, Phase 1 EQ will have 5 shadow signals (`empathyCompassion`, `vulnerabilityOpenness`, `emotionalRegulation`, `physicalAffectionStyle`, `humorPlayfulness`). Story 5 runs the Phase 1 gate — not Story 1.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | 15 in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-02) | 11 — includes Expansion-01 + Expansion-02 keys |
| Expansion-01/02 status | Complete in shadow mode; promote deferred until Phase 1 gate |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |
| Story 1 scope | Allowlist + `MAX_EVIDENCE_ITEMS` + specs only |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add to `SignalKey` + `COMPATIBILITY_SIGNAL_KEYS` | **Wrong for Story 1** — `SHADOW_SIGNAL_KEYS` only |
| Update `COMPATIBILITY_WEIGHTS` | **Deferred** — promotion story |
| Files: `compatibility-score.ts`, `match-explainability.ts` | **Out of scope** Story 1 — only `extracted-signals.interface.ts` |
| “Update all signal registries” | **Only** extraction allowlist + evidence cap in Story 1 |

Sprint README **DoD** (shadow until Phase 1 gate) aligns with shadow-first Story 1.

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append `humorPlayfulness` to `SHADOW_SIGNAL_KEYS`; bump `MAX_EVIDENCE_ITEMS` **30 → 31**; update comment |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert new key; shadow **11 → 12**; total **26 → 27**; `MAX_EVIDENCE_ITEMS === 31`; add Expansion-03 shadow-mode regression block |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` | Story 4 (shadow overlay if still shadow at chip time) |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts`, prompts | Story 2 |
| `matches/expansion-01-explainability.ts`, `expansion-02-explainability.ts` | Prior sprints only |
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

### 2. Key name & scale (locked)

| Key | Scale (Story 2) | Meaning (for Story 2 prompts) |
|-----|-----------------|-------------------------------|
| `humorPlayfulness` | **1–10** or null | Importance of playfulness, banter, fun, lightness, shared laughter in a relationship — not merely “I am funny” |

**Override:** README scale “0–10” → use **1–10** (matches extraction stack; Expansion-01/02 Story 2 lock). CamelCase exact spelling.

### 3. Distinct from existing keys (locked — Story 2 must echo in PROTECTED lines)

| Existing | Distinct angle |
|----------|----------------|
| `conflictStyle` (official) | Disagreement handling / repair style |
| `socialBattery` (official) | Social energy / introversion–extroversion |
| `noveltyVsRoutine` (shadow) | Preference for novelty vs familiar routines |
| `emotionalDepth` (official) | Values depth / introspection over levity |
| `empathyCompassion` (Expansion-01 shadow) | Care / attunement to partner feelings |
| `emotionalRegulation` (Expansion-02 shadow) | Managing emotions under stress |

`humorPlayfulness` = **day-to-day levity, banter, silliness, shared laughter as a relationship need** — distinct from social energy, conflict style, or emotional depth.

### 4. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 30 = 15 official + 11 shadow + 4 buffer
After:  31 = 15 official + 12 shadow + 4 buffer
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
  /** Expansion-03 — Humor & Playfulness (shadow until Phase 1 promote). */
  'humorPlayfulness',
] as const;

/** Max evidence items: 15 official + 12 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 31;
```

### 6. Promotion-ready constants (document only — do not implement)

| Key | Tier | Weight | Domain | Positive chip |
|-----|------|--------|--------|---------------|
| `humorPlayfulness` | Tier 2 (personality) | **1.2** | `connection` | `Shared playfulness` |

- **Not** Tier 1 (valuesAlignment).
- **Not** `HARD_MISMATCH_KEYS` initially.
- New domain `connection` for chip diversity (distinct from `emotional`, `intimacy`, `lifestyle`).

**Story 4 note:** While shadow, positive chips require **overlay module** (`expansion-03-explainability.ts`, merged in `assemble-result.ts` like Expansion-01/02) — do **not** add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` in Story 1.

**Story 3 note (preview):** Tension rule `humor_mismatch` — `(≥8 vs ≤3)` either direction, penalty **3**, chip `Playfulness mismatch`. Requires `EnrichedSignals` extension in Story 3, not Story 1.

### 7. DB / migration (locked)

| Item | Decision |
|------|----------|
| Prisma migration | **None** |
| Backfill | **Out of scope** — key appears on re-analyze only |
| Expansion-01/02 keys | **Unchanged** — do not promote prior sprints in this story |

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
| `SHADOW_SIGNAL_KEYS.length` | 11 → **12** |
| `EXTRACTION_SIGNAL_KEYS.length` | 26 → **27** |
| `MAX_EVIDENCE_ITEMS` | 30 → **31** |
| Membership | `toContain('humorPlayfulness')` |

Add `describe('Expansion-03 shadow mode (no scoring wire-up)')` mirroring Expansion-02 block:

- Key **not** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS`
- Key **not** in `COMPATIBILITY_SIGNAL_KEYS`

Optional: assert Expansion-01/02 keys still shadow (no regression).

Update `SHADOW_SIGNAL_KEYS_SET` tests to include `humorPlayfulness`.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Edit `SHADOW_SIGNAL_KEYS` + `MAX_EVIDENCE_ITEMS` per §5.
2. Update `extracted-signals.spec.ts` counts + Expansion-03 regression block.
3. Do **not** modify compatibility, explainability, tension, prompts, Prisma, or UI.
4. Run tests above; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add humorPlayfulness as shadow signal

Expansion-03 Story 1 — allowlist only; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] Only `extracted-signals.interface.ts` + `extracted-signals.spec.ts` (+ handoff) changed
- [ ] Key spelled `humorPlayfulness`
- [ ] Still in `SHADOW_SIGNAL_KEYS`, **not** in official/scored arrays
- [ ] `MAX_EVIDENCE_ITEMS === 31`
- [ ] Specs: 12 shadow / 27 total
- [ ] Expansion-01/02 keys unchanged; no scoring/chip/tension drift

---

## Open questions / blockers

- None blocking Story 1.
- **Phase 1 promote:** All 5 EQ signals may promote together after Story 5 gate — out of scope until explicit promote story.
- **Correlation risk:** `humorPlayfulness` may correlate with `noveltyVsRoutine` or `socialBattery` — Story 5 correlation matrix will flag if r>0.85.

---

## Next agent

```text
--agent 1 expansion 03 story 1
```

**Notes:** Same shadow playbook as Expansion-01/02 Story 1. Story 2 adds LLM prompts via `expansion-03-signal-definitions.ts` → `SELF_EXTRACTOR_PROMPT` in `extraction.service.ts` (not `evaluate-llm-prompts.ts`).
