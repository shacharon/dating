# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-02-regulation-affection  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for `emotionalRegulation` + `physicalAffectionStyle`. **Shadow only** — still no scoring/chips/tension.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Wire Expansion-02 shadow signals into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** follow sprint README §2.1 file path (`evaluate-llm-prompts.ts`) or §2.2 pattern (`evaluate.service.ts` + separate `extractNumericSignal` calls) — those do not match production extraction architecture.
- Add rich **semantic prompt blocks** (sprint README definitions, adapted) to the **`self`** domain extractor only — same pattern as Expansion-01 Story 2.
- Keep scale **1–10 or null** (matches `validateAndClean`); no regex / keyword / text-inference rules for these keys.
- Agent 4 **skipped** (no eligibility/ranking change).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | Keys in `SHADOW_SIGNAL_KEYS`; not in `COMPATIBILITY_SIGNAL_KEYS` |
| Expansion-01 Story 2 | `expansion-01-signal-definitions.ts` + wired in `SELF_EXTRACTOR_PROMPT` — **do not modify** |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` — `SELF_EXTRACTOR_PROMPT` |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) — existing pipeline |
| `evaluate-llm-prompts.ts` | Summary / motivation / attraction / derived-context only — **not** core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add prompts to `evaluate-llm-prompts.ts` | **Wrong file** — use extraction prompt path below |
| `evaluate.service.ts` + parallel `extractNumericSignal` | **Wrong pattern** — extend `SELF_EXTRACTOR_PROMPT`; no new LLM calls |
| Scale 0–10 | **Use 1–10** — matches entire extraction stack |
| `<50 chars` → null | **Use existing sparsity shutdown** (15-word rule in prompt) — do not add a second char gate |
| Story 5 test file `evaluate.service.spec.ts` | Tests belong in `extraction.service.spec.ts` (mock LLM) for Story 2 |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-02-signal-definitions.ts` | **Create** — exported semantic prompt block(s) for the two signals |
| `dating-api/src/extraction/extraction.service.ts` | Import block; append to `SELF_EXTRACTOR_PROMPT`; add keys to `ALLOWED KEYS` + `SIGNAL RULES` |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add both keys to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` |
| `dating-api/src/extraction/extraction.service.spec.ts` | New `describe('Expansion-02 shadow signals')` — mock LLM high/low/null cases |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `evaluate/evaluate.service.ts` | Does not run per-signal extraction |
| `extraction/extraction-text-inference.ts` | **NO regex rules** for Expansion-02 signals |
| `engine/signal-post-processing/text-inference.ts` | Same — no regex |
| `expansion-01-signal-definitions.ts` | Expansion-01 complete — do not edit |
| `compatibility/compatibility-score.ts` | Story 1 shadow lock |
| `engine/tension-rules.ts` | Story 3 |
| `matches/match-explainability.ts`, i18n | Story 4 |
| `PARTNER_EXTRACTOR_PROMPT` / `RELATIONSHIP_EXTRACTOR_PROMPT` | Would conflate “wants regulated/affectionate partner” with “is regulated/affectionate” — **self only** |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call, self domain only.**

```
Profile analyze → ExtractionService.extract('self', aboutMe)
  → SELF_EXTRACTOR_PROMPT (includes Expansion-01 + Expansion-02 blocks)
  → completeJSON (fast model, temp 0.1)
  → normalize → validateAndClean → validateExtraction
  → evaluationJson.self.signals.emotionalRegulation | physicalAffectionStyle
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction.

### 2. New file: `expansion-02-signal-definitions.ts` (locked)

Keeps semantic definitions maintainable without bloating `extraction.service.ts`. Export one block consumed by `SELF_EXTRACTOR_PROMPT`:

```typescript
/**
 * Expansion-02 shadow signal semantic definitions for SELF domain extraction.
 * LLM-first only — no keyword lists for scoring.
 */
export const EXPANSION_02_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-02 (extract when evidence exists; NOT used for scoring; 1–10 or null):

- emotionalRegulation: managing emotions under stress; staying balanced vs reactive/volatile;
  not flooding a partner with emotional outbursts; ability to calm down and process feelings.
  1–2 = very reactive, volatile, struggles to calm down when upset.
  3–4 = sometimes reactive, needs time to recover from strong emotions.
  5–6 = generally balanced, can usually manage reactions with effort.
  7–8 = emotionally steady, processes feelings without derailing the relationship.
  9–10 = highly regulated, calm under pressure, rarely reactive.
  PROTECTED — distinct from:
    emotionalDepth (values depth/introspection, not self-regulation under stress);
    empathyCompassion (attunement to partner feelings, not own emotional control);
    conflictStyle (how disagreements are handled, not general emotional steadiness);
    attachmentSecurity (bonding/clinginess style, not regulation skill);
    vulnerabilityOpenness (comfort sharing vs ability to stay calm).
  Infer from HOW they describe emotional reactions, stress, and recovery — semantic meaning, not keywords.
  Prefer null over stretched scoring.

- physicalAffectionStyle: need for physical touch, cuddling, PDA, closeness through touch in a relationship;
  how much physical affection they want to give and receive day-to-day.
  1–2 = low touch needs, prefers minimal physical affection.
  3–4 = occasional affection, not a primary love language.
  5–6 = moderate touch needs, enjoys regular affection.
  7–8 = high affection needs, touch is important for feeling connected.
  9–10 = very high touch needs, physical closeness is essential daily.
  PROTECTED — distinct from:
    physicalPriority (importance of partner's looks/attractiveness, not touch frequency);
    attachmentSecurity (emotional closeness/fusion, not tactile affection style);
    emotionalAvailability (behavioral presence "am I there?" — shadow, not extracted here);
    independence (autonomy/space vs need for physical closeness).
  Infer from explicit statements about touch, cuddling, PDA, physical closeness — not keywords.
  Prefer null over stretched scoring.
`;
```

Agent 1 may tighten wording but must preserve PROTECTED lines and semantic (not keyword) instruction.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** line — append: `emotionalRegulation, physicalAffectionStyle`
2. After `${EXPANSION_01_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_02_SELF_SHADOW_SIGNAL_BLOCK}` via import + template concat at module load.
3. **SIGNAL RULES** — add short pointers:
   - `emotionalRegulation` = explicit emotional steadiness vs reactivity under stress; calm recovery (not merely "I'm emotional")
   - `physicalAffectionStyle` = explicit touch/cuddling/PDA/closeness needs (not general attractiveness or "I'm loving")

Do **not** add trigger phrases / keyword lists (violates LLM-first).

### 4. `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (locked)

Append both keys to the `self` array in `extraction-strict-validation.ts`. Must stay in sync with prompt allowlist.

Expected `self` allowlist after Story 2 (18 keys):

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
],
```

### 5. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| Score outside range → null | `validateAndClean` (already) |
| Uncertain → null | Prompt: "Prefer null over stretched scoring" + evidence required |
| Short text → null | Existing **15-word sparsity shutdown** in `SELF_EXTRACTOR_PROMPT` |
| Log extraction | Existing `extraction_after_llm` / `keysPresent` logs — **no new log pipeline required** |

Optional (nice-to-have, not blocking): debug log when either Expansion-02 key is non-null:

```typescript
event: 'expansion02_shadow_extracted'
keys: { emotionalRegulation, physicalAffectionStyle }
```

### 6. Shadow mode preserved (locked)

- Keys remain in `SHADOW_SIGNAL_KEYS` only
- `product-scores.ts` / coverage still use `OFFICIAL_EXTRACTION_SIGNAL_KEYS` — Expansion-02 keys excluded from product coverage (correct for shadow)
- Match engine unchanged — no score impact until promote story
- Expansion-01 extraction prompts **unchanged**

### 7. Tests (agent 1 minimum — agent 2 expands)

Add to `extraction.service.spec.ts` (mirror `Expansion-01 shadow signals` describe):

| Test | Mock LLM | Expect |
|------|----------|--------|
| High regulation text | `emotionalRegulation: 8` + evidence | `signals.emotionalRegulation === 8` |
| Low regulation text | `emotionalRegulation: 2` + evidence | `=== 2` |
| High affection text | `physicalAffectionStyle: 8` | `=== 8` |
| Low affection text | `physicalAffectionStyle: 2` | `=== 2` |
| No cues | both `null` | both null |
| Out of range from LLM | `emotionalRegulation: 11` | stripped to `null` by validateAndClean |

Use semantic example strings from sprint README in test **names/comments only** — assertions are on mocked LLM output (unit tests), not live LLM calls. Live LLM validation is Story 5.

**Optional nit fix** (from Story 1 CR): update stale comment `// With 24 signals` → `26 signals` in overlap test if that block is touched.

### 8. Agent 4

**Skip** — no eligibility/ranking/matches-endpoint behavior change.

---

## Service signatures

No new public methods. Existing:

```typescript
// ExtractionService — unchanged signature
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
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-02"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Create `expansion-02-signal-definitions.ts` with semantic block (§2).
2. Wire into `SELF_EXTRACTOR_PROMPT` only; update ALLOWED KEYS + SIGNAL RULES; import after Expansion-01 block.
3. Update `DOMAIN_ALLOWED_SIGNAL_KEYS.self`.
4. Add unit tests (§7); run commands above.
5. **Do not** touch evaluate layer, text-inference regex, scoring, tension, or Expansion-01 definitions.
6. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for emotionalRegulation and physicalAffectionStyle

Expansion-02 Story 2 — self-domain shadow extraction only; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for Expansion-02 signals
- [ ] No changes to `extraction-text-inference.ts` / `text-inference.ts` for these keys
- [ ] Prompt block in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] `DOMAIN_ALLOWED_SIGNAL_KEYS.self` synced with prompt (18 keys)
- [ ] Scale 1–10 enforced; null on weak evidence
- [ ] PROTECTED / distinct-from lines present (esp. vs `physicalPriority`, `empathyCompassion`)
- [ ] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Expansion-01 prompts/tests unchanged
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Follow-up (Story 5):** Live LLM sample validation (>85% human agreement) — not Story 2 gate.

---

## Next agent

```text
--agent 1 expansion 02 story 2
```

**Notes:** Read `LLM_FIRST_PRINCIPLE.md` before coding. Sprint README Story 2 file paths are superseded by this handoff. Mirror Expansion-01 Story 2 implementation exactly — only signal semantics differ.
