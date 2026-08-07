# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-13-growth-self-awareness  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for Expansion-13 (`growthMindset`, `selfAwareness`). **Shadow only** — still no scoring / tension / chips / promote.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology

---

## Summary

- Wire Expansion-13 into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** invent evaluate-layer extractors — production extraction lives in `extraction.service.ts`.
- Story 1 already created **metadata-only** `expansion-13-signal-definitions.ts` + two `SHADOW_SIGNAL_KEYS`. Story 2 **extends** that file with LLM semantic blocks and wires prompts + `DOMAIN_ALLOWED`.
- Domains: **self + partner** (README lock). **Not** relationship.
- Scale **1–10 or null**. No regex / keyword / text-inference rules. Hebrew-aware **semantic** examples in prompts (not keyword matchers).
- Collision upgrades required on `vulnerabilityOpenness`, `directness`, `emotionalRegulation`, `empathyCompassion` SIGNAL RULES so they do not swallow Exp-13.
- Onboarding prompt **copy** remains Story 4; answers already feed the same free-text extractor when present — **no separate pipeline / DTO** in Story 2.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | `growthMindset`, `selfAwareness` in `SHADOW_SIGNAL_KEYS`; metadata module exists (domains both `personal`); `MAX_EVIDENCE_ITEMS === 51`; total extraction **47**; **not** in `COMPATIBILITY_SIGNAL_KEYS` (still **15**) |
| Self `DOMAIN_ALLOWED` | **37** (through `emotionalExpression`) — Story 2 adds **2 → 39** |
| Partner `DOMAIN_ALLOWED` | **23** — Story 2 adds **2 → 25** |
| Expansion-01–12 Story 2 | Blocks already wired in `SELF_EXTRACTOR_PROMPT` / partner — **do not modify** those definition files |
| Expansion-09 | Interest taxonomy — **orthogonal**; do not touch interest allowlists / guidance |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) |
| Adjacent collision risk | `vulnerabilityOpenness`, `directness`, `emotionalRegulation`, `empathyCompassion` |
| `evaluate-llm-prompts.ts` | Not core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Create `expansion-13-signal-definitions.ts` with semantic definitions | **Extend** existing Story 1 metadata file — add LLM blocks; keep promotion meta |
| Wire self + partner | **Yes** self+partner. Onboarding = same free-text path when answers exist — **no** new input channel / schema in Story 2. UI copy = **Story 4** |
| Sync `extraction-strict-validation.ts` allowlist | **Yes** — `DOMAIN_ALLOWED` self **39** / partner **25** |
| Unit tests: 2 signals × high/low/null | **Yes** — mocked LLM in `extraction.service.spec.ts` |
| Hebrew regression fixtures | **Story 5** live gate — Story 2 uses **mocked** unit tests only (optional fixture seed OK) |
| >85% agreement | **Story 5** — not Story 2 |
| Keyword / regex heuristics | **Forbidden** — LLM semantic only; README Hebrew strings are prompt examples / Story 5 fixtures, not matchers |
| Evaluate-layer prompts | **Wrong path** — use `extraction.service.ts` |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-13-signal-definitions.ts` | **Extend** — add `EXPANSION_13_SELF_SHADOW_SIGNAL_BLOCK` + `EXPANSION_13_PARTNER_SHADOW_SIGNAL_BLOCK` (keep Story 1 meta exports) |
| `dating-api/src/extraction/extraction.service.ts` | Import both blocks; append self after Exp-12; append partner after Exp-12 partner; add 2 keys to self + partner `ALLOWED KEYS`; add SIGNAL RULES; **upgrade** adjacent SIGNAL RULES |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add 2 keys to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**37 → 39**) and `.partner` (**23 → 25**) |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-13 shadow signals')` |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Add Exp-13 DOMAIN_ALLOWED membership; update self/partner length asserts **37→39** / **23→25** everywhere |
| `dating-api/src/extraction/expansion-10-rollout.spec.ts` | Bump DOMAIN lengths **37/23 → 39/25** |
| `dating-api/src/extraction/expansion-11-rollout.spec.ts` | Bump DOMAIN lengths **37/23 → 39/25** |
| `dating-api/src/extraction/expansion-12-rollout.spec.ts` | Bump DOMAIN lengths **37/23 → 39/25** |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `extraction/extraction-text-inference.ts` / `engine/.../text-inference.ts` | **NO regex** for Exp-13 |
| `expansion-01`…`12-*.ts` definition / interest files | Prior sprints — do not edit (except Exp-10/11/12 rollout DOMAIN length) |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `matches/match-explainability.ts`, `SIGNAL_DOMAIN`, i18n, onboarding UI copy | Story 4 |
| `RELATIONSHIP_EXTRACTOR_PROMPT` | Do **not** add Exp-13 keys |
| Live LLM / Hebrew fixture validator script | Story 5 |
| Prisma / backfill / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call per domain. Self + partner rich blocks.**

```
Profile analyze → ExtractionService.extract('self' | 'partner', text)
  → SELF_EXTRACTOR_PROMPT (Exp-01..13) OR PARTNER_EXTRACTOR_PROMPT (+ Exp-07/08/10/11/12/13 partner blocks)
  → completeJSON → normalize → validateAndClean → validateExtraction
  → evaluationJson.{self|partner}.signals.{growthMindset|selfAwareness}
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction. No onboarding-specific extractor.

### 2. Extend `expansion-13-signal-definitions.ts` (locked)

Keep existing `EXPANSION_13_SHADOW_SIGNAL_KEYS` / weights / tiers / domains (`personal`) / chip labels.

Update file header comment to note LLM blocks are present (still no keyword heuristics).

Append:

```typescript
/**
 * Expansion-13 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_13_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-13 Growth & Self-Awareness (extract when evidence exists; NOT used for scoring; 1–10 or null):

- growthMindset: openness to feedback, willingness to change and learn from
  mistakes in a relationship vs defensiveness / fixed "this is who I am".
  1–2 = defensive; resists feedback; refuses to change.
  3–4 = occasionally open, mostly resistant.
  5–6 = moderately open to change.
  7–8 = actively seeks feedback and works on self-improvement as a partner.
  9–10 = strongly growth-oriented; regularly reflects and adapts based on feedback.
  PROTECTED — distinct from:
    vulnerabilityOpenness (willingness to share fears / be seen — NOT willingness to change / take feedback);
    directness (how they speak / say hard things — NOT receptivity to feedback).
  Prefer null when change/feedback/self-improvement stance is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני תמיד עובד על להיות בן/בת זוג טוב/ה יותר".

- selfAwareness: understanding of one's own emotional patterns, triggers, and
  behavioral tendencies vs little insight / surprised by own reactions.
  1–2 = little insight into own patterns; surprised by own reactions.
  3–4 = limited self-reflection.
  5–6 = some awareness of patterns.
  7–8 = clearly names own triggers/tendencies ("I tend to shut down when...").
  9–10 = deep self-insight; articulates patterns and their origins.
  PROTECTED — distinct from:
    emotionalRegulation (managing emotions in the moment — NOT *knowing* one's patterns;
      insight without regulation, or regulation without insight, both possible);
    empathyCompassion (outward understanding of others — NOT inward understanding of self).
  Prefer null when self-reflective pattern language is unmentioned.
  Do not invent high self-awareness from silence or from empathy alone.
  Hebrew meaning examples (do not keyword-match): "אני יודע/ת שאני נוטה להיות מגונן/ת כשאני מרגיש/ה שמבקרים אותי".

Prefer null over stretched scoring for all Expansion-13 keys.
`;

/**
 * Expansion-13 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_13_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-13 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- growthMindset: desired partner openness to feedback / willingness to change
  (defensive / fixed LOW ↔ actively seeks feedback and grows HIGH)
- selfAwareness: desired partner insight into own patterns/triggers
  (little insight LOW ↔ clearly names patterns / origins HIGH)

Use the same 1–10 scales and PROTECTED distinctions as Expansion-13 self definitions.
CRITICAL: partner vulnerability / sharing-fears language alone → vulnerabilityOpenness territory — NOT growthMindset
  unless feedback / change / self-improvement stance is explicit.
CRITICAL: partner emotional steadiness / calm-under-stress alone does NOT equal selfAwareness.
CRITICAL: partner empathy / caring-about-others alone does NOT equal selfAwareness.
Prefer null over stretched scoring. Do not invent growth or self-awareness scores from silence.
`;
```

Agent 1 may tighten wording but must preserve both keys, scales, PROTECTED lines, and Hebrew-as-examples-only.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append (comma-separated, after `emotionalExpression`):

```text
growthMindset, selfAwareness
```

2. After `${EXPANSION_12_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_13_SELF_SHADOW_SIGNAL_BLOCK}`.

3. **SIGNAL RULES** — add:

```text
- growthMindset = explicit openness to feedback / willingness to change and learn as a partner (defensive/fixed LOW ↔ seeks feedback and adapts HIGH); not vulnerability/sharing-fears alone, not directness/speaking style alone
- selfAwareness = explicit insight into own patterns/triggers/tendencies (little insight LOW ↔ clearly names patterns/origins HIGH); not in-the-moment emotional regulation alone, not empathy/caring-about-others alone
```

4. **Upgrade adjacent lines** (self) — **required**:

```text
- vulnerabilityOpenness = …existing meaning… — not willingness to change / take feedback / self-improvement alone (→ growthMindset)
- directness = …existing meaning… — not receptivity to feedback / willingness to change alone (→ growthMindset)
- emotionalRegulation = …existing meaning… — not knowing/naming own patterns/triggers alone (→ selfAwareness)
- empathyCompassion = …existing meaning… — not inward self-insight / naming own patterns alone (→ selfAwareness)
```

Preserve any existing Exp-10/11/12 clauses already on these lines; **append** Exp-13 distinctions rather than deleting prior text. Do **not** invent rewrites that drop core meanings — only add the carve-outs if missing.

Do **not** add trigger-phrase keyword lists. Do **not** remove Exp-12 SIGNAL RULE lines.

### 4. `PARTNER_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append the same two keys after `emotionalExpression`.

2. Inject `${EXPANSION_13_PARTNER_SHADOW_SIGNAL_BLOCK}` after `${EXPANSION_12_PARTNER_SHADOW_SIGNAL_BLOCK}` (before DIRECTION LOCK / HARD SEMANTIC GUARD — keep readable).

3. **SIGNAL RULES** — add partner-framed one-liners for both keys.

4. **Upgrade** any adjacent partner lines that exist if they could swallow Exp-13 (keep short). Partner domain does **not** currently allow `vulnerabilityOpenness` / `emotionalRegulation` / `empathyCompassion` / `directness` — do **not** invent those partner keys; PROTECTED notes live in the Exp-13 partner block.

Optional partner HARD SEMANTIC GUARD note (keep short if added):

```text
- "welcomes feedback / always working on being a better partner" / "I know I shut down when criticized" -> growthMindset / selfAwareness when explicit; do not dump into vulnerability or regulation alone
```

### 5. `DOMAIN_ALLOWED_SIGNAL_KEYS` (locked)

| Domain | Change |
|--------|--------|
| `self` | Append `growthMindset`, `selfAwareness` → length **39** |
| `partner` | Append `growthMindset`, `selfAwareness` → length **25** |
| `relationship` | **Unchanged** |

Update **all** specs that assert self length **37** / partner **23** (Exp-06/07/08/10/11/12 blocks + Exp-10/11/12 rollout) → **39** / **25**.

Add Expansion-13 membership asserts (keys **are** in self+partner; **not** in relationship). Story 1 Exp-13 shadow-mode block currently omits DOMAIN_ALLOWED — Story 2 **adds** that membership test (mirror Exp-12).

### 6. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt blocks only — no text-inference |
| Null when unclear | "Prefer null…" + evidence required |
| Score outside range → null | `validateAndClean` |
| Short text → null | Existing sparsity shutdown |
| No keyword heuristics | No substring/tag scoring paths |
| Silence → null | Prefer null; do not invent low/high |
| “I am who I am” | Low-band `growthMindset` when explicit — not auto-null, not `vulnerabilityOpenness` alone |
| “I don’t know why I react…” | Low-band `selfAwareness` when explicit — not auto-null |
| >85% / live Hebrew fixtures | **Story 5** |
| Onboarding UI strings | **Story 4** |

### 7. Shadow mode preserved (locked)

- Keys remain in `SHADOW_SIGNAL_KEYS` only
- `COMPATIBILITY_SIGNAL_KEYS` still **15**
- No tension / chips / promote
- Metadata weights stay document-only
- Meta chip labels remain `Openness to growth` / `Self-awareness` (Story 4 browse chips differ)
- Domain `personal` remains metadata-only until Story 4 / promote

### 8. Tests (agent 1 minimum)

Add to `extraction.service.spec.ts` — `describe('Expansion-13 shadow signals')`:

| Test | Domain | Mock LLM | Expect |
|------|--------|----------|--------|
| High growthMindset | self | `9` + evidence | `=== 9` |
| Low growthMindset | self | `2` + evidence | `=== 2` |
| Null growthMindset (silence) | self | `null` | null |
| High selfAwareness | self | `9` + evidence | `=== 9` |
| Low selfAwareness | self | `2` + evidence | `=== 2` |
| Null selfAwareness (silence) | self | `null` | null |
| Out of range | self | `11` on either key | stripped to `null` |
| Partner growthMindset smoke | partner | `8` + evidence | `=== 8` |
| Partner selfAwareness smoke | partner | `8` + evidence | `=== 8` |

Use README semantic / Hebrew strings in test **names/comments only** — assertions on mocked LLM output. Do **not** add regex fixtures that pretend to score.

Also update `extracted-signals.spec.ts` domain-length + Exp-13 DOMAIN_ALLOWED membership asserts.

Optional (not required): seed `dating-api/data/expansion-13-extraction-fixtures.json` for Story 5 — **do not** run live LLM in Story 2.

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
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-13"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npx jest src/extraction/expansion-10-rollout.spec.ts src/extraction/expansion-11-rollout.spec.ts src/extraction/expansion-12-rollout.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `expansion-13-signal-definitions.ts` with self + partner semantic blocks (§2); keep Story 1 metadata.
2. Wire self block after Exp-12; update self ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§3).
3. Wire partner block after Exp-12 partner; update partner ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§4).
4. Sync `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**39**) and `.partner` (**25**) (§5).
5. Add unit tests (§8); fix domain-length asserts across specs; run commands above.
6. **Do not** touch evaluate layer, text-inference regex, scoring, tension, relationship prompt, Exp-01–12 definition bodies (except DOMAIN length in rollout), onboarding UI, or promote.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-13-growth-self-awareness/handoffs/STORY_02_llm_extraction_prompts/`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for Expansion-13 growthMindset and selfAwareness

Story 2 — self+partner shadow extraction; adjacent SIGNAL RULE upgrades; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for Exp-13 keys
- [ ] No changes to text-inference files for these keys
- [ ] Prompt blocks in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] Self + partner ALLOWED KEYS include both keys; relationship unchanged
- [ ] `DOMAIN_ALLOWED.self === 39`, `.partner === 25`
- [ ] Scale 1–10; null on weak evidence; out-of-range stripped
- [ ] PROTECTED distinctions present (vs `vulnerabilityOpenness` / `directness` / `emotionalRegulation` / `empathyCompassion`)
- [ ] Adjacent SIGNAL RULES upgraded (vulnerability / directness / regulation / empathy as applicable)
- [ ] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Story 1 metadata exports preserved (including domain `personal`)
- [ ] Expansion-09 interest artifacts untouched
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Story 5:** Live Hebrew fixtures + >85% gate.
- **Story 3:** Tension rules `growth_mindset_gap`, `both_low_self_awareness`.
- **Story 4:** Positive chips (`Grows together` both-high growth; `Self-awareness match` aligned) + i18n + onboarding copy + wire `personal` diversity.
- **Correlation risk:** `growthMindset` vs `vulnerabilityOpenness`; `selfAwareness` vs `emotionalRegulation` / `empathyCompassion` — monitor in Story 5; do not hardcode anti-correlation in Story 2.

---

## Next agent

```text
--agent 1 expansion 13 story 2
```

**Notes:** Mandatory `LLM_FIRST_PRINCIPLE.md`. Extend existing metadata file — do not recreate from scratch. Self **and** partner. Keep shadow / no scoring. Growth ≠ vulnerability; self-awareness ≠ regulation or empathy.
