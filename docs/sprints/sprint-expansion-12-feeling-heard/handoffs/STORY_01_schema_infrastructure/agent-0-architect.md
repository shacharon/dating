# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-12-feeling-heard  
**Date:** 2026-08-07  
**Status:** complete  

**Depends on:** Expansion-11 Done — see `sprint-expansion-11-stress-security/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for **two** new keys + promotion-ready metadata module. **No** scoring, tension, chips, or LLM prompt blocks in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology (`PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md`)

---

## Summary

- Expansion-12 adds **feeling heard** signals: `listeningPresence`, `emotionalExpression`.
- Both keys are **net-new** — do not exist in the codebase yet.
- Story 1: append both to `SHADOW_SIGNAL_KEYS`, bump `MAX_EVIDENCE_ITEMS`, create **`expansion-12-signal-definitions.ts` metadata only** (weights/tiers/domains/chips — **not** LLM SELF/PARTNER blocks).
- Follow **Expansion-01–11 Story 1 lock** — **not** naive README promote into `SignalKey` / `COMPATIBILITY_WEIGHTS` / `match-explainability.ts` now.
- **No Prisma migration.**
- Document distinctions (comments + this handoff) — prompt wiring is Story 2.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | **15** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-11) | **28** |
| Total extraction keys | **43** |
| `MAX_EVIDENCE_ITEMS` | **47** (= 15 + 28 + 4) |
| Self `DOMAIN_ALLOWED` | **35** (Story 2 will expand for Exp-12) |
| Partner `DOMAIN_ALLOWED` | **21** (Story 2 will sync self+partner) |
| Adjacent scored | `empathyCompassion`, `directness`, `emotionalDepth` |
| Adjacent shadow | `physicalAffectionStyle` (Exp-02); Exp-11 stress/jealousy |
| Two Exp-12 keys | **Do not exist** — Story 1 adds both |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add keys + weights/tiers/domains in Story 1 | **Shadow allowlist + metadata module** — do **not** wire `COMPATIBILITY_WEIGHTS` / `SignalKey` / `POSITIVE_CHIP_BY_SIGNAL` |
| Files: `compatibility-score.ts`, `match-explainability.ts` | **Out of scope** Story 1 (promote / Stories 3–5) |
| Update signal count docs (40 total after promote) | Product milestone after **future promote** of expansion set — **as-built after Story 1:** **15 scored + 30 shadow = 45** extraction keys. Do **not** promote in Story 1 |
| `expansion-12-signal-definitions.ts` | **Create** with **metadata constants only**; LLM blocks are **Story 2** (Story 2 README “create” = extend this file) |
| Unit test: keys validate in strict extraction schema | Story 1 gate = **`extracted-signals.spec.ts` allowlist + meta asserts**. Sync `DOMAIN_ALLOWED` / prompts is **Story 2** |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | **Optional** doc-only; **not** a Story 1 gate |
| Onboarding prompts | **Story 4** (copy) / Story 2 may note text feeds same extractor — no schema for prompts in Story 1 |
| Positive chip “Feels heard” (both high listening) | **Story 3/4** — metadata chip label for `listeningPresence` stays README Signals table **`Quality listening`** |
| Aligned expression chip “Expressiveness match” | **Story 4** — metadata label for `emotionalExpression` stays **`Expressiveness`** |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append 2 keys to `SHADOW_SIGNAL_KEYS` with distinction JSDoc; bump `MAX_EVIDENCE_ITEMS` **47 → 49** |
| `dating-api/src/extraction/expansion-12-signal-definitions.ts` | **Create** — promotion-ready meta (keys, weights, tiers, domains, chip labels). **No** LLM prompt block yet |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert 2 keys; shadow **28 → 30**; total **43 → 45**; `MAX_EVIDENCE_ITEMS === 49`; Expansion-12 shadow-mode regression block |
| `dating-api/src/extraction/expansion-11-rollout.spec.ts` | Update global count asserts if present (**28→30**, **43→45**, **47→49**, DOMAIN lengths stay **35/21** until Story 2) — only if those specs hard-code totals |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` | Stories 3–4 |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts` ALLOWED KEYS / prompts | Story 2 |
| `DOMAIN_ALLOWED_SIGNAL_KEYS` / `extraction-strict-validation.ts` | Story 2 (sync with prompts) |
| LLM `EXPANSION_12_*_SHADOW_SIGNAL_BLOCK` body | Story 2 (extend same definitions file) |
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
| New allowlist keys | `listeningPresence`, `emotionalExpression` |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still **15**) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

### 2. Key names & scale (locked)

| Key | Status | Scale (Story 2) | Meaning |
|-----|--------|-----------------|---------|
| `listeningPresence` | **New** | **1–10** or null | Quality of attention/presence when partner speaks: distracted/interrupting (**low**) ↔ deeply present / partner feels heard (**high**) |
| `emotionalExpression` | **New** | **1–10** or null | Outward verbal/emotional expression: reserved/internal (**low**) ↔ frequently expresses feelings/affection/appreciation (**high**) |

CamelCase exact spelling — no aliases (`listeningStyle`, `expressiveness` as key names forbidden). Scale **1–10**.

### 3. Distinct from existing keys (locked — Story 2 must echo)

| Existing / adjacent | Distinct angle for Expansion-12 |
|---------------------|----------------------------------|
| `empathyCompassion` (scored / Exp-01) | Understanding/caring about feelings — **not** the behavioral act of full attention / not interrupting |
| `directness` (scored) | How they speak / say hard things — **not** how they receive / listen |
| `emotionalDepth` (scored) | Capacity to feel/discuss deep emotion — **not** how outwardly that emotion is shown (deep+reserved or shallow+expressive both possible) |
| `physicalAffectionStyle` (Exp-02 shadow) | Physical touch affection — **not** verbal/emotional expression (words of affirmation, saying feelings out loud) |
| Silence / no listening or expression text | Prefer **null** — do not invent scores |

### 4. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 47 = 15 official + 28 shadow + 4 buffer
After:  49 = 15 official + 30 shadow + 4 buffer
```

### 5. Interface edit (copy-paste ready)

Append after `jealousySecurity`:

```typescript
  /**
   * Expansion-12 — Feeling Heard (shadow until promote).
   * listeningPresence: attention/presence when partner speaks — NOT empathyCompassion / directness alone.
   * emotionalExpression: outward verbal/emotional expression — NOT emotionalDepth / physicalAffectionStyle alone.
   */
  'listeningPresence',
  'emotionalExpression',
] as const;

/** Max evidence items: 15 official + 30 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 49;
```

Update the prior `MAX_EVIDENCE_ITEMS` comment that still says “28 shadow”.

### 6. Metadata module (locked — Story 1 creates; Story 2 extends)

Create `dating-api/src/extraction/expansion-12-signal-definitions.ts`:

```typescript
/**
 * Expansion-12 promotion-ready metadata (shadow until promote).
 * LLM semantic prompt block is added in Story 2 — do not put keyword heuristics here.
 */

export const EXPANSION_12_SHADOW_SIGNAL_KEYS = [
  'listeningPresence',
  'emotionalExpression',
] as const;

export type Expansion12ShadowSignalKey =
  (typeof EXPANSION_12_SHADOW_SIGNAL_KEYS)[number];

/** Document-only until promote — not wired into COMPATIBILITY_WEIGHTS yet. */
export const EXPANSION_12_PROMOTION_WEIGHTS: Record<
  Expansion12ShadowSignalKey,
  number
> = {
  listeningPresence: 1.3,
  emotionalExpression: 1.2,
};

/** Document-only until promote — not wired into TIER registries yet. */
export const EXPANSION_12_PROMOTION_TIERS: Record<
  Expansion12ShadowSignalKey,
  1 | 2 | 3
> = {
  listeningPresence: 2,
  emotionalExpression: 2,
};

export const EXPANSION_12_PROMOTION_DOMAINS: Record<
  Expansion12ShadowSignalKey,
  string
> = {
  listeningPresence: 'communication',
  emotionalExpression: 'emotional',
};

export const EXPANSION_12_PROMOTION_CHIP_LABELS: Record<
  Expansion12ShadowSignalKey,
  string
> = {
  listeningPresence: 'Quality listening',
  emotionalExpression: 'Expressiveness',
};
```

Exact chip labels match sprint README **Signals Added** table. Story 4 browse positives are **`Feels heard`** (both-high listening) and **`Expressiveness match`** (aligned expression) — different strings; do **not** invent those in Story 1.

### 7. Prior rollout specs that hard-code totals (locked)

If Agent 1 finds hard-coded global counts in `expansion-10-rollout.spec.ts` / `expansion-11-rollout.spec.ts`, bump only the **global** length asserts to post–Story-1 values:

| Assert | New value |
|--------|-----------|
| `SHADOW_SIGNAL_KEYS.length` | **30** |
| `EXTRACTION_SIGNAL_KEYS.length` | **45** |
| `MAX_EVIDENCE_ITEMS` | **49** |
| `DOMAIN_ALLOWED` self/partner lengths | **Unchanged** (**35** / **21**) until Story 2 |

Do **not** change Exp-10/11 key membership asserts.

### 8. Domains preview (Story 2 — not Story 1)

README: wire **self + partner**. Relationship domain **unchanged** in Story 2. Story 1 does not edit prompts or `DOMAIN_ALLOWED`.

### 9. Agent 4

**Skip.** Schema/metadata only.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npx jest src/extraction/expansion-11-rollout.spec.ts src/extraction/expansion-10-rollout.spec.ts --runInBand
npm run typecheck
```

Update / add asserts:

| Assert | Detail |
|--------|--------|
| Membership | `SHADOW_SIGNAL_KEYS` / `_SET` contain `listeningPresence`, `emotionalExpression` |
| Length | `SHADOW_SIGNAL_KEYS.length === 30` |
| Total | `EXTRACTION_SIGNAL_KEYS.length === 45` |
| Evidence cap | `MAX_EVIDENCE_ITEMS === 49` |
| Not scored | neither key in `COMPATIBILITY_SIGNAL_KEYS` / `OFFICIAL_EXTRACTION_SIGNAL_KEYS` |
| Meta module | `EXPANSION_12_SHADOW_SIGNAL_KEYS` length 2; weights/tiers/domains/labels match §6 |
| Adjacent | Exp-11 keys still present; `empathyCompassion` / `emotionalDepth` / `directness` remain official only |

Mirror Exp-11 `describe('Expansion-12 shadow mode (no scoring wire-up)')` — do **not** require `DOMAIN_ALLOWED` membership until Story 2.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Append two keys + bump `MAX_EVIDENCE_ITEMS` per §5.
2. Create `expansion-12-signal-definitions.ts` per §6.
3. Update `extracted-signals.spec.ts` counts and Exp-12 shadow-mode block.
4. Bump prior expansion rollout specs’ global count asserts if they fail (§7).
5. Do **not** touch scoring, tension, prompts, `DOMAIN_ALLOWED`, UI, or promote registries.
6. Run tests; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add Expansion-12 listeningPresence and emotionalExpression shadow keys

Story 1 — shadow allowlist 28→30; metadata module; no scoring wire-up.
```

---

## Agent 2 CR checklist

- [ ] Only allowlist + MAX_EVIDENCE + metadata module + specs (+ prior rollout count bumps + handoff) changed
- [ ] Keys spelled exactly: `listeningPresence`, `emotionalExpression`
- [ ] Shadow length **30**; total **45**; `MAX_EVIDENCE_ITEMS === 49`
- [ ] Not in `COMPATIBILITY_SIGNAL_KEYS` / official keys
- [ ] Metadata weights/tiers/domains/chips match README (tiers **2** / **2**; weights **1.3** / **1.2**; domains **communication** / **emotional**)
- [ ] No prompt / DOMAIN_ALLOWED / tension / scoring / i18n drift
- [ ] Specs + typecheck pass

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2:** LLM semantic blocks; self+partner `DOMAIN_ALLOWED`; distinguish from empathy / directness / depth / physical affection; Hebrew examples.
- **Story 3:** Two tension rules + English chips; both-high listening positive later in Story 4.
- **Story 4:** Positive chips (`Feels heard` both-high listening; `Expressiveness match` aligned) + i18n + onboarding prompt copy.
- **Story 5:** Fixtures / >85% / promote gate (product “40” framing vs as-built counts — reconcile at promote; do **not** treat README “40” as Story 1 deliverable).

---

## Next agent

```text
--agent 1 expansion 12 story 1
```

**Notes:** Shadow-first. Mandatory `LLM_FIRST_PRINCIPLE.md`. Story 2 owns prompts. Meta chip labels ≠ Story 4 browse chip strings — keep them distinct.
