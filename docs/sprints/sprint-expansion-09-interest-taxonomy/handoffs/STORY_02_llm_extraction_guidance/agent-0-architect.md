# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [README.md — STORY 2: LLM Extraction Guidance](../../README.md)  
**Sprint:** sprint-expansion-09-interest-taxonomy  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 1 agent-3-pm.md](../STORY_01_canonical_taxonomy/agent-3-pm.md)  
**Mode:** LLM-first **interest tag** guidance (not scored signals). Teach the extractor to map free text → canonical tags `biking` / `camping` / `nature` (+ existing 16). **No** overlap preferred list / i18n (Story 3). **No** live fixture gate (Story 4).

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Note:** Interest tags remain orthogonal to `COMPATIBILITY_SIGNAL_KEYS` / shadow keys. Do **not** add tags to signal allowlists.

---

## Summary

- Story 1 already has **19** canonical tags. Story 2 owns **prompt semantic guidance** + **preserving LLM interest arrays** through the extraction pipeline so mocked tests can assert tags.
- Replace Title-Case free-form examples (`"Nature"`, `"Running"`) with **lowercase canonical ids** from `INTEREST_CANONICAL_TAGS`.
- Hebrew/EN strings in prompts are **meaning aids only** — never keyword/regex matchers on profile text.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Story 1 | `INTEREST_CANONICAL_TAGS.length === 19`; tags in `INTEREST_CANONICAL_TAG_SET`; labels in `chips-builder.ts`; **not** scored |
| Self/partner/relationship prompts | `INTERESTS:` section asks for `interests: string[]`; example still `"I like nature" -> "Nature"` |
| `ExtractedSignals.rawInterests` | Optional `string[]` exists on type — **not populated today** by `normalizeRawExtraction` / `validateAndClean` (LLM `interests` dropped) |
| `pickTopInterests` | Prefers enrichment → extended → `result.self?.rawInterests` — so populating `rawInterests` unblocks LLM path without touching scored signals |
| Enrichment / `explicit-extended-lists` / HG regex | Legacy keyword/phrase paths — **do not expand** for Exp-09 tags in Story 2 |
| `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` | Still **8** — Story 3 |
| Scored keys | Still **15** |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Update interest extraction prompt / canonical tag list | **In scope** — inject SoT list + Exp-09 distinctions into all three domain `INTERESTS:` sections |
| Unit tests with mocked LLM | **In scope** — `extraction.service.spec.ts` `describe('Expansion-09 interest tags')` |
| Hebrew fixtures: אופניים, קמפינג, אוהב טבע | **Mocked** profile texts + mocked LLM responses in Story 2; **live** LLM / rollout gate → **Story 4** |
| LLM-only extraction | **Yes** for this path — no new regex/keyword interest detectors |
| Null/omit when unclear | **Yes** — prefer empty / omit over inventing tags |
| Coexistence hiking + camping + nature | **Yes** — multi-tag when all explicit |
| Preserve interests in pipeline | **Required** — otherwise mocked extract cannot assert AC (baseline drops `interests`) |
| Field name `interests` vs `rawInterests` | Prompt may keep `interests` for backward-compat wording; normalizer accepts **`interests` OR `rawInterests`** → stores on `ExtractedSignals.rawInterests` |
| Expand HG / enrichment / explicit-extended-lists | **Forbidden** this story (LLM-first; Story 4 may revisit) |
| Overlap preferred + i18n | **Story 3** |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-09-interest-guidance.ts` | **Create** — `EXPANSION_09_INTEREST_GUIDANCE_BLOCK` (+ optional shared helper to build canonical-list line from SoT) |
| `dating-api/src/extraction/extraction.service.ts` | Import block; replace/expand `INTERESTS:` in **self + partner + relationship** prompts; fix nature example → canonical `nature` |
| `dating-api/src/extraction/extraction-normalization.ts` | Parse `interests` / `rawInterests` string arrays into `ExtractedSignals.rawInterests` (technical only) |
| `dating-api/src/extraction/extraction.service.ts` (`validateAndClean`) | Allowlist-filter / normalize `rawInterests` (§4) |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-09 interest tags')` (§8) |
| Optional: `dating-api/src/extraction/extraction-normalization.spec.ts` or extend existing | Unit assert parse + allowlist if cleaner than only service specs |
| `handoffs/STORY_02_llm_extraction_guidance/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `matches/expansion-07-explainability.ts` preferred tags | Story 3 |
| `dating-ui` i18n | Story 3 |
| `holy-grail-matching/interest-tags-text.extract.ts` | Regex HG — do not expand |
| `evaluate/explicit-extended-lists.ts` | Keyword lists — do not add biking/camping/nature |
| `evaluate/enrichment-v2.ts` / v3 / v4 phrase interests | Keyword/phrase — do not expand |
| `COMPATIBILITY_SIGNAL_KEYS` / `SHADOW_SIGNAL_KEYS` / `DOMAIN_ALLOWED` | Untouched |
| Live LLM validation script / >85% gate | Story 4 |
| Prisma / promote / scoring | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Integration pattern (locked)

**Same single LLM call per domain.** Interests remain a sibling array on the JSON proposal — not a second LLM call, not evaluate-layer extractors.

```
ExtractionService.extract(domain, text)
  → domain system prompt (INTERESTS + Exp-09 guidance)
  → completeJSON
  → normalizeRawExtraction (signals + rawInterests)
  → validateAndClean (signal allowlist + interest canonical allowlist)
  → ExtractedSignals.rawInterests?: string[]  // canonical lowercase tags only
```

### 2. New guidance module (locked)

Create `dating-api/src/extraction/expansion-09-interest-guidance.ts`:

```typescript
import { INTEREST_CANONICAL_TAGS } from './extracted-interests.interface';

/** Comma-separated SoT list for prompts — never duplicate tag spellings by hand. */
export const INTEREST_CANONICAL_TAGS_PROMPT_LIST =
  INTEREST_CANONICAL_TAGS.join(', ');

/**
 * Expansion-09 interest tag semantic guidance.
 * LLM-first only — examples illustrate meaning; do not keyword-match.
 * Tags are NOT compatibility signals.
 */
export const EXPANSION_09_INTEREST_GUIDANCE_BLOCK = `
INTEREST TAG RULES (canonical ids only — NOT scored signals):
- Output interests as lowercase tags from this allowlist only:
  ${/* interpolated at module load via INTEREST_CANONICAL_TAGS_PROMPT_LIST */}
- Prefer omit / [] when hobby is unclear or not in the allowlist — do not invent tags.
- Multiple tags allowed when clearly present (coexistence OK).
- Distinctions (Expansion-09):
  - biking: cycling / bike rides (road, mountain, casual). ≠ gym (general fitness); ≠ hiking (on foot).
    Meaning examples (do not keyword-match): "I love cycling", "mountain bike weekends", "אופניים".
  - camping: overnight outdoor camping / tenting. ≠ hiking (day walk); ≠ travel (hotels / general trips).
    Meaning examples: "camping trips", "tent under the stars", "קמפינג".
  - nature: nature appreciation / outdoors broadly (parks, forests, wildlife). Prefer hiking/camping/biking when those are specifically stated; add nature when outdoors love is clear beyond a single activity.
    Meaning examples: "love nature / forests / wildlife", "אוהב טבע".
- Map free-text hobbies to the closest canonical id semantically (e.g. "I like nature" → "nature").
- Do not emit Title Case or free-form labels ("Nature", "Running") — only allowlist ids.
`;
```

Implement so the allowlist line uses `INTEREST_CANONICAL_TAGS_PROMPT_LIST` (template literal interpolation), not a hand-copied 19-tag string.

### 3. Prompt wiring (locked)

In `extraction.service.ts`, for **all three** domain prompts (`SELF`, `RELATIONSHIP`, `PARTNER`):

1. Import `EXPANSION_09_INTEREST_GUIDANCE_BLOCK`.
2. Replace the short `INTERESTS:` bullets with guidance that:
   - Still says extract only **explicit** hobbies/passions (do not invent from vibe).
   - Appends `${EXPANSION_09_INTEREST_GUIDANCE_BLOCK}`.
   - Removes obsolete examples:
     - `"I like nature" -> "Nature"` → covered by guidance → `nature`
     - `"I'm a runner" -> "Running"` → **delete** (`running` ∉ canonical list; omit if no allowlist match)
3. Output JSON line may keep `"interests": []` for continuity; document that pipeline maps it to `rawInterests`. Optionally mention both names in INTERESTS section: `interests` (alias) / prefer canonical tag strings.

Do **not** modify Exp-01–08 signal blocks or `ALLOWED KEYS` lists.

### 4. Technical interest normalization (locked)

**Allowed:** post-LLM allowlist cleanup (same class as signal-key allowlisting).  
**Forbidden:** scanning profile text with regex/keywords to invent tags.

In `normalizeRawExtraction`:

- Read `obj.rawInterests` if array; else fall back to `obj.interests` if array.
- Keep only strings; trim; drop empties; store as `rawInterests` on returned `ExtractedSignals` (pre-clean).

In `validateAndClean`:

- For each string: `trim` → `toLowerCase` → replace spaces with `_` only if needed for `home_life` style (canonical tags are already snake or single token — prefer exact set membership after `toLowerCase().trim()`; if `"home life"` → try `home_life` via `\s+` → `_`).
- Keep only members of `INTEREST_CANONICAL_TAG_SET`.
- Dedupe preserving order.
- Cap at **10** (aligns with v2 schema max).
- Unknown / non-canonical → drop (log optional debug; no invent).

Do **not** map synonyms in code (`cycling` → `biking`) — that is LLM semantic job. Code only accepts exact canonical ids (after case/underscore normalize).

### 5. Domains (locked)

Wire guidance on **self + partner + relationship** (all three already have INTERESTS sections). No domain-specific Exp-09 signal keys.

### 6. Agent 4

**Skip.** Prompt + allowlist preservation only; no eligibility/ranking change beyond storing new tag values when LLM emits them.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-09"
npx jest src/extraction/extracted-interests.spec.ts --runInBand
npm run typecheck
```

### §8 — `describe('Expansion-09 interest tags')` matrix

Extend `mockExtractionResponse` (or local helper) so mocks can include `interests` / `rawInterests`.

| Case | Mock LLM interests | Assert on `extract('self', text)` |
|------|--------------------|-----------------------------------|
| Biking EN | `['biking']` | `rawInterests` includes `biking` |
| Camping EN | `['camping']` | includes `camping` |
| Nature EN | `['nature']` | includes `nature` (not `"Nature"`) |
| Coexistence | `['hiking','camping','nature']` | all three present |
| Hebrew fixtures (mocked) | LLM returns `['biking']` / `['camping']` / `['nature']` for texts containing אופניים / קמפינג / אוהב טבע | tags preserved (tests prove pipeline; LLM mapping is mocked) |
| Non-canonical dropped | `['Nature','Running','biking']` | only `biking` (case-normalize Nature→nature if exact after lower; `"Nature".toLowerCase()==='nature'` **kept**; `Running` dropped) |
| Unclear → empty | `[]` | `rawInterests` empty / undefined OK |
| Prompt contains guidance | spy `completeJSON` system arg | includes `biking`, `camping`, `nature` and `INTEREST TAG RULES` (or distinctive phrase) |
| Not signals | — | `COMPATIBILITY_SIGNAL_KEYS` unchanged; no new shadow keys |

**Clarification on `"Nature"`:** after `toLowerCase()` it becomes `nature` and **is kept**. `"Running"` has no canonical match → **dropped**.

Hebrew cases: pass realistic HE profile strings as `text` for documentation, but **mock** JSON interests — do not call live LLM in Story 2.

Optional: assert SYSTEM prompt no longer contains `-> "Nature"` or `-> "Running"`.

---

## E2E verification

N/A — Agent 4 skipped. Live Hebrew extraction agreement → Story 4.

---

## Agent 1 instructions

1. Create `expansion-09-interest-guidance.ts` per §2.
2. Wire block into all three domain `INTERESTS:` sections; remove Title-Case / Running examples per §3.
3. Preserve + allowlist-filter interests in `normalizeRawExtraction` + `validateAndClean` per §4.
4. Add Expansion-09 specs per §8.
5. Do **not** touch preferred-overlap tags, i18n, HG regex, enrichment phrases, or signal registries.
6. Run tests; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM interest guidance for biking, camping, nature

Story 2 — canonical tag prompt + preserve rawInterests via allowlist.
```

---

## Agent 2 CR checklist

- [ ] Guidance module uses `INTEREST_CANONICAL_TAGS` SoT (no hand-duplicated 19-list drift)
- [ ] All three domain prompts updated; obsolete Nature/Running Title-Case examples gone
- [ ] No regex/keyword interest invent from profile text
- [ ] `rawInterests` populated + allowlist-filtered; max 10; case-normalized
- [ ] Specs cover EN tags, coexistence, HE mocked texts, non-canonical drop, prompt contains guidance
- [ ] No preferred-overlap / i18n / HG / enrichment / signal-key drift
- [ ] Specs + typecheck pass

---

## Open questions / blockers

- None blocking Story 2.
- **Story 3:** Add three tags to `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` + EN/HE/ES overlap copy.
- **Story 4:** Live fixtures / regression on prior 16 / rollout gate; decide whether legacy keyword interest paths stay untouched forever.

---

## Next agent

```text
--agent 1 expansion 09 story 2
```

**Notes:** Mandatory `LLM_FIRST_PRINCIPLE.md`. Tags ≠ scored signals. Examples in prompts are semantic aids only. Preserve interests through normalize/validate so mocked extract asserts work.
