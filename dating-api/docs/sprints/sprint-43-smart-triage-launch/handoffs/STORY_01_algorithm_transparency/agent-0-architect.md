# Handoff: Agent 0 — Architect — Sprint 43 Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_algorithm_transparency.md](../../STORY_01_algorithm_transparency.md)  
**Sprint:** sprint-43-smart-triage-launch  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** Backend + frontend. **Skip Agent 4** (no eligibility / preference / ranking / score-formula change).

---

## Summary

Ship **trust UI** that explains a match % with an expandable per-match breakdown + a public explainer page. Data is **mapped from existing compare internals** — no new LLM, no ranking changes.

**Reject** the story’s sample “Life Goals 40% / Personality 40% / Interests 20%” as the algorithm. Real blend (`COMPATIBILITY_BLEND_WEIGHTS` in `engine/scoring.ts`) is **0.28 aToB + 0.28 bToA + 0.24 relationshipFit + 0.12 valuesAlignment + 0.08 interestAlignment**, then coverage / friction / caps. Product copy must stay honest.

---

## Baseline facts (verified)

| Fact | Detail |
|------|--------|
| Public list/detail DTOs | Score, `priorityTier` (list), `explainability` chips, `whyTldr` (list), `matchNarrative` (detail), `recommendation` — **no** component breakdown |
| Compare result | `CompareResultDto`: `aToB`, `bToA`, `relationshipStyle` (= relationshipFit), `valuesAlignment`, `interestAlignment`, `finalScore`, `friction`, `tensionMatrix`, `alignments`, `explainability` |
| Signal breakdown | `BreakdownEntry[]` computed in pipeline and used by `buildMatchExplainability` — **not** serialized on `CompareResultDto` today |
| Chip labels | `POSITIVE_CHIP_BY_SIGNAL` / `TENSION_CHIP_BY_ID` in `match-explainability.ts` |
| Signal tiers | `TIER1_KEYS` (values), `TIER2_KEYS` (personality), `TIER3_KEYS` (lifestyle) in `compatibility-score.ts` |
| Priority thresholds | HIGH ≥ 85, GOOD ≥ 70 (`match-priority.ts`) — UI + API aligned |
| Detail UI | `MatchDetailContent` — narrative / takeaway / shared interests / caution; **intentionally no score badge** (`match-detail-score` absent) |
| Browse | `%` badge + expandable WHY (`whyTldr` + chips); priority section copy exists; HIGH has description only |
| Explainer route | **None** — no `/about/algorithm`; public legal pages live under `dating-ui/src/app/(public)/` |
| Analytics pattern | `emitProductLog` (opener events) — reuse for breakdown / explainer |

---

## Decision 1 — Surface & placement (locked)

| Surface | In scope? |
|---------|-----------|
| **Match detail** expandable “How we calculated this” | **Yes** — primary |
| **Browse list cards** full breakdown | **No** — keep list lean (already has WHY + chips + %) |
| **Public `/about/algorithm`** | **Yes** — “Learn more” target |
| Priority section / WHY footer link → explainer | **Yes** — secondary entry (copy link only) |

**UI pattern:** Collapsed by default (same spirit as browse WHY). Place **below** narrative / takeaway and shared-interests, **above** caution / analyzedAt in `MatchDetailContent` (or sibling slot from detail page).

**Score on detail:** Breakdown header may show `{matchScore}%` **inside the expanded panel only**. Do **not** reintroduce a permanent detail score badge (prior product lock).

---

## Decision 2 — Reject story blend weights / sample DTO (locked)

Story draft claims Life Goals / Personality / Interests at 40/40/20 and a nested DTO shaped like that.

| Verdict | Reason |
|---------|--------|
| **Reject as algorithm truth** | Would mis-teach users; fails CR “scores match engine” |
| **Keep story UX shape** (3 positive sections + optional challenges) | Familiar; maps to signal tiers + interests |

**Honesty rule (required copy):** Section %s are **component / derived scores**, not blend weights and not an average that equals `finalScore`. Header / microcopy: e.g. “What stood out behind this score” — not “92% = average of these.”

Explainer page documents the **real** factors in plain language (no raw weight decimals required — see Decision 5).

---

## Decision 3 — Product buckets ↔ engine (locked)

Build a pure mapper (no Nest) from compare internals → product DTO.

| UI section | Label (EN) | Score source | Signals / body |
|------------|------------|--------------|----------------|
| `values` | Life goals & values | `valuesAlignment` (0–100, uncapped display OK) | Top **3** `BreakdownEntry` in `TIER1_KEYS` by `pairScore` desc |
| `personality` | Personality | Round mean of present `TIER2_KEYS` `pairScore` × 10 → 0–100; omit section if no TIER2 present | Top **3** TIER2 entries |
| `interests` | Shared interests | `interestAlignment` (0–100) | Shared tags array (max **8** display); if none, omit body tags but keep score if compare ran |
| `challenges` | Things to watch | **No numeric %** (do not invent story’s “64%”) | Top **3** `tensionMatrix` by penalty (plain label via `TENSION_CHIP_BY_ID` or `explain`); include only when `friction >= 3` **and** ≥1 entry |

**Signal row fields (locked):**

```ts
{
  key: string;           // SignalKey or tension id (stable)
  label: string;         // POSITIVE_CHIP_BY_SIGNAL / tension chip — plain language
  match: 'high' | 'medium' | 'low';  // from pairScore: ≥7 high, ≥4 medium, else low (pairScore is 0–10)
  yourBand?: 'Low' | 'Medium' | 'High';  // self 1–10 → bands: ≤3 / ≤6 / else
  theirBand?: 'Low' | 'Medium' | 'High';
}
```

Reuse chip vocabulary — **do not** invent “Both want 2+ children” unless that text already exists in explainability / tags. Interests use **actual shared tags**. Challenges use existing tension copy, not LLM.

**Out of per-match panel (explainer only):** explicit aToB / bToA / relationshipStyle weight story. Optional one-line under header: “Also includes how you fit each other’s preferences and relationship style.”

---

## Decision 4 — API shape & build site (locked)

**Build once in the compare pipeline** (same place explainability is built):

- New pure module: `dating-api/src/matches/match-compatibility-breakdown.ts` (+ spec)
- Call from `compare-stages/assemble-result.ts` with `breakdown`, scores, `friction`, `tensionMatrix`, `sharedInterests`
- Attach `compatibilityBreakdown` on `CompareResultDto` (additive)

**Product DTO (detail only):**

```ts
// On MeMatchDetailDto — omit on list / MeMatchItemDto
compatibilityBreakdown?: CompatibilityBreakdownDto | null;
```

```ts
export type CompatibilityBreakdownDto = {
  finalScore: number; // same as matchScore / CompareResultDto.finalScore
  values: BreakdownSectionDto;
  personality?: BreakdownSectionDto; // omit if no TIER2 signals
  interests: InterestsSectionDto;
  challenges?: ChallengesSectionDto; // omit when rule fails
};

export type BreakdownSectionDto = {
  score: number; // 0–100
  signals: BreakdownSignalDto[]; // ≤3
};

export type InterestsSectionDto = {
  score: number;
  shared: string[]; // ≤8
  sharedCount: number; // full shared count before display cap
};

export type ChallengesSectionDto = {
  areas: Array<{ id: string; label: string; note?: string }>; // ≤3
};
```

`MeMatchesService` detail path: forward from `compareWithStatus` when scored; **undefined/null** on guards / unscored (UI hides control).

**Do not** bump Redis `MATCH_LIST_CACHE_VERSION` — list payload unchanged.

**No Prisma migration** — deterministic from compare; do not cache breakdown separately.

---

## Decision 5 — `/about/algorithm` (locked)

| Item | Lock |
|------|------|
| Route | `dating-ui/src/app/(public)/about/algorithm/page.tsx` → URL `/about/algorithm` |
| Auth | Public (like privacy/terms) |
| Layout | App shell / simple public page consistent with `(public)` — not a legal markdown dump unless helpful; prefer structured sections + i18n |
| Content | Plain language: what we look at (mutual preference fit, relationship style, life goals & values, interests); how friction / “things to watch” can lower the score; priority tiers HIGH ≥85 / GOOD 70–84 / OTHER &lt;70; why we show challenges |
| Weights | **Do not** print 40/40/20. Prefer qualitative (“largest part…”, “also…”) **or** rounded real blend: ~half mutual fit (both directions), ~a quarter relationship style, rest values + interests — sourced from `COMPATIBILITY_BLEND_WEIGHTS` |
| i18n | EN + ES + HE keys under a dedicated namespace (e.g. `algorithmExplainer.*`) |

---

## Decision 6 — Visual / UX (locked)

| Item | Lock |
|------|------|
| Expand control | Text button: “How we calculated this” (+ optional score when expanded title “How we calculated {n}%”) |
| Strong sections | Emerald accent (align with HIGH / opener — **not** indigo) |
| Challenges | Amber (align with existing `recommendation.caution`) |
| Emoji | **No** ✅/⚠️ emoji in UI chrome (story mock is illustrative only) |
| match bands | Color + text label (`high` / `medium` / `low`); ensure contrast (not color-only) |
| Mobile | Full-width stack; signals as simple rows; no dense multi-column |
| Empty | No breakdown field → hide entire control (no dead expander) |

---

## Decision 7 — Analytics (locked)

Client `emitProductLog` (trace), same pattern as openers:

| Event `message` | When | meta |
|-----------------|------|------|
| `match_breakdown_expanded` | User expands detail breakdown | `candidateProfileId`, `matchScore`, `priorityTier` (derive from score with same thresholds if detail DTO lacks tier) |
| `algorithm_explainer_viewed` | Explainer page mount / visible | `from`: `'detail' \| 'browse' \| 'direct'` if known via `?from=` or referrer heuristic; else omit |

No new backend analytics table in Story 1. No PII beyond profile id already used elsewhere.

---

## Decision 8 — Module / file layout (locked)

**API**

```text
dating-api/src/matches/match-compatibility-breakdown.ts
dating-api/src/matches/match-compatibility-breakdown.spec.ts
# wire in compare-stages/assemble-result.ts
# types on match-engine.types.ts + MeMatchDetailDto
# forward in me-matches.service.ts detail builder
# UI type mirror in dating-ui/src/lib/me-matches-api.ts
```

**UI**

```text
dating-ui/src/components/match-detail/match-compatibility-breakdown.tsx (+ spec)
# slot into MatchDetailContent or detail page
dating-ui/src/app/(public)/about/algorithm/page.tsx
# i18n: en.ts / es.ts / he.ts / types.ts
# optional: small “Learn how matching works” link near priority HIGH description / WHY
```

---

## Out of scope (Story 1)

- Changing `COMPATIBILITY_BLEND_WEIGHTS`, friction, caps, or priority thresholds  
- User-editable weights / “compare to your #3 match” / score history  
- Sharing breakdown externally  
- List DTO `compatibilityBreakdown`  
- LLM-generated signal prose  
- Reintroducing detail header score badge  
- Agent 4 / eligibility work  

---

## Acceptance mapping

| Criterion | How we meet it |
|-----------|----------------|
| Expandable breakdown on detail | Decision 1 + UI component |
| Life goals, personality, interests, challenges | Decision 3 buckets (challenges without fake %) |
| Scores match engine | Component scores from real fields / derived pairScores; not 40/40/20 |
| `/about/algorithm` | Decision 5 |
| Plain language | Chip labels + i18n; no internal coefficient names |
| Mobile | Decision 6 |
| Analytics expansion | Decision 7 |
| User testing ≥4/5 | Agent 3 / PM — not Agent 1 gate |

---

## Agent 1 checklist

1. Implement `buildCompatibilityBreakdown` + unit tests (tiers, caps, friction gate, empty TIER2).  
2. Attach on assemble → `CompareResultDto`; forward on `MeMatchDetailDto` only.  
3. UI expandable section + i18n; hide when null.  
4. Public explainer page with **honest** blend copy.  
5. `emitProductLog` for expand + explainer view.  
6. Tests: API mapping; UI expand/collapse; no score badge regression on detail.  
7. **Do not** change ranking / list cache version / Prisma.

---

## Next

```text
--agent 1 sprint 43 story 1
```
