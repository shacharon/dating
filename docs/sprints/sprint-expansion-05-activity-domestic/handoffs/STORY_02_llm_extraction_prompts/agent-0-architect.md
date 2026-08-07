# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for Expansion-05. **Shadow only** — still no scoring/chips/tension.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Wire Expansion-05 into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** follow sprint README inventing evaluate-layer extractors — production extraction lives in `extraction.service.ts`.
- **Both keys are new** to allowlists (unlike Expansion-04’s pre-existing `intellectualCuriosity`):
  - `physicalActivityLevel` — self-domain allowlist + ALLOWED KEYS + SIGNAL RULES + Expansion-05 semantic block
  - `domesticComfort` — same
- **Critical:** tighten SIGNAL RULES for adjacent official keys (`healthBodyConsciousness`, `lifestylePace`) so they are not conflated with the new signals.
- Scale **1–10 or null**. No regex / keyword / text-inference rules. No interest-tag scoring.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | Both keys in `SHADOW_SIGNAL_KEYS`; `MAX_EVIDENCE_ITEMS === 34`; not in `COMPATIBILITY_SIGNAL_KEYS` |
| Expansion-01–04 Story 2 | `expansion-0N-signal-definitions.ts` wired in `SELF_EXTRACTOR_PROMPT` — **do not modify** those files |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` — `SELF_EXTRACTOR_PROMPT` |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) — existing pipeline |
| Current `DOMAIN_ALLOWED_SIGNAL_KEYS.self` | **20** keys (through `creativeExpression`) |
| Adjacent collision risk | `healthBodyConsciousness` SIGNAL RULES currently say “health/**fitness** focus”; `lifestylePace` already maps “quiet home” in partner/relationship prompts — Story 2 must disambiguate |
| `evaluate-llm-prompts.ts` | Not core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add prompts to evaluate layer / invent new extractors | **Wrong** — use `extraction.service.ts` + `expansion-05-signal-definitions.ts` |
| Scale 0–10 | **Use 1–10** — matches entire extraction stack |
| Keyword / gym / homebody heuristics | **Forbidden** — LLM semantic only |
| Not conflated with socialBattery or lifestylePace | **Required** — PROTECTED lines + SIGNAL RULES upgrades |
| Story 5 live validation | Not Story 2 gate — unit tests with mocked LLM only |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-05-signal-definitions.ts` | **Create** — exported semantic prompt block for both Expansion-05 keys |
| `dating-api/src/extraction/extraction.service.ts` | Import block; append after Expansion-04; add both keys to `ALLOWED KEYS`; add SIGNAL RULES; **upgrade** `healthBodyConsciousness` + `lifestylePace` SIGNAL RULES lines |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add both keys to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` only |
| `dating-api/src/extraction/extraction.service.spec.ts` | New `describe('Expansion-05 shadow signals')` — mock LLM tests (§7); bump stale “28 signals / 13 shadow” comment → **30 / 15** if touched |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `evaluate/evaluate.service.ts` | Does not run per-signal extraction |
| `extraction/extraction-text-inference.ts` | **NO regex rules** for Expansion-05 signals |
| `engine/signal-post-processing/text-inference.ts` | Same — no regex |
| `expansion-01/02/03/04-signal-definitions.ts` | Prior sprints — do not edit |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` | Story 3 |
| `matches/match-explainability.ts`, i18n | Story 4 |
| Interest tag registries / UI hobby chips | Orthogonal |
| `PARTNER_EXTRACTOR_PROMPT` / `RELATIONSHIP_EXTRACTOR_PROMPT` | **Do not** add Expansion-05 keys to partner/relationship. Optional: leave partner “quiet home → lifestylePace” as-is (partner prefs); rich Expansion-05 framing is **self only**. |
| Re-analyze / backfill | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call, self domain for Expansion-05 rich block.**

```
Profile analyze → ExtractionService.extract('self', aboutMe)
  → SELF_EXTRACTOR_PROMPT (includes Expansion-01..05 blocks)
  → completeJSON (fast model, temp 0.1)
  → normalize → validateAndClean → validateExtraction
  → evaluationJson.self.signals.{physicalActivityLevel, domesticComfort}
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction.

### 2. New file: `expansion-05-signal-definitions.ts` (locked)

```typescript
/**
 * Expansion-05 shadow signal semantic definitions for SELF domain extraction.
 * LLM-first only — no keyword lists for scoring.
 * Both physicalActivityLevel and domesticComfort are new this sprint.
 */
export const EXPANSION_05_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-05 (extract when evidence exists; NOT used for scoring; 1–10 or null):

- physicalActivityLevel: how active/athletic in daily life — fitness behavior, energy for
  physical activities, sedentary vs very active lifestyle / athletic identity.
  Rate actual movement and activity behavior, not merely caring about wellness.
  1–2 = sedentary, low physical activity, prefers minimal movement.
  3–4 = light activity, occasional walks or gym.
  5–6 = moderately active, regular exercise.
  7–8 = very active, fitness/sports are a regular part of life.
  9–10 = highly athletic, activity is central to daily identity.
  PROTECTED — distinct from:
    healthBodyConsciousness (wellness values / caring about health — not how much they move);
    physicalPriority (importance of partner's looks/attraction — not own activity level);
    lifestylePace (busy vs calm life rhythm — not athletic/fitness behavior);
    physicalAffectionStyle (touch/affection need — not sports/fitness);
    noveltyVsRoutine (novelty seeking — not exercise habits);
    interest tags (e.g. gym / hiking — hobby presence ≠ scored activity intensity).
  Infer from how much they move and how central physical activity is — semantic meaning, not keyword "gym" or "fit".
  Distinguish "I care about healthy eating" (wellness values) vs "I train hard most days" (activity level).
  Prefer null over stretched scoring.

- domesticComfort: preference for home/cozy time vs being out and about — where they recharge
  and prefer to spend evenings/weekends (high = homebody / nest preference).
  1–2 = restless at home, always wants to be out, rarely enjoys staying in.
  3–4 = leans toward going out; home is mainly for sleep.
  5–6 = balanced mix of home and out.
  7–8 = prefers cozy nights in; home is the comfort zone.
  9–10 = strong homebody; loves domestic comfort; rarely wants to go out.
  PROTECTED — distinct from:
    socialBattery (intro/extro social energy — not home-vs-out preference);
    lifestylePace (calm vs high-action busy rhythm — not nesting vs nightlife preference);
    noveltyVsRoutine (new experiences vs familiar routines — not specifically home nest);
    independence (autonomy vs fusion — not homebody preference);
    interest tags (e.g. home_life / nightlife — tag presence ≠ scored home/out preference).
  Infer from where they prefer to spend free time and recharge — semantic meaning, not keyword "homebody" or "nightlife".
  Distinguish "I'm introverted / low social energy" (socialBattery) vs "I love staying in on weekends" (domesticComfort).
  Distinguish "my life is calm and slow-paced" (lifestylePace) vs "I prefer cozy nights at home vs going out" (domesticComfort).
  Prefer null over stretched scoring.
`;
```

Agent 1 may tighten wording but must preserve PROTECTED lines and both “adjacent signal vs Expansion-05” distinctions.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** line — append: `physicalActivityLevel, domesticComfort` (after `creativeExpression`).
2. After `${EXPANSION_04_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_05_SELF_SHADOW_SIGNAL_BLOCK}` via import + template concat.
3. **SIGNAL RULES** — upgrade adjacent + add new:

```text
- healthBodyConsciousness = explicit health/wellness values focus (caring about health — not how much they actually exercise/move)
- lifestylePace = explicit pace/rhythm (calm vs high-action busy life) — not home-vs-out nesting preference alone
- physicalActivityLevel = explicit daily athletic/activity behavior / how much they move (not merely wellness values or "I care about fitness")
- domesticComfort = explicit homebody vs always-out preference for evenings/weekends (not social energy intro/extro, not calm vs busy pace alone)
```

Do **not** add trigger phrases / keyword lists (violates LLM-first).

Do **not** edit `PARTNER_EXTRACTOR_PROMPT` / `RELATIONSHIP_EXTRACTOR_PROMPT` ALLOWED KEYS for Expansion-05 keys.

### 4. `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (locked)

Append both keys to the `self` array. Must stay in sync with prompt allowlist.

Expected `self` allowlist after Story 2 (**22 keys**):

```typescript
self: [
  'emotionalDepth',
  'attachmentSecurity',
  'directness',
  'independence',
  'socialBattery',
  'lifestylePace',
  'ambition',
  'healthBodyConsciousness',
  'spirituality',
  'intellectualCuriosity',
  'conflictStyle',
  'noveltyVsRoutine',
  'structureChaosTolerance',
  'relationshipClarity',
  'empathyCompassion',
  'vulnerabilityOpenness',
  'emotionalRegulation',
  'physicalAffectionStyle',
  'humorPlayfulness',
  'creativeExpression',
  'physicalActivityLevel',
  'domesticComfort',
],
```

**Partner / relationship arrays:** unchanged. Do **not** add Expansion-05 keys to `partner` or `relationship`.

### 5. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt block only — no text-inference |
| Null when unclear | Prompt: "Prefer null over stretched scoring" + evidence required |
| Score outside range → null | `validateAndClean` (already) |
| Short text → null | Existing **15-word sparsity shutdown** |
| No keyword / gym / homebody heuristics | No code paths that score from substrings or tags |
| Not conflated with wellness / socialBattery / lifestylePace | PROTECTED + SIGNAL RULES upgrades |

### 6. Shadow mode preserved (locked)

- Both keys remain in `SHADOW_SIGNAL_KEYS` only
- `COMPATIBILITY_SIGNAL_KEYS` still 15
- Product coverage still uses `OFFICIAL_EXTRACTION_SIGNAL_KEYS` — Expansion-05 keys excluded (correct)
- Match engine unchanged
- Expansion-01–04 prompt files **unchanged**

### 7. Tests (agent 1 minimum)

Add to `extraction.service.spec.ts` — `describe('Expansion-05 shadow signals')` (mirror Expansion-04):

| Test | Mock LLM | Expect |
|------|----------|--------|
| High physicalActivityLevel | `physicalActivityLevel: 8` + evidence | `=== 8` |
| Low physicalActivityLevel (sedentary) | `physicalActivityLevel: 2` + evidence | `=== 2` |
| High domesticComfort (homebody) | `domesticComfort: 8` + evidence | `=== 8` |
| Low domesticComfort (always out) | `domesticComfort: 2` + evidence | `=== 2` |
| No cues → both null | `null` | both null |
| Out of range physicalActivityLevel | `11` | stripped to `null` by validateAndClean |

Use semantic example strings from sprint README in test **names/comments only** — assertions on mocked LLM output. Live LLM validation is Story 5.

**Nit:** update stale comment `// With 28 signals (15 official + 13 shadow)` → `30 signals (15 official + 15 shadow)` if that overlap block is touched.

### 8. Agent 4

**Skip** — no eligibility/ranking/matches-endpoint behavior change.

---

## Service signatures

No new public methods. Existing:

```typescript
async extract(
  domain: ExtractionDomain,
  text: string,
  profileId?: string,
): Promise<ExtractedSignals>
```

Consumer path unchanged: profile analysis worker → `extract('self', aboutMe)` → persist `evaluationJson`.

---

## API / HTTP contracts

No REST DTO changes. Shadow keys appear in stored `evaluationJson.self.signals` when extraction succeeds.

---

## Runtime topology

N/A

---

## E2E verification

N/A — extraction-only; no ranking/eligibility change.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-05"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Create `expansion-05-signal-definitions.ts` with semantic block (§2) covering **both** keys.
2. Wire into `SELF_EXTRACTOR_PROMPT` only; update ALLOWED KEYS; upgrade/add SIGNAL RULES (§3); import after Expansion-04 block.
3. Update `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (+2 keys → **22**).
4. Add unit tests (§7); run commands above.
5. **Do not** touch evaluate layer, text-inference regex, scoring, tension, partner allowlist for Expansion-05, or Expansion-01–04 definition files.
6. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for physicalActivityLevel + domesticComfort

Expansion-05 Story 2 — self-domain shadow extraction; disambiguate from wellness/socialBattery/lifestylePace; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for Expansion-05 keys
- [ ] No changes to `extraction-text-inference.ts` / `text-inference.ts` for these keys
- [ ] Prompt block in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] `DOMAIN_ALLOWED_SIGNAL_KEYS.self` synced (**22** keys); Expansion-05 keys **not** on partner
- [ ] Scale 1–10 enforced; null on weak evidence
- [ ] PROTECTED / distinct-from lines present (esp. vs healthBodyConsciousness, physicalPriority, socialBattery, lifestylePace, interest tags)
- [ ] SIGNAL RULES upgrades for `healthBodyConsciousness` + `lifestylePace` present
- [ ] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Expansion-01–04 prompts/tests unchanged
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Follow-up (Story 5):** Live LLM sample validation (>85%) + no false correlation with wellness / social rhythm.
- **Correlation risk:** `physicalActivityLevel` vs `healthBodyConsciousness`; `domesticComfort` vs `socialBattery` / `lifestylePace` — Story 5 may flag; do not hardcode anti-correlation in Story 2.

---

## Next agent

```text
--agent 1 expansion 05 story 2
```

**Notes:** Read `LLM_FIRST_PRINCIPLE.md` before coding. Mirror Expansion-02/04 Story 2 (two signals in one block). Both keys are net-new. Extra care on SIGNAL RULES upgrades for adjacent official keys — this is the main Expansion-05 extraction risk.
