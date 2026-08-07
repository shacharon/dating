# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [README.md — STORY 1: Canonical Taxonomy](../../README.md)  
**Sprint:** sprint-expansion-09-interest-taxonomy  
**Date:** 2026-08-07  
**Status:** complete  

**Depends on:** Expansion-07 interest overlap chips live — see `sprint-expansion-07-profile-gap-signals/handoffs/STORY_04_chips_i18n/agent-3-pm.md`  
**Mode:** Design-only. Add three **interest tags** (not compatibility signals) to the canonical taxonomy. **No** LLM prompt guidance rewrite, overlap-chip preferred list, or i18n in this story.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Note:** These are tags, not scored signals. Do **not** add to `SignalKey` / `COMPATIBILITY_SIGNAL_KEYS` / shadow signal keys.

---

## Summary

- Expansion-09 closes hobby-list gaps: `biking`, `camping`, `nature`.
- Story 1: append/insert three tags into `INTEREST_CANONICAL_TAGS` (**16 → 19**), keep alphabetical order (current style), update display labels in `chips-builder.ts`, add unit asserts.
- Prompt semantic guidance + mocked LLM extraction tests → **Story 2**.
- Overlap preferred tags + i18n → **Story 3**.
- Live fixtures / rollout gate → **Story 4**.
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| `INTEREST_CANONICAL_TAGS` | **16** tags, alphabetical |
| `INTEREST_CANONICAL_TAG_SET` | Derived from array |
| Compatibility scored keys | **15** — interests are orthogonal |
| Shadow signal keys | Unrelated — do not touch |
| `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` | **8** tags in Exp-07 explainability — Story 3 adds new preferred |
| Extraction prompts | Interests as free `string[]` — **no** hard-listed canonical enum in `SELF_EXTRACTOR_PROMPT` today |
| Holy-grail `interest-tags-text.extract.ts` | Separate regex HG path — **out of scope** Story 1 (do not add keyword matchers) |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add 3 tags to `INTEREST_CANONICAL_TAGS` | **In scope** — alphabetical insert |
| Update allowlist / prompt guidance that enumerates tags | **Taxonomy + `INTEREST_LABELS` in Story 1**; full LLM semantic guidance → **Story 2** |
| Unit tests: in set; not in `COMPATIBILITY_SIGNAL_KEYS` | **In scope** |
| Overlap preferred / i18n | **Story 3** |
| Regex keyword matching for interests | **Forbidden** for extraction path; do not expand HG regex extractors in this sprint’s Story 1 |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-interests.interface.ts` | Insert `biking`, `camping`, `nature` alphabetically; length **19** |
| `dating-api/src/evaluate/chips-builder.ts` | Add three entries to `INTEREST_LABELS` |
| `dating-api/src/extraction/extracted-interests.spec.ts` | **Create** (or extend if exists) — membership + length + not scored |
| `handoffs/STORY_01_canonical_taxonomy/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `extraction/extraction.service.ts` prompt text | Story 2 |
| `matches/expansion-07-explainability.ts` preferred tags | Story 3 |
| `dating-ui` i18n | Story 3 |
| `COMPATIBILITY_SIGNAL_KEYS` / `SHADOW_SIGNAL_KEYS` | Must remain untouched |
| `holy-grail-matching/interest-tags-text.extract.ts` | Regex HG path — not this taxonomy story |
| `evaluate/explicit-extended-lists.ts` / enrichment-v2 patterns | Do not add keyword heuristics |
| Live fixtures | Story 4 |

---

## Decisions (do not reverse without discussion)

### 1. Tag names & meanings (locked)

| Tag | Meaning | Distinct from |
|-----|---------|---------------|
| `biking` | Cycling / bike rides (road, mountain, casual) | `gym` (general fitness); `hiking` (on foot) |
| `camping` | Overnight outdoor camping / tenting | `hiking` (day walk); `travel` (general travel) |
| `nature` | Nature appreciation / outdoors broadly (parks, forests, wildlife) | Broader than `hiking`; prefer specific tags when hike/camp/bike are clear |

Exact spellings — lowercase snake-free single tokens matching existing style (`home_life` is the only underscore tag; these three are single words).

### 2. Array order (locked — alphabetical)

Insert into existing alphabetical list:

```typescript
export const INTEREST_CANONICAL_TAGS = [
  'art',
  'beach',
  'biking',
  'books',
  'camping',
  'cooking',
  'dancing',
  'football',
  'gaming',
  'gym',
  'hiking',
  'home_life',
  'movies',
  'music',
  'nature',
  'nightlife',
  'spirituality',
  'travel',
  'yoga',
] as const;
```

`INTEREST_CANONICAL_TAG_SET` auto-updates via existing constructor — no separate edit beyond array.

### 3. Display labels (locked)

In `chips-builder.ts` `INTEREST_LABELS`:

```typescript
  biking: 'Biking',
  camping: 'Camping',
  nature: 'Nature',
```

(Fallback title-case would work, but explicit labels keep admin/UI consistent.)

### 4. Not compatibility signals (locked)

| Assert | Expect |
|--------|--------|
| `COMPATIBILITY_SIGNAL_KEYS` | does **not** contain any of the three |
| `SHADOW_SIGNAL_KEYS` / `OFFICIAL_EXTRACTION_SIGNAL_KEYS` | does **not** contain any of the three |
| `INTEREST_CANONICAL_TAGS.length` | **19** |

### 5. Prompt enumeration (locked)

Story 1 does **not** rewrite extraction prompts. If agent 1 finds a hard-coded 16-tag list elsewhere in extraction (not HG regex), update it to import/`join` from `INTEREST_CANONICAL_TAGS` rather than duplicating — prefer single source of truth. As of baseline audit, `extraction.service.ts` does not hard-list the 16 tags.

### 6. Agent 4

**Skip.** Taxonomy-only; no eligibility/ranking behavior change beyond allowing new interest tag values when present.

---

## Service / module placement

- Taxonomy SoT: `extracted-interests.interface.ts`
- Display labels: `evaluate/chips-builder.ts` (read-only UI chips; no scoring)

---

## Runtime topology

N/A

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/extraction/extracted-interests.spec.ts --runInBand
npm run typecheck
```

Create `extracted-interests.spec.ts`:

| Assert | Detail |
|--------|--------|
| length | `INTEREST_CANONICAL_TAGS.length === 19` |
| membership | `toContain` each of `biking`, `camping`, `nature` |
| set | `INTEREST_CANONICAL_TAG_SET.has(...)` true for all three |
| alphabetical | optional: array equals sorted copy |
| not scored | none of the three in `COMPATIBILITY_SIGNAL_KEYS` |
| existing | still contains `hiking`, `travel`, `gaming`, etc. |

Optional light assert: `INTEREST_LABELS` keys cover all canonical tags (if exporting labels is awkward, skip — chips-builder labels are private; then only interface specs).

---

## E2E verification

N/A

---

## Agent 1 instructions

1. Update `INTEREST_CANONICAL_TAGS` per §2.
2. Add three `INTEREST_LABELS` entries per §3.
3. Add `extracted-interests.spec.ts` per tests section.
4. Do **not** modify extraction prompts, overlap preferred tags, i18n, HG regex extractors, or scoring registries.
5. Run tests; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add biking, camping, nature to interest taxonomy

Story 1 — canonical tags 16→19; not compatibility signals.
```

---

## Agent 2 CR checklist

- [ ] Only taxonomy + labels + specs (+ handoff) changed
- [ ] Tags spelled exactly: `biking`, `camping`, `nature`
- [ ] Alphabetical order preserved; length **19**
- [ ] Not in `COMPATIBILITY_SIGNAL_KEYS` / signal allowlists
- [ ] No prompt / preferred-overlap / i18n / regex-HG drift
- [ ] Specs pass

---

## Open questions / blockers

- None blocking Story 1.
- **Story 2:** Semantic prompt guidance (EN/HE examples as meaning aids only; no keyword matchers); coexistence hiking+camping+nature.
- **Story 3:** Add three to `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` + EN/HE/ES overlap strings.
- **Story 4:** Fixtures + regression on existing 16.

---

## Next agent

```text
--agent 1 expansion 09 story 1
```

**Notes:** Interest tags only — never score keys. Keep alphabetical. Story 2 owns LLM guidance.
