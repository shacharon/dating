# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-04-intellectual-creative  
**Date:** 2026-08-07  
**Status:** complete  

**Depends on:** Expansion-03 complete in shadow mode — see `sprint-expansion-03-humor-playfulness/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for **new** key `creativeExpression`. **No** scoring, tension, chips, or LLM prompt work in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Expansion-04 is **Phase 2** (Activity-Style). Sprint signals: `intellectualCuriosity` + `creativeExpression`.
- **Critical baseline:** `intellectualCuriosity` is **already** in `SHADOW_SIGNAL_KEYS` and already listed in self/partner extraction prompts. Story 1 must **not** invent a duplicate key or re-append it.
- Story 1 only **adds** `creativeExpression` to `SHADOW_SIGNAL_KEYS` + bumps `MAX_EVIDENCE_ITEMS`.
- Follow **Expansion-01/02/03 Story 1 lock** — **not** the naive README “add to `SignalKey` / `COMPATIBILITY_WEIGHTS` now”.
- **No Prisma migration:** `UserProfileSignal.signalKey` is free-form `String`; `evaluationJson` is `Json`.
- Document **promotion-ready** weight / tier / domain / chip labels for Stories 3–4 — do **not** wire them in Story 1.
- **`EnrichedSignals` / tension-rules:** Story 3 only.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | 15 in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-03) | **12** — includes `intellectualCuriosity` (original shadow) + Phase A + Expansion-01/02/03 |
| `intellectualCuriosity` | **Already** in `SHADOW_SIGNAL_KEYS` + `DOMAIN_ALLOWED_SIGNAL_KEYS.self` / partner + `SELF_EXTRACTOR_PROMPT` |
| `creativeExpression` | **Does not exist** in codebase yet — Story 1 adds it |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |
| Story 1 scope | Allowlist + `MAX_EVIDENCE_ITEMS` + specs only |
| Phase 1 EQ promote | Still **deferred** (PARTIAL gate) — do **not** promote EQ keys in this story |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add both keys to type system | **Only add `creativeExpression`** — `intellectualCuriosity` already shadow |
| Add to `SignalKey` + weights/tiers/domains in Story 1 | **Wrong for Story 1** — `SHADOW_SIGNAL_KEYS` only |
| Update `COMPATIBILITY_WEIGHTS` | **Deferred** — promotion story |
| Files: `compatibility-score.ts`, `match-explainability.ts` | **Out of scope** Story 1 — only `extracted-signals.interface.ts` |
| Scale “0–10” in Story 2 README | Story 2 will use **1–10 or null** (extraction stack lock) |
| “Add intellectualCuriosity” | **Wire/promote path only** — refine prompts in Story 2; friction/chips in Stories 3–4; no duplicate allowlist entry |

Sprint README goal “add both signals” means: **complete Expansion-04 wiring for both**, not “insert both into SHADOW for the first time.”

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append `creativeExpression` to `SHADOW_SIGNAL_KEYS`; bump `MAX_EVIDENCE_ITEMS` **31 → 32**; update comment; optionally annotate `intellectualCuriosity` as Expansion-04-owned (comment only — do not move/remove) |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert `creativeExpression`; shadow **12 → 13**; total **27 → 28**; `MAX_EVIDENCE_ITEMS === 32`; add Expansion-04 shadow-mode regression block |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` | Story 4 (shadow overlay) |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts`, prompts, `DOMAIN_ALLOWED_*` | Story 2 |
| `matches/expansion-0*-explainability.ts` | Prior sprints only |
| Interest tag registries / UI hobby chips | Orthogonal — tags ≠ signals |
| i18n, `CHIP_TO_TRAIT`, Prisma | Stories 4+ / N/A |
| Phase 1 EQ promote | Separate future sprint |

---

## Decisions (do not reverse without discussion)

### 1. Shadow-first (locked)

| Choice | Lock |
|--------|------|
| New allowlist key | `creativeExpression` only |
| `intellectualCuriosity` | **Already present** — leave in place; do not promote |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still 15) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

### 2. Key names & scale (locked)

| Key | Status | Scale (Story 2) | Meaning (for Story 2 prompts) |
|-----|--------|-----------------|-------------------------------|
| `intellectualCuriosity` | **Exists** (shadow) | **1–10** or null | Need for mental stimulation — ideas, learning, deep conversations, intellectual growth **in a relationship** (not merely “I am smart”) |
| `creativeExpression` | **New** | **1–10** or null | Need for creative outlets — art, making things, self-expression through creation; how central creativity is to identity / daily life |

**Override:** README scale “0–10” → use **1–10** (matches extraction stack; Expansion-01–03 Story 2 lock). CamelCase exact spelling — no aliases.

### 3. Distinct from existing keys & interest tags (locked — Story 2 must echo)

| Existing / adjacent | Distinct angle |
|---------------------|----------------|
| `intellectualCuriosity` (this sprint, already shadow) | Mental stimulation **need** with partner — not IQ flex |
| `emotionalDepth` (official) | Introspection / emotional intensity vs idea-oriented stimulation |
| `noveltyVsRoutine` (shadow) | Novelty seeking vs familiar routines — not intellectual depth |
| `humorPlayfulness` (Expansion-03 shadow) | Levity / banter vs mental stimulation |
| Interest tags (`books_reading`, `art_visual`, etc.) | **Binary hobby presence** — orthogonal; signals = scored intensity/need for compatibility |
| Job title / “I’m an artist” | Story 2: job alone ≠ high `creativeExpression` without need/identity cues |

`creativeExpression` = **drive for creative making / expression as life need**, distinct from hobby tags and from intellectual curiosity.

### 4. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 31 = 15 official + 12 shadow + 4 buffer
After:  32 = 15 official + 13 shadow + 4 buffer
```

### 5. Interface edit (copy-paste ready)

```typescript
/** Shadow signals: extracted and stored but NOT wired into compatibility, friction, or finalScore. */
export const SHADOW_SIGNAL_KEYS = [
  /** Expansion-04 — Intellectual & Creative (already shadow; Story 2 refines relationship-need framing). */
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
  /** Expansion-04 — Intellectual & Creative Expression (shadow until Phase 2 promote). */
  'creativeExpression',
] as const;

/** Max evidence items: 15 official + 13 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 32;
```

**Note:** Only **append** `creativeExpression` and bump `MAX_EVIDENCE_ITEMS`. Comment annotation on `intellectualCuriosity` is optional but recommended for clarity. Do **not** reorder other keys unless required for the comment (keeping existing order is fine if agent 1 only appends + updates the intellectualCuriosity comment in place).

Preferred minimal diff if avoiding reorder noise:

```typescript
  /** Expansion-03 — Humor & Playfulness (shadow until Phase 1 promote). */
  'humorPlayfulness',
  /** Expansion-04 — Intellectual & Creative Expression (shadow until Phase 2 promote). */
  'creativeExpression',
] as const;

/** Max evidence items: 15 official + 13 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 32;
```

…and leave `intellectualCuriosity` where it already is (first entry). Either approach is acceptable; CR checks membership + counts, not array order.

### 6. Promotion-ready constants (document only — do not implement)

| Key | Tier | Weight | Domain | Positive chip |
|-----|------|--------|--------|---------------|
| `intellectualCuriosity` | Tier 2 (personality) | **1.3** | `intellectual` | `Mental stimulation` |
| `creativeExpression` | Tier 3 (lifestyle / prefs) | **1.0** | `creative` | `Creative expression` |

- **Not** Tier 1 (valuesAlignment).
- **Not** `HARD_MISMATCH_KEYS` initially.
- New domains `intellectual` / `creative` for chip diversity (distinct from `emotional`, `intimacy`, `connection`, `lifestyle`).

**Story 4 note:** While shadow, positive chips require **overlay module** (`expansion-04-explainability.ts`, merged in `assemble-result.ts` like Expansion-01/02/03) — do **not** add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` in Story 1.

**Story 3 note (preview):**

| Rule id | Threshold | Penalty | Chip |
|---------|-----------|---------|------|
| `intellectual_gap` | ≥8 vs ≤3 either direction | **4** | `Different mental stimulation needs` |
| `creative_mismatch` | ≥8 vs ≤2 either direction | **2** | `Creative drive mismatch` |

Requires `EnrichedSignals` extension in Story 3, not Story 1. Note asymmetric low threshold (≤3 vs ≤2) — preserve README lock in Story 3.

### 7. DB / migration (locked)

| Item | Decision |
|------|----------|
| Prisma migration | **None** |
| Backfill | **Out of scope** — `creativeExpression` appears on re-analyze only |
| Prior Expansion / Phase A / `intellectualCuriosity` | **Unchanged** — do not promote in this story |

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
| `SHADOW_SIGNAL_KEYS.length` | 12 → **13** |
| `EXTRACTION_SIGNAL_KEYS.length` | 27 → **28** |
| `MAX_EVIDENCE_ITEMS` | 31 → **32** |
| Membership | `toContain('creativeExpression')` |
| Existing | `toContain('intellectualCuriosity')` still true |

Add `describe('Expansion-04 shadow mode (no scoring wire-up)')`:

- Keys under test: `['intellectualCuriosity', 'creativeExpression']`
- Both **not** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS`
- Both **not** in `COMPATIBILITY_SIGNAL_KEYS`

Update `SHADOW_SIGNAL_KEYS_SET` tests to include `creativeExpression`.

Keep Expansion-01/02/03 regression describes intact.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Append `creativeExpression` to `SHADOW_SIGNAL_KEYS` + set `MAX_EVIDENCE_ITEMS = 32` per §5.
2. Update `extracted-signals.spec.ts` counts + Expansion-04 regression block (both keys).
3. Do **not** modify compatibility, explainability, tension, prompts, Prisma, or UI.
4. Do **not** re-add or rename `intellectualCuriosity`.
5. Run tests above; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add creativeExpression as shadow signal

Expansion-04 Story 1 — allowlist only; intellectualCuriosity already shadow; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] Only `extracted-signals.interface.ts` + `extracted-signals.spec.ts` (+ handoff) changed
- [ ] New key spelled `creativeExpression` exactly
- [ ] `intellectualCuriosity` still present once (no duplicate)
- [ ] Both keys in `SHADOW_SIGNAL_KEYS`, **not** in official/scored arrays
- [ ] `MAX_EVIDENCE_ITEMS === 32`
- [ ] Specs: 13 shadow / 28 total
- [ ] Expansion-01/02/03 keys unchanged; no scoring/chip/tension drift

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2 preview:** Refine `intellectualCuriosity` prompt toward relationship-need framing (README); add `creativeExpression` to self-domain prompt + `DOMAIN_ALLOWED_SIGNAL_KEYS.self` via `expansion-04-signal-definitions.ts` (same pattern as Expansion-03). Confirm whether partner-domain should include either key — default Expansion-01–03 lock: **self-domain only** for new expansion signals unless architect Story 2 says otherwise.
- **Phase 2 promote:** Both signals may promote together after Expansion-04 Story 5 validation — out of scope until explicit promote story.
- **Interest-tag coexistence:** Story 5 must assert tags unchanged and orthogonal to these signals.

---

## Next agent

```text
--agent 1 expansion 04 story 1
```

**Notes:** Same shadow playbook as Expansion-01–03 Story 1, with the Expansion-04 twist that one of the two sprint signals already exists. Story 2 adds/refines LLM prompts via `expansion-04-signal-definitions.ts` → `SELF_EXTRACTOR_PROMPT` in `extraction.service.ts` (not `evaluate-llm-prompts.ts`).
