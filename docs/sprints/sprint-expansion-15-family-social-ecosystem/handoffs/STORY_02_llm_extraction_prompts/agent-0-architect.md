# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-15-family-social-ecosystem  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for Expansion-15 (`familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed`). **Shadow only** — still no scoring / tension / chips / promote / Phase 6 promote-all.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology (final sprint)

---

## Summary

- Wire Expansion-15 into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** invent evaluate-layer extractors — production extraction lives in `extraction.service.ts`.
- Story 1 already created **metadata-only** `expansion-15-signal-definitions.ts` + three `SHADOW_SIGNAL_KEYS`. Story 2 **extends** that file with LLM semantic blocks and wires prompts + `DOMAIN_ALLOWED`.
- Domains: **self + partner** (README + Story 1 lock). **Not** relationship.
- Scale **1–10 or null**. No regex / keyword / text-inference rules. Hebrew-aware **semantic** examples in prompts (not keyword matchers).
- Collision upgrades required on `independence`, `socialBattery` (self), `traditionalism`, `socialBattery` (partner) so they do not swallow Exp-15.
- **`friendCoupleBalance` scale polarity locked:** low = friends-first; high = couple-centric — **do not invert**.
- Onboarding prompt **copy** remains Story 4; answers already feed the same free-text extractor when present — **no separate pipeline / DTO** in Story 2.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` in `SHADOW_SIGNAL_KEYS`; metadata module exists (domains `relationship` / `social` / `social`); `MAX_EVIDENCE_ITEMS === 57`; total extraction **53**; **not** in `COMPATIBILITY_SIGNAL_KEYS` (still **15**) |
| Self `DOMAIN_ALLOWED` | **42** (through `monogamyAlignment`) — Story 2 adds **3 → 45** |
| Partner `DOMAIN_ALLOWED` | **28** — Story 2 adds **3 → 31** |
| Expansion-01–14 Story 2 | Blocks already wired in `SELF_EXTRACTOR_PROMPT` / partner — **do not modify** those definition files |
| Expansion-09 | Interest taxonomy — **orthogonal**; do not touch interest allowlists / guidance |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) |
| Adjacent collision risk | `traditionalism`, `socialBattery`, `independence` |
| Self ALLOWED KEYS today | Has `independence`, `socialBattery`; **omits** `traditionalism` (`Do not output traditionalism`) |
| Partner ALLOWED KEYS today | Has `traditionalism`, `socialBattery`; **omits** `independence` (`Do not output independence`) |
| `evaluate-llm-prompts.ts` | Not core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Create `expansion-15-signal-definitions.ts` | **Extend** existing Story 1 metadata file — add LLM blocks; keep promotion meta |
| Wire self + partner | **Yes** self+partner. Onboarding = same free-text path when answers exist — **no** new input channel / schema in Story 2. UI copy = **Story 4** |
| Sync `extraction-strict-validation.ts` allowlist | **Yes** — `DOMAIN_ALLOWED` self **45** / partner **31** |
| Unit tests: 3 signals × high/low/null | **Yes** — mocked LLM in `extraction.service.spec.ts` |
| Hebrew regression fixtures | **Story 5** live gate — Story 2 uses **mocked** unit tests only (optional fixture seed OK) |
| >85% agreement | **Story 5** — not Story 2 |
| Keyword / regex heuristics | **Forbidden** — LLM semantic only; README Hebrew strings are prompt examples / Story 5 fixtures, not matchers |
| Evaluate-layer prompts | **Wrong path** — use `extraction.service.ts` |
| Phase 6 full rollout checklist | **Story 5** — not Story 2 |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-15-signal-definitions.ts` | **Extend** — add `EXPANSION_15_SELF_SHADOW_SIGNAL_BLOCK` + `EXPANSION_15_PARTNER_SHADOW_SIGNAL_BLOCK` (keep Story 1 meta exports) |
| `dating-api/src/extraction/extraction.service.ts` | Import both blocks; append self after Exp-14; append partner after Exp-14 partner; add 3 keys to self + partner `ALLOWED KEYS`; add SIGNAL RULES; **upgrade** adjacent SIGNAL RULES |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add 3 keys to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**42 → 45**) and `.partner` (**28 → 31**) |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-15 shadow signals')` |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Add Exp-15 DOMAIN_ALLOWED membership; update self/partner length asserts **42→45** / **28→31** everywhere |
| `dating-api/src/extraction/expansion-10-rollout.spec.ts` | Bump DOMAIN lengths **42/28 → 45/31** |
| `dating-api/src/extraction/expansion-11-rollout.spec.ts` | Bump DOMAIN lengths **42/28 → 45/31** |
| `dating-api/src/extraction/expansion-12-rollout.spec.ts` | Bump DOMAIN lengths **42/28 → 45/31** |
| `dating-api/src/extraction/expansion-13-rollout.spec.ts` | Bump DOMAIN lengths **42/28 → 45/31** |
| `dating-api/src/extraction/expansion-14-rollout.spec.ts` | Bump DOMAIN lengths **42/28 → 45/31** |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `extraction/extraction-text-inference.ts` / `engine/.../text-inference.ts` | **NO regex** for Exp-15 |
| `expansion-01`…`14-*.ts` definition / interest files | Prior sprints — do not edit (except Exp-10…14 rollout DOMAIN length) |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `matches/match-explainability.ts`, `SIGNAL_DOMAIN`, i18n, onboarding UI copy | Story 4 |
| `RELATIONSHIP_EXTRACTOR_PROMPT` | Do **not** add Exp-15 keys |
| Live LLM / Hebrew fixture validator script | Story 5 |
| Phase 6 promote-all / correlation / A/B / backfill | Story 5 / operator |
| Prisma / backfill / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call per domain. Self + partner rich blocks.**

```
Profile analyze → ExtractionService.extract('self' | 'partner', text)
  → SELF_EXTRACTOR_PROMPT (Exp-01..15) OR PARTNER_EXTRACTOR_PROMPT (+ Exp-07/08/10…15 partner blocks)
  → completeJSON → normalize → validateAndClean → validateExtraction
  → evaluationJson.{self|partner}.signals.{familyEnmeshment|friendCoupleBalance|aloneTimeNeed}
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction. No onboarding-specific extractor.

### 2. Extend `expansion-15-signal-definitions.ts` (locked)

Keep existing `EXPANSION_15_SHADOW_SIGNAL_KEYS` / weights / tiers / domains (`relationship` / `social` / `social`) / chip labels.

Update file header comment to note LLM blocks are present (still no keyword heuristics), mirroring Exp-14:

```typescript
/**
 * Expansion-15 promotion-ready metadata + LLM semantic prompt blocks (shadow until promote).
 * LLM-first only — no keyword heuristics.
 */
```

Append:

```typescript
/**
 * Expansion-15 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_15_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-15 Family & Social Ecosystem (extract when evidence exists; NOT used for scoring; 1–10 or null):

- familyEnmeshment: degree to which family-of-origin is involved in daily decisions and
  boundaries — independent/boundaried vs highly enmeshed.
  1–2 = very independent from family; makes decisions autonomously.
  3–4 = some family closeness, clear boundaries.
  5–6 = moderate involvement.
  7–8 = family heavily involved in decisions/routines.
  9–10 = very enmeshed; family opinion central to most decisions.
  PROTECTED — distinct from:
    traditionalism (general marriage/kids/religion/family-path values — NOT day-to-day
      family-of-origin involvement in decisions/boundaries).
  Prefer null when family involvement/boundaries stance is unmentioned.
  Hebrew meaning examples (do not keyword-match): "המשפחה שלי מאוד מעורבת בחיים שלי".

- friendCoupleBalance: where social time and priority tend to go —
  friends-first vs couple-centric. Neither end is inherently better.
  SCALE POLARITY (do not invert): LOW = friends-first; HIGH = couple-centric.
  1–2 = friends are a huge priority; lots of independent social time.
  3–4 = leans toward friend time.
  5–6 = balanced.
  7–8 = leans couple-centric.
  9–10 = very couple-centric; prioritizes partner time over friend groups.
  PROTECTED — distinct from:
    socialBattery (introversion/extroversion *energy* / how much socializing someone can do —
      NOT *where* social time goes between friends vs partner).
  Prefer null when friend-vs-couple time balance is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני אוהב/ת שרוב הזמן הפנוי שלי יהיה עם בן/בת הזוג".

- aloneTimeNeed: need for solo time to recharge — independent of overall social energy.
  1–2 = rarely needs alone time; prefers constant togetherness.
  3–4 = occasional alone time.
  5–6 = moderate need.
  7–8 = regularly needs solo time to recharge.
  9–10 = strong need for significant alone time; recharges primarily solo.
  PROTECTED — distinct from:
    independence (general autonomy across life decisions / fusion vs autonomy —
      NOT specifically the need for solo recharge time);
    socialBattery (social-energy capacity — NOT solo recharge preference alone).
  Prefer null when alone-time / solo-recharge stance is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני צריך/ה את המרחב והזמן שלי כדי להיטען מחדש".

Prefer null over stretched scoring for all Expansion-15 keys.
`;

/**
 * Expansion-15 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_15_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-15 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- familyEnmeshment: desired partner family-of-origin involvement / boundary style
  (very independent/boundaried LOW ↔ highly enmeshed HIGH)
- friendCoupleBalance: desired partner friends-vs-couple time balance
  (friends-first LOW ↔ couple-centric HIGH — do not invert)
- aloneTimeNeed: desired partner need for solo recharge time
  (rarely needs alone time / prefers togetherness LOW ↔ strong solo recharge need HIGH)

Use the same 1–10 scales and PROTECTED distinctions as Expansion-15 self definitions.
CRITICAL: partner marriage/kids/traditional family-path language alone → traditionalism — NOT familyEnmeshment
  unless day-to-day family-of-origin involvement/boundaries are explicit.
CRITICAL: partner social-energy / intro-extro language alone → socialBattery — NOT friendCoupleBalance
  unless friends-vs-couple time allocation is explicit.
CRITICAL: partner autonomy / fusion / "own life" decision language alone → independence territory —
  NOT aloneTimeNeed unless solo recharge / alone-time need is explicit
  (partner domain may not emit independence; still prefer null over inventing aloneTimeNeed from autonomy alone).
Prefer null over stretched scoring. Do not invent family, friend/couple, or alone-time scores from silence.
`;
```

Agent 1 may tighten wording but must preserve all three keys, scales, polarity lock, PROTECTED lines, and Hebrew-as-examples-only.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append (comma-separated, after `monogamyAlignment`):

```text
familyEnmeshment, friendCoupleBalance, aloneTimeNeed
```

2. After `${EXPANSION_14_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_15_SELF_SHADOW_SIGNAL_BLOCK}`.

3. **SIGNAL RULES** — add:

```text
- familyEnmeshment = explicit family-of-origin involvement in daily decisions/boundaries (very independent LOW ↔ highly enmeshed HIGH); not marriage/kids traditionalism alone
- friendCoupleBalance = explicit friends-first vs couple-centric time allocation (friends-first LOW ↔ couple-centric HIGH — do not invert); not social-energy intro/extro alone
- aloneTimeNeed = explicit need for solo recharge time (rarely needs alone time LOW ↔ strong solo need HIGH); not general independence/autonomy alone, not socialBattery alone
```

4. **Upgrade adjacent lines** (self) — **required**:

```text
- independence = …existing meaning… — not specifically the need for solo recharge / alone time alone (→ aloneTimeNeed)
- socialBattery = …existing meaning… — not friends-vs-couple time allocation alone (→ friendCoupleBalance)
```

Preserve any existing Exp-10/11/12/13/14 clauses already on these lines; **append** Exp-15 distinctions rather than deleting prior text.

**Note:** Self prompt omits `traditionalism` (`Do not output traditionalism`). Do **not** invent a self `traditionalism` SIGNAL RULE or add traditionalism to self ALLOWED KEYS. Family vs traditionalism PROTECTED notes live in the Exp-15 self block.

Do **not** add trigger-phrase keyword lists. Do **not** remove Exp-14 SIGNAL RULE lines.

Optional self HARD SEMANTIC GUARD note (keep short if added):

```text
- "family weighs in on decisions" / "friend group is my identity" / "need space to recharge" -> familyEnmeshment / friendCoupleBalance / aloneTimeNeed when explicit; do not dump into traditionalism, socialBattery, or independence alone
```

### 4. `PARTNER_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append the same three keys after `monogamyAlignment`.

2. Inject `${EXPANSION_15_PARTNER_SHADOW_SIGNAL_BLOCK}` after `${EXPANSION_14_PARTNER_SHADOW_SIGNAL_BLOCK}` (before DIRECTION LOCK / HARD SEMANTIC GUARD — keep readable).

3. **SIGNAL RULES** — add partner-framed one-liners for all three keys.

4. **Upgrade** adjacent partner lines — **required** (partner has these keys):

```text
- traditionalism = …existing… — not day-to-day family-of-origin involvement/boundaries alone (→ familyEnmeshment)
- socialBattery = …existing… — not friends-vs-couple time allocation alone (→ friendCoupleBalance)
```

Partner domain does **not** currently allow `independence` — do **not** invent that partner key; alone-time vs independence PROTECTED notes live in the Exp-15 partner block.

**Critical partner collision:** partner `traditionalism` currently covers kids/marriage/traditional family structure. Story 2 **must** append the familyEnmeshment carve-out so family-of-origin day-to-day involvement/boundaries routes to `familyEnmeshment`, while marriage/kids/traditional life-path stay `traditionalism`. Both may fire when evidence supports both angles; do not dump enmeshment into traditionalism alone.

Optional partner HARD SEMANTIC GUARD note (keep short if added):

```text
- "family involved in decisions" / "friends first vs couple time" / "needs alone time to recharge" -> familyEnmeshment / friendCoupleBalance / aloneTimeNeed when explicit; do not dump into traditionalism or socialBattery alone
```

### 5. `DOMAIN_ALLOWED_SIGNAL_KEYS` (locked)

| Domain | Change |
|--------|--------|
| `self` | Append `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` → length **45** |
| `partner` | Append `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` → length **31** |
| `relationship` | **Unchanged** |

Update **all** specs that assert self length **42** / partner **28** (Exp-10/11/12/13/14 rollout + `extracted-signals.spec.ts`) → **45** / **31**.

Add Expansion-15 membership asserts (keys **are** in self+partner; **not** in relationship). Story 1 Exp-15 shadow-mode block currently omits DOMAIN_ALLOWED — Story 2 **adds** that membership test (mirror Exp-14).

### 6. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt blocks only — no text-inference |
| Null when unclear | "Prefer null…" + evidence required |
| Score outside range → null | `validateAndClean` |
| Short text → null | Existing sparsity shutdown |
| No keyword heuristics | No substring/tag scoring paths |
| Silence → null | Prefer null; do not invent low/high |
| “Family very involved / weigh in on decisions” | High-band `familyEnmeshment` when explicit — not `traditionalism` alone |
| “I make my own decisions, family isn't involved” | Low-band `familyEnmeshment` when explicit |
| “Most free time with partner” | High-band `friendCoupleBalance` (couple-centric) when explicit — **not** inverted; not `socialBattery` alone |
| “Friend group is my identity” | Low-band `friendCoupleBalance` (friends-first) when explicit |
| “Need space to recharge” | High-band `aloneTimeNeed` when explicit — not `independence` alone |
| “Want to spend as much time together as possible” | Low-band `aloneTimeNeed` when explicit |
| >85% / live Hebrew fixtures | **Story 5** |
| Onboarding UI strings | **Story 4** |

### 7. Shadow mode preserved (locked)

- Keys remain in `SHADOW_SIGNAL_KEYS` only
- `COMPATIBILITY_SIGNAL_KEYS` still **15**
- No tension / chips / promote / Phase 6 promote-all
- Metadata weights stay document-only
- Meta chip labels remain `Family closeness` / `Friends & couple balance` / `Alone time needs` (Story 4 browse: `Family style match` / `Friends & couple balance` / `Recharge style match`)
- Promotion domains remain metadata-only until Story 4 / promote

### 8. Tests (agent 1 minimum)

Add to `extraction.service.spec.ts` — `describe('Expansion-15 shadow signals')`:

| Test | Domain | Mock LLM | Expect |
|------|--------|----------|--------|
| High familyEnmeshment | self | `9` + evidence | `=== 9` |
| Low familyEnmeshment | self | `2` + evidence | `=== 2` |
| Null familyEnmeshment (silence) | self | `null` | null |
| High friendCoupleBalance (couple-centric) | self | `9` + evidence | `=== 9` |
| Low friendCoupleBalance (friends-first) | self | `2` + evidence | `=== 2` |
| Null friendCoupleBalance (silence) | self | `null` | null |
| High aloneTimeNeed | self | `9` + evidence | `=== 9` |
| Low aloneTimeNeed | self | `2` + evidence | `=== 2` |
| Null aloneTimeNeed (silence) | self | `null` | null |
| Out of range | self | `11` on any Exp-15 key | stripped to `null` |
| Partner familyEnmeshment smoke | partner | `8` + evidence | `=== 8` |
| Partner friendCoupleBalance smoke | partner | `8` + evidence | `=== 8` |
| Partner aloneTimeNeed smoke | partner | `8` + evidence | `=== 8` |

Use README semantic / Hebrew strings in test **names/comments only** — assertions on mocked LLM output. Do **not** add regex fixtures that pretend to score.

Also update `extracted-signals.spec.ts` domain-length + Exp-15 DOMAIN_ALLOWED membership asserts.

Optional (not required): seed `dating-api/data/expansion-15-extraction-fixtures.json` for Story 5 — **do not** run live LLM in Story 2.

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
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-15"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npx jest src/extraction/expansion-10-rollout.spec.ts src/extraction/expansion-11-rollout.spec.ts src/extraction/expansion-12-rollout.spec.ts src/extraction/expansion-13-rollout.spec.ts src/extraction/expansion-14-rollout.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `expansion-15-signal-definitions.ts` with self + partner semantic blocks (§2); keep Story 1 metadata.
2. Wire self block after Exp-14; update self ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§3).
3. Wire partner block after Exp-14 partner; update partner ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§4) — **especially** `traditionalism` family-involvement carve-out.
4. Sync `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**45**) and `.partner` (**31**) (§5).
5. Add unit tests (§8); fix domain-length asserts across specs; run commands above.
6. **Do not** touch evaluate layer, text-inference regex, scoring, tension, relationship prompt, Exp-01–14 definition bodies (except DOMAIN length in rollout), onboarding UI, Phase 6 promote-all, or promote.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-15-family-social-ecosystem/handoffs/STORY_02_llm_extraction_prompts/`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for Expansion-15 family social ecosystem signals

Story 2 — self+partner shadow extraction; adjacent SIGNAL RULE upgrades; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for Exp-15 keys
- [ ] No changes to text-inference files for these keys
- [ ] Prompt blocks in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] Self + partner ALLOWED KEYS include all three keys; relationship unchanged
- [ ] `DOMAIN_ALLOWED.self === 45`, `.partner === 31`
- [ ] Scale 1–10; null on weak evidence; out-of-range stripped
- [ ] **`friendCoupleBalance` polarity:** low = friends-first, high = couple-centric (not inverted)
- [ ] PROTECTED distinctions present (vs `traditionalism` / `socialBattery` / `independence`)
- [ ] Adjacent SIGNAL RULES upgraded (independence / socialBattery self; traditionalism / socialBattery partner)
- [ ] Partner `traditionalism` no longer owns family-of-origin enmeshment alone
- [ ] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Story 1 metadata exports preserved (domains `relationship` / `social` / `social`)
- [ ] Expansion-09 interest artifacts untouched
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Story 5:** Live Hebrew fixtures + >85% gate + Phase 6 full rollout checklist.
- **Story 3:** Tension rules `family_enmeshment_gap`, `friend_couple_balance_gap`, `alone_time_need_gap`.
- **Story 4:** Browse chips / i18n / onboarding copy (meta chips ≠ browse labels except `Friends & couple balance` may match).
- Pre-existing: self omits `traditionalism`; partner omits `independence` — **do not “fix”** those ALLOWED KEYS lists in Story 2; PROTECTED text covers the distinctions.

---

## Next agent

```text
--agent 1 expansion 15 story 2
```

**Notes:** Shadow-first. Mandatory `LLM_FIRST_PRINCIPLE.md`. Story 1 owns metadata; Story 2 owns prompts + DOMAIN_ALLOWED. `friendCoupleBalance` scale: low = friends-first, high = couple-centric. Do not invent self traditionalism or partner independence keys.
