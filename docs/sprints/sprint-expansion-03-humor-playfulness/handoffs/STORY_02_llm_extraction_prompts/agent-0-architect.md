# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-03-humor-playfulness  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for `humorPlayfulness`. **Shadow only** — still no scoring/chips/tension.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Wire Expansion-03 shadow signal into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** follow sprint README file paths (`evaluate-llm-prompts.ts`) or per-signal `extractNumericSignal` pattern — production extraction lives in `extraction.service.ts`.
- Add rich **semantic prompt block** (sprint README definition, adapted) to the **`self`** domain extractor only — same pattern as Expansion-01/02 Story 2.
- Keep scale **1–10 or null** (matches `validateAndClean`); no regex / keyword / text-inference rules for this key.
- Agent 4 **skipped** (no eligibility/ranking change).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | `humorPlayfulness` in `SHADOW_SIGNAL_KEYS`; not in `COMPATIBILITY_SIGNAL_KEYS` |
| Expansion-01/02 Story 2 | `expansion-01-signal-definitions.ts`, `expansion-02-signal-definitions.ts` wired in `SELF_EXTRACTOR_PROMPT` — **do not modify** |
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
| Scale 0–10 | **Use 1–10** — matches entire extraction stack |
| `<50 chars` → null | **Use existing sparsity shutdown** (15-word rule in prompt) — do not add a second char gate |
| Story 5 live validation | Not Story 2 gate — unit tests with mocked LLM only |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-03-signal-definitions.ts` | **Create** — exported semantic prompt block for `humorPlayfulness` |
| `dating-api/src/extraction/extraction.service.ts` | Import block; append to `SELF_EXTRACTOR_PROMPT`; add key to `ALLOWED KEYS` + `SIGNAL RULES` |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add `humorPlayfulness` to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` |
| `dating-api/src/extraction/extraction.service.spec.ts` | New `describe('Expansion-03 shadow signals')` — mock LLM high/low/null/out-of-range |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `evaluate/evaluate.service.ts` | Does not run per-signal extraction |
| `extraction/extraction-text-inference.ts` | **NO regex rules** for Expansion-03 signal |
| `engine/signal-post-processing/text-inference.ts` | Same — no regex |
| `expansion-01-signal-definitions.ts`, `expansion-02-signal-definitions.ts` | Prior sprints — do not edit |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` | Story 3 |
| `matches/match-explainability.ts`, i18n | Story 4 |
| `PARTNER_EXTRACTOR_PROMPT` / `RELATIONSHIP_EXTRACTOR_PROMPT` | Would conflate “wants playful partner” with “values playfulness in relationships” — **self only** |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call, self domain only.**

```
Profile analyze → ExtractionService.extract('self', aboutMe)
  → SELF_EXTRACTOR_PROMPT (includes Expansion-01 + 02 + 03 blocks)
  → completeJSON (fast model, temp 0.1)
  → normalize → validateAndClean → validateExtraction
  → evaluationJson.self.signals.humorPlayfulness
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction.

### 2. New file: `expansion-03-signal-definitions.ts` (locked)

Keeps semantic definitions maintainable. Export one block consumed by `SELF_EXTRACTOR_PROMPT`:

```typescript
/**
 * Expansion-03 shadow signal semantic definitions for SELF domain extraction.
 * LLM-first only — no keyword lists for scoring.
 */
export const EXPANSION_03_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-03 (extract when evidence exists; NOT used for scoring; 1–10 or null):

- humorPlayfulness: importance of playfulness, banter, fun, lightness, and shared laughter
  in a relationship — how much levity and play matter day-to-day together.
  NOT merely self-description as "funny" or "I have humor" — rate need for playfulness in love.
  1–2 = very serious tone; little room for play or banter in relationships.
  3–4 = occasional humor; playfulness is nice but not important.
  5–6 = moderate — enjoys fun together, balanced with seriousness.
  7–8 = playfulness is important; banter and lightness strengthen the bond.
  9–10 = play and humor are essential; needs a partner who can laugh and be silly together.
  PROTECTED — distinct from:
    conflictStyle (disagreement handling / repair, not levity in daily connection);
    socialBattery (social energy / introversion–extroversion, not playfulness in intimacy);
    noveltyVsRoutine (preference for novelty vs familiar routines, not banter/laughter);
    emotionalDepth (values depth/introspection over lightness, not opposite of humor);
    empathyCompassion (attunement to partner feelings, not shared silliness);
    emotionalRegulation (managing emotions under stress, not fun/levity needs);
    lifestylePace (calm vs high-action rhythm, not humor/play in bonding).
  Infer from tone, self-description, what they value in a partner — semantic meaning, not keywords "fun" or "humor".
  Distinguish "I am funny" (comedic self-image) vs "I need playfulness in relationships" (relationship need).
  Prefer null over stretched scoring.
`;
```

Agent 1 may tighten wording but must preserve PROTECTED lines, the "I am funny" vs relationship-need distinction, and semantic (not keyword) instruction.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** line — append: `humorPlayfulness`
2. After `${EXPANSION_02_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_03_SELF_SHADOW_SIGNAL_BLOCK}` via import + template concat at module load.
3. **SIGNAL RULES** — add pointer:
   - `humorPlayfulness` = explicit need for banter, silliness, shared laughter, lightness in love (not merely "I'm funny" or generic "fun-loving")

Do **not** add trigger phrases / keyword lists (violates LLM-first).

### 4. `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (locked)

Append `humorPlayfulness` to the `self` array in `extraction-strict-validation.ts`. Must stay in sync with prompt allowlist.

Expected `self` allowlist after Story 2 (**19 keys**):

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
],
```

### 5. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt block only — no text-inference |
| Null when unclear | Prompt: "Prefer null over stretched scoring" + evidence required |
| Score outside range → null | `validateAndClean` (already) |
| Short text → null | Existing **15-word sparsity shutdown** in `SELF_EXTRACTOR_PROMPT` |
| Log extraction | Existing `extraction_after_llm` / `keysPresent` logs — **no new log pipeline required** |

Optional (nice-to-have, not blocking): debug log when `humorPlayfulness` is non-null:

```typescript
event: 'expansion03_shadow_extracted'
keys: { humorPlayfulness }
```

### 6. Shadow mode preserved (locked)

- Key remains in `SHADOW_SIGNAL_KEYS` only
- `product-scores.ts` / coverage still use `OFFICIAL_EXTRACTION_SIGNAL_KEYS` — Expansion-03 key excluded from product coverage (correct for shadow)
- Match engine unchanged — no score impact until promote story
- Expansion-01/02 extraction prompts **unchanged**

### 7. Tests (agent 1 minimum — agent 2 expands)

Add to `extraction.service.spec.ts` (mirror `Expansion-02 shadow signals` describe):

| Test | Mock LLM | Expect |
|------|----------|--------|
| High playfulness text | `humorPlayfulness: 8` + evidence | `signals.humorPlayfulness === 8` |
| Low playfulness text | `humorPlayfulness: 2` + evidence | `=== 2` |
| No cues | `null` | `humorPlayfulness` null |
| Out of range from LLM | `humorPlayfulness: 11` | stripped to `null` by validateAndClean |

Use semantic example strings from sprint README in test **names/comments only** — assertions are on mocked LLM output (unit tests), not live LLM calls. Live LLM validation is Story 5.

**Nit fix** (from Story 1 CR): update stale comment `// With 26 signals (15 official + 11 shadow)` → `27 signals (15 official + 12 shadow)` in overlap test if that block is touched.

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

No REST DTO changes. Shadow key appears in stored `evaluationJson.self.signals` when extraction succeeds.

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
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-03"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Create `expansion-03-signal-definitions.ts` with semantic block (§2).
2. Wire into `SELF_EXTRACTOR_PROMPT` only; update ALLOWED KEYS + SIGNAL RULES; import after Expansion-02 block.
3. Update `DOMAIN_ALLOWED_SIGNAL_KEYS.self`.
4. Add unit tests (§7); run commands above.
5. **Do not** touch evaluate layer, text-inference regex, scoring, tension, or Expansion-01/02 definitions.
6. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompt for humorPlayfulness

Expansion-03 Story 2 — self-domain shadow extraction only; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for `humorPlayfulness`
- [ ] No changes to `extraction-text-inference.ts` / `text-inference.ts` for this key
- [ ] Prompt block in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] `DOMAIN_ALLOWED_SIGNAL_KEYS.self` synced with prompt (19 keys)
- [ ] Scale 1–10 enforced; null on weak evidence
- [ ] PROTECTED / distinct-from lines present (esp. vs `noveltyVsRoutine`, `socialBattery`, "I am funny")
- [ ] Key still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Expansion-01/02 prompts/tests unchanged
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Follow-up (Story 5):** Live LLM sample validation (>85% human agreement) + Phase 1 gate for all 5 EQ signals — not Story 2 gate.
- **Correlation risk:** `humorPlayfulness` may correlate with `noveltyVsRoutine` or `socialBattery` — Story 5 matrix will flag if r>0.85.

---

## Next agent

```text
--agent 1 expansion 03 story 2
```

**Notes:** Read `LLM_FIRST_PRINCIPLE.md` before coding. Mirror Expansion-02 Story 2 implementation exactly — only signal semantics differ (single key this sprint).
