# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-11-stress-security  
**Date:** 2026-08-07  
**Status:** complete  

**Depends on:** Expansion-10 Done — see `sprint-expansion-10-conflict-recovery/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for **two** new keys + promotion-ready metadata module. **No** scoring, tension, chips, or LLM prompt blocks in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md`)

---

## Summary

- Expansion-11 adds **stress & security** signals: `stressResponse`, `jealousySecurity`.
- Both keys are **net-new** — do not exist in the codebase yet.
- Story 1: append both to `SHADOW_SIGNAL_KEYS`, bump `MAX_EVIDENCE_ITEMS`, create **`expansion-11-signal-definitions.ts` metadata only** (weights/tiers/domains/chips — **not** LLM SELF/PARTNER blocks).
- Follow **Expansion-01–10 Story 1 lock** — **not** naive README promote into `SignalKey` / `COMPATIBILITY_WEIGHTS` / `match-explainability.ts` now.
- **No Prisma migration.**
- Document distinctions (comments + this handoff) — prompt wiring is Story 2.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | **15** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-10) | **26** |
| Total extraction keys | **41** |
| `MAX_EVIDENCE_ITEMS` | **45** (= 15 + 26 + 4) |
| Self `DOMAIN_ALLOWED` | **33** (Story 2 will expand for Exp-11) |
| Partner `DOMAIN_ALLOWED` | **19** (Story 2 will sync self+partner) |
| Adjacent scored | `attachmentSecurity`, `independence` |
| Adjacent shadow | `emotionalRegulation`, `repairSkills` / `forgivenessStyle` (Exp-10) |
| Two Exp-11 keys | **Do not exist** — Story 1 adds both |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add keys + weights/tiers/domains in Story 1 | **Shadow allowlist + metadata module** — do **not** wire `COMPATIBILITY_WEIGHTS` / `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL` |
| Files: `compatibility-score.ts`, `match-explainability.ts` | **Out of scope** Story 1 (promote / Stories 3–5) |
| Update signal count docs (38 total after promote) | Product milestone after **future promote** of expansion set — **as-built after Story 1:** **15 scored + 28 shadow = 43** extraction keys. Do **not** promote in Story 1 |
| `expansion-11-signal-definitions.ts` | **Create** with **metadata constants only**; LLM blocks are **Story 2** (Story 2 README “create” = extend this file) |
| Unit test: keys validate in strict extraction schema | Story 1 gate = **`extracted-signals.spec.ts` allowlist + meta asserts**. Sync `DOMAIN_ALLOWED` / prompts is **Story 2** |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | **Optional** doc-only; **not** a Story 1 gate |
| Onboarding prompts | **Story 4** (copy) / Story 2 may note text feeds same extractor — no schema for prompts in Story 1 |
| Positive chip “Secure & trusting” (both low jealousy) | **Story 3/4** — metadata chip label for `jealousySecurity` stays README Signals table **`Trust & security`** |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append 2 keys to `SHADOW_SIGNAL_KEYS` with distinction JSDoc; bump `MAX_EVIDENCE_ITEMS` **45 → 47** |
| `dating-api/src/extraction/expansion-11-signal-definitions.ts` | **Create** — promotion-ready meta (keys, weights, tiers, domains, chip labels). **No** LLM prompt block yet |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert 2 keys; shadow **26 → 28**; total **41 → 43**; `MAX_EVIDENCE_ITEMS === 47`; Expansion-11 shadow-mode regression block |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` | Stories 3–4 |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts` ALLOWED KEYS / prompts | Story 2 |
| `DOMAIN_ALLOWED_SIGNAL_KEYS` / `extraction-strict-validation.ts` | Story 2 (sync with prompts) |
| LLM `EXPANSION_11_*_SHADOW_SIGNAL_BLOCK` body | Story 2 (extend same definitions file) |
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
| New allowlist keys | `stressResponse`, `jealousySecurity` |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still **15**) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

### 2. Key names & scale (locked)

| Key | Status | Scale (Story 2) | Meaning |
|-----|--------|-----------------|---------|
| `stressResponse` | **New** | **1–10** or null | Direction under stress: withdraw/self-reliant (**low**) ↔ seek closeness/support (**high**). **Compatibility axis** — neither end is “better” |
| `jealousySecurity` | **New** | **1–10** or null | Secure/trusting, low jealousy (**low**) ↔ highly jealous/possessive (**high**). Name is historical; **high = more jealousy**, not more security |

CamelCase exact spelling — no aliases (`jealousyStyle` forbidden). Scale **1–10**.

### 3. Distinct from existing keys (locked — Story 2 must echo)

| Existing / adjacent | Distinct angle for Expansion-11 |
|---------------------|----------------------------------|
| `attachmentSecurity` (scored) | General relational closeness/security pattern — **not** pursue/withdraw specifically under stress, and **not** jealousy/possessiveness |
| `emotionalRegulation` (Exp-02 shadow) | Reactivity / volatility management — **not** pursue vs withdraw direction under pressure |
| `independence` (scored) | Need for autonomy/space in general — **not** trust/jealousy/possessiveness |
| `repairSkills` / `forgivenessStyle` (Exp-10) | Post-conflict repair / grudge pacing — **not** stress-time pursue/withdraw or jealousy |
| Silence / no stress or jealousy text | Prefer **null** — do not invent scores |

### 4. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 45 = 15 official + 26 shadow + 4 buffer
After:  47 = 15 official + 28 shadow + 4 buffer
```

### 5. Interface edit (copy-paste ready)

Append after `forgivenessStyle`:

```typescript
  /**
   * Expansion-11 — Stress & Security (shadow until promote).
   * stressResponse: pursue vs withdraw under stress — NOT attachmentSecurity / emotionalRegulation alone.
   * jealousySecurity: jealousy/possessiveness vs trust (high = more jealous) — NOT independence / attachmentSecurity alone.
   */
  'stressResponse',
  'jealousySecurity',
] as const;

/** Max evidence items: 15 official + 28 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 47;
```

Update the prior `MAX_EVIDENCE_ITEMS` comment that still says “26 shadow”.

### 6. Metadata module (locked — Story 1 creates; Story 2 extends)

Create `dating-api/src/extraction/expansion-11-signal-definitions.ts`:

```typescript
/**
 * Expansion-11 promotion-ready metadata (shadow until promote).
 * LLM semantic prompt block is added in Story 2 — do not put keyword heuristics here.
 */

export const EXPANSION_11_SHADOW_SIGNAL_KEYS = [
  'stressResponse',
  'jealousySecurity',
] as const;

export type Expansion11ShadowSignalKey =
  (typeof EXPANSION_11_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_11_PROMOTION_WEIGHTS: Record<
  Expansion11ShadowSignalKey,
  number
> = {
  stressResponse: 1.3,
  jealousySecurity: 1.4,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_11_PROMOTION_TIERS: Record<
  Expansion11ShadowSignalKey,
  1 | 2 | 3
> = {
  stressResponse: 2,
  jealousySecurity: 1,
};

export const EXPANSION_11_PROMOTION_DOMAINS: Record<
  Expansion11ShadowSignalKey,
  string
> = {
  stressResponse: 'emotional',
  jealousySecurity: 'emotional',
};

export const EXPANSION_11_PROMOTION_CHIP_LABELS: Record<
  Expansion11ShadowSignalKey,
  string
> = {
  stressResponse: 'Support under pressure',
  jealousySecurity: 'Trust & security',
};
```

Exact chip labels match sprint README **Signals Added** table. Story 4 pair positive for both-low jealousy is **`Secure & trusting`** (different string — do not invent that chip in Story 1).

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
| Membership | `SHADOW_SIGNAL_KEYS` / `_SET` contain `stressResponse`, `jealousySecurity` |
| Length | `SHADOW_SIGNAL_KEYS.length === 28` |
| Total | `EXTRACTION_SIGNAL_KEYS.length === 43` |
| Evidence cap | `MAX_EVIDENCE_ITEMS === 47` |
| Not scored | neither key in `COMPATIBILITY_SIGNAL_KEYS` / `OFFICIAL_EXTRACTION_SIGNAL_KEYS` |
| Meta module | `EXPANSION_11_SHADOW_SIGNAL_KEYS` length 2; weights/tiers/domains/labels match §6 |
| Adjacent | Exp-10 keys still present; `independence` / `attachmentSecurity` remain official only |

Mirror Exp-10 `describe('Expansion-11 shadow mode (no scoring wire-up)')` — do **not** require `DOMAIN_ALLOWED` membership until Story 2.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Append two keys + bump `MAX_EVIDENCE_ITEMS` per §5.
2. Create `expansion-11-signal-definitions.ts` per §6.
3. Update `extracted-signals.spec.ts` counts and Exp-11 shadow-mode block.
4. Do **not** touch scoring, tension, prompts, `DOMAIN_ALLOWED`, UI, or promote registries.
5. Run tests; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add Expansion-11 stressResponse and jealousySecurity shadow keys

Story 1 — shadow allowlist 26→28; metadata module; no scoring wire-up.
```

---

## Agent 2 CR checklist

- [ ] Only allowlist + MAX_EVIDENCE + metadata module + specs (+ handoff) changed
- [ ] Keys spelled exactly: `stressResponse`, `jealousySecurity`
- [ ] Shadow length **28**; total **43**; `MAX_EVIDENCE_ITEMS === 47`
- [ ] Not in `COMPATIBILITY_SIGNAL_KEYS` / official keys
- [ ] Metadata weights/tiers/domains/chips match README (tiers **2** / **1**; weights **1.3** / **1.4**; domain **emotional**)
- [ ] No prompt / DOMAIN_ALLOWED / tension / scoring / i18n drift
- [ ] Specs + typecheck pass

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2:** LLM semantic blocks; self+partner `DOMAIN_ALLOWED`; distinguish from attachment / regulation / independence; emphasize `jealousySecurity` high = jealous; Hebrew examples.
- **Story 3:** Three tension rules + English chips; both-low jealousy positive later in Story 4.
- **Story 4:** Positive chips (`Support under pressure` aligned; `Secure & trusting` both-low) + i18n + onboarding prompt copy.
- **Story 5:** Fixtures / >85% / promote gate (product “38” framing vs as-built counts — reconcile at promote; do **not** treat README “38” as Story 1 deliverable).

---

## Next agent

```text
--agent 1 expansion 11 story 1
```

**Notes:** Shadow-first. Mandatory `LLM_FIRST_PRINCIPLE.md`. Story 2 owns prompts. `jealousySecurity` scale polarity is inverted vs “goodness” — document clearly for extractors.
