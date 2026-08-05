# Handoff: Agent 0 — Architect — Sprint 41 Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_priority_ranking.md](../../STORY_02_priority_ranking.md)  
**Sprint:** sprint-41-smart-triage-ui  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** Backend + frontend. **Skip Agent 4.**

---

## Summary

Surface existing `matchScore` / `finalScore` as **`priorityScore` + `priorityTier`** on the **flat** list DTO (already sorted DESC). **Do not** regroup the HTTP response into `{ high, good, other }` — that breaks cursor pagination. Frontend groups the accumulated infinite-scroll list into **Message these first / Good matches / Other matches**. Hard-blocked rows stay **outside** priority sections (trailing compact list). Thresholds **85 / 70**. No scoring algorithm changes. Analytics = client `emitProductLog` (same pattern as Story 1). **No emoji** in section chrome (Story 1 product convention).

---

## Baseline facts (verified)

| Fact | Detail |
|------|--------|
| List path | `GET /api/v1/me/matches` → `MeMatchesService` (`list` / legacy + `listFromMaterializedRanks`) |
| Sort today | Eligible first by `matchScore` DESC (null → −1); hard-blocked **appended last** (`me-matches.service.ts` ~1341–1352). Materialized ranks: `orderBy: matchScore desc` |
| List DTO | Flat `matches?: MeMatchItemDto[]` + `nextCursor` / `hasMore` (page size 20 on UI) |
| Score field | `matchScore: number \| null` (= engine `finalScore` when scored) |
| UI today | Story 1 `MatchBrowseCard` stack; hardBlocked → `MatchListItem`; infinite merge in `use-infinite-matches.ts` |
| Analytics | Story 1: client `emitProductLog`; server `ProductAnalyticsEvents` has no priority events |

---

## Decision: API shape (locked)

| Option | Verdict |
|--------|---------|
| Grouped `matches: { high, good, other }` | **Reject** — breaks opaque cursor + `hasMore`; infinite scroll merges arrays |
| **Flat `matches[]` + new fields, keep sort** | **Lock** |

```ts
// Additive on each list item (backward compatible)
priorityScore: number | null;  // === matchScore when finite; else null
priorityTier: 'HIGH' | 'GOOD' | 'OTHER';
```

- **Do not** remove or rename `matchScore`.
- Detail DTO: **out of scope** this story (list triage only).
- Sort: **already DESC** — Agent 1 verifies both legacy paginate + materialized paths still DESC; no second sort required unless a regression appears.

---

## Priority helper (locked)

**Path:** `dating-api/src/me-profile/match-priority.ts`  
(Presentation for me-matches list — **not** under `matches/compare-stages` / engine.)

```ts
export type MatchPriorityTier = 'HIGH' | 'GOOD' | 'OTHER';

/** Inclusive lower bound for HIGH. */
export const PRIORITY_HIGH_MIN = 85;

/** Inclusive lower bound for GOOD (below HIGH). */
export const PRIORITY_GOOD_MIN = 70;

export function calculatePriorityTier(
  score: number | null | undefined,
): MatchPriorityTier {
  if (score == null || !Number.isFinite(score)) return 'OTHER';
  if (score >= PRIORITY_HIGH_MIN) return 'HIGH';
  if (score >= PRIORITY_GOOD_MIN) return 'GOOD';
  return 'OTHER';
}

export function toPriorityFields(matchScore: number | null): {
  priorityScore: number | null;
  priorityTier: MatchPriorityTier;
} {
  const priorityScore =
    matchScore != null && Number.isFinite(matchScore) ? matchScore : null;
  return {
    priorityScore,
    priorityTier: calculatePriorityTier(priorityScore),
  };
}
```

**Edge cases (unit-test):** 85 → HIGH, 84.9 → GOOD, 70 → GOOD, 69.9 → OTHER, `null` → OTHER + `priorityScore: null`.

**Wire-in:** Apply `toPriorityFields(matchScore)` wherever list items are built (`matches.push` in `buildFullRankedList` / hydrate — both eligible and hardBlocked payloads get fields for consistency; UI ignores hardBlocked for sections).

---

## Thresholds (locked — tune later)

| Tier | Score |
|------|-------|
| HIGH | `>= 85` |
| GOOD | `>= 70` and `< 85` |
| OTHER | `< 70` or null |

Tuning table in story stays valid for Agent 3 / Story 3; **do not** change constants without PM note.

---

## Frontend sections (locked)

```text
me-matches-page-client.tsx
  ├── [page chrome unchanged]
  ├── MatchPrioritySections          # NEW
  │     ├── HIGH — always expanded when length > 0 (no collapse control)
  │     ├── GOOD — collapsed by default; header button toggles
  │     ├── OTHER — collapsed by default; header button toggles
  │     └── cards: MatchBrowseCard (eligible only)
  ├── hardBlocked trailer            # MatchListItem list after sections
  └── infinite sentinel (unchanged)
```

**Grouping (client):**

```ts
const eligible = matches.filter((m) => !m.hardBlocked);
const high = eligible.filter((m) => m.priorityTier === 'HIGH');
const good = eligible.filter((m) => m.priorityTier === 'GOOD');
const other = eligible.filter((m) => m.priorityTier === 'OTHER');
const blocked = matches.filter((m) => m.hardBlocked);
```

With DESC sort + hardBlocked last, infinite append preserves order within tiers as pages load.

**Empty behavior:**

| Case | UI |
|------|-----|
| No HIGH | Omit HIGH section (no empty “Message these first”) |
| No GOOD / OTHER | Omit that section |
| All empty eligible + no blocked | Existing `MatchListEmptyState` |
| Only blocked | Sections omitted; show blocked rows only |

**Collapse:** Controlled React state (`goodOpen` default `false`, `otherOpen` default `false`). HIGH never collapses. `aria-expanded` + keyboard on GOOD/OTHER headers (same pattern as Story 1 why toggle).

**Card height by tier:** **No** — same Story 1 photo-first card.

---

## Visual indicators (locked)

| Element | Spec |
|---------|------|
| Section titles | i18n text only — **no 🔥⭐✨** (Story 1 no-emoji chrome) |
| HIGH header | Stronger weight; optional emerald accent underline / left border |
| GOOD / OTHER headers | Neutral zinc; chevron; count in parentheses |
| HIGH card accent | `ring-1 ring-emerald-500/40` or `border-emerald-400/60` on article |
| GOOD / OTHER cards | Default Story 1 border |
| Score badge | On browse photo, `absolute end-3 top-3`, text `{score}%` (no target emoji), tabular-nums, dark scrim/pill for contrast; hide when `matchScore == null` |
| Hard-blocked | Unchanged compact row; no priority ring |

---

## Analytics (locked — client only)

Same sink as Story 1:

```ts
emitProductLog({
  level: 'trace',
  route: '/dating/me-matches',
  message: 'match.priority_section_viewed', // or _expanded
  meta: {
    event: 'match.priority_section_viewed' | 'match.priority_section_expanded',
    tier: 'HIGH' | 'GOOD' | 'OTHER',
  },
});
```

| Event | When |
|-------|------|
| `match.priority_section_viewed` | Section header (or first card in section) ≥50% visible once per tier per page load |
| `match.priority_section_expanded` | User expands GOOD or OTHER |

Do **not** add Nest analytics endpoints / `ProductAnalyticsEvents` this story.

---

## i18n (locked)

Under `copy.matches.list.priority` (EN + ES + HE):

| Key | Purpose |
|-----|---------|
| `highTitle` | e.g. “Message these first” |
| `highDescription` | One short line under HIGH header |
| `goodTitle` | “Good matches” |
| `otherTitle` | “Other matches” |
| `count` | `(n: number) => \`(${n})\`` or embed in titles |
| `expandAria` / `collapseAria` | Optional; or rely on visible title + `aria-expanded` |

---

## Artifacts (Agent 1)

### Backend

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/match-priority.ts` | **New** — thresholds + helpers |
| `dating-api/src/me-profile/match-priority.spec.ts` | **New** — edge cases |
| `dating-api/src/me-profile/me-matches.service.ts` | Attach `priorityScore` / `priorityTier` on list item build |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | Assert fields + sort unchanged |
| UI type mirror | `dating-ui/src/lib/me-matches-api.ts` `MeMatchItemDto` |

### Frontend

| Path | Change |
|------|--------|
| `dating-ui/.../match-priority-sections.tsx` (+ optional spec) | Sections + collapse + analytics |
| `dating-ui/.../match-priority.ts` | `groupMatchesByPriority` helper (+ spec) |
| `dating-ui/.../me-matches-page-client.tsx` | Render sections + blocked trailer |
| `dating-ui/.../match-browse-card.tsx` | Score badge + optional HIGH accent prop/`priorityTier` |
| `dating-ui/src/lib/i18n/{en,es,he}.ts` + `types.ts` | `list.priority.*` |
| `dating-ui/.../page.spec.tsx` | Sections, collapse, empty HIGH, badge |

**Do not change:**

| Path | Reason |
|------|--------|
| Engine / `finalScore` formulas | No algorithm changes |
| `MatchListRank` schema | Reuse stored `matchScore` |
| Cursor / page size contract | Flat array only |
| Detail page | Out of scope |
| Server product analytics catalog | Follow-up |

---

## Tests / verification

**Backend**

- [ ] `calculatePriorityTier` edges (85, 84.9, 70, 69.9, null)
- [ ] List item JSON includes `priorityScore` / `priorityTier`
- [ ] Existing sort specs still green

**Frontend**

- [ ] Grouping helper + section render
- [ ] HIGH default open; GOOD/OTHER start collapsed
- [ ] Empty HIGH omitted
- [ ] Score badge when score present
- [ ] Hard-blocked not inside HIGH/GOOD/OTHER card stacks

**Commands**

```bash
# api
npx jest src/me-profile/match-priority.spec.ts src/me-profile/me-matches.service.spec.ts --runInBand

# ui
npx vitest run src/app/dating/me-matches/
```

---

## Acceptance mapping

| AC | How |
|----|-----|
| `priorityScore` + `priorityTier` on list | `toPriorityFields` on item build |
| Sorted by score | Existing DESC — verify |
| 3 sections | Client group eligible |
| HIGH expanded; GOOD/OTHER collapsible | Defaults above |
| ~20/40/40 distribution | Agent 3 measures; thresholds 85/70 start |
| Analytics | `emitProductLog` section viewed/expanded |
| No algorithm change | Score passthrough only |

---

## Open questions / non-blockers

- None blocking Agent 1.
- Promoting priority events to server funnel — follow-up.
- Threshold retune — Agent 3 / Story 3 with real distribution.

---

## Agent 1 brief

1. Read this handoff + `STORY_02_priority_ranking.md`.
2. Add `match-priority.ts` + wire list DTO fields (both push sites).
3. Mirror types in UI; build `MatchPrioritySections`; badge + HIGH accent on browse card.
4. i18n EN/ES/HE; specs; no emoji section chrome.
5. No engine / schema / grouped API.

**Next command:**

```text
--agent 1 sprint 41 story 2
```
