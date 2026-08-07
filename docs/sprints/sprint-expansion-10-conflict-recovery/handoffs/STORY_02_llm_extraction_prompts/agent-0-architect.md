# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-10-conflict-recovery  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_schema_infrastructure/agent-3-pm.md)  
**Mode:** LLM-first semantic extraction for Expansion-10 (`repairSkills`, `forgivenessStyle`). **Shadow only** — still no scoring / tension / chips / promote.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Phase:** Phase 6 — Relationship Psychology

---

## Summary

- Wire Expansion-10 into the **existing single-call extraction pipeline** (`ExtractionService.extract` → domain system prompt → `completeJSON`).
- **Do NOT** invent evaluate-layer extractors — production extraction lives in `extraction.service.ts`.
- Story 1 already created **metadata-only** `expansion-10-signal-definitions.ts` + two `SHADOW_SIGNAL_KEYS`. Story 2 **extends** that file with LLM semantic blocks and wires prompts + `DOMAIN_ALLOWED`.
- Domains: **self + partner** (README lock). **Not** relationship.
- Scale **1–10 or null**. No regex / keyword / text-inference rules. Hebrew-aware **semantic** examples in prompts (not keyword matchers).
- **Critical collision fix:** today’s `conflictStyle` SIGNAL RULES say “repair / de-escalation” — Story 2 **must** upgrade them to **during-conflict** only so they do not swallow Exp-10 recovery/forgiveness.
- Onboarding prompt **copy** remains Story 4; answers already feed the same free-text extractor when present — **no separate pipeline / DTO** in Story 2.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | `repairSkills`, `forgivenessStyle` in `SHADOW_SIGNAL_KEYS`; metadata module exists; `MAX_EVIDENCE_ITEMS === 45`; total extraction **41**; **not** in `COMPATIBILITY_SIGNAL_KEYS` (still **15**) |
| Self `DOMAIN_ALLOWED` | **31** (through `physicalTypePreference`) — Story 2 adds **2 → 33** |
| Partner `DOMAIN_ALLOWED` | **17** — Story 2 adds **2 → 19** |
| Expansion-01–08 Story 2 | Blocks already wired in `SELF_EXTRACTOR_PROMPT` / partner — **do not modify** those definition files |
| Expansion-09 | Interest taxonomy — **orthogonal**; do not touch interest allowlists / guidance |
| Production extraction | `dating-api/src/extraction/extraction.service.ts` |
| LLM call | One `llm.completeJSON` per domain per text block — **not** per-signal calls |
| Scale | **1–10** integers or `null` (`validateAndClean` rejects `<1` or `>10`) |
| Evidence contract | Non-null signal → exact quote + reason (max 8 words) |
| Adjacent collision risk | `conflictStyle` (official), `directness`, `emotionalRegulation`, `attachmentSecurity` |
| `evaluate-llm-prompts.ts` | Not core signal extraction |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Create `expansion-10-signal-definitions.ts` with semantic definitions | **Extend** existing Story 1 metadata file — add LLM blocks; keep promotion meta |
| Wire self + partner; onboarding answers as additional input | **Yes** self+partner. Onboarding = same free-text path when answers exist — **no** new input channel / schema in Story 2. UI copy = **Story 4** |
| Sync `extraction-strict-validation.ts` allowlist | **Yes** — `DOMAIN_ALLOWED` self **33** / partner **19** |
| Unit tests: 2 signals × high/low/null | **Yes** — mocked LLM in `extraction.service.spec.ts` |
| Hebrew regression fixtures | **Story 5** live gate — Story 2 uses **mocked** unit tests only (optional fixture seed OK) |
| >85% agreement | **Story 5** — not Story 2 |
| Scale 0–10 elsewhere | **Use 1–10** — matches extraction stack |
| Keyword / regex heuristics | **Forbidden** — LLM semantic only; README Hebrew strings are prompt examples / Story 5 fixtures, not matchers |
| Evaluate-layer prompts | **Wrong path** — use `extraction.service.ts` |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-10-signal-definitions.ts` | **Extend** — add `EXPANSION_10_SELF_SHADOW_SIGNAL_BLOCK` + `EXPANSION_10_PARTNER_SHADOW_SIGNAL_BLOCK` (keep Story 1 meta exports) |
| `dating-api/src/extraction/extraction.service.ts` | Import both blocks; append self after Exp-08; append partner after Exp-08 partner; add 2 keys to self + partner `ALLOWED KEYS`; add SIGNAL RULES; **upgrade** `conflictStyle` (+ adjacent) SIGNAL RULES |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Add 2 keys to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**31 → 33**) and `.partner` (**17 → 19**) |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-10 shadow signals')` |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Flip Exp-10 “not yet in DOMAIN_ALLOWED” → **must** contain; self length **31 → 33**; partner **17 → 19**; keep Exp-06/07/08 length asserts in sync |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `evaluate/evaluate-llm-prompts.ts` | Not the extraction pipeline |
| `extraction/extraction-text-inference.ts` / `engine/.../text-inference.ts` | **NO regex** for Exp-10 |
| `expansion-01`…`09-*.ts` definition / interest files | Prior sprints — do not edit |
| `compatibility/compatibility-score.ts` | Shadow lock |
| `engine/tension-rules.ts` / `EnrichedSignals` | Story 3 |
| `matches/match-explainability.ts`, i18n, onboarding UI copy | Story 4 |
| `RELATIONSHIP_EXTRACTOR_PROMPT` | Do **not** add Exp-10 keys |
| Live LLM / Hebrew fixture validator script | Story 5 |
| Prisma / backfill / promote | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Single LLM call per domain. Self + partner rich blocks.**

```
Profile analyze → ExtractionService.extract('self' | 'partner', text)
  → SELF_EXTRACTOR_PROMPT (Exp-01..10) OR PARTNER_EXTRACTOR_PROMPT (+ Exp-07/08/10 partner blocks)
  → completeJSON → normalize → validateAndClean → validateExtraction
  → evaluationJson.{self|partner}.signals.{repairSkills|forgivenessStyle}
```

No second pass. No `extractNumericSignal`. No evaluate-layer extraction. No onboarding-specific extractor.

### 2. Extend `expansion-10-signal-definitions.ts` (locked)

Keep existing `EXPANSION_10_SHADOW_SIGNAL_KEYS` / weights / tiers / domains / chip labels.

Append:

```typescript
/**
 * Expansion-10 shadow signal semantic definitions — SELF domain.
 * LLM-first only — no keyword lists for scoring.
 * Hebrew/EN examples illustrate meaning; do not keyword-match.
 */
export const EXPANSION_10_SELF_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-10 Conflict Recovery (extract when evidence exists; NOT used for scoring; 1–10 or null):

- repairSkills: ability and willingness to apologize, take ownership of one's part, and actively reconnect
  AFTER conflict, vs stonewalling, deflecting blame, or avoiding resolution.
  1–2 = rarely apologizes; stonewalls / shuts down after conflict; avoids resolution.
  3–4 = struggles to own mistakes; slow to reconnect.
  5–6 = occasionally repairs; inconsistent.
  7–8 = generally apologizes and reconnects after disagreements.
  9–10 = actively repairs — owns their part, apologizes genuinely, reconnects quickly.
  PROTECTED — distinct from:
    conflictStyle (how they behave DURING disagreement — direct/avoidant/escalating — NOT post-conflict apology/ownership/reconnection);
    directness (communication bluntness / transparency — NOT accountability after a fight).
  "I need space after a fight" alone → prefer null unless clearly framed as chronic avoidance of repair
  (healthy temporary cool-down ≠ automatically low repairSkills).
  Prefer null when conflict aftermath / apology / reconnection is unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני תמיד מתנצל/ת ראשון/ה, גם אם אני חושב/ת שאני קצת צודק/ת".

- forgivenessStyle: tendency to let go of resentment and move forward vs holding grudges and rehashing past issues.
  1–2 = holds grudges a long time; rehashes old conflicts.
  3–4 = slow to forgive; issues linger.
  5–6 = forgives eventually with effort.
  7–8 = forgives fairly quickly; doesn't dwell.
  9–10 = lets go easily; genuinely moves forward without resentment.
  PROTECTED — distinct from:
    attachmentSecurity (general relational closeness/security — NOT specifically how grudges are handled post-conflict);
    emotionalRegulation (managing emotional reactivity IN THE MOMENT under stress — NOT resolution/letting-go over time after the moment).
  Prefer null when grudges / forgiveness / moving on from conflict are unmentioned.
  Hebrew meaning examples (do not keyword-match): "אני לא שומר/ת טינה - ברגע שדיברנו, זה נגמר".

Prefer null over stretched scoring for all Expansion-10 keys.
`;

/**
 * Expansion-10 shadow signal semantic definitions — PARTNER domain.
 * Scores desired partner traits / preferences (what the seeker wants in a partner),
 * not the seeker's own traits. Same scales/PROTECTED distinctions as self.
 */
export const EXPANSION_10_PARTNER_SHADOW_SIGNAL_BLOCK = `
SHADOW SIGNALS — Expansion-10 for PARTNER preferences (NOT used for scoring; 1–10 or null):

Extract when the text states what they want in a partner regarding:
- repairSkills: desired partner ability/willingness to apologize, own their part, and reconnect AFTER conflict
- forgivenessStyle: desired partner tendency to let go of resentment vs hold grudges / rehash

Use the same 1–10 scales and PROTECTED distinctions as Expansion-10 self definitions.
CRITICAL: partner conflictStyle = DURING-disagreement behavior — NOT post-conflict repair (→ repairSkills).
CRITICAL: partner emotional openness / attachment language alone does NOT equal forgivenessStyle.
CRITICAL: partner "calm under stress" alone → emotionalRegulation territory if present elsewhere — NOT forgivenessStyle.
Prefer null over stretched scoring. Do not invent low repair/forgiveness from silence.
`;
```

Agent 1 may tighten wording but must preserve both keys, scales, PROTECTED lines, healthy-space null guidance, and Hebrew-as-examples-only.

### 3. `SELF_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append (comma-separated, after `physicalTypePreference`):

```text
repairSkills, forgivenessStyle
```

2. After `${EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK}`, inject `${EXPANSION_10_SELF_SHADOW_SIGNAL_BLOCK}`.

3. **SIGNAL RULES** — add:

```text
- repairSkills = explicit post-conflict apology / ownership / reconnection vs stonewalling or avoiding resolution (not during-conflict style alone, not bluntness alone)
- forgivenessStyle = explicit letting-go vs holding grudges / rehashing past issues (not attachment closeness alone, not in-the-moment emotional regulation alone)
```

4. **Upgrade adjacent lines** (self) — **required** (today’s `conflictStyle` line wrongly includes “repair”):

```text
- conflictStyle = explicit disagreement handling DURING conflict (direct / avoidant / escalating / de-escalating in the moment) — not post-conflict apology, ownership, or reconnection alone (→ repairSkills), and not grudge/forgiveness pacing alone (→ forgivenessStyle)
- directness = explicit transparency, no secrets, clear communication — not honesty/integrity/"no games" as a core relationship value alone, and not post-conflict ownership/apology alone (→ repairSkills)
- emotionalRegulation = explicit emotional steadiness vs reactivity under stress; calm recovery in the moment (not merely "I'm emotional") — not letting go of grudges over time after conflict (→ forgivenessStyle)
- attachmentSecurity = explicit closeness, fusion, anchor-like bond, inseparable emotional union — not specifically how grudges/resentment are handled post-conflict (→ forgivenessStyle)
```

Do **not** add trigger-phrase keyword lists. Do **not** remove Exp-08 SIGNAL RULE lines.

### 4. `PARTNER_EXTRACTOR_PROMPT` edits (locked)

1. **ALLOWED KEYS** — append the same two keys after `physicalTypePreference`.

2. Inject `${EXPANSION_10_PARTNER_SHADOW_SIGNAL_BLOCK}` after `${EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK}` (before DIRECTION LOCK / HARD SEMANTIC GUARD — keep readable).

3. **SIGNAL RULES** — add partner-framed one-liners for both keys.

4. **Upgrade**:

```text
- conflictStyle = explicit disagreement handling DURING conflict (direct / avoidant / escalating / calm discussion in the moment) — not post-conflict repair/apology alone (→ repairSkills), not forgiveness/grudge pacing alone (→ forgivenessStyle)
```

Optional partner HARD SEMANTIC GUARD note (keep short if added):

```text
- "accountable after fights" / "doesn't hold grudges" -> repairSkills / forgivenessStyle when explicit; do not dump into conflictStyle alone
```

### 5. `DOMAIN_ALLOWED_SIGNAL_KEYS` (locked)

| Domain | Change |
|--------|--------|
| `self` | Append `repairSkills`, `forgivenessStyle` → length **33** |
| `partner` | Append `repairSkills`, `forgivenessStyle` → length **19** |
| `relationship` | **Unchanged** |

Update all specs that assert self length **31** / partner **17** (Exp-06/07/08/10 Story 1 blocks) → **33** / **19**.

Flip Expansion-10 Story 1 test that currently expects keys **not** in `DOMAIN_ALLOWED` to expect they **are** present.

### 6. Validation & confidence (locked — reuse existing)

| Sprint AC | Implementation |
|-----------|----------------|
| LLM-only extraction | Prompt blocks only — no text-inference |
| Null when unclear | "Prefer null…" + evidence required |
| Score outside range → null | `validateAndClean` |
| Short text → null | Existing sparsity shutdown |
| No keyword heuristics | No substring/tag scoring paths |
| Healthy space alone → null | PROTECTED guidance in self block |
| Silence → null | Prefer null; do not invent low |
| >85% / live Hebrew fixtures | **Story 5** |
| Onboarding UI strings | **Story 4** |

### 7. Shadow mode preserved (locked)

- Keys remain in `SHADOW_SIGNAL_KEYS` only
- `COMPATIBILITY_SIGNAL_KEYS` still **15**
- No tension / chips / promote
- Metadata weights stay document-only

### 8. Tests (agent 1 minimum)

Add to `extraction.service.spec.ts` — `describe('Expansion-10 shadow signals')`:

| Test | Domain | Mock LLM | Expect |
|------|--------|----------|--------|
| High repairSkills | self | `9` + evidence | `=== 9` |
| Low repairSkills | self | `2` + evidence | `=== 2` |
| Null repairSkills (no aftermath) | self | `null` | null |
| Null repairSkills (“need space” alone) | self | `null` | null |
| High forgivenessStyle | self | `9` + evidence | `=== 9` |
| Low forgivenessStyle | self | `2` + evidence | `=== 2` |
| Null forgivenessStyle (silence) | self | `null` | null |
| Out of range | self | `11` on either key | stripped to `null` |
| Partner repairSkills smoke | partner | `8` + evidence | `=== 8` |
| Partner forgivenessStyle smoke | partner | `8` + evidence | `=== 8` |

Use README semantic / Hebrew strings in test **names/comments only** — assertions on mocked LLM output. Do **not** add regex fixtures that pretend to score.

Also update `extracted-signals.spec.ts` domain-length + Exp-10 DOMAIN_ALLOWED membership asserts.

Optional (not required): seed `dating-api/data/expansion-10-extraction-fixtures.json` for Story 5 — **do not** run live LLM in Story 2.

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
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-10"
npx jest src/extraction/extracted-signals.spec.ts --runInBand
npm run typecheck
```

Architect: not run.

---

## Agent 1 instructions

1. Extend `expansion-10-signal-definitions.ts` with self + partner semantic blocks (§2); keep Story 1 metadata.
2. Wire self block after Exp-08; update self ALLOWED KEYS + SIGNAL RULES + adjacent upgrades (§3) — **especially `conflictStyle`**.
3. Wire partner block after Exp-08 partner; update partner ALLOWED KEYS + SIGNAL RULES + `conflictStyle` upgrade (§4).
4. Sync `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**33**) and `.partner` (**19**) (§5).
5. Add unit tests (§8); fix domain-length + Exp-10 membership asserts; run commands above.
6. **Do not** touch evaluate layer, text-inference regex, scoring, tension, relationship prompt, Exp-01–09 definition/interest files, onboarding UI, or promote.
7. Write `agent-1-dev.md` under `docs/sprints/sprint-expansion-10-conflict-recovery/handoffs/STORY_02_llm_extraction_prompts/`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for Expansion-10 repairSkills and forgivenessStyle

Story 2 — self+partner shadow extraction; conflictStyle during-vs-after clarification; no scoring impact.
```

---

## Agent 2 CR checklist

- [ ] **Zero** regex/keyword/if-else scoring for Exp-10 keys
- [ ] No changes to text-inference files for these keys
- [ ] Prompt blocks in extraction path (not `evaluate-llm-prompts.ts`)
- [ ] No separate LLM calls added
- [ ] Self + partner ALLOWED KEYS include both keys; relationship unchanged
- [ ] `DOMAIN_ALLOWED.self === 33`, `.partner === 19`
- [ ] Scale 1–10; null on weak evidence; out-of-range stripped
- [ ] PROTECTED distinctions present (vs `conflictStyle` / `directness` / `attachmentSecurity` / `emotionalRegulation`)
- [ ] **`conflictStyle` SIGNAL RULES upgraded** — no longer claim “repair” as conflictStyle alone
- [ ] Healthy-space / silence → prefer null guidance present
- [ ] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [ ] Story 1 metadata exports preserved
- [ ] Expansion-09 interest artifacts untouched
- [ ] Unit tests pass

---

## Open questions / blockers

- None blocking Story 2.
- **Story 5:** Live Hebrew gap fixtures (apologize-first, no-grudge, rare-admit-wrong, old-fights-return, space-after-fight → null) + >85% gate.
- **Story 3:** Tension rules `repair_skills_gap`, `both_low_repair`, `forgiveness_style_gap`.
- **Story 4:** Positive chips + i18n + onboarding prompt copy.
- **Correlation risk:** `repairSkills` vs `conflictStyle`; `forgivenessStyle` vs `emotionalRegulation` / `attachmentSecurity` — monitor in Story 5; do not hardcode anti-correlation in Story 2.

---

## Next agent

```text
--agent 1 expansion 10 story 2
```

**Notes:** Mandatory `LLM_FIRST_PRINCIPLE.md`. Extend existing metadata file — do not recreate from scratch. Self **and** partner. Keep shadow / no scoring. Upgrade `conflictStyle` rules so “repair” lands on `repairSkills`.
