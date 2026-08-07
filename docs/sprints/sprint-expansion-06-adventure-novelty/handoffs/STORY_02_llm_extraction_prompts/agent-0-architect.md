# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for Expansion-06. **Shadow only** — still no scoring/chips/tension.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Wire Expansion-06 into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** follow sprint README inventing evaluate-layer extractors — production extraction lives in `extraction.service.ts`.
- **Story 1 already** put `adventureNovelty` on `SHADOW_SIGNAL_KEYS` + self `DOMAIN_ALLOWED` + `KEY_ALIASES.noveltyVsRoutine → adventureNovelty`. Story 2 **migrates prompts** to the canonical key and adds the rich semantic block.
- Replace every **prompt allowlist / SIGNAL RULES** use of `noveltyVsRoutine` with `adventureNovelty` (alias remains for old LLM/storage outputs).
- Scale **1–10 or null**. No regex / keyword / text-inference rules. No interest-tag scoring.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | `adventureNovelty` in `SHADOW_SIGNAL_KEYS`; `noveltyVsRoutine` **not** in shadow; alias maps legacy → canonical; `DOMAIN_ALLOWED.self` already has `adventureNovelty` (**22**); `MAX_EVIDENCE_ITEMS === 34`; not in `COMPATIBILITY_SIGNAL_KEYS` |
| Expansion-01–05 Story 2 | `expansion-0N-signal-definitions.ts` wired in `SELF_EXTRACTOR_PROMPT` |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` — `SELF_EXTRACTOR_PROMPT` |
| Current prompt drift | ALLOWED KEYS + SIGNAL RULES still say **`noveltyVsRoutine`** (alias keeps pipeline green until this story) |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) — existing pipeline |
| Adjacent collision risk | `lifestylePace` (tempo vs novelty); `domesticComfort` (home/out vs novelty); `structureChaosTolerance`; travel/adventure **interest tags** |
| `evaluate-llm-prompts.ts` | Not core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add prompts to evaluate layer / invent new extractors | **Wrong** — use `extraction.service.ts` + `expansion-06-signal-definitions.ts` |
| Scale 0–10 | **Use 1–10** — matches entire extraction stack |
| Keyword / “creature of habit” heuristics | **Forbidden** — LLM semantic only; README examples are for prompt wording / test fixtures only |
| Distinguish from lifestylePace + travel tag | **Required** — PROTECTED lines + SIGNAL RULES |
| Story 5 live validation | Not Story 2 gate — unit tests with mocked LLM only |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-06-signal-definitions.ts` | **Create** — exported semantic prompt block for `adventureNovelty` |
| `dating-api/src/extraction/extraction.service.ts` | Import block; append after Expansion-05; **replace** `noveltyVsRoutine` → `adventureNovelty` in ALLOWED KEYS + SIGNAL RULES; **upgrade** `lifestylePace` SIGNAL RULES line (novelty ≠ tempo) |
| `dating-api/src/extraction/expansion-03-signal-definitions.ts` | In PROTECTED lines, rename `noveltyVsRoutine` → `adventureNovelty` (concept unchanged) |
| `dating-api/src/extraction/expansion-04-signal-definitions.ts` | Same string rename in PROTECTED lines |
| `dating-api/src/extraction/expansion-05-signal-definitions.ts` | Same string rename in PROTECTED lines |
| `dating-api/src/extraction/extraction-strict-validation.ts` | **No change expected** — Story 1 already swapped self allowlist |
| `dating-api/src/extraction/extraction.service.spec.ts` | New `describe('Expansion-06 shadow signals')` (§7); keep alias regression tests that mock legacy `noveltyVsRoutine` → expect `adventureNovelty` |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `evaluate/evaluate.service.ts` | Does not run per-signal extraction |
| `extraction/extraction-text-inference.ts` | **NO regex rules** for Expansion-06 |
| `engine/signal-post-processing/text-inference.ts` | Same — no regex |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` | Story 3 |
| `matches/match-explainability.ts`, i18n | Story 4 |
| Interest tag registries / UI hobby chips | Orthogonal (`travel` ≠ this signal) |
| `PARTNER_EXTRACTOR_PROMPT` / `RELATIONSHIP_EXTRACTOR_PROMPT` | **Do not** add `adventureNovelty` to partner/relationship |
| Re-analyze / backfill | Out of scope |
| Removing `KEY_ALIASES.noveltyVsRoutine` | **Keep permanently** |

**Exception vs Exp-05 Story 2:** Editing Exp-03/04/05 definition files is **allowed only** for the `noveltyVsRoutine` → `adventureNovelty` rename in PROTECTED distinction strings — no other edits.

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call, self domain for Expansion-06 rich block.**

```
Profile analyze → ExtractionService.extract('self', aboutMe)
  → SELF_EXTRACTOR_PROMPT (includes Expansion-01..06 blocks)
  → completeJSON (fast model, temp 0.1)
  → normalize (noveltyVsRoutine alias → adventureNovelty) → validateAndClean → validateExtraction
  → evaluationJson.self.signals.adventureNovelty
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction.

### 2. New file: `expansion-06-signal-definitions.ts` (locked)

```typescript
/**
 * Expansion-06 shadow signal semantic definitions for SELF domain extraction.
 * LLM-first only — no keyword lists for scoring.
 * Canonical key: adventureNovelty (formerly noveltyVsRoutine; alias remains).
 */
export const EXPANSION_06_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-06 (extract when evidence exists; NOT used for scoring; 1–10 or null):

- adventureNovelty: novelty-seeking vs routine preference — excitement for new experiences,
  places, activities vs comfort in familiar patterns.
  "Adventure" does NOT require extreme sports — trying new restaurants, spontaneous trips,
  variety-seeking count when framed as a preference.
  1–2 = strong preference for routine and familiar; dislikes change / novelty.
  3–4 = mostly routine; occasional new things are fine.
  5–6 = balanced — enjoys some novelty, some routine.
  7–8 = seeks new experiences regularly; variety matters.
  9–10 = strong novelty-seeker; thrives on adventure and the unfamiliar.
  PROTECTED — distinct from:
    lifestylePace (fast/slow busy tempo — can be slow-paced but high novelty, or fast but routine-locked);
    domesticComfort (homebody vs always-out — not new-vs-familiar preference);
    socialBattery (intro/extro social energy — not novelty seeking);
    physicalActivityLevel (athletic/movement behavior — not adventure-as-novelty);
    structureChaosTolerance (order/mess/chaos tolerance — adjacent but not experiential novelty);
    intellectualCuriosity (mental stimulation / ideas — not experiential novelty);
    interest tags (e.g. travel / adventure — hobby presence ≠ scored novelty-vs-routine intensity).
  Infer from how they describe weekends, travel, restaurants, habits, and change — semantic meaning,
  not keyword "adventure", "spontaneous", or "routine".
  Distinguish "my life is calm and slow" (lifestylePace) vs "I prefer familiar places and habits" (adventureNovelty low).
  Distinguish "I love staying in" (domesticComfort) vs "I hate doing the same thing twice" (adventureNovelty high).
  Prefer null over stretched scoring.
`;
```

Agent 1 may tighten wording but must preserve PROTECTED lines and adjacent distinctions.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — replace `noveltyVsRoutine` with `adventureNovelty` (same position; do not append a duplicate).
2. After `${EXPANSION_05_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_06_SELF_SHADOW_SIGNAL_BLOCK}` via import + template concat.
3. **SIGNAL RULES** — replace + upgrade:

```text
- lifestylePace = explicit pace/rhythm (calm vs high-action busy life) — not home-vs-out nesting preference alone, and not novelty-vs-routine preference
- adventureNovelty = explicit novelty vs routine / new-experiences preference (not life tempo alone, not homebody preference, not travel hobby tag alone)
```

Remove the old line:

```text
- noveltyVsRoutine = explicit novelty vs routine preference
```

Do **not** add trigger phrases / keyword lists (violates LLM-first).

Do **not** edit partner/relationship ALLOWED KEYS for Expansion-06.

### 4. `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (locked)

**Already correct after Story 1** — includes `adventureNovelty`, not `noveltyVsRoutine`; length **22**. Agent 1: verify only; no change unless drift found.

**Partner / relationship arrays:** unchanged.

### 5. Cross-sprint PROTECTED rename (locked)

In `expansion-03/04/05-signal-definitions.ts`, replace bare `noveltyVsRoutine` with `adventureNovelty` in PROTECTED / distinction text only. Do not change those sprints’ signal definitions otherwise.

### 6. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt block only — no text-inference |
| Null when unclear | Prompt: "Prefer null over stretched scoring" + evidence required |
| Score outside range → null | `validateAndClean` (already) |
| Short text → null | Existing **15-word sparsity shutdown** |
| No keyword heuristics | No code paths that score from substrings or tags |
| Not conflated with lifestylePace / domesticComfort / travel tags | PROTECTED + SIGNAL RULES |
| Legacy LLM key | `KEY_ALIASES.noveltyVsRoutine` remains |

### 7. Shadow mode preserved (locked)

- `adventureNovelty` remains in `SHADOW_SIGNAL_KEYS` only
- `COMPATIBILITY_SIGNAL_KEYS` still 15
- Match engine unchanged
- Do **not** remove the alias

### 8. Tests (agent 1 minimum)

Add to `extraction.service.spec.ts` — `describe('Expansion-06 shadow signals')`:

| Test | Mock LLM | Expect |
|------|----------|--------|
| High adventureNovelty (canonical key) | `adventureNovelty: 9` + evidence | `=== 9` |
| Low adventureNovelty (routine) | `adventureNovelty: 2` + evidence | `=== 2` |
| Legacy alias path | mock still returns `noveltyVsRoutine: 8` | `signals.adventureNovelty === 8` |
| No cues → null | `adventureNovelty: null` | null |
| Out of range | `adventureNovelty: 11` | stripped to `null` by validateAndClean |

Use semantic example strings from sprint README in test **names/comments only** — assertions on mocked LLM output. Live LLM validation is Story 5.

Keep existing SIGNAL3 / alias regression tests that prove legacy → canonical mapping (may already exist from Story 1).

### 9. Agent 4

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

---

## API / HTTP contracts

No REST DTO changes. Shadow key appears in stored `evaluationJson.self.signals.adventureNovelty` when extraction succeeds.

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
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-06"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Create `expansion-06-signal-definitions.ts` with semantic block (§2).
2. Wire into `SELF_EXTRACTOR_PROMPT` after Expansion-05; replace ALLOWED KEYS + SIGNAL RULES `noveltyVsRoutine` → `adventureNovelty`; upgrade `lifestylePace` line (§3).
3. Rename `noveltyVsRoutine` → `adventureNovelty` in Exp-03/04/05 PROTECTED distinction strings (§5).
4. Verify `DOMAIN_ALLOWED.self` already correct (Story 1) — do not re-add twin key.
5. Add unit tests (§8); run commands above.
6. **Do not** touch evaluate layer, text-inference regex, scoring, tension, partner allowlist, or remove the alias.
7. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for adventureNovelty

Expansion-06 Story 2 — migrate noveltyVsRoutine prompts to adventureNovelty; self-domain shadow; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for `adventureNovelty`
- [ ] No changes to `extraction-text-inference.ts` / `text-inference.ts` for this key
- [ ] Prompt block in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] ALLOWED KEYS / SIGNAL RULES use `adventureNovelty` (no `noveltyVsRoutine` in prompt strings)
- [ ] `KEY_ALIASES.noveltyVsRoutine` still present
- [ ] `DOMAIN_ALLOWED_SIGNAL_KEYS.self` still **22** with `adventureNovelty`; key **not** on partner
- [ ] Scale 1–10 enforced; null on weak evidence
- [ ] PROTECTED / distinct-from lines present (esp. vs lifestylePace, domesticComfort, interest tags)
- [ ] `lifestylePace` SIGNAL RULES mentions novelty-vs-routine distinction
- [ ] Exp-03/04/05 PROTECTED lines updated to `adventureNovelty`
- [ ] Key still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Unit tests pass (incl. alias path)

---

## Open questions / blockers

- None blocking Story 2.
- **Follow-up (Story 5):** Live LLM sample validation (>85%) + no false correlation with `lifestylePace` / `domesticComfort`.
- **Correlation risk:** `adventureNovelty` vs `lifestylePace` / `structureChaosTolerance` — Story 5 may flag; do not hardcode anti-correlation in Story 2.

---

## Next agent

```text
--agent 1 expansion 06 story 2
```

**Notes:** Read `LLM_FIRST_PRINCIPLE.md` before coding. Unlike Exp-05 (net-new keys), this story is **prompt migration + rich block** for a key already on the allowlist. Main risk: conflation with `lifestylePace`. Keep alias forever.
