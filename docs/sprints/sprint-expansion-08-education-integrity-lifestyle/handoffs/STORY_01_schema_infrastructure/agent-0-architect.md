# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-08-education-integrity-lifestyle  
**Date:** 2026-08-07  
**Status:** complete  

**Depends on:** Expansion-07 complete in shadow mode — see `sprint-expansion-07-profile-gap-signals/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for **four** new keys + promotion-ready metadata module. **No** scoring, tension, chips, or LLM prompt blocks in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Expansion-08 closes **education / integrity / chronotype / physical-type** gaps from second-wave Hebrew samples after Expansion 01–07.
- **All four keys are net-new** — none exist in the codebase yet.
- Story 1: append all four to `SHADOW_SIGNAL_KEYS`, bump `MAX_EVIDENCE_ITEMS`, create **`expansion-08-signal-definitions.ts` metadata only** (weights/tiers/domains/chips — **not** LLM SELF block).
- Follow **Expansion-01–07 Story 1 lock** — **not** naive README promote into `SignalKey` / `COMPATIBILITY_WEIGHTS` / `match-explainability.ts` now.
- **No Prisma migration.**
- Document distinctions (comments + this handoff) — prompt wiring is Story 2.
- **Ethical out-of-scope** (race/ethnicity filters, sexual anatomy preferences) stays documented; Story 1 adds **no** keys for those.
- **`physicalTypePreference` category metadata:** score key only in Story 1; optional category hint is Story 2/3 (see §7).
- **`EnrichedSignals` / tension-rules:** Story 3 only.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | **15** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-07) | **20** |
| Total extraction keys | **35** |
| `MAX_EVIDENCE_ITEMS` | **39** (= 15 + 20 + 4) |
| Self `DOMAIN_ALLOWED` | **27** (Story 2 will expand for Exp-08) |
| Partner `DOMAIN_ALLOWED` | **13** (Story 2 will decide self±partner) |
| Four Exp-08 keys | **Do not exist** — Story 1 adds all |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |
| Story 1 scope | Allowlist + `MAX_EVIDENCE_ITEMS` + metadata module + specs + distinction comments |
| Prior expansion / Phase A | **Unchanged** — do not promote any keys in this story |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add keys + weights/tiers/domains in Story 1 | **Shadow allowlist + metadata module** — do **not** wire `COMPATIBILITY_WEIGHTS` / `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL` |
| Files: `compatibility-score.ts`, `match-explainability.ts` | **Out of scope** Story 1 (promote / Stories 3–5) |
| Update signal count docs (34 total after promote) | Product milestone when promoted ≈ **15 scored + 19 prior expansion shadow claimed + 4 Exp-08** is messy vs as-built; **as-built:** runtime **15 scored + 24 shadow = 39 extraction keys** after Story 1. README “34 compatibility signals” means after **future promote** of the expansion product set — do **not** promote in Story 1 |
| `expansion-08-signal-definitions.ts` | **Create** with **metadata constants only**; LLM `SELF_SHADOW_SIGNAL_BLOCK` is **Story 2** |
| Unit test: keys validate in strict extraction schema | Story 1 gate = **`extracted-signals.spec.ts` allowlist + meta asserts**. Sync `extraction-strict-validation.ts` / `DOMAIN_ALLOWED` is **Story 2** (with prompts) |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | **Optional** doc-only; **not** a Story 1 gate |
| Optional category hint for `physicalTypePreference` | **Not** in Story 1 allowlist — score key only; see §7 |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append 4 keys to `SHADOW_SIGNAL_KEYS` with distinction JSDoc; bump `MAX_EVIDENCE_ITEMS` **39 → 43** |
| `dating-api/src/extraction/expansion-08-signal-definitions.ts` | **Create** — promotion-ready meta (keys, weights, tiers, domains, chip labels). **No** LLM prompt block yet |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert 4 keys; shadow **20 → 24**; total **35 → 39**; `MAX_EVIDENCE_ITEMS === 43`; Expansion-08 shadow-mode regression block |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` | Stories 3–4 |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts` ALLOWED KEYS / prompts | Story 2 |
| `DOMAIN_ALLOWED_SIGNAL_KEYS` / `extraction-strict-validation.ts` allowlist sync | Story 2 (sync with prompts) |
| LLM `EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK` body | Story 2 (same file may gain the block) |
| Physical-type category metadata schema / storage | Story 2–3 (§7) |
| Race/ethnicity or sexual-anatomy signal keys | **Forbidden** — ethical out of scope |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | Doc-only; not a Story 1 gate |
| Prisma / backfill | N/A / later |
| Prior expansion promote | Separate future sprint |
| UI / i18n | Story 4 |

---

## Decisions (do not reverse without discussion)

### 1. Shadow-first (locked)

| Choice | Lock |
|--------|------|
| New allowlist keys | `educationLevel`, `honestyIntegrity`, `chronotype`, `physicalTypePreference` |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still 15) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

### 2. Key names & scale (locked)

| Key | Status | Scale (Story 2) | Meaning (for Story 2 prompts) |
|-----|--------|-----------------|-------------------------------|
| `educationLevel` | **New** | **1–10** or null | Importance of formal education / degree attainment for self and partner |
| `honestyIntegrity` | **New** | **1–10** or null | Importance of honesty, integrity, trustworthiness, “no games” as a relationship value |
| `chronotype` | **New** | **1–10** or null | Natural sleep/wake and energy rhythm — early bird ↔ night owl |
| `physicalTypePreference` | **New** | **1–10** or null | How specific/important particular body/build preferences are vs flexible about type |

CamelCase exact spelling — no aliases. Scale **1–10** (not README “0–10” elsewhere).

### 3. Distinct from existing keys (locked — Story 2 must echo)

| Existing / adjacent | Distinct angle for Expansion-08 |
|---------------------|----------------------------------|
| `intellectualCuriosity` | Love of learning/ideas — **not** formal degree/credential filter |
| `ambition` | Drive/goals/achievement — **not** schooling credential preference |
| `directness` | Communication bluntness — **not** honesty/integrity/trustworthiness |
| `lifestylePace` | Fast/slow life tempo — **not** morning vs night sleep/energy rhythm |
| `physicalPriority` | How much looks matter — **not** *which* body/build type is preferred |
| `healthBodyConsciousness` | Wellness/fitness values — **not** partner body-type preference specificity |
| Race / ethnicity text | **null** on all four — never invent scores or keys |
| Sexual anatomy-only text | **null** on all four — never invent scores or keys |
| Hair-color-only as exclusive filter | Prefer **null** or mid specificity without a hair-color scored signal (too granular) |

### 4. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 39 = 15 official + 20 shadow + 4 buffer
After:  43 = 15 official + 24 shadow + 4 buffer
```

### 5. Interface edit (copy-paste ready)

Append after `religiousObservance`:

```typescript
  /**
   * Expansion-08 — Education, Integrity, Chronotype & Physical Type (shadow until promote).
   * educationLevel: formal education/degree importance — NOT intellectualCuriosity / ambition alone.
   * honestyIntegrity: honesty/integrity/no-games value — NOT directness (bluntness) alone.
   * chronotype: morning↔night sleep/energy rhythm — NOT lifestylePace (tempo).
   * physicalTypePreference: specificity of body/build preference — NOT physicalPriority (looks importance).
   * Ethical: race/ethnicity and sexual-anatomy preferences are NEVER scored keys.
   */
  'educationLevel',
  'honestyIntegrity',
  'chronotype',
  'physicalTypePreference',
] as const;

/** Max evidence items: 15 official + 24 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 43;
```

### 6. Metadata module (locked — Story 1 creates; Story 2 extends)

Create `dating-api/src/extraction/expansion-08-signal-definitions.ts`:

```typescript
/**
 * Expansion-08 promotion-ready metadata (shadow until promote).
 * LLM semantic prompt block is added in Story 2 — do not put keyword heuristics here.
 */

export const EXPANSION_08_SHADOW_SIGNAL_KEYS = [
  'educationLevel',
  'honestyIntegrity',
  'chronotype',
  'physicalTypePreference',
] as const;

export type Expansion08ShadowSignalKey =
  (typeof EXPANSION_08_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_08_PROMOTION_WEIGHTS: Record<
  Expansion08ShadowSignalKey,
  number
> = {
  educationLevel: 1.3,
  honestyIntegrity: 1.4,
  chronotype: 1.1,
  physicalTypePreference: 1.2,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_08_PROMOTION_TIERS: Record<
  Expansion08ShadowSignalKey,
  1 | 2 | 3
> = {
  educationLevel: 1,
  honestyIntegrity: 1,
  chronotype: 3,
  physicalTypePreference: 3,
};

export const EXPANSION_08_PROMOTION_DOMAINS: Record<
  Expansion08ShadowSignalKey,
  string
> = {
  educationLevel: 'values',
  honestyIntegrity: 'values',
  chronotype: 'lifestyle',
  physicalTypePreference: 'lifestyle',
};

export const EXPANSION_08_PROMOTION_CHIP_LABELS: Record<
  Expansion08ShadowSignalKey,
  string
> = {
  educationLevel: 'Education alignment',
  honestyIntegrity: 'Honesty & integrity',
  chronotype: 'Sleep & energy rhythm',
  physicalTypePreference: 'Physical type fit',
};
```

Agent 1 may adjust typing style to match repo, but keys/weights/tiers/domains/labels must match README.

**Do not** import this into `compatibility-score.ts` in Story 1.

### 7. Physical-type category metadata (preview — not Story 1)

| Item | Decision |
|------|----------|
| Story 1 | Numeric `physicalTypePreference` shadow key **only** |
| Story 2 | LLM may extract optional category hint in prompt text; do **not** invent a second scored signal |
| Storage | Prefer deferring structured category storage until Story 3 needs it for `physical_type_specificity_clash`. If pipeline lacks a clean metadata channel, **score alone is enough for v1** (README) |
| Story 3 | Implement first three tension rules fully; ship `physical_type_specificity_clash` only when categories exist (or soft-skip) |

### 8. Promotion-ready summary (document — do not implement scoring)

| Key | Tier | Weight | Domain | Standalone positive chip |
|-----|------|--------|--------|--------------------------|
| `educationLevel` | Tier 1 | **1.3** | `values` | `Education alignment` |
| `honestyIntegrity` | Tier 1 | **1.4** | `values` | `Honesty & integrity` |
| `chronotype` | Tier 3 | **1.1** | `lifestyle` | `Sleep & energy rhythm` |
| `physicalTypePreference` | Tier 3 | **1.2** | `lifestyle` | `Physical type fit` |

**Story 3 note (preview):**

| Rule id | Penalty | Chip |
|---------|---------|------|
| `education_level_gap` | **4** | `Education expectations` |
| `honesty_integrity_gap` | **5** | `Honesty values gap` |
| `chronotype_clash` | **3** | `Morning vs night` |
| `physical_type_specificity_clash` | **4** | `Physical type mismatch` (category-gated / soft-skip if no metadata) |

### 9. DB / migration (locked)

| Item | Decision |
|------|----------|
| Prisma migration | **None** |
| Backfill | **Out of scope** — keys appear on re-analyze only |
| Prior Expansion / Phase A keys | **Unchanged** |

### 10. Agent 4

**Skip.** Story 1 is allowlist/metadata only — no eligibility, preference-dimension, or ranking behavior change.

---

## Service / module placement

- Allowlist SoT: `extracted-signals.interface.ts`
- Exp-08 meta SoT: `expansion-08-signal-definitions.ts` (Story 1 metadata; Story 2 adds prompt block)

`EXTRACTION_SIGNAL_KEYS` / sets auto-union — no scoring wiring in Story 1.

---

## Runtime topology

N/A — no realtime / proxy / cookie changes.

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
| `SHADOW_SIGNAL_KEYS.length` | 20 → **24** |
| `EXTRACTION_SIGNAL_KEYS.length` | 35 → **39** |
| `MAX_EVIDENCE_ITEMS` | 39 → **43** |
| Membership | all 4 keys `toContain` |
| Existing | Expansion-01–07 keys still present |
| Meta module | `EXPANSION_08_SHADOW_SIGNAL_KEYS.length === 4`; weights/tiers/domains/chips match lock |

Add `describe('Expansion-08 shadow mode (no scoring wire-up)')`:

- Keys under test: the four Expansion-08 keys
- All **not** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS`
- All **not** in `COMPATIBILITY_SIGNAL_KEYS`
- Meta asserts for weights / domains / chip labels (and tiers if exported)

Keep Expansion-01–07 regression describes intact. **Do not** change Exp-07 `DOMAIN_ALLOWED` length asserts in this story (still 27/13 until Story 2).

---

## E2E verification

N/A — Agent 4 skipped; no matching-engine behavior change in Story 1.

---

## Agent 1 instructions

1. Append four keys + set `MAX_EVIDENCE_ITEMS = 43` per §5.
2. Create `expansion-08-signal-definitions.ts` metadata per §6 (no LLM block).
3. Update `extracted-signals.spec.ts` (+ meta asserts).
4. Do **not** modify compatibility, explainability, tension, prompts, `DOMAIN_ALLOWED`, Prisma, or UI.
5. Run tests above; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add Expansion-08 education/integrity/lifestyle signals as shadow keys

Story 1 — allowlist + promotion metadata; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] Only allowlist + Exp-08 metadata module + specs (+ handoff) changed
- [ ] All four keys spelled exactly
- [ ] All in `SHADOW_SIGNAL_KEYS`, **not** in official/scored arrays
- [ ] `MAX_EVIDENCE_ITEMS === 43`
- [ ] Specs: 24 shadow / 39 total
- [ ] Distinction comments present (incl. ethical note)
- [ ] No LLM prompt block / no `DOMAIN_ALLOWED` / no scoring drift
- [ ] No race/ethnicity or anatomy keys added
- [ ] Expansion-01–07 keys unchanged

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2 preview:** Add `EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK` (and possibly partner) to same definitions file; wire `SELF_EXTRACTOR_PROMPT`; sync `DOMAIN_ALLOWED` (self ± partner — default lean **self + partner** for preference-shaped keys like education/physical type, matching Exp-07 pattern; architect Story 2 locks). Hebrew-aware semantic examples; PROTECT vs adjacent keys; racist/anatomy-only → null; no regex.
- **Story 3 preview:** Three tension rules ship fully; physical-type clash category-gated.
- **Promote:** README Story 5 mentions promote toward 34 scored — treat as **optional gate**, not automatic; keep shadow until explicit promote decision.

---

## Next agent

```text
--agent 1 expansion 08 story 1
```

**Notes:** Same shadow playbook as Expansion-01–07 Story 1, but **four net-new keys** + a metadata-only `expansion-08-signal-definitions.ts`. Do **not** bump scoring registries. Story 2 owns LLM prompts.
