# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-08-education-integrity-lifestyle  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for Expansion-08 (four education/integrity/lifestyle signals). **Shadow only** — still no scoring / tension / chips.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Wire Expansion-08 into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** invent evaluate-layer extractors — production extraction lives in `extraction.service.ts`.
- Story 1 already created **metadata-only** `expansion-08-signal-definitions.ts` + four `SHADOW_SIGNAL_KEYS`. Story 2 **extends** that file with LLM semantic blocks and wires prompts + `DOMAIN_ALLOWED`.
- Domains: **self + partner** (README lock; preference-shaped keys). **Not** relationship.
- Scale **1–10 or null**. No regex / keyword / text-inference rules. Hebrew-aware **semantic** examples in prompts (not keyword matchers).
- **Category metadata** for `physicalTypePreference`: prompt may mention type categories as meaning aids; **do not** invent a second scored key or new storage schema in Story 2 — **score alone is enough for v1** (Story 3 may add category storage if needed for clash).
- Ethical lock: race/ethnicity and sexual-anatomy-only text → **null** on these four (do not invent scores).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | Four keys in `SHADOW_SIGNAL_KEYS`; metadata module exists; `MAX_EVIDENCE_ITEMS === 43`; total extraction **39**; **not** in `COMPATIBILITY_SIGNAL_KEYS` (still **15**) |
| Self `DOMAIN_ALLOWED` | **27** (through `religiousObservance`) — Story 2 adds **4 → 31** |
| Partner `DOMAIN_ALLOWED` | **13** — Story 2 adds **4 → 17** |
| Expansion-01–07 Story 2 | Blocks already wired in `SELF_EXTRACTOR_PROMPT` / partner — **do not modify** those definition files |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) |
| Adjacent collision risk | `intellectualCuriosity`, `ambition`, `directness`, `lifestylePace`, `physicalPriority`, `healthBodyConsciousness` |
| `evaluate-llm-prompts.ts` | Not core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Create `expansion-08-signal-definitions.ts` | **Extend** existing Story 1 metadata file — add LLM blocks; keep promotion meta |
| Wire self + partner | **Yes** — both domains; relationship **unchanged** |
| Scale 0–10 elsewhere | **Use 1–10** — matches extraction stack |
| Optional category hint / store category metadata | **Prompt guidance only** in Story 2; **no** new scored key, **no** new `evaluationJson` schema field. Score alone for v1 |
| Keyword / regex heuristics | **Forbidden** — LLM semantic only; README Hebrew strings are prompt examples / Story 5 fixtures, not matchers |
| Hebrew regression fixtures | **Story 5** live gate — Story 2 uses **mocked LLM** unit tests only (may seed fixture JSON for Story 5, optional) |
| >85% agreement | **Story 5** — not Story 2 |
| Evaluate-layer prompts | **Wrong path** — use `extraction.service.ts` |
| honestyIntegrity low (1–3) | Prefer **null from silence** — do not invent low scores when honesty is unmentioned |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-08-signal-definitions.ts` | **Extend** — add `EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK` + `EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK` (keep Story 1 meta exports) |
| `dating-api/src/extraction/extraction.service.ts` | Import both blocks; append self after Exp-07; append partner block; add 4 keys to self + partner `ALLOWED KEYS`; add SIGNAL RULES; upgrade adjacent SIGNAL RULES |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add 4 keys to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**27 → 31**) and `.partner` (**13 → 17**) |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-08 shadow signals')` (§8) |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Update Exp-06/07 asserts `DOMAIN_ALLOWED.self.length === 27` → **31**; partner **13 → 17** |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `extraction/extraction-text-inference.ts` / `engine/.../text-inference.ts` | **NO regex** for Exp-08 |
| `expansion-01`…`07-signal-definitions.ts` | Prior sprints — do not edit |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `matches/match-explainability.ts`, i18n | Story 4 |
| Structured physical-type category storage | Story 3 (if clash needs it) |
| Race/ethnicity or sexual-anatomy signal keys | **Forbidden** |
| `RELATIONSHIP_EXTRACTOR_PROMPT` | Do **not** add Exp-08 keys |
| Live LLM / Hebrew fixture validator script | Story 5 |
| Prisma / backfill / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call per domain. Self + partner rich blocks.**

```
Profile analyze → ExtractionService.extract('self' | 'partner', text)
  → SELF_EXTRACTOR_PROMPT (Exp-01..08) OR PARTNER_EXTRACTOR_PROMPT (+ Exp-07/08 partner blocks)
  → completeJSON → normalize → validateAndClean → validateExtraction
  → evaluationJson.{self|partner}.signals.{educationLevel|honestyIntegrity|chronotype|physicalTypePreference}
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction.

### 2. Extend `expansion-08-signal-definitions.ts` (locked)

Keep existing `EXPANSION_08_SHADOW_SIGNAL_KEYS` / weights / tiers / domains / chip labels.

Append:

```typescript
/**
 * Expansion-08 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-08 Education / Integrity / Lifestyle (extract when evidence exists; NOT used for scoring; 1–10 or null):

- educationLevel: importance of formal education / degree attainment (high school → university → advanced degree)
  for self and/or partner filtering.
  1–2 = education/credentials do not matter; street smarts over diplomas.
  3–4 = some schooling preferred; not a filter.
  5–6 = appreciates education; open either way.
  7–8 = prefers university-educated partner.
  9–10 = requires degree / advanced degree as partner filter.
  PROTECTED — distinct from:
    intellectualCuriosity (love of learning/ideas/mental stimulation — not formal credentials);
    ambition (drive/goals/achievement — not schooling credential preference).
  "I'm smart" / bookish without degree stance → prefer null (curiosity may fire separately).
  Hebrew meaning examples (do not keyword-match): "רק עם תואר ראשון", "חכמים באוניברסיטה".

- honestyIntegrity: importance of honesty, integrity, trustworthiness, and "no games" as a relationship value.
  1–2 = little emphasis on honesty/integrity (ONLY when text downplays it — do NOT invent low from silence).
  3–4 = mild preference for honesty.
  5–6 = values honesty but not a dominant theme.
  7–8 = strongly seeks honest / straightforward / no-games partner.
  9–10 = honesty/integrity is central ("straight as a ruler", "no liars", "no games").
  PROTECTED — distinct from:
    directness (communication bluntness / transparency style — not integrity/trustworthiness as a core value).
  Prefer null when honesty/trust/games/integrity are unmentioned.
  Hebrew meaning examples (do not keyword-match): "ישרה כמו סרגל", "לא משחק משחקים".

- chronotype: natural sleep/wake and energy rhythm — early bird ↔ night owl.
  1–2 = strong early bird / morning person.
  3–4 = prefers mornings / early nights.
  5–6 = flexible / normal schedule.
  7–8 = prefers late nights / sleeping in.
  9–10 = strong night owl; sleeps late regularly.
  PROTECTED — distinct from:
    lifestylePace (fast/slow life tempo / busy vs calm — not morning vs night sleep rhythm).
  Prefer null when no sleep/schedule rhythm is mentioned.
  Hebrew meaning examples (do not keyword-match): "לישון עד מאוחר בשבת".

- physicalTypePreference: how specific and important particular body/build preferences are
  (curvy, athletic, slim, petite, taller, etc.) vs flexible about type.
  1–2 = explicitly flexible / "doesn't care about appearance" regarding type.
  3–4 = mild preferences, not filters.
  5–6 = some preference mentioned; still open.
  7–8 = clear type preference (e.g. athletic, curvy).
  9–10 = strong exclusive preference ("only X type").
  PROTECTED — distinct from:
    physicalPriority (how much looks/attraction matter — not which body/build type);
    healthBodyConsciousness (own wellness values — not partner body-type filter).
  Mentions "beautiful" / "attractive" without type specificity → prefer null here (physicalPriority may fire).
  Hair-color-only exclusive filters → prefer null or mid; do not invent a hair-color scored signal.
  Race/ethnicity preferences and sexual-anatomy-only preferences → ALWAYS null on this key (and all Exp-08 keys).
  Category labels (athletic/curvy/slim/etc.) are meaning aids only — do NOT invent a second scored key.
  Hebrew meaning examples (do not keyword-match): "אוהב שמנות ומלאות", "לא איכפת לו ממראה חיצוני".

Prefer null over stretched scoring for all Expansion-08 keys.
Ethical: race/ethnicity and sexual-anatomy-only text must not produce Exp-08 scores.
`;

/**
 * Expansion-08 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-08 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- educationLevel: how much formal education/credentials matter in a partner
- honestyIntegrity: desired partner honesty/integrity/"no games" emphasis
- chronotype: desired partner sleep/energy rhythm (early bird vs night owl)
- physicalTypePreference: how specific body/build type preferences are for a partner

Use the same 1–10 scales and PROTECTED distinctions as Expansion-08 self definitions.
CRITICAL: partner intellectualCuriosity = mental stimulation/ideas — NOT degree/credential filter (→ educationLevel).
CRITICAL: partner physicalPriority = looks/attraction importance — NOT which body/build type (→ physicalTypePreference).
CRITICAL: partner traditionalism / lifestylePace remain as today — chronotype is sleep/morning-night only.
Race/ethnicity and sexual-anatomy-only preferences → null on all Expansion-08 keys.
Prefer null over stretched scoring. Do not invent honestyIntegrity low scores from silence.
`;
```

Agent 1 may tighten wording but must preserve all four keys, scales, PROTECTED lines, ethical null rules, and Hebrew-as-examples-only guidance.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append (comma-separated, after `religiousObservance`):

```text
educationLevel, honestyIntegrity, chronotype, physicalTypePreference
```

2. After `${EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK}`.

3. **SIGNAL RULES** — add:

```text
- educationLevel = explicit formal education/degree importance or credential filter (not intellectual curiosity alone, not ambition alone)
- honestyIntegrity = explicit honesty/integrity/"no games" value (not communication bluntness/directness alone); prefer null if unmentioned
- chronotype = explicit morning vs night sleep/energy rhythm (not busy vs calm lifestyle pace alone)
- physicalTypePreference = explicit body/build type specificity vs flexibility (not looks-importance alone); race/anatomy-only → null
```

4. **Upgrade adjacent lines** (self):

```text
- directness = explicit transparency, no secrets, clear communication — not honesty/integrity/"no games" as a core relationship value alone
- intellectualCuriosity = explicit need for mental stimulation / ideas / deep learning with a partner (not merely "I'm smart" or listing books, and not formal degree/credential filters)
- lifestylePace = explicit pace/rhythm (calm vs high-action busy life) — not home-vs-out nesting preference alone, not novelty-vs-routine preference, and not morning vs night sleep chronotype
- ambition = explicit goals, drive — not formal education/credential preference alone
```

Do **not** add trigger-phrase keyword lists.

### 4. `PARTNER_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append the same four keys after `religiousObservance`.

2. Inject `${EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK}` after the Exp-07 partner block (before DIRECTION LOCK / HARD SEMANTIC GUARD — keep readable).

3. **SIGNAL RULES** — add the four partner-framed one-liners (desired-partner traits).

4. **Upgrade**:

```text
- physicalPriority = explicit looks, attraction, chemistry, appearance — not casual vs committed intimacy boundary, and not which body/build type preference (→ physicalTypePreference)
- intellectualCuriosity = explicit learning, books, ideas, curiosity, deep conversations — not formal degree/credential filter (→ educationLevel)
- lifestylePace = quiet/calm/home-centered = lower; adventurous/high-action = higher — not morning vs night sleep chronotype
```

### 5. `DOMAIN_ALLOWED_SIGNAL_KEYS` (locked)

| Domain | Change |
|--------|--------|
| `self` | Append all 4 Exp-08 keys → length **31** |
| `partner` | Append all 4 Exp-08 keys → length **17** |
| `relationship` | **Unchanged** |

Update specs that assert self length **27** (Exp-06/07 blocks) → **31**, and partner **13 → 17**.

### 6. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt blocks only — no text-inference |
| Null when unclear | "Prefer null…" + evidence required |
| Score outside range → null | `validateAndClean` |
| Short text → null | Existing sparsity shutdown |
| No keyword heuristics | No substring/tag scoring paths |
| Racist / anatomy-only → null | PROTECTED / ethical lines in both blocks |
| honestyIntegrity silence → null | Prefer null, do not invent low |
| Category storage | **Not** Story 2 |
| >85% / live Hebrew fixtures | **Story 5** |

### 7. Shadow mode preserved (locked)

- Keys remain in `SHADOW_SIGNAL_KEYS` only
- `COMPATIBILITY_SIGNAL_KEYS` still **15**
- No tension / chips / promote
- Metadata weights stay document-only

### 8. Tests (agent 1 minimum)

Add to `extraction.service.spec.ts` — `describe('Expansion-08 shadow signals')`:

| Test | Domain | Mock LLM | Expect |
|------|--------|----------|--------|
| High educationLevel | self | `9` + evidence | `=== 9` |
| Low educationLevel | self | `2` + evidence | `=== 2` |
| Null educationLevel ("smart" only) | self | `null` | null |
| High honestyIntegrity | self | `9` + evidence | `=== 9` |
| Null honestyIntegrity (silence) | self | `null` | null |
| High chronotype (night owl) | self | `9` + evidence | `=== 9` |
| Low chronotype (early bird) | self | `2` + evidence | `=== 2` |
| Null chronotype | self | `null` | null |
| High physicalTypePreference | self | `9` + evidence | `=== 9` |
| Low physicalTypePreference (flexible) | self | `2` + evidence | `=== 2` |
| Null physicalTypePreference ("beautiful" only) | self | `null` | null |
| Out of range | self | `11` on any Exp-08 key | stripped to `null` |
| Partner educationLevel smoke | partner | `8` + evidence | `=== 8` |
| Partner physicalTypePreference smoke | partner | `8` + evidence | `=== 8` |

Use README semantic / Hebrew strings in test **names/comments only** — assertions on mocked LLM output. Do **not** add regex fixtures that pretend to score.

Also update `extracted-signals.spec.ts` domain-length asserts (27 → 31, 13 → 17).

Optional (not required): seed `dating-api/data/expansion-08-extraction-fixtures.json` for Story 5 — **do not** run live LLM in Story 2.

### 9. Agent 4

**Skip.**

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

No REST DTO changes. Shadow keys appear in stored `evaluationJson.self|partner.signals.*` when extraction succeeds.

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
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-08"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `expansion-08-signal-definitions.ts` with self + partner semantic blocks (§2); keep Story 1 metadata.
2. Wire self block after Exp-07; update self ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§3).
3. Wire partner block after Exp-07 partner block; update partner ALLOWED KEYS + SIGNAL RULES + upgrades (§4).
4. Sync `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**31**) and `.partner` (**17**) (§5).
5. Add unit tests (§8); fix domain-length asserts; run commands above.
6. **Do not** touch evaluate layer, text-inference regex, scoring, tension, relationship prompt, Exp-01–07 definition files, category storage schema, or promote.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-08-education-integrity-lifestyle/handoffs/STORY_02_llm_extraction_prompts/`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for Expansion-08 education/integrity/lifestyle signals

Story 2 — self+partner shadow extraction; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for Exp-08 keys
- [ ] No changes to text-inference files for these keys
- [ ] Prompt blocks in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] Self + partner ALLOWED KEYS include all four; relationship unchanged
- [ ] `DOMAIN_ALLOWED.self === 31`, `.partner === 17`
- [ ] Scale 1–10; null on weak evidence; out-of-range stripped
- [ ] PROTECTED distinctions present (education / honesty / chronotype / physical type)
- [ ] Ethical null rules present (race/ethnicity, anatomy-only)
- [ ] Adjacent SIGNAL RULES upgraded (directness / curiosity / pace / ambition / physicalPriority)
- [ ] No structured category storage invented
- [ ] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Story 1 metadata exports preserved
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Story 5:** Live Hebrew gap fixtures (honesty ruler, degree, sleep late Shabbat, curvy preference, appearance-flexible, racist/anatomy → null) + >85% gate.
- **Story 3:** Three tension rules ship fully; `physical_type_specificity_clash` category-gated / soft-skip if no metadata.
- **Correlation risk:** `honestyIntegrity` vs `directness`; `educationLevel` vs `intellectualCuriosity` / `ambition`; `chronotype` vs `lifestylePace`; `physicalTypePreference` vs `physicalPriority` — monitor in Story 5; do not hardcode anti-correlation in Story 2.

---

## Next agent

```text
--agent 1 expansion 08 story 2
```

**Notes:** Mandatory `LLM_FIRST_PRINCIPLE.md`. Extend existing metadata file — do not recreate from scratch. Self **and** partner. Keep shadow / no scoring. Score-only for physical type in v1 (no category schema).
