# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-11-stress-security  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for Expansion-11 (`stressResponse`, `jealousySecurity`). **Shadow only** — still no scoring / tension / chips / promote.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology

---

## Summary

- Wire Expansion-11 into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** invent evaluate-layer extractors — production extraction lives in `extraction.service.ts`.
- Story 1 already created **metadata-only** `expansion-11-signal-definitions.ts` + two `SHADOW_SIGNAL_KEYS`. Story 2 **extends** that file with LLM semantic blocks and wires prompts + `DOMAIN_ALLOWED`.
- Domains: **self + partner** (README lock). **Not** relationship.
- Scale **1–10 or null**. No regex / keyword / text-inference rules. Hebrew-aware **semantic** examples in prompts (not keyword matchers).
- **Critical polarity:** `jealousySecurity` **high = more jealous/possessive**; low = secure/trusting. Do not invert.
- **Critical axis:** `stressResponse` is a **compatibility direction** (withdraw ↔ pursue) — neither end is “better.”
- Collision upgrades required on `emotionalRegulation`, `attachmentSecurity`, `independence` SIGNAL RULES so they do not swallow Exp-11.
- Onboarding prompt **copy** remains Story 4; answers already feed the same free-text extractor when present — **no separate pipeline / DTO** in Story 2.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | `stressResponse`, `jealousySecurity` in `SHADOW_SIGNAL_KEYS`; metadata module exists; `MAX_EVIDENCE_ITEMS === 47`; total extraction **43**; **not** in `COMPATIBILITY_SIGNAL_KEYS` (still **15**) |
| Self `DOMAIN_ALLOWED` | **33** (through `forgivenessStyle`) — Story 2 adds **2 → 35** |
| Partner `DOMAIN_ALLOWED` | **19** — Story 2 adds **2 → 21** |
| Expansion-01–10 Story 2 | Blocks already wired in `SELF_EXTRACTOR_PROMPT` / partner — **do not modify** those definition files |
| Expansion-09 | Interest taxonomy — **orthogonal**; do not touch interest allowlists / guidance |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) |
| Adjacent collision risk | `attachmentSecurity`, `emotionalRegulation`, `independence`; secondary: Exp-10 space-after-fight vs stress space |
| `evaluate-llm-prompts.ts` | Not core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Create `expansion-11-signal-definitions.ts` with semantic definitions | **Extend** existing Story 1 metadata file — add LLM blocks; keep promotion meta |
| Wire self + partner | **Yes** self+partner. Onboarding = same free-text path when answers exist — **no** new input channel / schema in Story 2. UI copy = **Story 4** |
| Sync `extraction-strict-validation.ts` allowlist | **Yes** — `DOMAIN_ALLOWED` self **35** / partner **21** |
| Unit tests: 2 signals × high/low/null | **Yes** — mocked LLM in `extraction.service.spec.ts` |
| Hebrew regression fixtures | **Story 5** live gate — Story 2 uses **mocked** unit tests only (optional fixture seed OK) |
| >85% agreement | **Story 5** — not Story 2 |
| Keyword / regex heuristics | **Forbidden** — LLM semantic only; README Hebrew strings are prompt examples / Story 5 fixtures, not matchers |
| Evaluate-layer prompts | **Wrong path** — use `extraction.service.ts` |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-11-signal-definitions.ts` | **Extend** — add `EXPANSION_11_SELF_SHADOW_SIGNAL_BLOCK` + `EXPANSION_11_PARTNER_SHADOW_SIGNAL_BLOCK` (keep Story 1 meta exports) |
| `dating-api/src/extraction/extraction.service.ts` | Import both blocks; append self after Exp-10; append partner after Exp-10 partner; add 2 keys to self + partner `ALLOWED KEYS`; add SIGNAL RULES; **upgrade** adjacent SIGNAL RULES |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add 2 keys to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**33 → 35**) and `.partner` (**19 → 21**) |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-11 shadow signals')` |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Add Exp-11 DOMAIN_ALLOWED membership; update self/partner length asserts **33→35** / **19→21** everywhere |
| `dating-api/src/extraction/expansion-10-rollout.spec.ts` | If it asserts DOMAIN lengths **33/19**, bump to **35/21** |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `extraction/extraction-text-inference.ts` / `engine/.../text-inference.ts` | **NO regex** for Exp-11 |
| `expansion-01`…`10-*.ts` definition / interest files | Prior sprints — do not edit (except Exp-10 rollout count/DOMAIN length if needed) |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `matches/match-explainability.ts`, i18n, onboarding UI copy | Story 4 |
| `RELATIONSHIP_EXTRACTOR_PROMPT` | Do **not** add Exp-11 keys |
| Live LLM / Hebrew fixture validator script | Story 5 |
| Prisma / backfill / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call per domain. Self + partner rich blocks.**

```
Profile analyze → ExtractionService.extract('self' | 'partner', text)
  → SELF_EXTRACTOR_PROMPT (Exp-01..11) OR PARTNER_EXTRACTOR_PROMPT (+ Exp-07/08/10/11 partner blocks)
  → completeJSON → normalize → validateAndClean → validateExtraction
  → evaluationJson.{self|partner}.signals.{stressResponse|jealousySecurity}
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction. No onboarding-specific extractor.

### 2. Extend `expansion-11-signal-definitions.ts` (locked)

Keep existing `EXPANSION_11_SHADOW_SIGNAL_KEYS` / weights / tiers / domains / chip labels.

Update file header comment to note LLM blocks are present (still no keyword heuristics).

Append:

```typescript
/**
 * Expansion-11 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_11_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-11 Stress & Security (extract when evidence exists; NOT used for scoring; 1–10 or null):

- stressResponse: behavioral DIRECTION under stress — withdrawing / handling alone (LOW)
  vs actively seeking closeness / support from partner (HIGH).
  This is a COMPATIBILITY AXIS — neither end is "better" or "healthier" by itself.
  1–2 = strongly self-reliant; withdraws and processes alone under stress.
  3–4 = prefers some space before reconnecting when stressed.
  5–6 = mixed; depends on situation.
  7–8 = prefers to talk it out with partner fairly soon when stressed.
  9–10 = actively seeks closeness and reassurance from partner when stressed.
  PROTECTED — distinct from:
    attachmentSecurity (general closeness/fusion pattern — NOT specifically pursue/withdraw under pressure);
    emotionalRegulation (reactivity / volatility / calm recovery IN THE MOMENT — NOT pursue vs withdraw direction);
    repairSkills (post-conflict apology/ownership/reconnection — NOT general stress-time support-seeking).
  Prefer null when stress-time pursue/withdraw behavior is unmentioned.
  Hebrew meaning examples (do not keyword-match): "כשאני לחוץ אני צריך שבן/בת הזוג יהיה קרוב אליי".

- jealousySecurity: tendency toward jealousy and possessiveness vs trust and security
  regarding partner's other relationships / attention.
  CRITICAL POLARITY — HIGH = MORE jealous/possessive; LOW = secure/trusting.
  1–2 = very secure, trusting, comfortable with partner's independence and friendships.
  3–4 = generally secure with occasional insecurity.
  5–6 = some jealousy in specific situations.
  7–8 = regularly feels jealous or needs reassurance.
  9–10 = highly jealous/possessive; struggles with partner's independence.
  PROTECTED — distinct from:
    independence (need for autonomy/space in general — NOT trust/jealousy/possessiveness);
    attachmentSecurity (broader closeness/distance comfort — NOT specifically jealousy about partner's other attention).
  Prefer null when jealousy / trust / possessiveness is unmentioned.
  Do not invent high jealousy from silence or from "I value independence" alone.
  Hebrew meaning examples (do not keyword-match): "אני מתקנא בקלות וצריך לדעת איפה את".

Prefer null over stretched scoring for all Expansion-11 keys.
`;

/**
 * Expansion-11 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_11_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-11 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- stressResponse: desired partner direction under stress (withdraw/self-reliant LOW ↔ seek closeness HIGH)
- jealousySecurity: desired partner jealousy/possessiveness vs trust
  (HIGH = more jealous — CRITICAL: do not invert; wanting a "secure/trusting" partner → LOW)

Use the same 1–10 scales and PROTECTED distinctions as Expansion-11 self definitions.
CRITICAL: partner "calm under stress" alone → emotionalRegulation territory — NOT stressResponse
  unless pursue/withdraw / support-seeking direction is explicit.
CRITICAL: partner independence / autonomy preference alone does NOT equal jealousySecurity.
CRITICAL: partner attachment/closeness language alone does NOT equal stressResponse or jealousySecurity.
Prefer null over stretched scoring. Do not invent jealousy or stress direction from silence.
`;
```

Agent 1 may tighten wording but must preserve both keys, scales, polarity, PROTECTED lines, compatibility-axis note, and Hebrew-as-examples-only.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append (comma-separated, after `forgivenessStyle`):

```text
stressResponse, jealousySecurity
```

2. After `${EXPANSION_10_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_11_SELF_SHADOW_SIGNAL_BLOCK}`.

3. **SIGNAL RULES** — add:

```text
- stressResponse = explicit pursue vs withdraw direction under stress (seek closeness/support HIGH ↔ handle alone/withdraw LOW); compatibility axis — not attachment closeness alone, not emotional reactivity alone, not post-conflict repair alone
- jealousySecurity = explicit jealousy/possessiveness vs trust regarding partner's other attention (HIGH = more jealous); not independence/autonomy alone, not general attachment security alone
```

4. **Upgrade adjacent lines** (self) — **required**:

```text
- attachmentSecurity = explicit closeness, fusion, anchor-like bond, inseparable emotional union — not specifically how grudges/resentment are handled post-conflict (→ forgivenessStyle), not pursue/withdraw under stress alone (→ stressResponse), and not jealousy/possessiveness alone (→ jealousySecurity)
- independence = explicit autonomy vs fusion; shared-everything / merged-life language = low — not jealousy/trust/possessiveness alone (→ jealousySecurity)
- emotionalRegulation = explicit emotional steadiness vs reactivity under stress; calm recovery in the moment (not merely "I'm emotional") — not letting go of grudges over time after conflict (→ forgivenessStyle), and not pursue vs withdraw / support-seeking direction alone (→ stressResponse)
```

Do **not** add trigger-phrase keyword lists. Do **not** remove Exp-10 SIGNAL RULE lines.

### 4. `PARTNER_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append the same two keys after `forgivenessStyle`.

2. Inject `${EXPANSION_11_PARTNER_SHADOW_SIGNAL_BLOCK}` after `${EXPANSION_10_PARTNER_SHADOW_SIGNAL_BLOCK}` (before DIRECTION LOCK / HARD SEMANTIC GUARD — keep readable).

3. **SIGNAL RULES** — add partner-framed one-liners for both keys.

4. **Upgrade** partner adjacent lines similarly (attachment / independence / emotionalRegulation / calm-under-stress → not Exp-11 alone).

Optional partner HARD SEMANTIC GUARD note (keep short if added):

```text
- "needs me close when stressed" / "jealous / needs check-ins" -> stressResponse / jealousySecurity when explicit; do not dump into attachmentSecurity or independence alone
```

### 5. `DOMAIN_ALLOWED_SIGNAL_KEYS` (locked)

| Domain | Change |
|--------|--------|
| `self` | Append `stressResponse`, `jealousySecurity` → length **35** |
| `partner` | Append `stressResponse`, `jealousySecurity` → length **21** |
| `relationship` | **Unchanged** |

Update **all** specs that assert self length **33** / partner **19** (Exp-06/07/08/10 blocks + Exp-10 rollout) → **35** / **21**.

Add Expansion-11 membership asserts (keys **are** in self+partner; **not** in relationship).

### 6. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt blocks only — no text-inference |
| Null when unclear | "Prefer null…" + evidence required |
| Score outside range → null | `validateAndClean` |
| Short text → null | Existing sparsity shutdown |
| No keyword heuristics | No substring/tag scoring paths |
| Silence → null | Prefer null; do not invent low/high |
| Jealousy polarity | HIGH = jealous — document in prompts |
| >85% / live Hebrew fixtures | **Story 5** |
| Onboarding UI strings | **Story 4** |

### 7. Shadow mode preserved (locked)

- Keys remain in `SHADOW_SIGNAL_KEYS` only
- `COMPATIBILITY_SIGNAL_KEYS` still **15**
- No tension / chips / promote
- Metadata weights stay document-only

### 8. Tests (agent 1 minimum)

Add to `extraction.service.spec.ts` — `describe('Expansion-11 shadow signals')`:

| Test | Domain | Mock LLM | Expect |
|------|--------|----------|--------|
| High stressResponse (seek closeness) | self | `9` + evidence | `=== 9` |
| Low stressResponse (withdraw) | self | `2` + evidence | `=== 2` |
| Null stressResponse (silence) | self | `null` | null |
| High jealousySecurity (jealous) | self | `9` + evidence | `=== 9` |
| Low jealousySecurity (secure/trusting) | self | `2` + evidence | `=== 2` |
| Null jealousySecurity (silence) | self | `null` | null |
| Out of range | self | `11` on either key | stripped to `null` |
| Partner stressResponse smoke | partner | `8` + evidence | `=== 8` |
| Partner jealousySecurity smoke | partner | `8` + evidence | `=== 8` |

Use README semantic / Hebrew strings in test **names/comments only** — assertions on mocked LLM output. Do **not** add regex fixtures that pretend to score.

Also update `extracted-signals.spec.ts` domain-length + Exp-11 DOMAIN_ALLOWED membership asserts.

Optional (not required): seed `dating-api/data/expansion-11-extraction-fixtures.json` for Story 5 — **do not** run live LLM in Story 2.

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
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-11"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npx jest src/extraction/expansion-10-rollout.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `expansion-11-signal-definitions.ts` with self + partner semantic blocks (§2); keep Story 1 metadata.
2. Wire self block after Exp-10; update self ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§3).
3. Wire partner block after Exp-10 partner; update partner ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§4).
4. Sync `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**35**) and `.partner` (**21**) (§5).
5. Add unit tests (§8); fix domain-length asserts across specs; run commands above.
6. **Do not** touch evaluate layer, text-inference regex, scoring, tension, relationship prompt, Exp-01–10 definition bodies (except DOMAIN length in rollout if needed), onboarding UI, or promote.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-11-stress-security/handoffs/STORY_02_llm_extraction_prompts/`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for Expansion-11 stressResponse and jealousySecurity

Story 2 — self+partner shadow extraction; polarity/axis locks; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for Exp-11 keys
- [ ] No changes to text-inference files for these keys
- [ ] Prompt blocks in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] Self + partner ALLOWED KEYS include both keys; relationship unchanged
- [ ] `DOMAIN_ALLOWED.self === 35`, `.partner === 21`
- [ ] Scale 1–10; null on weak evidence; out-of-range stripped
- [ ] PROTECTED distinctions present (vs `attachmentSecurity` / `emotionalRegulation` / `independence` / Exp-10 repair)
- [ ] **`jealousySecurity` polarity** documented (HIGH = jealous)
- [ ] **`stressResponse` compatibility axis** documented (neither end better)
- [ ] Adjacent SIGNAL RULES upgraded (attachment / independence / emotionalRegulation)
- [ ] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Story 1 metadata exports preserved
- [ ] Expansion-09 interest artifacts untouched
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Story 5:** Live Hebrew fixtures + >85% gate.
- **Story 3:** Tension rules `stress_response_clash`, `jealousy_security_gap`, `both_high_jealousy`.
- **Story 4:** Positive chips (`Support under pressure`; both-low `Secure & trusting`) + i18n + onboarding copy.
- **Correlation risk:** `stressResponse` vs `emotionalRegulation` / `attachmentSecurity`; `jealousySecurity` vs `independence` / `attachmentSecurity` — monitor in Story 5; do not hardcode anti-correlation in Story 2.

---

## Next agent

```text
--agent 1 expansion 11 story 2
```

**Notes:** Mandatory `LLM_FIRST_PRINCIPLE.md`. Extend existing metadata file — do not recreate from scratch. Self **and** partner. Keep shadow / no scoring. Polarity + axis locks are non-negotiable.
