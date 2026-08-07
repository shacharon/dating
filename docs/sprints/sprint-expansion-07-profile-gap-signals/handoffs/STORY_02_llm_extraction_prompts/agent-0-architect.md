# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for Expansion-07 (five profile-gap signals). **Shadow only** — still no scoring / tension / chips.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Wire Expansion-07 into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** invent evaluate-layer extractors — production extraction lives in `extraction.service.ts`.
- Story 1 already created **metadata-only** `expansion-07-signal-definitions.ts` + five `SHADOW_SIGNAL_KEYS`. Story 2 **extends** that file with LLM semantic blocks and wires prompts + `DOMAIN_ALLOWED`.
- Domains: **self + partner** (README lock). **Not** relationship.
- Scale **1–10 or null**. No regex / keyword / text-inference rules. Hebrew-aware **semantic** examples in prompts (not keyword matchers).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | Five keys in `SHADOW_SIGNAL_KEYS`; metadata module exists; `MAX_EVIDENCE_ITEMS === 39`; total extraction **35**; **not** in `COMPATIBILITY_SIGNAL_KEYS` (still **15**) |
| Self `DOMAIN_ALLOWED` | **22** (through `domesticComfort`) — Story 2 adds **5 → 27** |
| Partner `DOMAIN_ALLOWED` | **8** — Story 2 adds **5 → 13** |
| Expansion-01–06 Story 2 | Blocks already wired in `SELF_EXTRACTOR_PROMPT` — **do not modify** those definition files |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) |
| Adjacent collision risk | `physicalPriority`, `relationshipClarity`, `physicalAffectionStyle`, `financialMindset`, `spirituality`, `traditionalism`; Hebrew emotional “תמיכה” ≠ financial support |
| `evaluate-llm-prompts.ts` | Not core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Create `expansion-07-signal-definitions.ts` | **Extend** existing Story 1 metadata file — add LLM blocks; keep promotion meta |
| Wire self + partner | **Yes** — both domains; relationship **unchanged** |
| Scale 0–10 elsewhere | **Use 1–10** — matches extraction stack |
| Keyword / regex heuristics | **Forbidden** — LLM semantic only; README Hebrew strings are prompt examples / Story 5 fixtures, not matchers |
| Hebrew regression fixtures + pair fixtures | **Story 5** live gate — Story 2 uses **mocked LLM** unit tests only (may seed fixture JSON for Story 5, optional) |
| >85% agreement | **Story 5** — not Story 2 |
| Evaluate-layer prompts | **Wrong path** — use `extraction.service.ts` |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-07-signal-definitions.ts` | **Extend** — add `EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK` + `EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK` (keep Story 1 meta exports) |
| `dating-api/src/extraction/extraction.service.ts` | Import both blocks; append self after Exp-06; append partner block; add 5 keys to self + partner `ALLOWED KEYS`; add SIGNAL RULES; upgrade adjacent SIGNAL RULES / partner `traditionalism` + `physicalPriority` lines |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add 5 keys to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**22 → 27**) and `.partner` (**8 → 13**) |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-07 shadow signals')` (§8) |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Update Exp-06 assert `DOMAIN_ALLOWED.self.length === 22` → **27**; add partner length **13** if useful |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `extraction/extraction-text-inference.ts` / `engine/.../text-inference.ts` | **NO regex** for Exp-07 |
| `expansion-01`…`06-signal-definitions.ts` | Prior sprints — do not edit |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `matches/match-explainability.ts`, i18n, interest chips | Story 4 |
| `RELATIONSHIP_EXTRACTOR_PROMPT` | Do **not** add Exp-07 keys |
| Live LLM / Hebrew fixture validator script | Story 5 |
| Prisma / backfill / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call per domain. Self + partner rich blocks.**

```
Profile analyze → ExtractionService.extract('self' | 'partner', text)
  → SELF_EXTRACTOR_PROMPT (Exp-01..07) OR PARTNER_EXTRACTOR_PROMPT (+ Exp-07 partner block)
  → completeJSON → normalize → validateAndClean → validateExtraction
  → evaluationJson.{self|partner}.signals.{casualIntimacyIntent|…}
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction.

### 2. Extend `expansion-07-signal-definitions.ts` (locked)

Keep existing `EXPANSION_07_SHADOW_SIGNAL_KEYS` / weights / domains / chip labels.

Append:

```typescript
/**
 * Expansion-07 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-07 Profile Gap (extract when evidence exists; NOT used for scoring; 1–10 or null):

- casualIntimacyIntent: comfort with casual physical intimacy (hookups / sex without commitment)
  vs intimacy only within committed/emotional relationship.
  1–2 = committed-only intimacy; rejects casual/hookups.
  3–4 = strong preference for emotional connection before physical; casual unlikely.
  5–6 = open either way depending on connection; no strong stance.
  7–8 = comfortable with casual physical intimacy; may prefer low-commitment.
  9–10 = explicitly seeks hookups/casual sex; rejects relationship commitment for intimacy.
  PROTECTED — distinct from:
    physicalPriority (importance of looks/attraction — not casual vs committed intimacy boundary);
    relationshipClarity (labels/exclusivity/commitment structure — not specifically physical/intimate boundary);
    physicalAffectionStyle (touch/cuddling/PDA needs — not hookup vs committed-only boundary).
  Infer from semantic stance on casual sex / hookups / "no strings" vs intimacy-needs-commitment —
  not keyword lists. Prefer null if dating goals omit physical/intimate boundaries.

- supportExchangeOrientation: openness to transactional / arrangement / money-in-relationship dynamics
  (allowance, sugar dating, explicit support-for-companionship) vs purely romantic/non-transactional.
  1–2 = explicitly rejects transactional/arrangement dynamics.
  3–4 = uncomfortable with money/support as part of dating.
  5–6 = neutral / no clear stance.
  7–8 = open to mutual or one-sided support as part of relationship.
  9–10 = explicitly seeks arrangement (allowance, financial support, sugar dynamic).
  PROTECTED — distinct from:
    financialMindset (save/spend/security philosophy — not arrangement dynamics);
    emotional "support" / תמיכה through hard times without money context (do NOT score high — prefer null/low).
  Prefer null when "support each other" is emotional-only.

- supportProviderOrientation: desire to GIVE ongoing financial support to a partner
  (breadwinner / allowance / "I take care of you financially").
  1–2 = does not want to provide; expects equal split.
  3–4 = occasional generosity (dates/gifts) but not ongoing support — generosity alone stays low–mid, not 9–10.
  5–6 = open to contributing more in committed relationship; no explicit provider role.
  7–8 = wants to be primary provider / breadwinner.
  9–10 = explicitly offers allowance or ongoing financial support ("I'll give you $X/month").
  PROTECTED — distinct from supportExchangeOrientation (openness vs direction) and supportRecipientOrientation (give ≠ receive).

- supportRecipientOrientation: desire to RECEIVE ongoing financial support from a partner.
  1–2 = does not want financial support; values independence.
  3–4 = accepts occasional treats but not ongoing support.
  5–6 = neutral; would accept support in committed relationship if offered.
  7–8 = prefers/expects partner to contribute more financially.
  9–10 = explicitly seeks allowance / ongoing support ("looking for someone who supports me").
  PROTECTED — distinct from exchange openness and provider direction.
  Disambiguation: Profile offering "$1000/month support" → high exchange + high provider + low recipient.
  Emotional תמיכה without money → null/low on provider/recipient.

- religiousObservance: practical religious practice (kosher, Shabbat, prayer, community, ritual)
  vs secular / cultural-only / non-practicing.
  1–2 = secular; no religious practice.
  3–4 = cultural identity only; minimal practice.
  5–6 = moderate practice; some rituals matter.
  7–8 = regular observance (kosher, Shabbat, prayer, community).
  9–10 = strict observance; practice central to daily life / partner requirements.
  PROTECTED — distinct from:
    spirituality (inner/transcendent meaning — "spiritual but not observant" can be high spirituality + low observance);
    traditionalism (life-structure / marriage-kids values — not ritual practice level).
  Prefer null when no religious/practice cues exist.

Prefer null over stretched scoring for all Expansion-07 keys.
`;

/**
 * Expansion-07 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-07 Profile Gap for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- casualIntimacyIntent: desired partner's casual vs committed-only intimacy stance
- supportExchangeOrientation: openness they want around arrangement/money-in-relationship
- supportProviderOrientation: whether they want a partner who PROVIDES financial support
- supportRecipientOrientation: whether they want a partner who RECEIVES / expects financial support
- religiousObservance: desired partner's practical religious practice level

Use the same 1–10 scales and PROTECTED distinctions as Expansion-07 self definitions.
CRITICAL: partner traditionalism = marriage/kids/family-structure preference — NOT ritual observance
  (kosher/Shabbat/דתי practice → religiousObservance when about practice level).
CRITICAL: partner physicalPriority = looks/attraction importance — NOT casual-intimacy boundary.
Emotional תמיכה without financial context → do not score support* high.
Prefer null over stretched scoring.
`;
```

Agent 1 may tighten wording but must preserve all five keys, scales, PROTECTED lines, Hebrew emotional-support disambiguation, and generosity≠high-provider rule.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append (comma-separated, after `domesticComfort`):

```text
casualIntimacyIntent, supportExchangeOrientation, supportProviderOrientation, supportRecipientOrientation, religiousObservance
```

2. After `${EXPANSION_06_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK}`.

3. **SIGNAL RULES** — add:

```text
- casualIntimacyIntent = explicit casual vs committed-only physical intimacy stance (not looks priority, not affection/touch needs alone, not commitment-labels alone)
- supportExchangeOrientation = explicit openness to arrangement/money-in-relationship dynamics (not save/spend philosophy, not emotional support alone)
- supportProviderOrientation = explicit desire to give ongoing financial support (not occasional date generosity alone)
- supportRecipientOrientation = explicit desire to receive ongoing financial support (not emotional support alone)
- religiousObservance = explicit practical religious practice level (not inner spirituality alone, not traditional family-structure alone)
```

4. **Upgrade adjacent lines** (self):

```text
- spirituality = explicit spiritual/inner meaning orientation — not practical ritual observance level alone
- physicalAffectionStyle = explicit touch/cuddling/PDA/closeness needs (not general attractiveness, not casual vs committed intimacy boundary)
```

(Keep existing `relationshipClarity` exclusion — do not add it to self ALLOWED KEYS.)

Do **not** add trigger-phrase keyword lists.

### 4. `PARTNER_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append the same five keys after `conflictStyle`.

2. Inject `${EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK}` after SIGNAL RULES (or before HARD SEMANTIC GUARD — keep readable).

3. **SIGNAL RULES** — add the five partner-framed one-liners (desired-partner traits).

4. **Upgrade**:

```text
- traditionalism = explicit desire for kids, marriage, traditional family structure — not practical religious ritual observance alone (kosher/Shabbat/דתי practice → religiousObservance)
- physicalPriority = explicit looks, attraction, chemistry, appearance — not casual vs committed intimacy boundary
```

5. Optionally soft-update FAMILY LANGUAGE RULE: kids/marriage/family → traditionalism; ritual practice → religiousObservance. Do not break existing family→traditionalism mapping.

### 5. `DOMAIN_ALLOWED_SIGNAL_KEYS` (locked)

| Domain | Change |
|--------|--------|
| `self` | Append all 5 Exp-07 keys → length **27** |
| `partner` | Append all 5 Exp-07 keys → length **13** |
| `relationship` | **Unchanged** |

Update specs that assert self length **22** (Exp-06 block) → **27**.

### 6. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt blocks only — no text-inference |
| Null when unclear | "Prefer null…" + evidence required |
| Score outside range → null | `validateAndClean` |
| Short text → null | Existing sparsity shutdown |
| No keyword heuristics | No substring/tag scoring paths |
| Hebrew emotional תמיכה ≠ financial support | PROTECTED lines in both blocks |
| >85% / live Hebrew fixtures | **Story 5** |

### 7. Shadow mode preserved (locked)

- Keys remain in `SHADOW_SIGNAL_KEYS` only
- `COMPATIBILITY_SIGNAL_KEYS` still **15**
- No tension / chips / promote
- Metadata weights stay document-only

### 8. Tests (agent 1 minimum)

Add to `extraction.service.spec.ts` — `describe('Expansion-07 shadow signals')`:

| Test | Domain | Mock LLM | Expect |
|------|--------|----------|--------|
| High casualIntimacyIntent | self | `9` + evidence | `=== 9` |
| Low casualIntimacyIntent | self | `2` + evidence | `=== 2` |
| Null casualIntimacyIntent | self | `null` | null |
| High supportExchangeOrientation | self | `9` + evidence | `=== 9` |
| Low supportExchangeOrientation | self | `2` + evidence | `=== 2` |
| Profile-C style support set | self | exchange `9`, provider `9`, recipient `2` | those values |
| High/low supportProviderOrientation | self | `8` / `2` | match |
| High/low supportRecipientOrientation | self | `8` / `2` | match |
| High/low religiousObservance | self | `9` / `2` | match |
| Null religiousObservance | self | `null` | null |
| Out of range | self | `11` on any Exp-07 key | stripped to `null` |
| Partner religiousObservance smoke | partner | `8` + evidence | `=== 8` |

Use README semantic strings in test **names/comments only** — assertions on mocked LLM output.

Also update `extracted-signals.spec.ts` domain-length asserts (22 → 27).

Optional (not required): seed `dating-api/data/expansion-07-extraction-fixtures.json` for Story 5 — **do not** run live LLM in Story 2.

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
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-07"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `expansion-07-signal-definitions.ts` with self + partner semantic blocks (§2); keep Story 1 metadata.
2. Wire self block after Exp-06; update self ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§3).
3. Wire partner block; update partner ALLOWED KEYS + SIGNAL RULES + traditionalism/physicalPriority upgrades (§4).
4. Sync `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**27**) and `.partner` (**13**) (§5).
5. Add unit tests (§8); fix domain-length asserts; run commands above.
6. **Do not** touch evaluate layer, text-inference regex, scoring, tension, relationship prompt, Exp-01–06 definition files, or promote.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-07-profile-gap-signals/handoffs/STORY_02_llm_extraction_prompts/`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for Expansion-07 profile-gap signals

Story 2 — self+partner shadow extraction; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for Exp-07 keys
- [ ] No changes to text-inference files for these keys
- [ ] Prompt blocks in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] Self + partner ALLOWED KEYS include all five; relationship unchanged
- [ ] `DOMAIN_ALLOWED.self === 27`, `.partner === 13`
- [ ] Scale 1–10; null on weak evidence; out-of-range stripped
- [ ] PROTECTED distinctions present (intimacy / support set / religiousObservance)
- [ ] spirituality / physicalAffectionStyle / traditionalism / physicalPriority lines upgraded where locked
- [ ] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Story 1 metadata exports preserved
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Story 5:** Live Hebrew gap-profile fixtures + >85% gate + pair support fixtures for tension validation.
- **Story 3:** Five tension rules + `EnrichedSignals` (previewed in Story 1 architect).
- **Correlation risk:** `religiousObservance` vs `spirituality` / `traditionalism`; support* vs emotional language — monitor in Story 5; do not hardcode anti-correlation in Story 2.

---

## Next agent

```text
--agent 1 expansion 07 story 2
```

**Notes:** Mandatory `LLM_FIRST_PRINCIPLE.md`. Extend existing metadata file — do not recreate from scratch. Self **and** partner. Keep shadow / no scoring.
