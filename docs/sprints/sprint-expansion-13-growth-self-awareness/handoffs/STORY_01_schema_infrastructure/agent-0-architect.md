# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-13-growth-self-awareness  
**Date:** 2026-08-08  
**Status:** complete  

**Depends on:** Expansion-12 Done — see `sprint-expansion-12-feeling-heard/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for **two** new keys + promotion-ready metadata module. **No** scoring, tension, chips, or LLM prompt blocks in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md`)

---

## Summary

- Expansion-13 adds **growth & self-awareness** signals: `growthMindset`, `selfAwareness`.
- Both keys are **net-new** — do not exist in the codebase yet.
- New promotion domain string **`personal`** (both keys) — document in metadata only this story; do **not** wire `SIGNAL_DOMAIN` / chip-diversity runtime yet (promote / Story 4).
- Story 1: append both to `SHADOW_SIGNAL_KEYS`, bump `MAX_EVIDENCE_ITEMS`, create **`expansion-13-signal-definitions.ts` metadata only** (weights/tiers/domains/chips — **not** LLM SELF/PARTNER blocks).
- Follow **Expansion-01–12 Story 1 lock** — **not** naive README promote into `SignalKey` / `COMPATIBILITY_WEIGHTS` / `match-explainability.ts` now.
- **No Prisma migration.**
- Document distinctions (comments + this handoff) — prompt wiring is Story 2.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | **15** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-12) | **30** |
| Total extraction keys | **45** |
| `MAX_EVIDENCE_ITEMS` | **49** (= 15 + 30 + 4) |
| Self `DOMAIN_ALLOWED` | **37** (Story 2 will expand for Exp-13) |
| Partner `DOMAIN_ALLOWED` | **23** (Story 2 will sync self+partner) |
| `CHIP_EVIDENCE_KEYS` | **35** (Story 4 will grow) |
| Adjacent scored / shadow | `vulnerabilityOpenness`, `directness`, `emotionalRegulation`, `empathyCompassion` |
| Two Exp-13 keys | **Do not exist** — Story 1 adds both |
| Domain `personal` | **Does not exist** in `SIGNAL_DOMAIN` / shadow maps yet |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add keys + weights/tiers/domains in Story 1 | **Shadow allowlist + metadata module** — do **not** wire `COMPATIBILITY_WEIGHTS` / `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL` |
| Update `SIGNAL_DOMAIN` + chip-diversity for `personal` | **Out of scope Story 1** — metadata documents `personal`; runtime `SHADOW_SIGNAL_DOMAIN` / diversity lands with Story 4 explainability overlay (or promote). `SIGNAL_DOMAIN` stays `Record<SignalKey, string>` until promote |
| Files: `compatibility-score.ts`, `match-explainability.ts` | **Out of scope** Story 1 (promote / Stories 3–5) — README “at promote gate” |
| Update signal count docs (42 total after promote) | Product milestone after **future promote** of expansion set — **as-built after Story 1:** **15 scored + 32 shadow = 47** extraction keys. Do **not** promote in Story 1 |
| `expansion-13-signal-definitions.ts` | **Create** with **metadata constants only**; LLM blocks are **Story 2** (Story 2 README “create” = extend this file) |
| Unit test: keys validate in strict extraction schema | Story 1 gate = **`extracted-signals.spec.ts` allowlist + meta asserts**. Sync `DOMAIN_ALLOWED` / prompts is **Story 2** |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | **Optional** doc-only; **not** a Story 1 gate |
| Onboarding prompts | **Story 4** (copy) / Story 2 may note text feeds same extractor — no schema for prompts in Story 1 |
| Positive chip “Grows together” (both high growth) | **Story 3/4** — metadata chip label for `growthMindset` stays README Signals table **`Openness to growth`** |
| Aligned self-awareness chip “Self-awareness match” | **Story 4** — metadata label for `selfAwareness` stays **`Self-awareness`** |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append 2 keys to `SHADOW_SIGNAL_KEYS` with distinction JSDoc; bump `MAX_EVIDENCE_ITEMS` **49 → 51** |
| `dating-api/src/extraction/expansion-13-signal-definitions.ts` | **Create** — promotion-ready meta (keys, weights, tiers, domains, chip labels). **No** LLM prompt block yet |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert 2 keys; shadow **30 → 32**; total **45 → 47**; `MAX_EVIDENCE_ITEMS === 51`; Expansion-13 shadow-mode regression block |
| `dating-api/src/extraction/expansion-12-rollout.spec.ts` (and Exp-10/11 if needed) | Update global count asserts if present (**30→32**, **45→47**, **49→51**; DOMAIN lengths stay **37/23** until Story 2) — only if those specs hard-code totals |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` / `SIGNAL_DOMAIN` | Stories 3–4 / promote — do **not** add `personal` to scored domain map yet |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts` ALLOWED KEYS / prompts | Story 2 |
| `DOMAIN_ALLOWED_SIGNAL_KEYS` / `extraction-strict-validation.ts` | Story 2 (sync with prompts) |
| LLM `EXPANSION_13_*_SHADOW_SIGNAL_BLOCK` body | Story 2 (extend same definitions file) |
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
| New allowlist keys | `growthMindset`, `selfAwareness` |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still **15**) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

### 2. Key names & scale (locked)

| Key | Status | Scale (Story 2) | Meaning |
|-----|--------|-----------------|---------|
| `growthMindset` | **New** | **1–10** or null | Openness to feedback/change in relationship: defensive / “this is who I am” (**low**) ↔ actively seeks feedback and adapts (**high**) |
| `selfAwareness` | **New** | **1–10** or null | Insight into own patterns/triggers: little insight (**low**) ↔ clearly names patterns and origins (**high**) |

CamelCase exact spelling — no aliases (`growthOrientation`, `selfInsight` as key names forbidden). Scale **1–10**.

### 3. Distinct from existing keys (locked — Story 2 must echo)

| Existing / adjacent | Distinct angle for Expansion-13 |
|---------------------|----------------------------------|
| `vulnerabilityOpenness` (Exp-01 shadow) | Willingness to share fears / be seen — **not** willingness to change / take feedback |
| `directness` (scored) | Communication style saying hard things — **not** receptivity to feedback |
| `emotionalRegulation` (Exp-02 shadow) | Managing emotions in the moment — **not** *knowing* one's patterns/triggers (insight ≠ regulation) |
| `empathyCompassion` (Exp-01) | Outward understanding of others — **not** inward understanding of self |
| Silence / no growth or self-insight text | Prefer **null** — do not invent scores |

### 4. Domain `personal` (locked)

| Layer | Story 1 | Later |
|-------|---------|-------|
| `EXPANSION_13_PROMOTION_DOMAINS` | Both keys → **`personal`** | — |
| `SIGNAL_DOMAIN` (`SignalKey`) | **Unchanged** | Promote story |
| `SHADOW_SIGNAL_DOMAIN` in Exp-13 explainability | **Not created** | Story 4 |
| Chip-diversity runtime | **Unchanged** | Story 4 (new domain string is fine — diversity is string-keyed; no enum to extend in Story 1) |

Do **not** invent a shared domain registry enum in Story 1.

### 5. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 49 = 15 official + 30 shadow + 4 buffer
After:  51 = 15 official + 32 shadow + 4 buffer
```

### 6. Interface edit (copy-paste ready)

Append after `emotionalExpression`:

```typescript
  /**
   * Expansion-13 — Growth & Self-Awareness (shadow until promote).
   * growthMindset: openness to feedback/change — NOT vulnerabilityOpenness / directness alone.
   * selfAwareness: insight into own patterns/triggers — NOT emotionalRegulation / empathyCompassion alone.
   */
  'growthMindset',
  'selfAwareness',
] as const;

/** Max evidence items: 15 official + 32 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 51;
```

Update the prior `MAX_EVIDENCE_ITEMS` comment that still says “30 shadow”.

### 7. Metadata module (locked — Story 1 creates; Story 2 extends)

Create `dating-api/src/extraction/expansion-13-signal-definitions.ts`:

```typescript
/**
 * Expansion-13 promotion-ready metadata (shadow until promote).
 * LLM semantic prompt block is added in Story 2 — do not put keyword heuristics here.
 */

export const EXPANSION_13_SHADOW_SIGNAL_KEYS = [
  'growthMindset',
  'selfAwareness',
] as const;

export type Expansion13ShadowSignalKey =
  (typeof EXPANSION_13_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_13_PROMOTION_WEIGHTS: Record<
  Expansion13ShadowSignalKey,
  number
> = {
  growthMindset: 1.3,
  selfAwareness: 1.2,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_13_PROMOTION_TIERS: Record<
  Expansion13ShadowSignalKey,
  1 | 2 | 3
> = {
  growthMindset: 2,
  selfAwareness: 2,
};

export const EXPANSION_13_PROMOTION_DOMAINS: Record<
  Expansion13ShadowSignalKey,
  string
> = {
  growthMindset: 'personal',
  selfAwareness: 'personal',
};

export const EXPANSION_13_PROMOTION_CHIP_LABELS: Record<
  Expansion13ShadowSignalKey,
  string
> = {
  growthMindset: 'Openness to growth',
  selfAwareness: 'Self-awareness',
};
```

Exact chip labels match sprint README **Signals Added** table. Story 4 browse positives are **`Grows together`** (both-high growth) and **`Self-awareness match`** (aligned awareness) — different strings; do **not** invent those in Story 1.

### 8. Prior rollout specs that hard-code totals (locked)

If Agent 1 finds hard-coded global counts in `expansion-10-rollout.spec.ts` / `expansion-11-rollout.spec.ts` / `expansion-12-rollout.spec.ts`, bump only the **global** length asserts to post–Story-1 values:

| Assert | New value |
|--------|-----------|
| `SHADOW_SIGNAL_KEYS.length` | **32** |
| `EXTRACTION_SIGNAL_KEYS.length` | **47** |
| `MAX_EVIDENCE_ITEMS` | **51** |
| `DOMAIN_ALLOWED` self/partner lengths | **Unchanged** (**37** / **23**) until Story 2 |

Do **not** change Exp-10/11/12 key membership asserts.

### 9. Domains preview (Story 2 — not Story 1)

README: wire **self + partner**. Relationship domain **unchanged** in Story 2. Story 1 does not edit prompts or `DOMAIN_ALLOWED`.

### 10. Agent 4

**Skip.** Schema/metadata only.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npx jest src/extraction/expansion-12-rollout.spec.ts src/extraction/expansion-11-rollout.spec.ts src/extraction/expansion-10-rollout.spec.ts --runInBand
npm run typecheck
```

Update / add asserts:

| Assert | Detail |
|--------|--------|
| Membership | `SHADOW_SIGNAL_KEYS` / `_SET` contain `growthMindset`, `selfAwareness` |
| Length | `SHADOW_SIGNAL_KEYS.length === 32` |
| Total | `EXTRACTION_SIGNAL_KEYS.length === 47` |
| Evidence cap | `MAX_EVIDENCE_ITEMS === 51` |
| Not scored | neither key in `COMPATIBILITY_SIGNAL_KEYS` / `OFFICIAL_EXTRACTION_SIGNAL_KEYS` |
| Meta module | `EXPANSION_13_SHADOW_SIGNAL_KEYS` length 2; weights/tiers/domains/labels match §7 |
| Adjacent | Exp-12 keys still present; adjacent distinctions documented |

Mirror Exp-12 `describe('Expansion-13 shadow mode (no scoring wire-up)')` — do **not** require `DOMAIN_ALLOWED` membership until Story 2.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Append two keys + bump `MAX_EVIDENCE_ITEMS` per §6.
2. Create `expansion-13-signal-definitions.ts` per §7.
3. Update `extracted-signals.spec.ts` counts and Exp-13 shadow-mode block.
4. Bump prior expansion rollout specs’ global count asserts if they fail (§8).
5. Do **not** touch scoring, tension, prompts, `DOMAIN_ALLOWED`, `SIGNAL_DOMAIN`, UI, or promote registries.
6. Run tests; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add Expansion-13 growthMindset and selfAwareness shadow keys

Story 1 — shadow allowlist 30→32; metadata module (personal domain); no scoring wire-up.
```

---

## Agent 2 CR checklist

- [ ] Only allowlist + MAX_EVIDENCE + metadata module + specs (+ prior rollout count bumps + handoff) changed
- [ ] Keys spelled exactly: `growthMindset`, `selfAwareness`
- [ ] Shadow length **32**; total **47**; `MAX_EVIDENCE_ITEMS === 51`
- [ ] Not in `COMPATIBILITY_SIGNAL_KEYS` / official keys
- [ ] Metadata weights/tiers/domains/chips match README (tiers **2** / **2**; weights **1.3** / **1.2**; domains both **`personal`**)
- [ ] No `SIGNAL_DOMAIN` / prompt / DOMAIN_ALLOWED / tension / scoring / i18n drift
- [ ] Specs + typecheck pass

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2:** LLM semantic blocks; self+partner `DOMAIN_ALLOWED`; distinguish from vulnerability / directness / regulation / empathy; Hebrew examples.
- **Story 3:** Two tension rules (`growth_mindset_gap`, `both_low_self_awareness`) + English chips; both-high growth positive later in Story 4.
- **Story 4:** Positive chips (`Grows together` / `Self-awareness match`) + i18n + onboarding + wire `personal` into shadow chip domains for diversity.
- **Story 5:** Fixtures / >85% / promote gate (product “42” framing vs as-built counts — reconcile at promote; do **not** treat README “42” as Story 1 deliverable).

---

## Next agent

```text
--agent 1 expansion 13 story 1
```

**Notes:** Shadow-first. Mandatory `LLM_FIRST_PRINCIPLE.md`. Story 2 owns prompts. Meta chip labels ≠ Story 4 browse chip strings — keep them distinct. Domain `personal` is metadata-only until Story 4 / promote.
