# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [README.md — STORY 4: Testing & Validation](../../README.md)  
**Sprint:** sprint-expansion-09-interest-taxonomy  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 3 agent-3-pm.md](../STORY_03_overlap_chips_i18n/agent-3-pm.md)  
**Mode:** Close Expansion-09 with a **rollout gate** (deterministic specs + optional live LLM interest fixtures). **No** new taxonomy / prompts / preferred-list / i18n features. **No** keyword interest detectors. Tags remain **not** scored signals.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

**Pattern:** Mirror Exp-07 Story 5 shape (integration + optional live script), adapted for **interest tags** (`rawInterests` / `interestsTop3`) instead of shadow signal bands.

---

## Summary

- Stories 1–3 delivered taxonomy (19), LLM guidance + `rawInterests` pipeline, preferred overlap (**11**) + EN/HE/ES.
- Story 4 **validates end-to-end** and documents the rollout checklist as green.
- Deterministic: `compare()` interest-overlap E2E for Exp-09 tags + consolidated rollout-gate asserts.
- Optional live: fixtures JSON + `validate:expansion-09-extraction` (skip without `OPENAI_API_KEY`) — **not a CI hard gate**.
- Agent 4 **skipped**.
- Closes Expansion-09 **engineering gate** when PM marks Done.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| `INTEREST_CANONICAL_TAGS` | **19** (incl. biking, camping, nature) |
| Preferred overlap | **11** |
| Scored keys | **15** — Exp-09 tags ∉ `COMPATIBILITY_SIGNAL_KEYS` / shadow / official |
| Story 2 mocked extraction | Already green — **do not duplicate** full matrix |
| Story 3 picker + UI i18n | Already green — **do not re-implement**; may add thin ES key assert if missing |
| Live LLM scripts | Exp-01–07 exist; **no** Exp-08/09 yet |
| Legacy keyword paths | enrichment-v2 / explicit-extended-lists / HG regex — **do not expand** for Exp-09 |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Fixtures table (4 texts) | **In scope** — fixtures JSON + optional live script; also deterministic mock/regression where noted |
| Rollout gate checklist | **In scope** — assert in `expansion-09-rollout.spec.ts` (or equivalent) |
| Extraction fixtures pass | Deterministic Story 2 already; Story 4 adds **optional live** agreement ≥85% when key present |
| Overlap chips EN/HE/ES | Story 3 done — Story 4 **re-asserts** keys exist (incl. ES) in rollout gate |
| No regression on existing 16 | Assert prior tags still in canonical set; live/regression fixture for gaming/cooking/movies/travel/dancing |
| Still not scored | Assert three tags ∉ scored/shadow/official |
| NO hardcoded pattern matching for interest detection | **Do not** add enrichment/HG/explicit-list keyword rules for biking/camping/nature |
| Live >85% | **Optional** — skip exit 0 without API key (same as Exp-07) |
| Promote tags to signals | **Forbidden** |
| Duplicate Story 2/3 unit matrices | **Forbidden** — thin E2E + gate only |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-engine.spec.ts` | `describe('Expansion-09 interest overlap E2E via compare')` — §2 |
| `dating-api/src/extraction/expansion-09-rollout.spec.ts` | **Create** — rollout gate asserts §3 |
| `dating-api/data/expansion-09-interest-fixtures.json` | **Create** — README fixture table + regression row |
| `dating-api/scripts/validate-expansion-09-extraction.ts` | **Create** — live LLM interest validation §4 |
| `dating-api/package.json` | `"validate:expansion-09-extraction"` script |
| Optional UI: `match-why-section.spec.tsx` or small i18n assert | ES keys for Exp-09 if not already covered (Story 3 has HE; add ES in rollout or UI — one place enough) |
| `handoffs/STORY_04_testing_validation/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| New prompt / taxonomy / preferred-list feature work | Stories 1–3 done |
| `evaluate/enrichment-v2.ts` / explicit-extended-lists / HG interest regex | No keyword expansion |
| `COMPATIBILITY_SIGNAL_KEYS` promote | Forbidden |
| Browser Playwright | Out of pattern |
| Admin match-quality polish | Operator / defer |
| Re-run entire Story 2/3 matrices as new copies | Already green |

---

## Decisions (do not reverse without discussion)

### 1. Integration surface (locked)

Use existing `compare()` + `makeProfile` / `makeProfileWithExpansion07Shadow` (or any helper that accepts `interestsTop3`). Inject shared Exp-09 tags via `interestsTop3` — deterministic, no LLM.

### 2. Match-engine E2E matrix (locked)

Add `describe('Expansion-09 interest overlap E2E via compare')` with **≥4** tests:

| # | Test | Setup | Expect |
|---|------|-------|--------|
| 1 | Shared biking+camping | both `interestsTop3: ['biking','camping']` | `interestOverlapTags` equals `['biking','camping']` (order stable); length ≤ 2 |
| 2 | Shared nature preferred over non-preferred | both `['gaming','nature']` | tags include `nature` first among preferred; length ≤ 2 |
| 3 | Max 2 among three Exp-09 | both `['biking','camping','nature']` | length **2**; subset of the three |
| 4 | Exp-07 regression travel/books | both `['travel','books']` | still `['travel','books']` |

Do **not** add friction/signal asserts here — interests only.

### 3. Rollout gate spec (locked)

Create `dating-api/src/extraction/expansion-09-rollout.spec.ts`:

| Assert | Detail |
|--------|--------|
| Canonical length | `INTEREST_CANONICAL_TAGS.length === 19` |
| Membership | contains biking, camping, nature + prior hobby set (gaming, cooking, dancing, travel, movies, hiking, …) |
| Not scored | none of three in `COMPATIBILITY_SIGNAL_KEYS` |
| Not extraction signals | none in `OFFICIAL_EXTRACTION_SIGNAL_KEYS` / `SHADOW_SIGNAL_KEYS` |
| Preferred length | `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS.length === 11` + contains three |
| Guidance SoT | `INTEREST_CANONICAL_TAGS_PROMPT_LIST` includes three (import from guidance module) |
| Hobby coverage map | static map Games→gaming … Movies→movies all ⊆ canonical (document 8/8) |

**i18n keys:** Prefer asserting via importing UI copies only if path is easy from api package (usually **not**). Instead: document Story 3 UI green + optional thin UI test for ES keys. Agent 1 may add ES key assert in `match-why-section.spec.tsx` (mirror HE).

### 4. Live fixtures + validator (locked)

**File:** `dating-api/data/expansion-09-interest-fixtures.json`

```json
[
  {
    "id": "en-biking-camping",
    "aboutMe": "I love biking and camping",
    "expectedTags": ["biking", "camping"]
  },
  {
    "id": "en-nature-walks",
    "aboutMe": "Nature walks and forests",
    "expectedTagsAnyOf": [["nature"], ["hiking"], ["nature", "hiking"]]
  },
  {
    "id": "he-biking-camping",
    "aboutMe": "אוהב אופניים וקמפינג",
    "expectedTags": ["biking", "camping"]
  },
  {
    "id": "en-existing-hobbies",
    "aboutMe": "Games, cooking, movies, travel, dancing",
    "expectedTags": ["gaming", "cooking", "movies", "travel", "dancing"]
  }
]
```

**Pass rule per fixture:**

- If `expectedTags`: every tag ∈ `extracted.rawInterests` (after pipeline allowlist). Extra tags OK.
- If `expectedTagsAnyOf`: at least one listed combination is fully ⊆ `rawInterests` (handles nature vs hiking ambiguity).

**Script:** `scripts/validate-expansion-09-extraction.ts`

- Mirror Exp-07 bootstrap (`NestFactory` + `ExtractionService.extract('self', …)`).
- No `OPENAI_API_KEY` → log `SKIP` + exit **0**.
- With key: run fixtures; agreement = passes/scored ≥ **0.85**; else exit **1**.
- `package.json`: `"validate:expansion-09-extraction": "ts-node --project tsconfig.json scripts/validate-expansion-09-extraction.ts"`

**CI:** Do not fail CI without key. Operator may run live gate manually.

### 5. Legacy keyword paths (locked — awareness only)

Document in handoff / PM notes (no code change required):

- `enrichment-v2` historically maps pattern `biking` → value `cycling` (non-canonical).
- Exp-09 LLM path emits canonical `biking`.
- Story 4 does **not** fix enrichment keyword maps (would be hybrid/keyword expansion). Future cleanup optional.

### 6. Agent 4

**Skip.** Validation + optional live script only.

### 7. Sprint close (agent 3)

When engineering gate met, PM marks Story 4 Done + README DoD checkboxes + Coverage 8/8.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/matches/match-engine.spec.ts --runInBand -t "Expansion-09"
npx jest src/extraction/expansion-09-rollout.spec.ts --runInBand
npx jest src/extraction/extracted-interests.spec.ts src/extraction/extraction-normalization.interest.spec.ts --runInBand
npm run typecheck
# optional live (needs key):
npm run validate:expansion-09-extraction

cd ../dating-ui
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx
```

---

## E2E verification

N/A Agent 4. Optional live script is the live extraction smoke.

---

## Agent 1 instructions

1. Add match-engine Exp-09 interest E2E per §2.
2. Create `expansion-09-rollout.spec.ts` per §3.
3. Create fixtures JSON + validate script + package.json entry per §4.
4. Optional: ES i18n key assert in UI spec.
5. Do **not** add keyword interest detectors or promote tags to signals.
6. Run deterministic tests; run live script if key available (document SKIP if not).
7. Write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
test(expansion-09): rollout gate and interest fixture validator

Story 4 — compare() overlap E2E, gate asserts, optional live LLM.
```

---

## Agent 2 CR checklist

- [ ] Match-engine Exp-09 interest E2E ≥4 cases; max-2 preserved
- [ ] Rollout gate covers length 19, preferred 11, not scored
- [ ] Fixtures match README table; nature ambiguity via `expectedTagsAnyOf`
- [ ] Live script skips without API key; ≥85% when run
- [ ] No keyword / HG / enrichment expansion; no signal promote
- [ ] Specs + typecheck pass

---

## Open questions / blockers

- None blocking Story 4.
- Live agreement depends on operator API key — engineering close allowed with SKIP + deterministic green.

---

## Next agent

```text
--agent 1 expansion 09 story 4
```

**Notes:** Close the sprint with validation only. Tags ≠ signals. LLM-first — no new keyword interest matching.
