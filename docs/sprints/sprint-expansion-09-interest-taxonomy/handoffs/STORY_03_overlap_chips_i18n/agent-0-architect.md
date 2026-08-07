# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [README.md — STORY 3: Interest Overlap Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-09-interest-taxonomy  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_guidance/agent-3-pm.md)  
**Mode:** Display-only — extend interest-overlap preferred tags + EN/HE/ES copy for `biking` / `camping` / `nature`. **No** extraction prompt changes, **no** scoring / signal keys, **no** new UI component (reuse Exp-07 `interestOverlapTags` renderer).

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`  
**Note:** Still interest tags, not compatibility signals. Overlap chips use **normalized tag intersection** only — do not add keyword interest matching.

---

## Summary

- Story 1–2 delivered taxonomy + LLM guidance + `rawInterests` pipeline. Story 3 surfaces the three new tags in **"why we matched"** interest-overlap chips.
- Extend `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` **8 → 11**; add i18n strings; extend picker/UI specs.
- Max-2 picker behavior unchanged (`pickInterestOverlapTags`).
- Agent 4 **skipped**.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Canonical tags | **19** (incl. Exp-09 three) |
| `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` | **8**: books, travel, hiking, movies, cooking, music, gym, beach |
| `pickInterestOverlapTags` | Preferred membership first (order of shared), then rest; slice **2** |
| UI | `match-why-section.tsx` already renders `interestOverlapTags` via `browse.interestOverlap[tag]` + fallback |
| i18n type | `interestOverlap: Record<string, string>` — no type change required |
| Scored keys | **15** — untouched |
| Extraction / prompts | Story 2 done — **do not** re-edit unless bugfix |

---

## README reconciliation (locked overrides)

| Sprint README says | As-built lock |
|--------------------|---------------|
| Add 3 tags to preferred list | **In scope** — append `biking`, `camping`, `nature` (**8 → 11**) |
| i18n EN/HE/ES exact README strings | **In scope** — use README table verbatim |
| UI already renders — verify | **In scope** — extend `match-why-section.spec.tsx` (and backend picker specs) |
| Max-2 picker still works | **In scope** — add asserts that preferred Exp-09 tags win over non-preferred; length ≤ 2 |
| Keyword matching for interests | **Forbidden** |
| Live extraction fixtures | **Story 4** |
| Change `CHIP_EVIDENCE_KEYS` / signal chips | **Out of scope** — interest chips are outside signal chip registry |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-07-explainability.ts` | Append 3 tags to `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` |
| `dating-api/src/matches/expansion-07-explainability.spec.ts` | Preferred Exp-09 pick + max-2 asserts |
| `dating-ui/src/lib/i18n/en.ts` | Add 3 `interestOverlap` entries |
| `dating-ui/src/lib/i18n/he.ts` | Add 3 `interestOverlap` entries |
| `dating-ui/src/lib/i18n/es.ts` | Add 3 `interestOverlap` entries |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | Render Exp-09 tags with EN copy |
| Optional: `dating-api/src/matches/match-explainability.spec.ts` | One case with shared `biking`/`camping` if easy |
| `handoffs/STORY_03_overlap_chips_i18n/agent-1-dev.md` | Created by agent 1 |

### Explicitly out of scope

| Path | Why |
|------|-----|
| `extraction/*` prompts / guidance | Story 2 done |
| `holy-grail-matching/interest-tags-text.extract.ts` | Regex HG |
| `evaluate/enrichment-v2.ts` / explicit-extended-lists | Keyword paths |
| `COMPATIBILITY_SIGNAL_KEYS` / shadow keys | Untouched |
| `match-why-section.tsx` layout rewrite | Already renders; only verify via tests unless a bug appears |
| Live LLM fixtures / rollout gate | Story 4 |
| Admin match-quality polish | Out of scope |

---

## Decisions (do not reverse without discussion)

### 1. Preferred tag list (locked)

Append (do **not** reorder existing 8):

```typescript
export const INTEREST_OVERLAP_CHIP_PREFERRED_TAGS = [
  'books',
  'travel',
  'hiking',
  'movies',
  'cooking',
  'music',
  'gym',
  'beach',
  'biking',
  'camping',
  'nature',
] as const;
```

`PREFERRED_TAG_SET` auto-updates via existing constructor. Length **11**.

Picker order remains: among shared tags, preferred members first (stable shared order), then non-preferred; **max 2**. Membership in the array is what matters — array position among preferred does not reorder shared hits.

### 2. i18n copy (locked — exact README)

Under `matches.list.browse.interestOverlap` in **en / he / es**:

| Tag | EN | HE | ES |
|-----|----|----|-----|
| `biking` | You both enjoy biking | שניכם נהנים מרכיבה על אופניים | A ambos les gusta andar en bici |
| `camping` | You both enjoy camping | שניכם נהנים מקמפינג | A ambos les gusta acampar |
| `nature` | You both love nature | שניכם אוהבים טבע | A ambos les encanta la naturaleza |

Keep existing 8 entries unchanged. No `types.ts` change (`Record<string, string>`).

### 3. UI (locked)

- No structural change to `match-why-section.tsx` unless a bug blocks rendering.
- Fallback `You both enjoy ${tag}` remains for non-i18n tags.
- `data-testid="match-why-interest-chips"` unchanged.

### 4. Scoring / extraction (locked)

| Layer | Impact |
|-------|--------|
| Compatibility / scored keys | **None** |
| Extraction prompts | **None** |
| `interestOverlapTags` DTO | Unchanged shape; new preferred membership only |
| Positive signal chips / `CHIP_EVIDENCE_KEYS` | **None** |

### 5. Agent 4

**Skip.** Display + i18n only; no eligibility/ranking change.

---

## Tests / verification (agent 1)

```bash
cd dating-api
npx jest src/matches/expansion-07-explainability.spec.ts --runInBand -t "pickInterestOverlapTags"
# optional:
npx jest src/matches/match-explainability.spec.ts --runInBand -t "interestOverlap"
npm run typecheck

cd ../dating-ui
npx jest src/app/dating/me-matches/match-why-section.spec.tsx --runInBand -t "interest overlap"
# or full file if filter awkward
```

### Backend matrix (`pickInterestOverlapTags`)

| Case | Input shared | Expect |
|------|--------------|--------|
| Exp-09 preferred wins | `['gaming', 'biking']` | `['biking', 'gaming']` (biking preferred first) |
| Two Exp-09 preferred | `['camping', 'nature', 'gaming']` | `['camping', 'nature']` (max 2; gaming dropped) |
| Cap still 2 | `['biking', 'camping', 'nature']` | length **2**; first two in shared order among preferred |
| Existing regression | `['travel', 'books', 'xyz']` | still `['travel', 'books']` |

Optional explainability: `sharedInterests` including `biking` → `interestOverlapTags` includes `biking`.

### Frontend matrix

| Case | `interestOverlapTags` | Expect |
|------|----------------------|--------|
| Exp-09 EN | `['biking', 'camping']` | testid present; texts match EN i18n strings |
| Nature EN | `['nature']` | `You both love nature` |

HE/ES: optional light assert via `getCopy('he')` / `getCopy('es')` that map keys exist — or rely on static object entries + EN render test. Prefer at least one HE or key-exists assert if cheap.

---

## E2E verification

N/A — Agent 4 skipped. Live pair browse QA → Story 4 / operator.

---

## Agent 1 instructions

1. Append three tags to `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` per §1.
2. Add EN/HE/ES i18n entries per §2 (exact strings).
3. Extend picker + match-why specs per tests section.
4. Do **not** touch extraction, HG regex, enrichment, scored keys, or chip evidence registries.
5. Run tests; write `agent-1-dev.md`. Do not commit unless user asks.

Suggested commit:

```
feat(matches): prefer biking, camping, nature on interest overlap chips

Story 3 — preferred tags 8→11 + EN/HE/ES overlap copy.
```

---

## Agent 2 CR checklist

- [ ] Preferred list length **11**; tags spelled exactly `biking`, `camping`, `nature`
- [ ] Existing 8 preferred tags unchanged / not reordered
- [ ] i18n EN/HE/ES strings match README exactly
- [ ] Max-2 picker specs cover Exp-09 preferred behavior
- [ ] UI spec renders new tags with i18n copy
- [ ] No extraction / HG / enrichment / scored-key / CHIP_EVIDENCE drift
- [ ] Specs + typecheck pass (api + ui as touched)

---

## Open questions / blockers

- None blocking Story 3.
- **Story 4:** Live fixtures, regression on prior 16 tags, rollout gate checklist.

---

## Next agent

```text
--agent 1 expansion 09 story 3
```

**Notes:** Display-only. Tags ≠ scored signals. Reuse Exp-07 overlap chip pipeline — only preferred set + i18n.
