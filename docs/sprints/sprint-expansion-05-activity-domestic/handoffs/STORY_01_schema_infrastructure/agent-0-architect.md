# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Depends on:** Expansion-04 complete in shadow mode — see `sprint-expansion-04-intellectual-creative/handoffs/STORY_05_testing_validation/agent-3-pm.md`  
**Mode:** Design-only. Shadow-mode allowlist for **both** new keys. **No** scoring, tension, chips, or LLM prompt work in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Expansion-05 continues **Phase 2** (Activity-Style). Sprint signals: `physicalActivityLevel` + `domesticComfort`.
- **Both keys are new** — neither exists in the codebase yet (unlike Expansion-04’s pre-existing `intellectualCuriosity`).
- Story 1 only **appends both** to `SHADOW_SIGNAL_KEYS` + bumps `MAX_EVIDENCE_ITEMS`.
- Follow **Expansion-01–04 Story 1 lock** — **not** the naive README “add to `SignalKey` / `COMPATIBILITY_WEIGHTS` / `match-explainability.ts` now”.
- **No Prisma migration:** `UserProfileSignal.signalKey` is free-form `String`; `evaluationJson` is `Json`.
- Document **promotion-ready** weight / tier / domain / chip labels for Stories 3–4 — do **not** wire them in Story 1.
- Document **distinctions** from `healthBodyConsciousness`, `socialBattery`, `lifestylePace`, `physicalPriority` (comments + this handoff) — prompt wiring is Story 2.
- **`EnrichedSignals` / tension-rules:** Story 3 only.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Official scored keys | 15 in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` ≡ `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` |
| Shadow keys (post Expansion-04) | **13** |
| Total extraction keys | **28** |
| `MAX_EVIDENCE_ITEMS` | **32** (= 15 + 13 + 4) |
| `physicalActivityLevel` / `domesticComfort` | **Do not exist** — Story 1 adds both |
| Shadow → no score impact | `computeCompatibility` only iterates `COMPATIBILITY_SIGNAL_KEYS` |
| DB | No schema change for new signal keys |
| Story 1 scope | Allowlist + `MAX_EVIDENCE_ITEMS` + specs + distinction comments only |
| Prior expansion / Phase A / EQ promote | **Unchanged** — do not promote any keys in this story |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add keys, weights, Tier 3, domain `lifestyle` in Story 1 | **Shadow allowlist only** — weights/tiers/domains documented, not wired |
| Files: `compatibility-score.ts`, `match-explainability.ts` | **Out of scope** Story 1 — only `extracted-signals.interface.ts` (+ spec) |
| Scale “0–10” in Story 2 README | Story 2 will use **1–10 or null** (extraction stack lock) |
| Document distinction in code comments | **Yes** — brief JSDoc on the new `SHADOW_SIGNAL_KEYS` entries |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Append `physicalActivityLevel` + `domesticComfort` to `SHADOW_SIGNAL_KEYS` with distinction comments; bump `MAX_EVIDENCE_ITEMS` **32 → 34** |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Assert both keys; shadow **13 → 15**; total **28 → 30**; `MAX_EVIDENCE_ITEMS === 34`; add Expansion-05 shadow-mode regression block |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `compatibility/compatibility-score.ts` | Would enable scoring — breaks shadow mode |
| `matches/match-explainability.ts` | Story 4 (shadow overlay) |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `extraction/extraction.service.ts`, prompts, `DOMAIN_ALLOWED_*` | Story 2 |
| `matches/expansion-0*-explainability.ts` | Prior sprints only |
| Interest tag registries / UI hobby chips | Orthogonal |
| i18n, `CHIP_TO_TRAIT`, Prisma | Stories 4+ / N/A |
| Prior expansion promote | Separate future sprint |

---

## Decisions (do not reverse without discussion)

### 1. Shadow-first (locked)

| Choice | Lock |
|--------|------|
| New allowlist keys | `physicalActivityLevel`, `domesticComfort` |
| `COMPATIBILITY_SIGNAL_KEYS` / `SignalKey` | **Unchanged** (still 15) |
| `COMPATIBILITY_WEIGHTS` / `TIER*` | **Unchanged** |
| Scoring / friction / coverage impact | **None** this story |

### 2. Key names & scale (locked)

| Key | Status | Scale (Story 2) | Meaning (for Story 2 prompts) |
|-----|--------|-----------------|-------------------------------|
| `physicalActivityLevel` | **New** | **1–10** or null | How active/athletic in **daily life** — fitness behavior, energy for physical activities, sedentary ↔ highly athletic identity |
| `domesticComfort` | **New** | **1–10** or null | Preference for **home/cozy time vs being out** — where they recharge and prefer evenings/weekends (high = homebody) |

**Override:** README scale “0–10” → use **1–10** (matches extraction stack; Expansion-01–04 Story 2 lock). CamelCase exact spelling — no aliases.

### 3. Distinct from existing keys (locked — Story 2 must echo)

| Existing / adjacent | Distinct angle for Expansion-05 |
|---------------------|----------------------------------|
| `healthBodyConsciousness` (official) | **Wellness values** / caring about health — not how much they actually move |
| `physicalPriority` (official) | Importance of partner’s **looks/attraction** — not own activity level |
| `lifestylePace` (official) | Calm vs high-action **life rhythm** — not specifically home-vs-out preference or athletic behavior |
| `socialBattery` (official) | Intro/extro **social energy** — not preference for staying in vs going out |
| `noveltyVsRoutine` (shadow) | Novelty seeking vs familiar routines — not fitness activity or nest preference |
| `physicalAffectionStyle` (Expansion-02) | Touch/affection need — not sports/fitness activity |
| Interest tags (`gym`, `hiking`, `home_life`, etc.) | **Binary hobby presence** — orthogonal; signals = scored intensity/preference for compatibility |

**Story 2 risk:** Existing self-prompt already maps “quiet home” → `lifestylePace`. Story 2 must add **PROTECTED** / distinction language so `domesticComfort` is not collapsed into `lifestylePace` or `socialBattery`.

### 4. `MAX_EVIDENCE_ITEMS` (locked)

```text
Before: 32 = 15 official + 13 shadow + 4 buffer
After:  34 = 15 official + 15 shadow + 4 buffer
```

### 5. Interface edit (copy-paste ready)

Append after `creativeExpression`:

```typescript
  /** Expansion-04 — Intellectual & Creative Expression (shadow until Phase 2 promote). */
  'creativeExpression',
  /**
   * Expansion-05 — Physical Activity & Domestic Comfort (shadow until Phase 2 promote).
   * physicalActivityLevel: daily athletic/activity behavior — NOT healthBodyConsciousness (wellness values)
   *   and NOT physicalPriority (looks importance).
   * domesticComfort: homebody vs always-out preference — NOT socialBattery (intro/extro energy)
   *   and NOT lifestylePace (busy vs calm rhythm).
   */
  'physicalActivityLevel',
  'domesticComfort',
] as const;

/** Max evidence items: 15 official + 15 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 34;
```

### 6. Promotion-ready constants (document only — do not implement)

| Key | Tier | Weight | Domain | Positive chip |
|-----|------|--------|--------|---------------|
| `physicalActivityLevel` | Tier 3 (lifestyle / prefs) | **1.2** | `lifestyle` | `Activity level match` |
| `domesticComfort` | Tier 3 (lifestyle / prefs) | **1.1** | `lifestyle` | `Home/out balance` |

- **Not** Tier 1 (valuesAlignment).
- **Not** `HARD_MISMATCH_KEYS` initially.
- Both use domain `lifestyle` (README lock) — chip labels still distinct for Story 4.

**Story 4 note:** While shadow, positive chips require **overlay module** (`expansion-05-explainability.ts`, merged in `assemble-result.ts` like Expansion-01–04) — do **not** add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` in Story 1.

**Story 3 note (preview — preserve README thresholds):**

| Rule id | Threshold | Penalty | Chip |
|---------|-----------|---------|------|
| `activity_level_gap` | ≥8 vs ≤3 either direction | **3** | `Different activity levels` |
| `domestic_out_mismatch` | ≥8 vs ≤3 either direction | **3** | `Home vs out mismatch` |

Requires `EnrichedSignals` extension in Story 3, not Story 1. Both penalties **3** → each alone can surface `tensionChip` (friction gate ≥3).

### 7. DB / migration (locked)

| Item | Decision |
|------|----------|
| Prisma migration | **None** |
| Backfill | **Out of scope** — keys appear on re-analyze only |
| Prior Expansion / Phase A keys | **Unchanged** |

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
| `SHADOW_SIGNAL_KEYS.length` | 13 → **15** |
| `EXTRACTION_SIGNAL_KEYS.length` | 28 → **30** |
| `MAX_EVIDENCE_ITEMS` | 32 → **34** |
| Membership | `toContain('physicalActivityLevel')`, `toContain('domesticComfort')` |
| Existing | Expansion-01–04 keys still present |

Add `describe('Expansion-05 shadow mode (no scoring wire-up)')`:

- Keys under test: `['physicalActivityLevel', 'domesticComfort']`
- Both **not** in `OFFICIAL_EXTRACTION_SIGNAL_KEYS`
- Both **not** in `COMPATIBILITY_SIGNAL_KEYS`

Update `SHADOW_SIGNAL_KEYS_SET` tests to include both new keys.

Keep Expansion-01–04 regression describes intact.

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Append both keys to `SHADOW_SIGNAL_KEYS` + set `MAX_EVIDENCE_ITEMS = 34` per §5 (include distinction comments).
2. Update `extracted-signals.spec.ts` counts + Expansion-05 regression block.
3. Do **not** modify compatibility, explainability, tension, prompts, Prisma, or UI.
4. Run tests above; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add physicalActivityLevel and domesticComfort as shadow signals

Expansion-05 Story 1 — allowlist only; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] Only `extracted-signals.interface.ts` + `extracted-signals.spec.ts` (+ handoff) changed
- [ ] Keys spelled `physicalActivityLevel` and `domesticComfort` exactly
- [ ] Both in `SHADOW_SIGNAL_KEYS`, **not** in official/scored arrays
- [ ] `MAX_EVIDENCE_ITEMS === 34`
- [ ] Specs: 15 shadow / 30 total
- [ ] Distinction comments present
- [ ] Expansion-01–04 keys unchanged; no scoring/chip/tension drift

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2 preview:** Create `expansion-05-signal-definitions.ts` → inject into `SELF_EXTRACTOR_PROMPT` (not `evaluate-llm-prompts.ts`). Self-domain only for new keys (Expansion-01–04 pattern). Must PROTECT against conflation with `healthBodyConsciousness`, `socialBattery`, `lifestylePace`, `physicalPriority`.
- **Phase 2 promote:** May promote with other Phase 2 signals after validation — out of scope until explicit promote story.

---

## Next agent

```text
--agent 1 expansion 05 story 1
```

**Notes:** Same shadow playbook as Expansion-01–04 Story 1. Both keys are net-new. Story 2 adds LLM prompts via `expansion-05-signal-definitions.ts` → `SELF_EXTRACTOR_PROMPT` in `extraction.service.ts`.
