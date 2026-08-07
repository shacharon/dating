# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Date:** 2026-08-07  
**Status:** complete  

**Depends on:** Expansion-06 complete in shadow mode — see `sprint-expansion-06-adventure-novelty/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for **five** new keys + promotion-ready metadata module. **No** scoring, tension, chips, or LLM prompt blocks in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Expansion-07 closes **profile-gap** holes from Hebrew sample analysis (casual intimacy, support exchange + direction, religious observance). Interest-overlap UI chips are **Story 4** — not Story 1.
- **All five keys are net-new** — none exist in the codebase yet.
- Story 1: append all five to `SHADOW_SIGNAL_KEYS`, bump `MAX_EVIDENCE_ITEMS`, create **`expansion-07-signal-definitions.ts` metadata only** (weights/tiers/domains/chips — **not** LLM SELF block).
- Follow **Expansion-01–06 Story 1 lock** — **not** naive README promote into `SignalKey` / `COMPATIBILITY_WEIGHTS` / `match-explainability.ts` now.
- **No Prisma migration.**
- Document distinctions (comments + this handoff) — prompt wiring is Story 2.
- **`EnrichedSignals` / tension-rules:** Story 3 only.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | **15** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-06) | **15** |
| Total extraction keys | **30** |
| `MAX_EVIDENCE_ITEMS` | **34** (= 15 + 15 + 4) |
| Self `DOMAIN_ALLOWED` | **22** (Story 2 will expand) |
| Five Exp-07 keys | **Do not exist** — Story 1 adds all |
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
| Update signal count docs (30 total after promote) | Product milestone when promoted = **15 + 15 prior shadow expansions claimed + 5 Exp-07** is messy; **as-built:** runtime **15 scored + 20 shadow = 35 extraction keys** after Story 1. “30 compatibility signals” README means after **future promote** of expansion product set — do **not** promote in Story 1 |
| `expansion-07-signal-definitions.ts` | **Create** with **metadata constants only**; LLM `SELF_SHADOW_SIGNAL_BLOCK` is **Story 2** |
| Interest overlap chips | **Story 4** — not Story 1 |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append 5 keys to `SHADOW_SIGNAL_KEYS` with distinction JSDoc; bump `MAX_EVIDENCE_ITEMS` **34 → 39** |
| `dating-api/src/extraction/expansion-07-signal-definitions.ts` | **Create** — promotion-ready meta (keys, weights, tiers, domains, chip labels). **No** LLM prompt block yet |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert 5 keys; shadow **15 → 20**; total **30 → 35**; `MAX_EVIDENCE_ITEMS === 39`; Expansion-07 shadow-mode regression block |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` | Stories 3–4 |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts` ALLOWED KEYS / prompts | Story 2 |
| `DOMAIN_ALLOWED_SIGNAL_KEYS` | Story 2 (sync with prompts) |
| LLM `EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK` body | Story 2 (same file may gain the block) |
| Interest overlap / UI i18n | Story 4 |
| Prisma / backfill | N/A / later |
| Prior expansion promote | Separate future sprint |

---

## Decisions (do not reverse without discussion)

### 1. Shadow-first (locked)

| Choice | Lock |
|--------|------|
| New allowlist keys | `casualIntimacyIntent`, `supportExchangeOrientation`, `supportProviderOrientation`, `supportRecipientOrientation`, `religiousObservance` |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still 15) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

### 2. Key names & scale (locked)

| Key | Status | Scale (Story 2) | Meaning (for Story 2 prompts) |
|-----|--------|-----------------|-------------------------------|
| `casualIntimacyIntent` | **New** | **1–10** or null | Comfort with casual physical intimacy / hookups vs intimacy only in committed relationship |
| `supportExchangeOrientation` | **New** | **1–10** or null | Openness to transactional/arrangement money-in-relationship dynamics vs purely romantic |
| `supportProviderOrientation` | **New** | **1–10** or null | Desire to **give** ongoing financial support to a partner |
| `supportRecipientOrientation` | **New** | **1–10** or null | Desire to **receive** ongoing financial support from a partner |
| `religiousObservance` | **New** | **1–10** or null | Practical religious practice (kosher, Shabbat, prayer, community) vs secular/cultural-only |

CamelCase exact spelling — no aliases. Scale **1–10** (not README “0–10” elsewhere).

### 3. Distinct from existing keys (locked — Story 2 must echo)

| Existing / adjacent | Distinct angle for Expansion-07 |
|---------------------|----------------------------------|
| `physicalPriority` | Looks/attraction importance — not casual vs committed intimacy boundary |
| `relationshipClarity` | Overall relationship structure intent — not specifically physical/intimate boundary |
| `financialMindset` | Save/spend/security philosophy — not arrangement/allowance dynamics |
| `supportExchangeOrientation` vs provider/recipient | Exchange = openness to money-in-relationship; provider/recipient = **direction** |
| Generosity / “I pay for dates” | Scores **low–mid** on provider (3–5), not 9–10 — only explicit ongoing support scores high (Story 2) |
| `spirituality` | Inner/transcendent meaning — not ritual/practice level |
| `traditionalism` | Life-structure values — not religious ritual observance |
| Interest tags | Orthogonal — Story 4 interest chips; not these scored signals |

### 4. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 34 = 15 official + 15 shadow + 4 buffer
After:  39 = 15 official + 20 shadow + 4 buffer
```

### 5. Interface edit (copy-paste ready)

Append after `domesticComfort`:

```typescript
  /**
   * Expansion-07 — Profile Gap Signals (shadow until promote).
   * casualIntimacyIntent: casual/hookup vs committed-only intimacy — NOT physicalPriority / relationshipClarity alone.
   * supportExchangeOrientation: arrangement/money-in-relationship openness — NOT financialMindset.
   * supportProviderOrientation / supportRecipientOrientation: give vs receive direction — NOT exchange alone.
   * religiousObservance: practical practice (kosher/Shabbat/etc.) — NOT spirituality / traditionalism alone.
   */
  'casualIntimacyIntent',
  'supportExchangeOrientation',
  'supportProviderOrientation',
  'supportRecipientOrientation',
  'religiousObservance',
] as const;

/** Max evidence items: 15 official + 20 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 39;
```

### 6. Metadata module (locked — Story 1 creates; Story 2 extends)

Create `dating-api/src/extraction/expansion-07-signal-definitions.ts`:

```typescript
/**
 * Expansion-07 promotion-ready metadata (shadow until promote).
 * LLM semantic prompt block is added in Story 2 — do not put keyword heuristics here.
 */
export const EXPANSION_07_SHADOW_SIGNAL_KEYS = [
  'casualIntimacyIntent',
  'supportExchangeOrientation',
  'supportProviderOrientation',
  'supportRecipientOrientation',
  'religiousObservance',
] as const;

export type Expansion07ShadowSignalKey =
  (typeof EXPANSION_07_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_07_PROMOTION_WEIGHTS: Record<
  Expansion07ShadowSignalKey,
  number
> = {
  casualIntimacyIntent: 1.4,
  supportExchangeOrientation: 1.5,
  supportProviderOrientation: 1.3,
  supportRecipientOrientation: 1.3,
  religiousObservance: 1.5,
};

export const EXPANSION_07_PROMOTION_DOMAINS: Record<
  Expansion07ShadowSignalKey,
  string
> = {
  casualIntimacyIntent: 'intimacy',
  supportExchangeOrientation: 'relationship',
  supportProviderOrientation: 'relationship',
  supportRecipientOrientation: 'relationship',
  religiousObservance: 'values',
};

/** Standalone positive chip labels (provider/recipient use pair-level chips in Story 4). */
export const EXPANSION_07_PROMOTION_CHIP_LABELS: Partial<
  Record<Expansion07ShadowSignalKey, string>
> = {
  casualIntimacyIntent: 'Intimacy expectations',
  supportExchangeOrientation: 'Support & arrangement style',
  religiousObservance: 'Religious practice',
};
```

Agent 1 may adjust typing style to match repo, but keys/weights/domains/labels must match README.

**Do not** import this into `compatibility-score.ts` in Story 1.

### 7. Promotion-ready summary (document — do not implement scoring)

| Key | Tier | Weight | Domain | Standalone positive chip |
|-----|------|--------|--------|--------------------------|
| `casualIntimacyIntent` | Tier 1 | **1.4** | `intimacy` | `Intimacy expectations` |
| `supportExchangeOrientation` | Tier 1 | **1.5** | `relationship` | `Support & arrangement style` |
| `supportProviderOrientation` | Tier 1 | **1.3** | `relationship` | Pair-level only (Story 3–4) |
| `supportRecipientOrientation` | Tier 1 | **1.3** | `relationship` | Pair-level only (Story 3–4) |
| `religiousObservance` | Tier 1 | **1.5** | `values` | `Religious practice` |

**Story 4 note:** Pair-level chips `Financial support alignment` / `Non-transactional match` + interest overlap chips.

**Story 3 note (preview):**

| Rule id | Penalty | Chip |
|---------|---------|------|
| `casual_intimacy_clash` | **6** | `Casual vs committed intimacy` |
| `support_exchange_mismatch` | **6** | `Arrangement vs romance` |
| `support_both_provider` | **4** | `Both want to provide` |
| `support_both_recipient` | **4** | `Both seek support` |
| `religious_observance_gap` | **5** | `Religious practice gap` |

### 8. DB / migration (locked)

| Item | Decision |
|------|----------|
| Prisma migration | **None** |
| Backfill | **Out of scope** — keys appear on re-analyze only |
| Prior Expansion / Phase A keys | **Unchanged** |

### 9. Agent 4

**Skip.**

---

## Service / module placement

- Allowlist SoT: `extracted-signals.interface.ts`
- Exp-07 meta SoT: `expansion-07-signal-definitions.ts` (Story 1 metadata; Story 2 adds prompt block)

`EXTRACTION_SIGNAL_KEYS` / sets auto-union — no scoring wiring in Story 1.

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
| `SHADOW_SIGNAL_KEYS.length` | 15 → **20** |
| `EXTRACTION_SIGNAL_KEYS.length` | 30 → **35** |
| `MAX_EVIDENCE_ITEMS` | 34 → **39** |
| Membership | all 5 keys `toContain` |
| Existing | Expansion-01–06 keys still present |
| Meta module | `EXPANSION_07_SHADOW_SIGNAL_KEYS.length === 5`; weights/domains match lock |

Add `describe('Expansion-07 shadow mode (no scoring wire-up)')`:

- Keys under test: the five Expansion-07 keys
- All **not** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS`
- All **not** in `COMPATIBILITY_SIGNAL_KEYS`

Keep Expansion-01–06 regression describes intact.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Append five keys + set `MAX_EVIDENCE_ITEMS = 39` per §5.
2. Create `expansion-07-signal-definitions.ts` metadata per §6 (no LLM block).
3. Update `extracted-signals.spec.ts` (+ light meta asserts if useful).
4. Do **not** modify compatibility, explainability, tension, prompts, Prisma, or UI.
5. Run tests above; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add Expansion-07 profile-gap signals as shadow keys

Story 1 — allowlist + promotion metadata; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] Only allowlist + Exp-07 metadata module + specs (+ handoff) changed
- [ ] All five keys spelled exactly
- [ ] All in `SHADOW_SIGNAL_KEYS`, **not** in official/scored arrays
- [ ] `MAX_EVIDENCE_ITEMS === 39`
- [ ] Specs: 20 shadow / 35 total
- [ ] Distinction comments present
- [ ] No LLM prompt block / no `DOMAIN_ALLOWED` / no scoring drift
- [ ] Expansion-01–06 keys unchanged

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2 preview:** Add `EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK` (and possibly partner) to same definitions file; wire `SELF_EXTRACTOR_PROMPT`; sync `DOMAIN_ALLOWED` (self ± partner per README). Hebrew-aware semantic examples; PROTECT vs adjacent keys; no regex.
- **Story 4 interest chips:** May already have `sharedInterestNote` — architect Story 4 will reconcile with existing payload.
- **Promote:** README Story 5 mentions promote to 30 scored — treat as **optional gate**, not automatic; keep shadow until explicit promote decision.

---

## Next agent

```text
--agent 1 expansion 07 story 1
```

**Notes:** Same shadow playbook as Expansion-01–06 Story 1, but **five net-new keys** + a metadata-only `expansion-07-signal-definitions.ts`. Do **not** bump scoring registries. Story 2 owns LLM prompts.
