# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-14-tolerance-intimacy-pacing  
**Date:** 2026-08-08  
**Status:** complete  

**Depends on:** Expansion-13 Done — see `sprint-expansion-13-growth-self-awareness/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for **three** new keys + promotion-ready metadata module. **No** scoring, tension, chips, or LLM prompt blocks in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md`)

---

## Summary

- Expansion-14 adds **tolerance & intimacy pacing** signals: `patienceTolerance`, `intimacyPacing`, `monogamyAlignment`.
- All three keys are **net-new** — do not exist in the codebase yet.
- Domains reuse existing strings: **`relationship`** (patience + monogamy) and **`intimacy`** (pacing) — metadata only this story; chip-diversity runtime lands Story 4 / promote.
- Story 1: append three to `SHADOW_SIGNAL_KEYS`, bump `MAX_EVIDENCE_ITEMS`, create **`expansion-14-signal-definitions.ts` metadata only** (weights/tiers/domains/chips — **not** LLM SELF/PARTNER blocks).
- Follow **Expansion-01–13 Story 1 lock** — **not** naive README promote into `SignalKey` / `COMPATIBILITY_WEIGHTS` / `match-explainability.ts` now.
- **No Prisma migration.**
- Document distinctions (comments + this handoff) — prompt wiring is Story 2.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | **15** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-13) | **32** |
| Total extraction keys | **47** |
| `MAX_EVIDENCE_ITEMS` | **51** (= 15 + 32 + 4) |
| Self `DOMAIN_ALLOWED` | **39** (Story 2 will expand for Exp-14) |
| Partner `DOMAIN_ALLOWED` | **25** (Story 2 will sync self+partner) |
| `CHIP_EVIDENCE_KEYS` | **37** (Story 4 will grow) |
| Adjacent scored / shadow | `conflictStyle`, `emotionalRegulation`, `casualIntimacyIntent`, `relationshipClarity` |
| Three Exp-14 keys | **Do not exist** — Story 1 adds all three |
| Domains `relationship` / `intimacy` | Already used by scored/shadow maps elsewhere — OK to reuse as metadata strings |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add keys + weights/tiers/domains in Story 1 | **Shadow allowlist + metadata module** — do **not** wire `COMPATIBILITY_WEIGHTS` / `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL` |
| Files: `compatibility-score.ts`, `match-explainability.ts` | **Out of scope** Story 1 (promote / Stories 3–5) — README “at promote gate” |
| Update signal count docs (45 total after promote) | Product milestone after **future promote** of expansion set — **as-built after Story 1:** **15 scored + 35 shadow = 50** extraction keys. Do **not** promote in Story 1 |
| `expansion-14-signal-definitions.ts` | **Create** with **metadata constants only**; LLM blocks are **Story 2** (Story 2 README “create” = extend this file) |
| Unit test: keys validate in strict extraction schema | Story 1 gate = **`extracted-signals.spec.ts` allowlist + meta asserts**. Sync `DOMAIN_ALLOWED` / prompts is **Story 2** |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | **Optional** doc-only; **not** a Story 1 gate |
| Onboarding prompts | **Story 4** (copy) / Story 2 may note text feeds same extractor — no schema for prompts in Story 1 |
| Browse positives (`Patience match` / `Pace of closeness` / `Aligned on relationship structure`) | **Story 4** — Story 1 meta chips stay README **Signals Added** table strings |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append 3 keys to `SHADOW_SIGNAL_KEYS` with distinction JSDoc; bump `MAX_EVIDENCE_ITEMS` **51 → 54** |
| `dating-api/src/extraction/expansion-14-signal-definitions.ts` | **Create** — promotion-ready meta (keys, weights, tiers, domains, chip labels). **No** LLM prompt block yet |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert 3 keys; shadow **32 → 35**; total **47 → 50**; `MAX_EVIDENCE_ITEMS === 54`; Expansion-14 shadow-mode regression block |
| `dating-api/src/extraction/expansion-13-rollout.spec.ts` (and Exp-10/11/12 if needed) | Update global count asserts if present (**32→35**, **47→50**, **51→54**; DOMAIN lengths stay **39/25** until Story 2) — only if those specs hard-code totals |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` / scored `SIGNAL_DOMAIN` | Stories 3–4 / promote |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts` ALLOWED KEYS / prompts | Story 2 |
| `DOMAIN_ALLOWED_SIGNAL_KEYS` / `extraction-strict-validation.ts` | Story 2 (sync with prompts) |
| LLM `EXPANSION_14_*_SHADOW_SIGNAL_BLOCK` body | Story 2 (extend same definitions file) |
| Onboarding prompt UI / i18n | Story 4 |
| Holy-Grail hard filter for monogamy mismatch | README flags for later product discussion — **not** Story 1 |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | Doc-only; not a Story 1 gate |
| Prisma / backfill | N/A / later |
| Prior expansion promote | Separate future story |
| Keyword / regex extraction | **Forbidden** |

---

## Decisions (do not reverse without discussion)

### 1. Shadow-first (locked)

| Choice | Lock |
|--------|------|
| New allowlist keys | `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still **15**) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

### 2. Key names & scale (locked)

| Key | Status | Scale (Story 2) | Meaning |
|-----|--------|-----------------|---------|
| `patienceTolerance` | **New** | **1–10** or null | Day-to-day tolerance for partner quirks/flaws: highly critical (**low**) ↔ very patient/accepting (**high**) |
| `intimacyPacing` | **New** | **1–10** or null | Speed toward closeness: very slow/cautious (**low**) ↔ moves fast into closeness (**high**) |
| `monogamyAlignment` | **New** | **1–10** or null | Structure expectation: strict exclusivity (**low 1–2**) ↔ open/poly (**high 9–10**); mid = open to discussion |

CamelCase exact spelling — no aliases (`patience`, `pacing`, `monogamy` as key names forbidden). Scale **1–10**.

**Critical scale note for `monogamyAlignment`:** Low = monogamous; high = non-monogamous/open. Do **not** invert this in metadata comments or later stories.

### 3. Distinct from existing keys (locked — Story 2 must echo)

| Existing / adjacent | Distinct angle for Expansion-14 |
|---------------------|----------------------------------|
| `conflictStyle` (scored) | Behavior *during* disagreement — **not** ongoing tolerance for quirks that never become “a fight” |
| `emotionalRegulation` (Exp-02) | Managing *own* reactivity — **not** tolerance threshold for partner’s imperfections |
| `casualIntimacyIntent` (Exp-07) | Casual/hookup vs committed *type* — **not** *speed* to closeness |
| `relationshipClarity` (scored) | Structured vs free-flow *dating approach* — **not** exclusive vs open/poly *structure* |
| Silence / no related text | Prefer **null** — do not invent scores |

### 4. Domains (locked)

| Key | `EXPANSION_14_PROMOTION_DOMAINS` |
|-----|----------------------------------|
| `patienceTolerance` | **`relationship`** |
| `intimacyPacing` | **`intimacy`** |
| `monogamyAlignment` | **`relationship`** |

| Layer | Story 1 | Later |
|-------|---------|-------|
| Promotion domains meta | As above | — |
| Scored `SIGNAL_DOMAIN` | **Unchanged** | Promote story |
| `SHADOW_SIGNAL_DOMAIN` in Exp-14 explainability | **Not created** | Story 4 |
| Chip-diversity runtime | **Unchanged** | Story 4 |

### 5. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 51 = 15 official + 32 shadow + 4 buffer
After:  54 = 15 official + 35 shadow + 4 buffer
```

### 6. Interface edit (copy-paste ready)

Append after `selfAwareness`:

```typescript
  /**
   * Expansion-14 — Tolerance & Intimacy Pacing (shadow until promote).
   * patienceTolerance: day-to-day tolerance for quirks/flaws — NOT conflictStyle / emotionalRegulation alone.
   * intimacyPacing: speed toward closeness — NOT casualIntimacyIntent (type) alone.
   * monogamyAlignment: exclusive vs open/poly structure (low=mono, high=open) — NOT relationshipClarity alone.
   */
  'patienceTolerance',
  'intimacyPacing',
  'monogamyAlignment',
] as const;

/** Max evidence items: 15 official + 35 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 54;
```

Update the prior `MAX_EVIDENCE_ITEMS` comment that still says “32 shadow”.

### 7. Metadata module (locked — Story 1 creates; Story 2 extends)

Create `dating-api/src/extraction/expansion-14-signal-definitions.ts`:

```typescript
/**
 * Expansion-14 promotion-ready metadata (shadow until promote).
 * LLM semantic prompt block is added in Story 2 — do not put keyword heuristics here.
 */

export const EXPANSION_14_SHADOW_SIGNAL_KEYS = [
  'patienceTolerance',
  'intimacyPacing',
  'monogamyAlignment',
] as const;

export type Expansion14ShadowSignalKey =
  (typeof EXPANSION_14_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_14_PROMOTION_WEIGHTS: Record<
  Expansion14ShadowSignalKey,
  number
> = {
  patienceTolerance: 1.2,
  intimacyPacing: 1.3,
  monogamyAlignment: 1.6,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_14_PROMOTION_TIERS: Record<
  Expansion14ShadowSignalKey,
  1 | 2 | 3
> = {
  patienceTolerance: 2,
  intimacyPacing: 1,
  monogamyAlignment: 1,
};

export const EXPANSION_14_PROMOTION_DOMAINS: Record<
  Expansion14ShadowSignalKey,
  string
> = {
  patienceTolerance: 'relationship',
  intimacyPacing: 'intimacy',
  monogamyAlignment: 'relationship',
};

export const EXPANSION_14_PROMOTION_CHIP_LABELS: Record<
  Expansion14ShadowSignalKey,
  string
> = {
  patienceTolerance: 'Patience with differences',
  intimacyPacing: 'Pace of closeness',
  monogamyAlignment: 'Relationship structure',
};
```

Exact chip labels match sprint README **Signals Added** table.

**Meta ≠ browse (Story 4):**

| Key | Story 1 meta | Story 4 browse |
|-----|--------------|----------------|
| `patienceTolerance` | Patience with differences | Patience match |
| `intimacyPacing` | Pace of closeness | Pace of closeness (aligned; same string OK) |
| `monogamyAlignment` | Relationship structure | Aligned on relationship structure |

Do **not** invent Story 4 browse strings in Story 1.

### 8. Prior rollout specs that hard-code totals (locked)

If Agent 1 finds hard-coded global counts in `expansion-10`…`13-rollout.spec.ts`, bump only the **global** length asserts to post–Story-1 values:

| Assert | New value |
|--------|-----------|
| `SHADOW_SIGNAL_KEYS.length` | **35** |
| `EXTRACTION_SIGNAL_KEYS.length` | **50** |
| `MAX_EVIDENCE_ITEMS` | **54** |
| `DOMAIN_ALLOWED` self/partner lengths | **Unchanged** (**39** / **25**) until Story 2 |

Do **not** change Exp-10–13 key membership asserts.

### 9. Domains preview (Story 2 — not Story 1)

README: wire **self + partner**. Relationship domain **unchanged** for Exp-14 keys in relationship *extraction* domain sense — Story 2 will decide ALLOWED KEYS placement (likely self + partner for all three). Story 1 does not edit prompts or `DOMAIN_ALLOWED`.

### 10. Agent 4

**Skip.** Schema/metadata only.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npx jest src/extraction/expansion-13-rollout.spec.ts src/extraction/expansion-12-rollout.spec.ts src/extraction/expansion-11-rollout.spec.ts src/extraction/expansion-10-rollout.spec.ts --runInBand
npm run typecheck
```

Update / add asserts:

| Assert | Detail |
|--------|--------|
| Membership | `SHADOW_SIGNAL_KEYS` / `_SET` contain all three Exp-14 keys |
| Length | `SHADOW_SIGNAL_KEYS.length === 35` |
| Total | `EXTRACTION_SIGNAL_KEYS.length === 50` |
| Evidence cap | `MAX_EVIDENCE_ITEMS === 54` |
| Not scored | none of the three in `COMPATIBILITY_SIGNAL_KEYS` / `OFFICIAL_EXTRACTION_SIGNAL_KEYS` |
| Meta module | `EXPANSION_14_SHADOW_SIGNAL_KEYS` length 3; weights/tiers/domains/labels match §7 |
| Adjacent | Exp-13 keys still present; adjacent distinctions documented |

Mirror Exp-13 `describe('Expansion-14 shadow mode (no scoring wire-up)')` — do **not** require `DOMAIN_ALLOWED` membership until Story 2.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Append three keys + bump `MAX_EVIDENCE_ITEMS` per §6.
2. Create `expansion-14-signal-definitions.ts` per §7.
3. Update `extracted-signals.spec.ts` counts and Exp-14 shadow-mode block.
4. Bump prior expansion rollout specs’ global count asserts if they fail (§8).
5. Do **not** touch scoring, tension, prompts, `DOMAIN_ALLOWED`, scored `SIGNAL_DOMAIN`, UI, or promote registries.
6. Run tests; write `agent-1-dev.md` under `docs/sprints/sprint-expansion-14-tolerance-intimacy-pacing/handoffs/STORY_01_schema_infrastructure/`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add Expansion-14 patienceTolerance intimacyPacing monogamyAlignment shadow keys

Story 1 — shadow allowlist 32→35; metadata module; no scoring wire-up.
```

---

## Agent 2 CR checklist

- [ ] Only allowlist + MAX_EVIDENCE + metadata module + specs (+ prior rollout count bumps + handoff) changed
- [ ] Keys spelled exactly: `patienceTolerance`, `intimacyPacing`, `monogamyAlignment`
- [ ] Shadow length **35**; total **50**; `MAX_EVIDENCE_ITEMS === 54`
- [ ] Not in `COMPATIBILITY_SIGNAL_KEYS` / official keys
- [ ] Metadata weights/tiers/domains/chips match README (weights **1.2 / 1.3 / 1.6**; tiers **2 / 1 / 1**; domains **relationship / intimacy / relationship**)
- [ ] No prompt / DOMAIN_ALLOWED / tension / scoring / i18n drift
- [ ] Specs + typecheck pass

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2:** LLM semantic blocks; self+partner `DOMAIN_ALLOWED`; distinguish from conflict / regulation / casual intimacy / relationship clarity; Hebrew examples; **monogamy low=mono high=open** scale lock.
- **Story 3:** Three tension rules (penalties **3 / 4 / 8**) + English chips; monogamy positive later in Story 4.
- **Story 4:** Browse positives + i18n + onboarding.
- **Story 5:** Fixtures / >85% / promote gate (product “45” framing vs as-built counts — reconcile at promote; do **not** treat README “45” as Story 1 deliverable).
- **Later product:** Extreme `monogamy_alignment_mismatch` as Holy-Grail hard filter — flagged in README; out of scope this sprint.

---

## Next agent

```text
--agent 1 expansion 14 story 1
```

**Notes:** Shadow-first. Mandatory `LLM_FIRST_PRINCIPLE.md`. Story 2 owns prompts. Meta chip labels ≠ Story 4 browse chip strings (except `Pace of closeness` may match). `monogamyAlignment` scale: low = mono, high = open.
