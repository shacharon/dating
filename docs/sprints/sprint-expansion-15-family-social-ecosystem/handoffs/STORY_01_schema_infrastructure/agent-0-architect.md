# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-15-family-social-ecosystem  
**Date:** 2026-08-08  
**Status:** complete  

**Depends on:** Expansion-14 Done — see `sprint-expansion-14-tolerance-intimacy-pacing/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for **three** new keys + promotion-ready metadata module. **No** scoring, tension, chips, or LLM prompt blocks in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology final sprint (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md`)

---

## Summary

- Expansion-15 adds **family & social ecosystem** signals: `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed`.
- All three keys are **net-new** — do not exist in the codebase yet.
- Domains reuse existing strings: **`relationship`** (family) and **`social`** (friends/couple balance + alone time) — metadata only this story; chip-diversity runtime lands Story 4 / promote.
- Story 1: append three to `SHADOW_SIGNAL_KEYS`, bump `MAX_EVIDENCE_ITEMS`, create **`expansion-15-signal-definitions.ts` metadata only** (weights/tiers/domains/chips — **not** LLM SELF/PARTNER blocks).
- Follow **Expansion-01–14 Story 1 lock** — **not** naive README promote into `SignalKey` / `COMPATIBILITY_WEIGHTS` / `match-explainability.ts` now.
- **No Prisma migration.**
- Document distinctions (comments + this handoff) — prompt wiring is Story 2.
- Agent 4 **skipped**.
- Phase 6 “full rollout / 48 scored / promote all 14” is **Story 5 / future promote** — **not** Story 1.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | **15** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-14) | **35** |
| Total extraction keys | **50** |
| `MAX_EVIDENCE_ITEMS` | **54** (= 15 + 35 + 4) |
| Self `DOMAIN_ALLOWED` | **42** (Story 2 will expand for Exp-15) |
| Partner `DOMAIN_ALLOWED` | **28** (Story 2 will sync self+partner) |
| `CHIP_EVIDENCE_KEYS` | **40** (Story 4 will grow) |
| Adjacent scored / shadow | `traditionalism`, `socialBattery`, `independence` |
| Three Exp-15 keys | **Do not exist** — Story 1 adds all three |
| Domains `relationship` / `social` | Already used elsewhere (`socialBattery` → `social`) — OK to reuse as metadata strings |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add keys + weights/tiers/domains in Story 1 | **Shadow allowlist + metadata module** — do **not** wire `COMPATIBILITY_WEIGHTS` / `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL` |
| Files: `compatibility-score.ts`, `match-explainability.ts` | **Out of scope** Story 1 (promote / Stories 3–5) — README “at promote gate” |
| Update signal count docs (48 total after promote) | Product milestone after **future promote** of expansion set — **as-built after Story 1:** **15 scored + 38 shadow = 53** extraction keys. Do **not** promote in Story 1 |
| `expansion-15-signal-definitions.ts` | **Create** with **metadata constants only**; LLM blocks are **Story 2** (Story 2 README “create” = extend this file) |
| Unit test: keys validate in strict extraction schema | Story 1 gate = **`extracted-signals.spec.ts` allowlist + meta asserts**. Sync `DOMAIN_ALLOWED` / prompts is **Story 2** |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | **Optional** doc-only; **not** a Story 1 gate |
| Onboarding prompts | **Story 4** (copy) / Story 2 may note text feeds same extractor — no schema for prompts in Story 1 |
| Browse positives (`Family style match` / `Friends & couple balance` / `Recharge style match`) | **Story 4** — Story 1 meta chips stay README **Signals Added** table strings |
| Phase 6 full rollout checklist / 10% A/B / backfill | **Story 5** (+ operator) — **not** Story 1 |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append 3 keys to `SHADOW_SIGNAL_KEYS` with distinction JSDoc; bump `MAX_EVIDENCE_ITEMS` **54 → 57** |
| `dating-api/src/extraction/expansion-15-signal-definitions.ts` | **Create** — promotion-ready meta (keys, weights, tiers, domains, chip labels). **No** LLM prompt block yet |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert 3 keys; shadow **35 → 38**; total **50 → 53**; `MAX_EVIDENCE_ITEMS === 57`; Expansion-15 shadow-mode regression block |
| `dating-api/src/extraction/expansion-14-rollout.spec.ts` (and Exp-10/11/12/13 if needed) | Update global count asserts if present (**35→38**, **50→53**, **54→57**; DOMAIN lengths stay **42/28** until Story 2) — only if those specs hard-code totals |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` / scored `SIGNAL_DOMAIN` | Stories 3–4 / promote |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts` ALLOWED KEYS / prompts | Story 2 |
| `DOMAIN_ALLOWED_SIGNAL_KEYS` / `extraction-strict-validation.ts` | Story 2 (sync with prompts) |
| LLM `EXPANSION_15_*_SHADOW_SIGNAL_BLOCK` body | Story 2 (extend same definitions file) |
| Onboarding prompt UI / i18n | Story 4 |
| Phase 6 promote-all / correlation matrix / A/B / backfill | Story 5 / operator |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | Doc-only; not a Story 1 gate |
| Prisma / backfill | N/A / later |
| Prior expansion promote | Separate future story |
| Keyword / regex extraction | **Forbidden** |

---

## Decisions (do not reverse without discussion)

### 1. Shadow-first (locked)

| Choice | Lock |
|--------|------|
| New allowlist keys | `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still **15**) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

### 2. Key names & scale (locked)

| Key | Status | Scale (Story 2) | Meaning |
|-----|--------|-----------------|---------|
| `familyEnmeshment` | **New** | **1–10** or null | Family-of-origin involvement in daily decisions/boundaries: very independent/boundaried (**low**) ↔ highly enmeshed (**high**) |
| `friendCoupleBalance` | **New** | **1–10** or null | Where social time goes: friends-first (**low**) ↔ couple-centric (**high**); neither end inherently better |
| `aloneTimeNeed` | **New** | **1–10** or null | Need for solo recharge: rarely needs alone time / prefers togetherness (**low**) ↔ strong need for significant alone time (**high**) |

CamelCase exact spelling — no aliases (`family`, `friends`, `aloneTime` as key names forbidden). Scale **1–10**.

**Critical scale note for `friendCoupleBalance`:** Low = friends-first; high = couple-centric. Do **not** invert this in metadata comments or later stories.

### 3. Distinct from existing keys (locked — Story 2 must echo)

| Existing / adjacent | Distinct angle for Expansion-15 |
|---------------------|----------------------------------|
| `traditionalism` (scored) | General life-structure values — **not** day-to-day family-of-origin involvement/boundaries |
| `socialBattery` (scored) | Introversion/extroversion *energy* — **not** *where* social time goes (friends vs partner) |
| `independence` (scored) | General autonomy across life decisions — **not** specifically solo recharge time |
| Silence / no related text | Prefer **null** — do not invent scores |

### 4. Domains (locked)

| Key | `EXPANSION_15_PROMOTION_DOMAINS` |
|-----|----------------------------------|
| `familyEnmeshment` | **`relationship`** |
| `friendCoupleBalance` | **`social`** |
| `aloneTimeNeed` | **`social`** |

| Layer | Story 1 | Later |
|-------|---------|-------|
| Promotion domains meta | As above | — |
| Scored `SIGNAL_DOMAIN` | **Unchanged** | Promote story |
| `SHADOW_SIGNAL_DOMAIN` in Exp-15 explainability | **Not created** | Story 4 |
| Chip-diversity runtime | **Unchanged** | Story 4 |

### 5. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 54 = 15 official + 35 shadow + 4 buffer
After:  57 = 15 official + 38 shadow + 4 buffer
```

### 6. Interface edit (copy-paste ready)

Append after `monogamyAlignment`:

```typescript
  /**
   * Expansion-15 — Family & Social Ecosystem (shadow until promote).
   * familyEnmeshment: family-of-origin involvement/boundaries — NOT traditionalism alone.
   * friendCoupleBalance: friends-first (low) ↔ couple-centric (high) — NOT socialBattery alone.
   * aloneTimeNeed: solo recharge need — NOT independence alone.
   */
  'familyEnmeshment',
  'friendCoupleBalance',
  'aloneTimeNeed',
] as const;

/** Max evidence items: 15 official + 38 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 57;
```

Update the prior `MAX_EVIDENCE_ITEMS` comment that still says “35 shadow”.

### 7. Metadata module (locked — Story 1 creates; Story 2 extends)

Create `dating-api/src/extraction/expansion-15-signal-definitions.ts`:

```typescript
/**
 * Expansion-15 promotion-ready metadata (shadow until promote).
 * LLM semantic prompt block is added in Story 2 — do not put keyword heuristics here.
 */

export const EXPANSION_15_SHADOW_SIGNAL_KEYS = [
  'familyEnmeshment',
  'friendCoupleBalance',
  'aloneTimeNeed',
] as const;

export type Expansion15ShadowSignalKey =
  (typeof EXPANSION_15_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_15_PROMOTION_WEIGHTS: Record<
  Expansion15ShadowSignalKey,
  number
> = {
  familyEnmeshment: 1.2,
  friendCoupleBalance: 1.1,
  aloneTimeNeed: 1.2,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_15_PROMOTION_TIERS: Record<
  Expansion15ShadowSignalKey,
  1 | 2 | 3
> = {
  familyEnmeshment: 2,
  friendCoupleBalance: 3,
  aloneTimeNeed: 2,
};

export const EXPANSION_15_PROMOTION_DOMAINS: Record<
  Expansion15ShadowSignalKey,
  string
> = {
  familyEnmeshment: 'relationship',
  friendCoupleBalance: 'social',
  aloneTimeNeed: 'social',
};

export const EXPANSION_15_PROMOTION_CHIP_LABELS: Record<
  Expansion15ShadowSignalKey,
  string
> = {
  familyEnmeshment: 'Family closeness',
  friendCoupleBalance: 'Friends & couple balance',
  aloneTimeNeed: 'Alone time needs',
};
```

Exact chip labels match sprint README **Signals Added** table.

**Meta ≠ browse (Story 4):**

| Key | Story 1 meta | Story 4 browse |
|-----|--------------|----------------|
| `familyEnmeshment` | Family closeness | Family style match |
| `friendCoupleBalance` | Friends & couple balance | Friends & couple balance (aligned; same string OK) |
| `aloneTimeNeed` | Alone time needs | Recharge style match |

Do **not** invent Story 4 browse strings in Story 1.

### 8. Prior rollout specs that hard-code totals (locked)

If Agent 1 finds hard-coded global counts in `expansion-10`…`14-rollout.spec.ts`, bump only the **global** length asserts to post–Story-1 values:

| Assert | New value |
|--------|-----------|
| `SHADOW_SIGNAL_KEYS.length` | **38** |
| `EXTRACTION_SIGNAL_KEYS.length` | **53** |
| `MAX_EVIDENCE_ITEMS` | **57** |
| `DOMAIN_ALLOWED` self/partner lengths | **Unchanged** (**42** / **28**) until Story 2 |

Do **not** change Exp-10–14 key membership asserts.

### 9. Domains preview (Story 2 — not Story 1)

README: wire **self + partner**. Story 2 will decide ALLOWED KEYS placement (likely self + partner for all three). Story 1 does not edit prompts or `DOMAIN_ALLOWED`.

### 10. Agent 4

**Skip.** Schema/metadata only.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npx jest src/extraction/expansion-14-rollout.spec.ts src/extraction/expansion-13-rollout.spec.ts src/extraction/expansion-12-rollout.spec.ts src/extraction/expansion-11-rollout.spec.ts src/extraction/expansion-10-rollout.spec.ts --runInBand
npm run typecheck
```

Update / add asserts:

| Assert | Detail |
|--------|--------|
| Membership | `SHADOW_SIGNAL_KEYS` / `_SET` contain all three Exp-15 keys |
| Length | `SHADOW_SIGNAL_KEYS.length === 38` |
| Total | `EXTRACTION_SIGNAL_KEYS.length === 53` |
| Evidence cap | `MAX_EVIDENCE_ITEMS === 57` |
| Not scored | none of the three in `COMPATIBILITY_SIGNAL_KEYS` / `OFFICIAL_EXTRACTION_SIGNAL_KEYS` |
| Meta module | `EXPANSION_15_SHADOW_SIGNAL_KEYS` length 3; weights/tiers/domains/labels match §7 |
| Adjacent | Exp-14 keys still present; adjacent distinctions documented |

Mirror Exp-14 `describe('Expansion-15 shadow mode (no scoring wire-up)')` — do **not** require `DOMAIN_ALLOWED` membership until Story 2.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Append three keys + bump `MAX_EVIDENCE_ITEMS` per §6.
2. Create `expansion-15-signal-definitions.ts` per §7.
3. Update `extracted-signals.spec.ts` counts and Exp-15 shadow-mode block.
4. Bump prior expansion rollout specs’ global count asserts if they fail (§8).
5. Do **not** touch scoring, tension, prompts, `DOMAIN_ALLOWED`, scored `SIGNAL_DOMAIN`, UI, Phase 6 promote-all, or promote registries.
6. Run tests; write `agent-1-dev.md` under `docs/sprints/sprint-expansion-15-family-social-ecosystem/handoffs/STORY_01_schema_infrastructure/`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add Expansion-15 familyEnmeshment friendCoupleBalance aloneTimeNeed shadow keys

Story 1 — shadow allowlist 35→38; metadata module; no scoring wire-up.
```

---

## Agent 2 CR checklist

- [ ] Only allowlist + MAX_EVIDENCE + metadata module + specs (+ prior rollout count bumps + handoff) changed
- [ ] Keys spelled exactly: `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed`
- [ ] Shadow length **38**; total **53**; `MAX_EVIDENCE_ITEMS === 57`
- [ ] Not in `COMPATIBILITY_SIGNAL_KEYS` / official keys
- [ ] Metadata weights/tiers/domains/chips match README (weights **1.2 / 1.1 / 1.2**; tiers **2 / 3 / 2**; domains **relationship / social / social**)
- [ ] No prompt / DOMAIN_ALLOWED / tension / scoring / i18n / Phase 6 promote-all drift
- [ ] Specs + typecheck pass

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2:** LLM semantic blocks; self+partner `DOMAIN_ALLOWED`; distinguish from traditionalism / socialBattery / independence; Hebrew examples; **friendCoupleBalance low=friends-first high=couple-centric** scale lock.
- **Story 3:** Three tension rules (penalties **4 / 3 / 3**) + English chips; positives deferred to Story 4.
- **Story 4:** Browse positives + i18n + onboarding.
- **Story 5:** Fixtures / >85% / Phase 6 full rollout gate (product “48” framing vs as-built counts — reconcile at promote; do **not** treat README “48” as Story 1 deliverable).
- **Later / Story 5 operator:** Correlation matrix, A/B 10%, backfill — out of scope Story 1.

---

## Next agent

```text
--agent 1 expansion 15 story 1
```

**Notes:** Shadow-first. Mandatory `LLM_FIRST_PRINCIPLE.md`. Story 2 owns prompts. Meta chip labels ≠ Story 4 browse chip strings (except `Friends & couple balance` may match). `friendCoupleBalance` scale: low = friends-first, high = couple-centric. Phase 6 promote-all is **not** this story.
