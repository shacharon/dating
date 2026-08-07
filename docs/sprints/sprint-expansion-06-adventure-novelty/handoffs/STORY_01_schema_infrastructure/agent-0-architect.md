# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Depends on:** Expansion-05 complete in shadow mode — see `sprint-expansion-05-activity-domestic/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for Expansion-06 product key. **No** scoring, tension, chips, or LLM prompt definition work in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Expansion-06 is the **final Phase 2 activity-style signal** and closes the 10-signal expansion set. Sprint signal: `adventureNovelty`.
- **Critical baseline:** `noveltyVsRoutine` is **already** in `SHADOW_SIGNAL_KEYS`, self `DOMAIN_ALLOWED`, and `SELF_EXTRACTOR_PROMPT`. It is the **same semantic construct** as README `adventureNovelty` (novelty-seeking vs routine/familiar).
- Story 1 **renames** the shadow key `noveltyVsRoutine` → `adventureNovelty` (same slot — **not** a net-new duplicate) + adds a **technical alias** so existing LLM/storage keys still normalize.
- Follow **Expansion-01–05 Story 1 lock** — **not** the naive README “add to `SignalKey` / `COMPATIBILITY_WEIGHTS` / `match-explainability.ts` now”.
- **No Prisma migration:** `UserProfileSignal.signalKey` is free-form `String`; `evaluationJson` is `Json`.
- Document **promotion-ready** weight / tier / domain / chip labels for Stories 3–4 — do **not** wire them in Story 1.
- Document **distinction** from `lifestylePace` (and adjacent keys) — prompt rewrite is Story 2.
- **`EnrichedSignals` / tension-rules:** Story 3 only.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | 15 in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-05) | **15** |
| Total extraction keys | **30** |
| `MAX_EVIDENCE_ITEMS` | **34** (= 15 + 15 + 4) |
| `noveltyVsRoutine` | **Already** in `SHADOW_SIGNAL_KEYS` + self allowlist + self prompt |
| `adventureNovelty` | **Does not exist** as a key yet — Story 1 introduces it by **rename** |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |
| Story 1 scope | Rename in allowlist + alias + domain allowlist + specs (see Artifacts) |
| Prior expansion / Phase A / EQ promote | **Unchanged** — do not promote any keys in this story |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add `adventureNovelty` to `SignalKey`, weight 1.2, Tier 3, domain `lifestyle` | **Shadow allowlist only** — weights/tiers/domains documented, not wired |
| Final audit: 25 signals in all registries | **Meaning:** 15 scored + 10 expansion product signals **tracked**; runtime still **15 scored + 15 shadow** until Phase 2 promote. Do **not** promote to 25 scored in this story |
| Files: `compatibility-score.ts`, `match-explainability.ts`, `COMPATIBILITY_SIGNALS_SUMMARY.md` | **Out of scope** Story 1 (summary doc optional later; not required for gate) |
| Scale “0–10” in Story 2 README | Story 2 will use **1–10 or null** (extraction stack lock) |
| Treat as net-new key alongside `noveltyVsRoutine` | **Forbidden** — would create a twin signal and waste LLM budget |

Sprint README goal “add adventureNovelty” means: **complete Expansion-06 wiring under the product key name**, consolidating the pre-existing `noveltyVsRoutine` shadow slot — not “insert a second novelty signal.”

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Replace `'noveltyVsRoutine'` with `'adventureNovelty'` in `SHADOW_SIGNAL_KEYS` (keep position among original shadow keys or move with Expansion-06 JSDoc — either OK if length stays 15); add distinction comment; **do not** change `MAX_EVIDENCE_ITEMS` (stays **34**) |
| `dating-api/src/extraction/extraction-normalization.ts` | Add `KEY_ALIASES` entry: `noveltyVsRoutine: 'adventureNovelty'` |
| `dating-api/src/extraction/extraction-strict-validation.ts` | In `DOMAIN_ALLOWED_SIGNAL_KEYS.self`, replace `'noveltyVsRoutine'` with `'adventureNovelty'` (count stays **22**) |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert `adventureNovelty`; **not** `noveltyVsRoutine` in `SHADOW_SIGNAL_KEYS`; shadow still **15**; total still **30**; `MAX_EVIDENCE_ITEMS === 34`; add Expansion-06 shadow-mode regression block; update `SHADOW_SIGNAL_KEYS_SET` asserts |
| `dating-api/src/extraction/extraction.service.spec.ts` | Update any post-pipeline expects of `signals['noveltyVsRoutine']` / evidence signal name → `adventureNovelty` (alias maps them). **Do not** rewrite prompt strings / SIGNAL RULES here — Story 2 |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` | Story 4 (shadow overlay) |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts` prompt text / SIGNAL RULES / `expansion-06-signal-definitions.ts` | Story 2 (prompts still emit `noveltyVsRoutine` until then — **alias keeps pipeline green**) |
| Distinction strings in `expansion-0{3,4,5}-signal-definitions.ts` that mention `noveltyVsRoutine` | Story 2 cleanup (still accurate as “novelty vs routine” concept; rename references when prompts migrate) |
| `COMPATIBILITY_SIGNALS_SUMMARY.md` | Doc-only; not a Story 1 gate |
| Interest tag registries / UI hobby chips | Orthogonal (`travel` tag ≠ this signal) |
| i18n, `CHIP_TO_TRAIT`, Prisma | Stories 4+ / N/A |
| Prior expansion promote | Separate future sprint |

---

## Decisions (do not reverse without discussion)

### 1. Shadow-first + rename (locked)

| Choice | Lock |
|--------|------|
| Canonical Expansion-06 key | `adventureNovelty` |
| Pre-existing twin | `noveltyVsRoutine` → **alias into** `adventureNovelty`; **remove** from `SHADOW_SIGNAL_KEYS` |
| Net shadow count | **Unchanged (15)** |
| `MAX_EVIDENCE_ITEMS` | **Unchanged (34)** |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still 15) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

**Rationale:** Same pattern as Expansion-04 owning pre-existing `intellectualCuriosity`, except the product name differs — rename + technical alias instead of inventing a duplicate.

### 2. Key names & scale (locked)

| Key | Status | Scale (Story 2) | Meaning (for Story 2 prompts) |
|-----|--------|-----------------|-------------------------------|
| `adventureNovelty` | **Rename of** `noveltyVsRoutine` | **1–10** or null | Novelty-seeking vs routine preference — excitement for new experiences, places, activities vs comfort in familiar patterns. “Adventure” ≠ extreme sports only (new restaurants/trips/variety count). |
| `noveltyVsRoutine` | **Legacy alias only** | n/a | Must not remain a parallel allowlist/prompt key after Story 2 |

**Override:** README scale “0–10” → use **1–10** (matches extraction stack; Expansion-01–05 Story 2 lock). CamelCase exact spelling for the canonical key.

### 3. Distinct from existing keys & tags (locked — Story 2 must echo)

| Existing / adjacent | Distinct angle for Expansion-06 |
|---------------------|----------------------------------|
| `lifestylePace` (official) | **Tempo** (fast/slow busy rhythm) — can be slow-paced but high novelty, or fast-paced but routine-locked |
| `socialBattery` (official) | Intro/extro **social energy** — not new-vs-familiar preference |
| `domesticComfort` (Expansion-05) | Homebody vs out — not novelty vs routine (homebody can still seek novelty at home) |
| `physicalActivityLevel` (Expansion-05) | Athletic/activity behavior — not adventure-as-novelty |
| `structureChaosTolerance` (shadow) | Tolerance for mess/chaos/structure — adjacent but not the same as seeking new experiences |
| `intellectualCuriosity` (shadow) | Mental stimulation / ideas — not experiential novelty |
| Interest tags (`travel`, `adventure`, etc.) | **Binary hobby presence** — orthogonal; signal = intensity of novelty-vs-routine preference |

### 4. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 34 = 15 official + 15 shadow + 4 buffer
After:  34 = 15 official + 15 shadow + 4 buffer  (unchanged — rename, not append)
```

### 5. Interface / alias edit (copy-paste ready)

In `SHADOW_SIGNAL_KEYS`, replace the `noveltyVsRoutine` entry:

```typescript
  /** Expansion-04 — Intellectual & Creative (already shadow; Story 2 refines relationship-need framing). */
  'intellectualCuriosity',
  /**
   * Expansion-06 — Adventure & Novelty (shadow until Phase 2 promote).
   * Formerly `noveltyVsRoutine` (legacy alias maps into this key).
   * Novelty-seeking vs familiar/routine preference — NOT lifestylePace (tempo)
   * and NOT domesticComfort (home vs out) or travel interest tags (binary).
   */
  'adventureNovelty',
  'structureChaosTolerance',
```

In `extraction-normalization.ts`:

```typescript
export const KEY_ALIASES: Record<string, string> = {
  spiritualOrientation: 'spirituality',
  appearancePriority: 'physicalPriority',
  materialAmbition: 'financialMindset',
  partnerObjectificationRisk: 'physicalPriority',
  instrumentalRelationshipView: 'statusOrientation',
  noveltyVsRoutine: 'adventureNovelty',
};
```

In `DOMAIN_ALLOWED_SIGNAL_KEYS.self`, replace `'noveltyVsRoutine'` with `'adventureNovelty'` (keep order otherwise).

Comment on `MAX_EVIDENCE_ITEMS` may stay “15 official + 15 shadow + 4 buffer”.

### 6. Promotion-ready constants (document only — do not implement)

| Key | Tier | Weight | Domain | Positive chip |
|-----|------|--------|--------|---------------|
| `adventureNovelty` | Tier 3 (lifestyle / prefs) | **1.2** | `lifestyle` | `Adventure & novelty` |

- **Not** Tier 1 (valuesAlignment).
- **Not** `HARD_MISMATCH_KEYS` initially.

**Story 4 note:** While shadow, positive chips require **overlay module** (`expansion-06-explainability.ts`, merged in `assemble-result.ts` like Expansion-01–05) — do **not** add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` in Story 1.

**Story 3 note (preview — preserve README thresholds):**

| Rule id | Threshold | Penalty | Chip |
|---------|-----------|---------|------|
| `novelty_routine_clash` | ≥8 vs ≤3 either direction | **4** | `Novelty vs routine` |

Requires `EnrichedSignals` extension in Story 3, not Story 1. Penalty **4** → alone can surface `tensionChip` (friction gate ≥3).

### 7. DB / migration (locked)

| Item | Decision |
|------|----------|
| Prisma migration | **None** |
| Backfill | **Out of scope** — re-analyze maps via alias; stored `noveltyVsRoutine` rows remain readable once readers use alias or re-extract |
| Prior Expansion / Phase A keys | **Unchanged** (except this rename) |

### 8. Agent 4

**Skip.**

---

## Service / module placement

- Allowlist SoT: `dating-api/src/extraction/extracted-signals.interface.ts`
- Alias SoT: `dating-api/src/extraction/extraction-normalization.ts`
- Domain allowlist: `dating-api/src/extraction/extraction-strict-validation.ts`

`EXTRACTION_SIGNAL_KEYS` / `EXTRACTION_SIGNAL_KEYS_SET` auto-union — no scoring wiring in Story 1.

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npx jest src/extraction/extraction.service.spec.ts --runInBand
npm run typecheck
```

Agent 1 must update:

| Assert | Before → After |
|--------|----------------|
| `SHADOW_SIGNAL_KEYS.length` | 15 → **15** (unchanged) |
| `EXTRACTION_SIGNAL_KEYS.length` | 30 → **30** |
| `MAX_EVIDENCE_ITEMS` | 34 → **34** |
| Membership | `toContain('adventureNovelty')`; `not.toContain('noveltyVsRoutine')` |
| Alias | `KEY_ALIASES.noveltyVsRoutine === 'adventureNovelty'` (add a small unit assert if none exists; optional in `extracted-signals.spec` or normalization spec) |
| Domain self | `DOMAIN_ALLOWED_SIGNAL_KEYS.self` includes `adventureNovelty`, not `noveltyVsRoutine`; length still **22** |
| Existing | Expansion-01–05 keys still present |

Add `describe('Expansion-06 shadow mode (no scoring wire-up)')`:

- Keys under test: `['adventureNovelty']`
- **Not** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS`
- **Not** in `COMPATIBILITY_SIGNAL_KEYS`

Keep Expansion-01–05 regression describes intact.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Rename shadow key + add alias + update self domain allowlist per §5.
2. Update `extracted-signals.spec.ts` (+ any broken `extraction.service.spec.ts` post-pipeline key names).
3. Do **not** modify compatibility, explainability, tension, prompt definition blocks, Prisma, or UI.
4. Run tests above; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): rename noveltyVsRoutine to adventureNovelty shadow key

Expansion-06 Story 1 — allowlist rename + alias; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] Only allowlist / alias / domain allowlist / specs (+ handoff) changed — **no** prompt rewrite beyond what specs force
- [ ] Canonical key spelled `adventureNovelty` exactly
- [ ] `noveltyVsRoutine` **not** in `SHADOW_SIGNAL_KEYS`; **is** in `KEY_ALIASES`
- [ ] `MAX_EVIDENCE_ITEMS === 34`; shadow length **15**; total **30**
- [ ] Self domain allowlist has `adventureNovelty`, not `noveltyVsRoutine`
- [ ] Specs: Expansion-06 shadow-mode block; Expansion-01–05 intact
- [ ] No scoring / chip / tension drift; `COMPATIBILITY_SIGNAL_KEYS` still 15

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2 preview:** Create `expansion-06-signal-definitions.ts` → inject into `SELF_EXTRACTOR_PROMPT`. Replace prompt key `noveltyVsRoutine` with `adventureNovelty` + strengthen PROTECTED distinction vs `lifestylePace` / `domesticComfort` / interest tags. Update cross-sprint distinction lines that still say `noveltyVsRoutine`. Keep alias permanently for old outputs.
- **Phase 2 promote:** Final expansion signal; promote only after Exp-06 Story 5 validation + explicit promote story — out of scope here.
- **“25 signals” wording:** Product milestone = 15 original + 10 expansion **when promoted**; current runtime remains shadow-expanded until then.

---

## Next agent

```text
--agent 1 expansion 06 story 1
```

**Notes:** Same shadow playbook as Expansion-01–05 Story 1, but this story is a **rename + alias** (like Expansion-04 owning a pre-existing key), not an append. Do **not** bump shadow count or `MAX_EVIDENCE_ITEMS`. Story 2 migrates prompt text to `adventureNovelty`.
