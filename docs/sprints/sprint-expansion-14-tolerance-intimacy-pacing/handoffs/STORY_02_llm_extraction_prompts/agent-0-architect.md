# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-14-tolerance-intimacy-pacing  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for Expansion-14 (`patienceTolerance`, `intimacyPacing`, `monogamyAlignment`). **Shadow only** — still no scoring / tension / chips / promote.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology

---

## Summary

- Wire Expansion-14 into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** invent evaluate-layer extractors — production extraction lives in `extraction.service.ts`.
- Story 1 already created **metadata-only** `expansion-14-signal-definitions.ts` + three `SHADOW_SIGNAL_KEYS`. Story 2 **extends** that file with LLM semantic blocks and wires prompts + `DOMAIN_ALLOWED`.
- Domains: **self + partner** (README + Story 1 lock). **Not** relationship.
- Scale **1–10 or null**. No regex / keyword / text-inference rules. Hebrew-aware **semantic** examples in prompts (not keyword matchers).
- Collision upgrades required on `conflictStyle`, `emotionalRegulation` (self), `casualIntimacyIntent`, `relationshipClarity` (partner; self if a SIGNAL RULE line exists) so they do not swallow Exp-14.
- **`monogamyAlignment` scale polarity locked:** low = mono/exclusive; high = open/poly — **do not invert**.
- Onboarding prompt **copy** remains Story 4; answers already feed the same free-text extractor when present — **no separate pipeline / DTO** in Story 2.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` in `SHADOW_SIGNAL_KEYS`; metadata module exists (domains `relationship` / `intimacy` / `relationship`); `MAX_EVIDENCE_ITEMS === 54`; total extraction **50**; **not** in `COMPATIBILITY_SIGNAL_KEYS` (still **15**) |
| Self `DOMAIN_ALLOWED` | **39** (through `selfAwareness`) — Story 2 adds **3 → 42** |
| Partner `DOMAIN_ALLOWED` | **25** — Story 2 adds **3 → 28** |
| Expansion-01–13 Story 2 | Blocks already wired in `SELF_EXTRACTOR_PROMPT` / partner — **do not modify** those definition files |
| Expansion-09 | Interest taxonomy — **orthogonal**; do not touch interest allowlists / guidance |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) |
| Adjacent collision risk | `conflictStyle`, `emotionalRegulation`, `casualIntimacyIntent`, `relationshipClarity` |
| `evaluate-llm-prompts.ts` | Not core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Create `expansion-14-signal-definitions.ts` | **Extend** existing Story 1 metadata file — add LLM blocks; keep promotion meta |
| Wire self + partner | **Yes** self+partner. Onboarding = same free-text path when answers exist — **no** new input channel / schema in Story 2. UI copy = **Story 4** |
| Sync `extraction-strict-validation.ts` allowlist | **Yes** — `DOMAIN_ALLOWED` self **42** / partner **28** |
| Unit tests: 3 signals × high/low/null | **Yes** — mocked LLM in `extraction.service.spec.ts` |
| Hebrew regression fixtures | **Story 5** live gate — Story 2 uses **mocked** unit tests only (optional fixture seed OK) |
| >85% agreement | **Story 5** — not Story 2 |
| Keyword / regex heuristics | **Forbidden** — LLM semantic only; README Hebrew strings are prompt examples / Story 5 fixtures, not matchers |
| Evaluate-layer prompts | **Wrong path** — use `extraction.service.ts` |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-14-signal-definitions.ts` | **Extend** — add `EXPANSION_14_SELF_SHADOW_SIGNAL_BLOCK` + `EXPANSION_14_PARTNER_SHADOW_SIGNAL_BLOCK` (keep Story 1 meta exports) |
| `dating-api/src/extraction/extraction.service.ts` | Import both blocks; append self after Exp-13; append partner after Exp-13 partner; add 3 keys to self + partner `ALLOWED KEYS`; add SIGNAL RULES; **upgrade** adjacent SIGNAL RULES |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add 3 keys to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**39 → 42**) and `.partner` (**25 → 28**) |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-14 shadow signals')` |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Add Exp-14 DOMAIN_ALLOWED membership; update self/partner length asserts **39→42** / **25→28** everywhere |
| `dating-api/src/extraction/expansion-10-rollout.spec.ts` | Bump DOMAIN lengths **39/25 → 42/28** |
| `dating-api/src/extraction/expansion-11-rollout.spec.ts` | Bump DOMAIN lengths **39/25 → 42/28** |
| `dating-api/src/extraction/expansion-12-rollout.spec.ts` | Bump DOMAIN lengths **39/25 → 42/28** |
| `dating-api/src/extraction/expansion-13-rollout.spec.ts` | Bump DOMAIN lengths **39/25 → 42/28** |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `extraction/extraction-text-inference.ts` / `engine/.../text-inference.ts` | **NO regex** for Exp-14 |
| `expansion-01`…`13-*.ts` definition / interest files | Prior sprints — do not edit (except Exp-10/11/12/13 rollout DOMAIN length) |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `matches/match-explainability.ts`, `SIGNAL_DOMAIN`, i18n, onboarding UI copy | Story 4 |
| `RELATIONSHIP_EXTRACTOR_PROMPT` | Do **not** add Exp-14 keys |
| Live LLM / Hebrew fixture validator script | Story 5 |
| Prisma / backfill / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call per domain. Self + partner rich blocks.**

```
Profile analyze → ExtractionService.extract('self' | 'partner', text)
  → SELF_EXTRACTOR_PROMPT (Exp-01..14) OR PARTNER_EXTRACTOR_PROMPT (+ Exp-07/08/10/11/12/13/14 partner blocks)
  → completeJSON → normalize → validateAndClean → validateExtraction
  → evaluationJson.{self|partner}.signals.{patienceTolerance|intimacyPacing|monogamyAlignment}
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction. No onboarding-specific extractor.

### 2. Extend `expansion-14-signal-definitions.ts` (locked)

Keep existing `EXPANSION_14_SHADOW_SIGNAL_KEYS` / weights / tiers / domains (`relationship` / `intimacy` / `relationship`) / chip labels.

Update file header comment to note LLM blocks are present (still no keyword heuristics), mirroring Exp-13:

```typescript
/**
 * Expansion-14 promotion-ready metadata + LLM semantic prompt blocks (shadow until promote).
 * LLM-first only — no keyword heuristics.
 */
```

Append:

```typescript
/**
 * Expansion-14 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_14_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-14 Tolerance & Intimacy Pacing (extract when evidence exists; NOT used for scoring; 1–10 or null):

- patienceTolerance: day-to-day tolerance for a partner's flaws, quirks, and differences
  vs low tolerance / critical stance toward imperfection.
  1–2 = highly critical; low tolerance for differences or imperfection.
  3–4 = some patience but easily frustrated by quirks.
  5–6 = moderate tolerance.
  7–8 = generally patient and accepting of differences.
  9–10 = very patient; easily accepts partner's flaws and quirks.
  PROTECTED — distinct from:
    conflictStyle (behavior DURING disagreement / how they fight — NOT ongoing tolerance for quirks that never become "a fight");
    emotionalRegulation (managing one's own reactivity under stress — NOT tolerance threshold for partner's imperfections).
  Prefer null when tolerance / reaction-to-flaws stance is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אף אחד לא מושלם, אני מנסה להיות מבין/ה לגבי הדברים הקטנים".

- intimacyPacing: preferred speed toward emotional and/or physical closeness in a new
  relationship — slow/cautious vs fast.
  1–2 = very slow; takes a long time to open up or get physically close.
  3–4 = cautious pace.
  5–6 = moderate pace.
  7–8 = moves fairly quickly toward closeness.
  9–10 = very fast; dives into closeness quickly.
  PROTECTED — distinct from:
    casualIntimacyIntent (casual/hookup vs committed-only *type* of intimacy — NOT *speed* to closeness;
      someone can want committed intimacy and still move slowly or quickly).
  Prefer null when pacing preference is unmentioned.
  Do not invent pacing from affection needs or casual-vs-committed stance alone.
  Hebrew meaning examples (do not keyword-match): "אני לוקח/ת את הדברים לאט, צריך/ה זמן לפני שאני נפתח/ת".

- monogamyAlignment: expectation of relationship structure — strict exclusivity vs openness
  to non-monogamous / poly structures.
  SCALE POLARITY (do not invert): LOW = monogamous / exclusive; HIGH = open / poly.
  1–2 = strictly monogamous; exclusivity is non-negotiable.
  3–4 = monogamous-leaning, minimal flexibility.
  5–6 = open to discussion / hasn't decided.
  7–8 = leans open / non-monogamous.
  9–10 = explicitly seeks open / poly relationship structure.
  PROTECTED — distinct from:
    relationshipClarity (wanting labels, boundaries, transparency, intentional dating *approach* —
      NOT exclusive-vs-open/poly *structure* preference alone).
  Prefer null when exclusivity / open-structure stance is unmentioned.
  "Exclusive / monogamous only" without open/poly language → LOW band when explicit.
  "Ethically non-monogamous / poly / open relationship" → HIGH band when explicit.
  Hebrew meaning examples (do not keyword-match): "מחפש/ת קשר מחויב ובלעדי בלבד".

Prefer null over stretched scoring for all Expansion-14 keys.
`;

/**
 * Expansion-14 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_14_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-14 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- patienceTolerance: desired partner patience / acceptance of quirks and differences
  (highly critical LOW ↔ very patient / accepting HIGH)
- intimacyPacing: desired partner pace toward closeness
  (very slow/cautious LOW ↔ moves fast into closeness HIGH)
- monogamyAlignment: desired partner structure expectation
  (strict mono/exclusive LOW ↔ open/poly HIGH — do not invert)

Use the same 1–10 scales and PROTECTED distinctions as Expansion-14 self definitions.
CRITICAL: partner conflict / fight-style language alone → conflictStyle territory — NOT patienceTolerance
  unless day-to-day tolerance for flaws/quirks (outside fights) is explicit.
CRITICAL: partner casual vs committed-intimacy type alone → casualIntimacyIntent — NOT intimacyPacing
  unless speed-to-closeness is explicit.
CRITICAL: partner wanting labels / clarity / "know where we stand" alone → relationshipClarity — NOT monogamyAlignment
  unless exclusive-vs-open/poly structure stance is explicit.
Prefer null over stretched scoring. Do not invent tolerance, pacing, or monogamy scores from silence.
`;
```

Agent 1 may tighten wording but must preserve all three keys, scales, polarity lock, PROTECTED lines, and Hebrew-as-examples-only.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append (comma-separated, after `selfAwareness`):

```text
patienceTolerance, intimacyPacing, monogamyAlignment
```

2. After `${EXPANSION_13_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_14_SELF_SHADOW_SIGNAL_BLOCK}`.

3. **SIGNAL RULES** — add:

```text
- patienceTolerance = explicit day-to-day tolerance for partner flaws/quirks/differences (highly critical LOW ↔ very patient/accepting HIGH); not during-conflict fight style alone, not own emotional regulation alone
- intimacyPacing = explicit preferred speed toward emotional/physical closeness (very slow LOW ↔ moves fast HIGH); not casual-vs-committed intimacy type alone
- monogamyAlignment = explicit exclusive-vs-open/poly structure expectation (strict mono LOW ↔ open/poly HIGH — do not invert); not labels/boundaries/dating-approach clarity alone
```

4. **Upgrade adjacent lines** (self) — **required**:

```text
- conflictStyle = …existing meaning… — not day-to-day tolerance for quirks/flaws outside fights alone (→ patienceTolerance)
- emotionalRegulation = …existing meaning… — not tolerance threshold for partner's imperfections alone (→ patienceTolerance)
- casualIntimacyIntent = …existing meaning… — not speed-to-closeness / pacing alone (→ intimacyPacing)
```

Preserve any existing Exp-10/11/12/13 clauses already on these lines; **append** Exp-14 distinctions rather than deleting prior text. Do **not** invent rewrites that drop core meanings — only add the carve-outs if missing.

**Note:** Self prompt `ALLOWED KEYS` currently omits `relationshipClarity` (even though `DOMAIN_ALLOWED.self` lists it — pre-existing). Do **not** add `relationshipClarity` to self ALLOWED KEYS in Story 2. Monogamy vs clarity PROTECTED notes live in the Exp-14 self block. If a self SIGNAL RULE for `relationshipClarity` already exists, append the monogamy carve-out; otherwise do not invent a new self rule line solely for that.

Do **not** add trigger-phrase keyword lists. Do **not** remove Exp-13 SIGNAL RULE lines.

Optional self HARD SEMANTIC GUARD note (keep short if added):

```text
- "nobody's perfect / little habits bother me" / "I take things slow" / "exclusive only" / "poly / open relationship" -> patienceTolerance / intimacyPacing / monogamyAlignment when explicit; do not dump into conflictStyle, casualIntimacyIntent, or relationshipClarity alone
```

### 4. `PARTNER_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append the same three keys after `selfAwareness`.

2. Inject `${EXPANSION_14_PARTNER_SHADOW_SIGNAL_BLOCK}` after `${EXPANSION_13_PARTNER_SHADOW_SIGNAL_BLOCK}` (before DIRECTION LOCK / HARD SEMANTIC GUARD — keep readable).

3. **SIGNAL RULES** — add partner-framed one-liners for all three keys.

4. **Upgrade** adjacent partner lines — **required** (partner has these keys):

```text
- conflictStyle = …existing… — not day-to-day patience for quirks/flaws alone (→ patienceTolerance)
- casualIntimacyIntent = …existing… — not speed-to-closeness alone (→ intimacyPacing)
- relationshipClarity = …existing… — not exclusive-vs-open/poly structure alone (→ monogamyAlignment)
```

Partner domain does **not** currently allow `emotionalRegulation` — do **not** invent that partner key; patience vs regulation PROTECTED notes live in the Exp-14 partner block.

**Critical partner collision:** partner `relationshipClarity` currently mentions “exclusivity” in its SIGNAL RULE. Story 2 **must** append the monogamy carve-out so exclusivity-as-structure (mono vs open/poly) routes to `monogamyAlignment`, while labels / boundaries / transparency / intentional dating approach stay `relationshipClarity`. Both may fire when evidence supports both angles; do not dump mono/poly stance into clarity alone.

Optional partner HARD SEMANTIC GUARD note (keep short if added):

```text
- "patient with quirks" / "moves fast / takes it slow" / "exclusive only" / "open / poly" -> patienceTolerance / intimacyPacing / monogamyAlignment when explicit; do not dump into conflictStyle, casualIntimacyIntent, or relationshipClarity alone
```

### 5. `DOMAIN_ALLOWED_SIGNAL_KEYS` (locked)

| Domain | Change |
|--------|--------|
| `self` | Append `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` → length **42** |
| `partner` | Append `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` → length **28** |
| `relationship` | **Unchanged** |

Update **all** specs that assert self length **39** / partner **25** (Exp-10/11/12/13 rollout + `extracted-signals.spec.ts`) → **42** / **28**.

Add Expansion-14 membership asserts (keys **are** in self+partner; **not** in relationship). Story 1 Exp-14 shadow-mode block currently omits DOMAIN_ALLOWED — Story 2 **adds** that membership test (mirror Exp-13).

### 6. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt blocks only — no text-inference |
| Null when unclear | "Prefer null…" + evidence required |
| Score outside range → null | `validateAndClean` |
| Short text → null | Existing sparsity shutdown |
| No keyword heuristics | No substring/tag scoring paths |
| Silence → null | Prefer null; do not invent low/high |
| “Little habits bother me” | Low-band `patienceTolerance` when explicit — not auto-null, not `conflictStyle` alone |
| “I take things slow” | Low-band `intimacyPacing` when explicit — not auto-null, not `casualIntimacyIntent` alone |
| “Exclusive relationship only” | Low-band `monogamyAlignment` when explicit — **not** inverted; not `relationshipClarity` alone |
| “Ethically non-monogamous / poly” | High-band `monogamyAlignment` when explicit |
| >85% / live Hebrew fixtures | **Story 5** |
| Onboarding UI strings | **Story 4** |

### 7. Shadow mode preserved (locked)

- Keys remain in `SHADOW_SIGNAL_KEYS` only
- `COMPATIBILITY_SIGNAL_KEYS` still **15**
- No tension / chips / promote
- Metadata weights stay document-only
- Meta chip labels remain `Patience with differences` / `Pace of closeness` / `Relationship structure` (Story 4 browse chips differ: `Patience match` / `Aligned on relationship structure`, etc.)
- Promotion domains remain metadata-only until Story 4 / promote

### 8. Tests (agent 1 minimum)

Add to `extraction.service.spec.ts` — `describe('Expansion-14 shadow signals')`:

| Test | Domain | Mock LLM | Expect |
|------|--------|----------|--------|
| High patienceTolerance | self | `9` + evidence | `=== 9` |
| Low patienceTolerance | self | `2` + evidence | `=== 2` |
| Null patienceTolerance (silence) | self | `null` | null |
| High intimacyPacing | self | `9` + evidence | `=== 9` |
| Low intimacyPacing | self | `2` + evidence | `=== 2` |
| Null intimacyPacing (silence) | self | `null` | null |
| High monogamyAlignment (open/poly) | self | `9` + evidence | `=== 9` |
| Low monogamyAlignment (strict mono) | self | `2` + evidence | `=== 2` |
| Null monogamyAlignment (silence) | self | `null` | null |
| Out of range | self | `11` on any Exp-14 key | stripped to `null` |
| Partner patienceTolerance smoke | partner | `8` + evidence | `=== 8` |
| Partner intimacyPacing smoke | partner | `8` + evidence | `=== 8` |
| Partner monogamyAlignment smoke | partner | `8` + evidence | `=== 8` |

Use README semantic / Hebrew strings in test **names/comments only** — assertions on mocked LLM output. Do **not** add regex fixtures that pretend to score.

Also update `extracted-signals.spec.ts` domain-length + Exp-14 DOMAIN_ALLOWED membership asserts.

Optional (not required): seed `dating-api/data/expansion-14-extraction-fixtures.json` for Story 5 — **do not** run live LLM in Story 2.

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
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-14"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npx jest src/extraction/expansion-10-rollout.spec.ts src/extraction/expansion-11-rollout.spec.ts src/extraction/expansion-12-rollout.spec.ts src/extraction/expansion-13-rollout.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `expansion-14-signal-definitions.ts` with self + partner semantic blocks (§2); keep Story 1 metadata.
2. Wire self block after Exp-13; update self ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§3).
3. Wire partner block after Exp-13 partner; update partner ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§4) — **especially** `relationshipClarity` exclusivity carve-out.
4. Sync `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**42**) and `.partner` (**28**) (§5).
5. Add unit tests (§8); fix domain-length asserts across specs; run commands above.
6. **Do not** touch evaluate layer, text-inference regex, scoring, tension, relationship prompt, Exp-01–13 definition bodies (except DOMAIN length in rollout), onboarding UI, or promote.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-14-tolerance-intimacy-pacing/handoffs/STORY_02_llm_extraction_prompts/`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for Expansion-14 patience intimacy monogamy signals

Story 2 — self+partner shadow extraction; adjacent SIGNAL RULE upgrades; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for Exp-14 keys
- [ ] No changes to text-inference files for these keys
- [ ] Prompt blocks in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] Self + partner ALLOWED KEYS include all three keys; relationship unchanged
- [ ] `DOMAIN_ALLOWED.self === 42`, `.partner === 28`
- [ ] Scale 1–10; null on weak evidence; out-of-range stripped
- [ ] **`monogamyAlignment` polarity:** low = mono, high = open/poly (not inverted)
- [ ] PROTECTED distinctions present (vs `conflictStyle` / `emotionalRegulation` / `casualIntimacyIntent` / `relationshipClarity`)
- [ ] Adjacent SIGNAL RULES upgraded (conflict / regulation / casual intimacy / relationshipClarity as applicable)
- [ ] Partner `relationshipClarity` no longer owns exclusive-vs-open/poly alone
- [ ] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Story 1 metadata exports preserved (domains `relationship` / `intimacy` / `relationship`)
- [ ] Expansion-09 interest artifacts untouched
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Story 5:** Live Hebrew fixtures + >85% gate.
- **Story 3:** Tension rules `patience_tolerance_gap`, `intimacy_pacing_clash`, `monogamy_alignment_mismatch`.
- **Story 4:** Browse chips / i18n / onboarding copy (meta chips ≠ browse labels).
- Pre-existing: `DOMAIN_ALLOWED.self` lists `relationshipClarity` while self prompt ALLOWED KEYS omit it — **do not “fix”** in Story 2 unless needed for Exp-14; monogamy PROTECTED text covers the distinction.

---

## Next agent

```text
--agent 1 expansion 14 story 2
```
