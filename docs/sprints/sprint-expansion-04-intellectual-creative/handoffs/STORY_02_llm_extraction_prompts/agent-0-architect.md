# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-04-intellectual-creative  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for Expansion-04. **Shadow only** — still no scoring/chips/tension.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Wire Expansion-04 into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** follow sprint README file paths (`evaluate-llm-prompts.ts`) or per-signal `extractNumericSignal` — production extraction lives in `extraction.service.ts`.
- **Two keys, asymmetric baseline:**
  - `intellectualCuriosity` — **already** in `SHADOW_SIGNAL_KEYS`, `ALLOWED KEYS`, `DOMAIN_ALLOWED_SIGNAL_KEYS.self` / `partner`, and a thin SIGNAL RULES line. Story 2 **refines** relationship-need framing (rich Expansion-04 block + upgraded SIGNAL RULES pointer). Do **not** re-add the key.
  - `creativeExpression` — **new**. Add to self-domain allowlist + ALLOWED KEYS + SIGNAL RULES + Expansion-04 semantic block.
- Scale **1–10 or null**. No regex / keyword / text-inference rules. No interest-tag scoring.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | `creativeExpression` in `SHADOW_SIGNAL_KEYS`; `intellectualCuriosity` already shadow; `MAX_EVIDENCE_ITEMS === 32`; not in `COMPATIBILITY_SIGNAL_KEYS` |
| Expansion-01/02/03 Story 2 | `expansion-0N-signal-definitions.ts` wired in `SELF_EXTRACTOR_PROMPT` — **do not modify** those files |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` — `SELF_EXTRACTOR_PROMPT` |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) — existing pipeline |
| Interest tags | Orthogonal (`books_reading`, `art_visual`, etc.) — **do not** score signals from tag presence |
| `evaluate-llm-prompts.ts` | Summary / motivation / attraction / derived-context only — **not** core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add prompts to evaluate layer / invent new extractors | **Wrong** — use `extraction.service.ts` + `expansion-04-signal-definitions.ts` |
| Scale 0–10 | **Use 1–10** — matches entire extraction stack |
| Add both keys as if new | **Only `creativeExpression` is new to allowlists**; refine `intellectualCuriosity` semantics |
| Keyword / job-title heuristics | **Forbidden** — LLM semantic only; “artist” alone ≠ high `creativeExpression` |
| Story 5 live validation | Not Story 2 gate — unit tests with mocked LLM only |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-04-signal-definitions.ts` | **Create** — exported semantic prompt block for both Expansion-04 keys |
| `dating-api/src/extraction/extraction.service.ts` | Import block; append after Expansion-03; add `creativeExpression` to `ALLOWED KEYS`; upgrade `intellectualCuriosity` SIGNAL RULES; add `creativeExpression` SIGNAL RULES |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add `creativeExpression` to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` only |
| `dating-api/src/extraction/extraction.service.spec.ts` | New `describe('Expansion-04 shadow signals')` — mock LLM tests (§7); bump stale signal-count comment 27→28 if touched |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `evaluate/evaluate.service.ts` | Does not run per-signal extraction |
| `extraction/extraction-text-inference.ts` | **NO regex rules** for Expansion-04 signals |
| `engine/signal-post-processing/text-inference.ts` | Same — no regex |
| `expansion-01/02/03-signal-definitions.ts` | Prior sprints — do not edit |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` | Story 3 |
| `matches/match-explainability.ts`, i18n | Story 4 |
| Interest tag registries / UI hobby chips | Orthogonal — Story 5 coexistence assert |
| `PARTNER_EXTRACTOR_PROMPT` / `RELATIONSHIP_EXTRACTOR_PROMPT` | **Do not** add `creativeExpression` to partner. Leave existing thin partner `intellectualCuriosity` line as-is (partner preference for learning/ideas already present). Expansion-04 rich framing is **self only**. |
| Re-analyze / backfill | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call, self domain for Expansion-04 rich block.**

```
Profile analyze → ExtractionService.extract('self', aboutMe)
  → SELF_EXTRACTOR_PROMPT (includes Expansion-01..04 blocks)
  → completeJSON (fast model, temp 0.1)
  → normalize → validateAndClean → validateExtraction
  → evaluationJson.self.signals.{intellectualCuriosity, creativeExpression}
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction.

### 2. New file: `expansion-04-signal-definitions.ts` (locked)

```typescript
/**
 * Expansion-04 shadow signal semantic definitions for SELF domain extraction.
 * LLM-first only — no keyword lists for scoring.
 * intellectualCuriosity already existed as a thin shadow key — this block refines
 * relationship-need framing. creativeExpression is new this sprint.
 */
export const EXPANSION_04_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-04 (extract when evidence exists; NOT used for scoring; 1–10 or null):

- intellectualCuriosity: need for mental stimulation with a partner — ideas, learning,
  deep conversations, intellectual growth in a relationship.
  NOT merely "I am smart / educated / read a lot" as self-image — rate need for stimulation in love.
  1–2 = little interest in ideas or deep thinking with a partner.
  3–4 = occasional intellectual conversation is fine.
  5–6 = moderate — enjoys some mental stimulation.
  7–8 = needs regular intellectual engagement; ideas matter in the bond.
  9–10 = intellectual connection is essential; thrives on learning together.
  PROTECTED — distinct from:
    emotionalDepth (introspection / emotional intensity, not idea-oriented stimulation);
    noveltyVsRoutine (novelty vs familiar routines, not intellectual depth);
    humorPlayfulness (levity / banter, not mental stimulation);
    ambition (goals / drive / achievement, not curiosity about ideas);
    conflictStyle (disagreement handling, not intellectual engagement);
    interest tags / hobby mentions (binary hobby presence ≠ scored intellectual need).
  Infer from what they want to share/discuss/grow with a partner — semantic meaning, not keywords "smart" or "books".
  Distinguish "I am intelligent" (self-image) vs "I need mental stimulation in relationships" (relationship need).
  Prefer null over stretched scoring.

- creativeExpression: need for creative outlets — art, making things, self-expression through creation;
  how central creativity is to identity and daily life.
  NOT merely having a creative job title or listing an art hobby tag — rate need/identity drive for creating.
  1–2 = not interested in creative pursuits.
  3–4 = enjoys creativity casually.
  5–6 = creative hobbies matter moderately.
  7–8 = creative expression is an important part of life.
  9–10 = creativity is core identity; needs space and respect for creative time.
  PROTECTED — distinct from:
    intellectualCuriosity (mental stimulation / ideas, not making/creating);
    noveltyVsRoutine (seeking new experiences, not creative making);
    humorPlayfulness (play/banter, not artistic expression);
    lifestylePace (busy vs calm rhythm, not creative identity);
    interest tags (e.g. art_visual / music — presence of a hobby ≠ intensity of creative need);
    job/logistics ("I'm a designer") alone without need/identity cues.
  Infer from how central making/creating is to who they are and what they need — not keyword "artist" or "creative".
  Distinguish "I work in design" (job) vs "I need creative expression in my life" (identity/need).
  Prefer null over stretched scoring.
`;
```

Agent 1 may tighten wording but must preserve PROTECTED lines, both “self-image/job vs relationship/identity need” distinctions, and explicit orthogonality to **interest tags**.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** line — append: `creativeExpression` (after `humorPlayfulness`). Leave `intellectualCuriosity` where it already is.
2. After `${EXPANSION_03_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_04_SELF_SHADOW_SIGNAL_BLOCK}` via import + template concat.
3. **SIGNAL RULES** — update / add:
   - Upgrade existing: `intellectualCuriosity` = explicit need for mental stimulation / ideas / deep learning **with a partner** (not merely "I'm smart" or listing books)
   - Add: `creativeExpression` = explicit need for creative outlets / making / self-expression through creation (not merely job title "artist" or hobby tag)

Do **not** add trigger phrases / keyword lists (violates LLM-first).

Do **not** edit `PARTNER_EXTRACTOR_PROMPT` ALLOWED KEYS or SIGNAL RULES for `creativeExpression`. Partner may keep existing thin `intellectualCuriosity` line unchanged.

### 4. `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (locked)

Append `creativeExpression` to the `self` array. Must stay in sync with prompt allowlist.

Expected `self` allowlist after Story 2 (**20 keys**):

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
],
```

**Partner / relationship arrays:** unchanged. Do **not** add `creativeExpression` to `partner`.

### 5. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt block only — no text-inference |
| Null when unclear | Prompt: "Prefer null over stretched scoring" + evidence required |
| Score outside range → null | `validateAndClean` (already) |
| Short text → null | Existing **15-word sparsity shutdown** |
| No keyword / "artist" heuristics | No code paths that score from substrings or tags |
| Log extraction | Existing pipeline logs — no new log pipeline required |

### 6. Shadow mode preserved (locked)

- Both keys remain in `SHADOW_SIGNAL_KEYS` only
- `COMPATIBILITY_SIGNAL_KEYS` still 15
- Product coverage still uses `OFFICIAL_EXTRACTION_SIGNAL_KEYS` — Expansion-04 keys excluded (correct)
- Match engine unchanged
- Expansion-01/02/03 prompt files **unchanged**

### 7. Tests (agent 1 minimum)

Add to `extraction.service.spec.ts` — `describe('Expansion-04 shadow signals')` (mirror Expansion-02/03):

| Test | Mock LLM | Expect |
|------|----------|--------|
| High intellectualCuriosity (relationship need) | `intellectualCuriosity: 8` + evidence | `=== 8` |
| Low intellectualCuriosity | `intellectualCuriosity: 2` + evidence | `=== 2` |
| High creativeExpression | `creativeExpression: 8` + evidence | `=== 8` |
| Low creativeExpression | `creativeExpression: 2` + evidence | `=== 2` |
| No cues → creativeExpression null | `null` | `creativeExpression` null |
| Out of range creativeExpression | `11` | stripped to `null` by validateAndClean |

Use semantic example strings from sprint README in test **names/comments only** — assertions on mocked LLM output. Live LLM validation is Story 5.

**Nit:** update stale comment `// With 27 signals (15 official + 12 shadow)` → `28 signals (15 official + 13 shadow)` if that overlap block is touched.

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

N/A — no realtime, proxy, cookies, or migrations.

---

## E2E verification

N/A — extraction-only; no ranking/eligibility change.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-04"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Create `expansion-04-signal-definitions.ts` with semantic block (§2) covering **both** keys.
2. Wire into `SELF_EXTRACTOR_PROMPT` only; update ALLOWED KEYS (`creativeExpression`); upgrade/add SIGNAL RULES; import after Expansion-03 block.
3. Update `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (+1 key → 20).
4. Add unit tests (§7); run commands above.
5. **Do not** touch evaluate layer, text-inference regex, scoring, tension, partner allowlist for `creativeExpression`, or Expansion-01/02/03 definition files.
6. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for intellectualCuriosity + creativeExpression

Expansion-04 Story 2 — refine intellectualCuriosity relationship-need framing; add creativeExpression self-domain shadow extraction; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for Expansion-04 keys
- [ ] No changes to `extraction-text-inference.ts` / `text-inference.ts` for these keys
- [ ] Prompt block in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] `DOMAIN_ALLOWED_SIGNAL_KEYS.self` synced (20 keys); `creativeExpression` **not** on partner
- [ ] Scale 1–10 enforced; null on weak evidence
- [ ] PROTECTED / distinct-from lines present (esp. vs tags, job titles, "I'm smart", emotionalDepth, humorPlayfulness)
- [ ] `intellectualCuriosity` not duplicated in SHADOW / allowlists
- [ ] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Expansion-01/02/03 prompts/tests unchanged
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Follow-up (Story 5):** Live LLM sample validation (>85%) + interest-tag coexistence regression.
- **Correlation risk:** `intellectualCuriosity` vs `emotionalDepth` / `noveltyVsRoutine`; `creativeExpression` vs hobby tags — Story 5 may flag; do not hardcode anti-correlation in Story 2.

---

## Next agent

```text
--agent 1 expansion 04 story 2
```

**Notes:** Read `LLM_FIRST_PRINCIPLE.md` before coding. Mirror Expansion-02 Story 2 (two signals in one block) — Expansion-04 twist is refining an **existing** thin key (`intellectualCuriosity`) while adding one new key (`creativeExpression`).
