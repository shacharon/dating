# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-10-conflict-recovery  
**Date:** 2026-08-07  
**Status:** complete  

**Depends on:** Expansion-09 Done — see `sprint-expansion-09-interest-taxonomy/handoffs/STORY_04_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for **two** new keys + promotion-ready metadata module. **No** scoring, tension, chips, or LLM prompt blocks in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md`)

---

## Summary

- Expansion-10 adds Gottman-aligned **conflict recovery** signals: `repairSkills`, `forgivenessStyle`.
- Both keys are **net-new** — do not exist in the codebase yet.
- Story 1: append both to `SHADOW_SIGNAL_KEYS`, bump `MAX_EVIDENCE_ITEMS`, create **`expansion-10-signal-definitions.ts` metadata only** (weights/tiers/domains/chips — **not** LLM SELF/PARTNER blocks).
- Follow **Expansion-01–08 Story 1 lock** — **not** naive README promote into `SignalKey` / `COMPATIBILITY_WEIGHTS` / `match-explainability.ts` now.
- **No Prisma migration.**
- Document distinctions (comments + this handoff) — prompt wiring is Story 2.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | **15** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-08) | **24** |
| Total extraction keys | **39** |
| `MAX_EVIDENCE_ITEMS` | **43** (= 15 + 24 + 4) |
| Self `DOMAIN_ALLOWED` | **31** (Story 2 will expand for Exp-10) |
| Partner `DOMAIN_ALLOWED` | **17** (Story 2 will sync self+partner) |
| Adjacent scored key | `conflictStyle` — **during** conflict; Exp-10 is **after** |
| Adjacent shadow | `emotionalRegulation`, `attachmentSecurity`, `directness` |
| Two Exp-10 keys | **Do not exist** — Story 1 adds both |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add keys + weights/tiers/domains in Story 1 | **Shadow allowlist + metadata module** — do **not** wire `COMPATIBILITY_WEIGHTS` / `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL` |
| Files: `compatibility-score.ts`, `match-explainability.ts` | **Out of scope** Story 1 (promote / Stories 3–5) |
| Update signal count docs (36 total after promote) | Product milestone after **future promote** of expansion set — **as-built after Story 1:** **15 scored + 26 shadow = 41** extraction keys. Do **not** promote in Story 1 |
| `expansion-10-signal-definitions.ts` | **Create** with **metadata constants only**; LLM blocks are **Story 2** |
| Unit test: keys validate in strict extraction schema | Story 1 gate = **`extracted-signals.spec.ts` allowlist + meta asserts**. Sync `DOMAIN_ALLOWED` / prompts is **Story 2** |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | **Optional** doc-only; **not** a Story 1 gate |
| Onboarding prompts | **Story 4** (copy) / Story 2 may note text feeds same extractor — no schema for prompts in Story 1 |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append 2 keys to `SHADOW_SIGNAL_KEYS` with distinction JSDoc; bump `MAX_EVIDENCE_ITEMS` **43 → 45** |
| `dating-api/src/extraction/expansion-10-signal-definitions.ts` | **Create** — promotion-ready meta (keys, weights, tiers, domains, chip labels). **No** LLM prompt block yet |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert 2 keys; shadow **24 → 26**; total **39 → 41**; `MAX_EVIDENCE_ITEMS === 45`; Expansion-10 shadow-mode regression block |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` | Stories 3–4 |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts` ALLOWED KEYS / prompts | Story 2 |
| `DOMAIN_ALLOWED_SIGNAL_KEYS` / `extraction-strict-validation.ts` | Story 2 (sync with prompts) |
| LLM `EXPANSION_10_*_SHADOW_SIGNAL_BLOCK` body | Story 2 (extend same definitions file) |
| Onboarding prompt UI / i18n | Story 4 |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | Doc-only; not a Story 1 gate |
| Prisma / backfill | N/A / later |
| Prior expansion promote | Separate future story |
| Keyword / regex extraction | **Forbidden** |

---

## Decisions (do not reverse without discussion)

### 1. Shadow-first (locked)

| Choice | Lock |
|--------|------|
| New allowlist keys | `repairSkills`, `forgivenessStyle` |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still **15**) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

### 2. Key names & scale (locked)

| Key | Status | Scale (Story 2) | Meaning |
|-----|--------|-----------------|---------|
| `repairSkills` | **New** | **1–10** or null | Ability/willingness to apologize, own one's part, and reconnect after conflict vs stonewall / deflect / avoid resolution |
| `forgivenessStyle` | **New** | **1–10** or null | Tendency to let go of resentment and move forward vs holding grudges / rehashing past conflicts |

CamelCase exact spelling — no aliases. Scale **1–10**.

### 3. Distinct from existing keys (locked — Story 2 must echo)

| Existing / adjacent | Distinct angle for Expansion-10 |
|---------------------|----------------------------------|
| `conflictStyle` (scored) | Behavior **during** disagreement — **not** post-conflict repair |
| `directness` | Communication bluntness — **not** accountability / apology / reconnection |
| `attachmentSecurity` | General relational security — **not** grudge/forgiveness pacing |
| `emotionalRegulation` (Exp-02 shadow) | In-the-moment reactivity management — **not** resolution over time after the fight |
| Silence / no conflict aftermath text | Prefer **null** — do not invent scores |

### 4. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 43 = 15 official + 24 shadow + 4 buffer
After:  45 = 15 official + 26 shadow + 4 buffer
```

### 5. Interface edit (copy-paste ready)

Append after `physicalTypePreference`:

```typescript
  /**
   * Expansion-10 — Conflict Recovery (shadow until promote).
   * repairSkills: post-conflict apology / ownership / reconnection — NOT conflictStyle (during conflict).
   * forgivenessStyle: letting go vs holding grudges after conflict — NOT attachmentSecurity / emotionalRegulation alone.
   */
  'repairSkills',
  'forgivenessStyle',
] as const;

/** Max evidence items: 15 official + 26 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 45;
```

Update the prior `MAX_EVIDENCE_ITEMS` comment that still says “24 shadow”.

### 6. Metadata module (locked — Story 1 creates; Story 2 extends)

Create `dating-api/src/extraction/expansion-10-signal-definitions.ts`:

```typescript
/**
 * Expansion-10 promotion-ready metadata (shadow until promote).
 * LLM semantic prompt block is added in Story 2 — do not put keyword heuristics here.
 */

export const EXPANSION_10_SHADOW_SIGNAL_KEYS = [
  'repairSkills',
  'forgivenessStyle',
] as const;

export type Expansion10ShadowSignalKey =
  (typeof EXPANSION_10_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_10_PROMOTION_WEIGHTS: Record<
  Expansion10ShadowSignalKey,
  number
> = {
  repairSkills: 1.4,
  forgivenessStyle: 1.3,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_10_PROMOTION_TIERS: Record<
  Expansion10ShadowSignalKey,
  1 | 2 | 3
> = {
  repairSkills: 2,
  forgivenessStyle: 2,
};

export const EXPANSION_10_PROMOTION_DOMAINS: Record<
  Expansion10ShadowSignalKey,
  string
> = {
  repairSkills: 'communication',
  forgivenessStyle: 'communication',
};

export const EXPANSION_10_PROMOTION_CHIP_LABELS: Record<
  Expansion10ShadowSignalKey,
  string
> = {
  repairSkills: 'Conflict recovery',
  forgivenessStyle: 'Letting go & moving forward',
};
```

Exact chip labels match sprint README (Story 4 will use them later).

### 7. Domains preview (Story 2 — not Story 1)

README: wire **self + partner**. Relationship domain **unchanged** in Story 2. Story 1 does not edit prompts or `DOMAIN_ALLOWED`.

### 8. Agent 4

**Skip.** Schema/metadata only.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npm run typecheck
```

Update / add asserts:

| Assert | Detail |
|--------|--------|
| Membership | `SHADOW_SIGNAL_KEYS` / `_SET` contain `repairSkills`, `forgivenessStyle` |
| Length | `SHADOW_SIGNAL_KEYS.length === 26` |
| Total | `EXTRACTION_SIGNAL_KEYS.length === 41` |
| Evidence cap | `MAX_EVIDENCE_ITEMS === 45` |
| Not scored | neither key in `COMPATIBILITY_SIGNAL_KEYS` / `OFFICIAL_EXTRACTION_SIGNAL_KEYS` |
| Meta module | `EXPANSION_10_SHADOW_SIGNAL_KEYS` length 2; weights/tiers/domains/labels match §6 |
| Adjacent | still contains `conflictStyle` only as official (not in shadow); Exp-08 keys unchanged |

Mirror Exp-08 `describe('Expansion-10 shadow mode (no scoring wire-up)')` — do **not** require `DOMAIN_ALLOWED` membership until Story 2.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Append two keys + bump `MAX_EVIDENCE_ITEMS` per §5.
2. Create `expansion-10-signal-definitions.ts` per §6.
3. Update `extracted-signals.spec.ts` counts and Exp-10 shadow-mode block.
4. Do **not** touch scoring, tension, prompts, `DOMAIN_ALLOWED`, UI, or promote registries.
5. Run tests; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add Expansion-10 repairSkills and forgivenessStyle shadow keys

Story 1 — shadow allowlist 24→26; metadata module; no scoring wire-up.
```

---

## Agent 2 CR checklist

- [ ] Only allowlist + MAX_EVIDENCE + metadata module + specs (+ handoff) changed
- [ ] Keys spelled exactly: `repairSkills`, `forgivenessStyle`
- [ ] Shadow length **26**; total **41**; `MAX_EVIDENCE_ITEMS === 45`
- [ ] Not in `COMPATIBILITY_SIGNAL_KEYS` / official keys
- [ ] Metadata weights/tiers/domains/chips match README
- [ ] No prompt / DOMAIN_ALLOWED / tension / scoring / i18n drift
- [ ] Specs + typecheck pass

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2:** LLM semantic blocks; self+partner `DOMAIN_ALLOWED`; distinguish from `conflictStyle` / regulation / attachment; Hebrew examples.
- **Story 3:** Three tension rules + English chips.
- **Story 4:** Positive chips + i18n + onboarding prompt copy.
- **Story 5:** Fixtures / >85% / promote gate (36 product framing vs as-built counts — reconcile at promote).

---

## Next agent

```text
--agent 1 expansion 10 story 1
```

**Notes:** Shadow-first. Tags ≠ interests (Exp-09). Mandatory `LLM_FIRST_PRINCIPLE.md`. Story 2 owns prompts.
