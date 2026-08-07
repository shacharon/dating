# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-12-feeling-heard  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for Expansion-12 (`listeningPresence`, `emotionalExpression`). **Shadow only** — still no scoring / tension / chips / promote.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology

---

## Summary

- Wire Expansion-12 into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** invent evaluate-layer extractors — production extraction lives in `extraction.service.ts`.
- Story 1 already created **metadata-only** `expansion-12-signal-definitions.ts` + two `SHADOW_SIGNAL_KEYS`. Story 2 **extends** that file with LLM semantic blocks and wires prompts + `DOMAIN_ALLOWED`.
- Domains: **self + partner** (README lock). **Not** relationship.
- Scale **1–10 or null**. No regex / keyword / text-inference rules. Hebrew-aware **semantic** examples in prompts (not keyword matchers).
- Collision upgrades required on `empathyCompassion`, `directness`, `emotionalDepth`, `physicalAffectionStyle` SIGNAL RULES so they do not swallow Exp-12.
- Onboarding prompt **copy** remains Story 4; answers already feed the same free-text extractor when present — **no separate pipeline / DTO** in Story 2.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | `listeningPresence`, `emotionalExpression` in `SHADOW_SIGNAL_KEYS`; metadata module exists; `MAX_EVIDENCE_ITEMS === 49`; total extraction **45**; **not** in `COMPATIBILITY_SIGNAL_KEYS` (still **15**) |
| Self `DOMAIN_ALLOWED` | **35** (through `jealousySecurity`) — Story 2 adds **2 → 37** |
| Partner `DOMAIN_ALLOWED` | **21** — Story 2 adds **2 → 23** |
| Expansion-01–11 Story 2 | Blocks already wired in `SELF_EXTRACTOR_PROMPT` / partner — **do not modify** those definition files |
| Expansion-09 | Interest taxonomy — **orthogonal**; do not touch interest allowlists / guidance |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) |
| Adjacent collision risk | `empathyCompassion`, `directness`, `emotionalDepth`, `physicalAffectionStyle` |
| `evaluate-llm-prompts.ts` | Not core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Create `expansion-12-signal-definitions.ts` with semantic definitions | **Extend** existing Story 1 metadata file — add LLM blocks; keep promotion meta |
| Wire self + partner | **Yes** self+partner. Onboarding = same free-text path when answers exist — **no** new input channel / schema in Story 2. UI copy = **Story 4** |
| Sync `extraction-strict-validation.ts` allowlist | **Yes** — `DOMAIN_ALLOWED` self **37** / partner **23** |
| Unit tests: 2 signals × high/low/null | **Yes** — mocked LLM in `extraction.service.spec.ts` |
| Hebrew regression fixtures | **Story 5** live gate — Story 2 uses **mocked** unit tests only (optional fixture seed OK) |
| >85% agreement | **Story 5** — not Story 2 |
| Keyword / regex heuristics | **Forbidden** — LLM semantic only; README Hebrew strings are prompt examples / Story 5 fixtures, not matchers |
| Evaluate-layer prompts | **Wrong path** — use `extraction.service.ts` |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-12-signal-definitions.ts` | **Extend** — add `EXPANSION_12_SELF_SHADOW_SIGNAL_BLOCK` + `EXPANSION_12_PARTNER_SHADOW_SIGNAL_BLOCK` (keep Story 1 meta exports) |
| `dating-api/src/extraction/extraction.service.ts` | Import both blocks; append self after Exp-11; append partner after Exp-11 partner; add 2 keys to self + partner `ALLOWED KEYS`; add SIGNAL RULES; **upgrade** adjacent SIGNAL RULES |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add 2 keys to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**35 → 37**) and `.partner` (**21 → 23**) |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-12 shadow signals')` |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Add Exp-12 DOMAIN_ALLOWED membership; update self/partner length asserts **35→37** / **21→23** everywhere |
| `dating-api/src/extraction/expansion-10-rollout.spec.ts` | Bump DOMAIN lengths **35/21 → 37/23** |
| `dating-api/src/extraction/expansion-11-rollout.spec.ts` | Bump DOMAIN lengths **35/21 → 37/23** |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `extraction/extraction-text-inference.ts` / `engine/.../text-inference.ts` | **NO regex** for Exp-12 |
| `expansion-01`…`11-*.ts` definition / interest files | Prior sprints — do not edit (except Exp-10/11 rollout DOMAIN length) |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `matches/match-explainability.ts`, i18n, onboarding UI copy | Story 4 |
| `RELATIONSHIP_EXTRACTOR_PROMPT` | Do **not** add Exp-12 keys |
| Live LLM / Hebrew fixture validator script | Story 5 |
| Prisma / backfill / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call per domain. Self + partner rich blocks.**

```
Profile analyze → ExtractionService.extract('self' | 'partner', text)
  → SELF_EXTRACTOR_PROMPT (Exp-01..12) OR PARTNER_EXTRACTOR_PROMPT (+ Exp-07/08/10/11/12 partner blocks)
  → completeJSON → normalize → validateAndClean → validateExtraction
  → evaluationJson.{self|partner}.signals.{listeningPresence|emotionalExpression}
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction. No onboarding-specific extractor.

### 2. Extend `expansion-12-signal-definitions.ts` (locked)

Keep existing `EXPANSION_12_SHADOW_SIGNAL_KEYS` / weights / tiers / domains / chip labels.

Update file header comment to note LLM blocks are present (still no keyword heuristics).

Append:

```typescript
/**
 * Expansion-12 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_12_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-12 Feeling Heard (extract when evidence exists; NOT used for scoring; 1–10 or null):

- listeningPresence: quality of attention and presence when a partner speaks —
  distracted / interrupting / half-listening (LOW) vs fully engaged, present,
  partner feels heard (HIGH).
  1–2 = easily distracted; interrupts; doesn't retain what partner shares.
  3–4 = listens inconsistently.
  5–6 = generally attentive.
  7–8 = actively listens, asks follow-ups, remembers details.
  9–10 = deeply present; partner consistently feels heard and understood.
  PROTECTED — distinct from:
    empathyCompassion (understanding/caring about feelings — NOT the behavioral act of full attention / not interrupting);
    directness (how they speak / say hard things — NOT how they receive / listen).
  Prefer null when listening/attention behavior is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני תמיד שם את הטלפון בצד כשבן/בת הזוג מדבר/ת אליי".

- emotionalExpression: comfort/tendency to outwardly express feelings, affection,
  and appreciation verbally vs reserved/internal emotional style.
  1–2 = very reserved; rarely says feelings out loud even when felt deeply.
  3–4 = occasional expression, mostly internal (including "love through actions, not words").
  5–6 = moderate, situational expression.
  7–8 = regularly expresses feelings, affection, appreciation verbally.
  9–10 = very expressive; frequently and openly shares feelings and affection.
  PROTECTED — distinct from:
    emotionalDepth (capacity to feel/discuss deep emotion — NOT how outwardly it is shown;
      deep+reserved or shallow+expressive both possible);
    physicalAffectionStyle (physical touch/PDA — NOT verbal/emotional expression /
      words of affirmation / saying feelings out loud).
  Prefer null when expressing-feelings style is unmentioned.
  Do not invent high expression from silence or from emotional depth alone.
  Hebrew meaning examples (do not keyword-match): "אני אומר/ת לבן/בת הזוג שאני אוהב/ת אותם כל הזמן".

Prefer null over stretched scoring for all Expansion-12 keys.
`;

/**
 * Expansion-12 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_12_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-12 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- listeningPresence: desired partner attention/presence when listening
  (distracted/interrupting LOW ↔ deeply present / makes them feel heard HIGH)
- emotionalExpression: desired partner outward verbal/emotional expression
  (reserved/actions-not-words LOW ↔ frequently says feelings/affection HIGH)

Use the same 1–10 scales and PROTECTED distinctions as Expansion-12 self definitions.
CRITICAL: partner empathy/caring language alone → empathyCompassion territory — NOT listeningPresence
  unless attention / presence / not-interrupting behavior is explicit.
CRITICAL: partner emotional depth / vulnerability capacity alone does NOT equal emotionalExpression.
CRITICAL: partner physical affection / touch preference alone does NOT equal emotionalExpression.
Prefer null over stretched scoring. Do not invent listening or expression scores from silence.
`;
```

Agent 1 may tighten wording but must preserve both keys, scales, PROTECTED lines, and Hebrew-as-examples-only.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append (comma-separated, after `jealousySecurity`):

```text
listeningPresence, emotionalExpression
```

2. After `${EXPANSION_11_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_12_SELF_SHADOW_SIGNAL_BLOCK}`.

3. **SIGNAL RULES** — add:

```text
- listeningPresence = explicit attention/presence when partner speaks (distracted/interrupting LOW ↔ deeply present / partner feels heard HIGH); not empathy/caring alone, not directness/speaking style alone
- emotionalExpression = explicit outward verbal expression of feelings/affection/appreciation (reserved/actions-not-words LOW ↔ frequently says feelings HIGH); not emotional depth alone, not physical touch affection alone
```

4. **Upgrade adjacent lines** (self) — **required**:

```text
- empathyCompassion = explicit care for partner's feelings, attunement, compassionate responses (not generic kindness) — not listening attention/presence / not-interrupting alone (→ listeningPresence)
- directness = …existing meaning… — not how they receive / listen / give attention alone (→ listeningPresence)
- emotionalDepth = explicit introspection, vulnerability, emotional self-awareness — not how outwardly feelings are verbally expressed (→ emotionalExpression)
- physicalAffectionStyle = explicit touch/cuddling/PDA/closeness needs (not general attractiveness, not casual vs committed intimacy boundary) — not verbal/emotional expression / words-of-affirmation alone (→ emotionalExpression)
```

Preserve any existing Exp-10/11 clauses already on these lines; **append** Exp-12 distinctions rather than deleting prior text. Do **not** invent a `directness` rewrite that drops its core meaning — only add the listening carve-out if missing.

Do **not** add trigger-phrase keyword lists. Do **not** remove Exp-11 SIGNAL RULE lines.

### 4. `PARTNER_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append the same two keys after `jealousySecurity`.

2. Inject `${EXPANSION_12_PARTNER_SHADOW_SIGNAL_BLOCK}` after `${EXPANSION_11_PARTNER_SHADOW_SIGNAL_BLOCK}` (before DIRECTION LOCK / HARD SEMANTIC GUARD — keep readable).

3. **SIGNAL RULES** — add partner-framed one-liners for both keys.

4. **Upgrade** partner `emotionalDepth` (and any other adjacent partner lines that exist) so depth ≠ expression alone. Partner domain does **not** currently allow `empathyCompassion` / `directness` / `physicalAffectionStyle` — do **not** invent those partner keys; PROTECTED notes live in the Exp-12 partner block.

Optional partner HARD SEMANTIC GUARD note (keep short if added):

```text
- "puts phone away / really listens" / "says I love you often / open about feelings" -> listeningPresence / emotionalExpression when explicit; do not dump into emotionalDepth alone
```

### 5. `DOMAIN_ALLOWED_SIGNAL_KEYS` (locked)

| Domain | Change |
|--------|--------|
| `self` | Append `listeningPresence`, `emotionalExpression` → length **37** |
| `partner` | Append `listeningPresence`, `emotionalExpression` → length **23** |
| `relationship` | **Unchanged** |

Update **all** specs that assert self length **35** / partner **21** (Exp-06/07/08/10/11 blocks + Exp-10/11 rollout) → **37** / **23**.

Add Expansion-12 membership asserts (keys **are** in self+partner; **not** in relationship).

### 6. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt blocks only — no text-inference |
| Null when unclear | "Prefer null…" + evidence required |
| Score outside range → null | `validateAndClean` |
| Short text → null | Existing sparsity shutdown |
| No keyword heuristics | No substring/tag scoring paths |
| Silence → null | Prefer null; do not invent low/high |
| Actions-not-words | Low-band `emotionalExpression` when explicit — not auto-null, not `physicalAffectionStyle` alone |
| >85% / live Hebrew fixtures | **Story 5** |
| Onboarding UI strings | **Story 4** |

### 7. Shadow mode preserved (locked)

- Keys remain in `SHADOW_SIGNAL_KEYS` only
- `COMPATIBILITY_SIGNAL_KEYS` still **15**
- No tension / chips / promote
- Metadata weights stay document-only
- Meta chip labels remain `Quality listening` / `Expressiveness` (Story 4 browse chips differ)

### 8. Tests (agent 1 minimum)

Add to `extraction.service.spec.ts` — `describe('Expansion-12 shadow signals')`:

| Test | Domain | Mock LLM | Expect |
|------|--------|----------|--------|
| High listeningPresence | self | `9` + evidence | `=== 9` |
| Low listeningPresence | self | `2` + evidence | `=== 2` |
| Null listeningPresence (silence) | self | `null` | null |
| High emotionalExpression | self | `9` + evidence | `=== 9` |
| Low emotionalExpression | self | `2` + evidence | `=== 2` |
| Null emotionalExpression (silence) | self | `null` | null |
| Out of range | self | `11` on either key | stripped to `null` |
| Partner listeningPresence smoke | partner | `8` + evidence | `=== 8` |
| Partner emotionalExpression smoke | partner | `8` + evidence | `=== 8` |

Use README semantic / Hebrew strings in test **names/comments only** — assertions on mocked LLM output. Do **not** add regex fixtures that pretend to score.

Also update `extracted-signals.spec.ts` domain-length + Exp-12 DOMAIN_ALLOWED membership asserts.

Optional (not required): seed `dating-api/data/expansion-12-extraction-fixtures.json` for Story 5 — **do not** run live LLM in Story 2.

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
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-12"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npx jest src/extraction/expansion-10-rollout.spec.ts src/extraction/expansion-11-rollout.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `expansion-12-signal-definitions.ts` with self + partner semantic blocks (§2); keep Story 1 metadata.
2. Wire self block after Exp-11; update self ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§3).
3. Wire partner block after Exp-11 partner; update partner ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§4).
4. Sync `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**37**) and `.partner` (**23**) (§5).
5. Add unit tests (§8); fix domain-length asserts across specs; run commands above.
6. **Do not** touch evaluate layer, text-inference regex, scoring, tension, relationship prompt, Exp-01–11 definition bodies (except DOMAIN length in rollout), onboarding UI, or promote.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-12-feeling-heard/handoffs/STORY_02_llm_extraction_prompts/`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for Expansion-12 listeningPresence and emotionalExpression

Story 2 — self+partner shadow extraction; adjacent SIGNAL RULE upgrades; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for Exp-12 keys
- [ ] No changes to text-inference files for these keys
- [ ] Prompt blocks in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] Self + partner ALLOWED KEYS include both keys; relationship unchanged
- [ ] `DOMAIN_ALLOWED.self === 37`, `.partner === 23`
- [ ] Scale 1–10; null on weak evidence; out-of-range stripped
- [ ] PROTECTED distinctions present (vs `empathyCompassion` / `directness` / `emotionalDepth` / `physicalAffectionStyle`)
- [ ] Adjacent SIGNAL RULES upgraded (empathy / directness / depth / physical affection as applicable)
- [ ] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Story 1 metadata exports preserved
- [ ] Expansion-09 interest artifacts untouched
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Story 5:** Live Hebrew fixtures + >85% gate.
- **Story 3:** Tension rules `listening_presence_gap`, `emotional_expression_gap`.
- **Story 4:** Positive chips (`Feels heard` both-high listening; `Expressiveness match` aligned) + i18n + onboarding copy.
- **Correlation risk:** `listeningPresence` vs `empathyCompassion`; `emotionalExpression` vs `emotionalDepth` / `physicalAffectionStyle` — monitor in Story 5; do not hardcode anti-correlation in Story 2.

---

## Next agent

```text
--agent 1 expansion 12 story 2
```

**Notes:** Mandatory `LLM_FIRST_PRINCIPLE.md`. Extend existing metadata file — do not recreate from scratch. Self **and** partner. Keep shadow / no scoring. Listening ≠ empathy; expression ≠ depth or touch.
