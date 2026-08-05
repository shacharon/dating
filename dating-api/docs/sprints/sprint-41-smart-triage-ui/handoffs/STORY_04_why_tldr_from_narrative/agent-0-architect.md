# Handoff: Agent 0 — Architect — Sprint 41 Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_why_tldr_from_narrative.md](../../STORY_04_why_tldr_from_narrative.md)  
**Sprint:** sprint-41-smart-triage-ui  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** Backend + frontend. **Skip Agent 4.**

---

## Summary

Browse one-liner becomes a **short cut of the same `matchNarrative` WHY** as the match profile — not a parallel template brain. Persist `narrativeTldr` on `MatchNarrativeCache`. List exposes `whyTldr`. **HIGH** rows may eager-generate (capped). GOOD/OTHER stay lazy. **Empty line is OK.** Kill coach templates on browse. Openers stay Sprint 42.

---

## Baseline facts (verified)

| Fact | Detail |
|------|--------|
| Full WHY | `matchNarrative` — LLM via `MatchNarrativeGenerator`, lazy on **detail** only (`resolveMatchNarrative` in `me-matches.service.ts`) |
| Cache | `MatchNarrativeCache` — columns: narrative, model, eval IDs, `promptVersion` (`v4`). **No TLDR column today** |
| Cache rule | Persist **LLM only**; fallback narratives are **never** persisted |
| List DTO | `MeMatchItemDto` has `recommendation.primaryTakeaway` from `buildPlainMatchListTldr` (hardcoded coach/interest/place/decide lines) |
| List omits | `matchNarrative` (Sprint 22 lock — cost) |
| Browse UI | `matchBrowseOneLiner` → `primaryTakeaway` first; expandable Why → `matchBrowseWhyBody` → same takeaway |
| Priority | `priorityTier` already on list (`HIGH` ≥ 85) — Story 2 |
| Page size | UI infinite scroll ~20; HIGH count per page usually small |

---

## Decision 1 — How to build the TLDR (locked)

| Option | Verdict |
|--------|---------|
| Second LLM call for TLDR | **Reject** — cost + different voice risk |
| Same LLM JSON `{ narrative, tldr }` + prompt bump | **Reject for v1** — more validation surface; not required |
| **Deterministic extract from validated narrative** | **Lock** |

**Helper (new):** `dating-api/src/matches/match-narrative/match-narrative-tldr.ts`

```ts
export const NARRATIVE_TLDR_MAX_CHARS = 160;

/** 1–2 leading sentences, hard-capped. Same words as full WHY. */
export function buildNarrativeTldr(narrative: string): string;
```

Rules:
- Split on sentence boundaries (reuse same spirit as UI `splitIntoSentences` / keep one shared util if easy).
- Take **1 sentence** if that sentence is already ≥ ~80 chars; else up to **2 sentences**.
- Cap at `NARRATIVE_TLDR_MAX_CHARS` with word-boundary ellipsis (same idea as `truncateListTldrLine`).
- Input must be the **exact** narrative string shown on detail (LLM or in-memory fallback for that request).
- **No** score-band coach templates. **No** interest/place invent.

**Prompt version:** **Do not bump** `MATCH_NARRATIVE_PROMPT_VERSION` (still `v4`). Extract is post-process.

---

## Decision 2 — Persistence (locked)

**Schema** (`MatchNarrativeCache`):

```prisma
narrativeTldr String? @db.VarChar(200)  // null = legacy row / not backfilled yet
```

- Migration: additive nullable column.
- On **LLM** upsert: always set `narrativeTldr = buildNarrativeTldr(narrative)`.
- On **cache read**: if `narrative` present and `narrativeTldr` null/empty → compute extract; **best-effort backfill** write (don’t fail list on backfill error).
- Fallback narrative: still **not** persisted (existing rule). HIGH eager may return an in-memory TLDR for that response only if `generate()` returns fallback — optional; prefer **omit `whyTldr`** when source is fallback so list stays empty until a real cached WHY exists. **Lock: only set/persist `whyTldr` from LLM-sourced narrative (cache hit or fresh LLM store).**

---

## Decision 3 — List DTO (locked)

Additive on `MeMatchItemDto` (and UI mirror):

```ts
/**
 * Short WHY for browse — extract of cached matchNarrative.
 * Null/omit when no LLM narrative cached yet (empty one-liner is OK).
 */
whyTldr: string | null;
```

- **Do not** put full `matchNarrative` on list.
- Detail DTO: unchanged (`matchNarrative` full text). Optionally also return `whyTldr` on detail — **out of scope** (not required).

### `primaryTakeaway` semantic change (list path)

| Surface | Behavior |
|---------|----------|
| Browse one-liner | **Only** `whyTldr` — never template `primaryTakeaway` |
| Expandable Why body | Prefer `whyTldr`; else chips / empty copy — **not** coach takeaway |
| `recommendation.primaryTakeaway` on **list** items | Set to `whyTldr ?? ''` (or keep building templates but UI must ignore — **Lock: stop attaching template takeaways on list**; use `whyTldr ?? ''` so API consumers don’t show coach copy) |
| Detail fallback when no narrative | Keep existing recommendation takeaway / fallback narrative path as today (detail still never blanks) |

`buildPlainMatchListTldr`: **stop using on me-matches list assembly**. May remain for unit tests / other callers temporarily; Agent 1 should not wire it into list item build. Deprecation cleanup can be same PR if cheap.

---

## Decision 4 — When to generate (locked): **B2 HIGH eager, capped**

| Tier | List behavior |
|------|----------------|
| **HIGH** | Cache lookup → if miss, **may** generate LLM narrative+TLDR (see caps) |
| **GOOD / OTHER** | Cache lookup only — never eager LLM on list |
| Hard-blocked | No WHY TLDR work |

**Caps (per list request):**

| Cap | Value |
|-----|-------|
| Max HIGH LLM generates | **3** |
| Remaining HIGH misses after cap | `whyTldr: null` (empty OK) |
| Concurrency | `Promise.allSettled` on the ≤3 misses; list must still return if some fail |
| Timeout | Reuse existing narrative generator timeouts; failure → null TLDR, no throw to client |

**Algorithm sketch (after page items built / priority known):**

1. Collect eligible HIGH items on this page with eval IDs available.
2. Batch `find` cache rows (extend cache service to return `{ narrative, narrativeTldr }` or `findMany`).
3. Attach `whyTldr` for hits (backfill extract if needed).
4. For misses: take first **3**, call shared resolve/generate path (factor from `resolveMatchNarrative` so detail + list share one implementation), persist LLM+TLDR, attach.
5. Do **not** block or inflate latency for GOOD/OTHER.

**Eval IDs:** List hydrate already has viewer + candidate evaluations for scored compares — Agent 1 wires the same cache key fields as detail. If an item lacks eval IDs, skip (`whyTldr: null`).

**List Redis/cache payload:** If match list HTTP responses are cached, include `whyTldr` in the cached item shape (or accept short TTL staleness). Agent 1 verifies `MatchListCachePayload` — invalidate or version bump if schema of cached items changes.

---

## Decision 5 — Frontend (locked)

| File | Change |
|------|--------|
| `match-display.ts` | `matchBrowseOneLiner` → `m.whyTldr?.trim() \|\| null` only |
| `matchBrowseWhyBody` | Prefer `whyTldr`; else null (chips still in Why section) — **do not** fall back to template `primaryTakeaway` |
| `match-browse-card.tsx` | Already hides empty one-liner — keep |
| Types | `MeMatchItemDto.whyTldr: string \| null` |
| Specs | Update one-liner tests; empty when null; present when set |

**Do not** start Sprint 42 opener UI.

---

## Cache service API (locked)

Extend `MatchNarrativeCacheService`:

```ts
find(...): Promise<{ narrative: string; narrativeTldr: string | null } | null>
upsert(... & { narrative: string; narrativeTldr: string; model?: ... })
// Optional: findMany(keys[]) for list batch
```

Detail `resolveMatchNarrative` keeps returning `string` (full narrative) for call-site stability; internally uses new find shape. List uses find/findMany + optional generate.

---

## Artifacts (Agent 1)

### Backend

| Path | Change |
|------|--------|
| `prisma/schema.prisma` + migration | `narrativeTldr` nullable |
| `match-narrative-tldr.ts` (+ spec) | Extract helper |
| `match-narrative-cache.service.ts` (+ spec) | Return/store TLDR; backfill |
| `match-narrative/index.ts` | Export helper |
| `me-matches.service.ts` | List: attach `whyTldr`; HIGH eager ≤3; factor shared resolve; list `primaryTakeaway` = whyTldr \|\| `''` |
| Integration / service specs | Cache hit TLDR on list; HIGH miss generate; GOOD no generate; cap 3 |

### Frontend

| Path | Change |
|------|--------|
| `me-matches-api.ts` | `whyTldr` |
| `match-display.ts` (+ spec) | One-liner / why body from `whyTldr` only |
| Browse / page specs | Empty vs present |

**Do not change:** scores, tiers, HG, opener stories, chip redesign, Hebrew narrative.

---

## Tests / verification

```bash
# api
npx jest src/matches/match-narrative/ --runInBand
npx jest src/me-profile/me-matches.service.spec.ts --runInBand
# if present:
npx jest --no-coverage me-new-model-e2e-match-narrative.integration --runInBand

# ui
npx vitest run src/app/dating/me-matches/
```

**Manual smoke**

1. HIGH with cold cache → list may show line after eager gen (or empty if capped/fail); open detail → full WHY; back to list → same short beat.
2. GOOD → list no line until detail opened once → then list shows TLDR on refresh.
3. Confirm no “say hello” / “thin fit” / “easy first message” on browse.

---

## Acceptance mapping

| AC | How |
|----|-----|
| Browse = short form of profile WHY | Extract of same cached narrative |
| No coach templates on browse | UI + list DTO ignore `buildPlainMatchListTldr` |
| Missing → omit line | `whyTldr: null` |
| Detail full narrative | Unchanged resolve path |
| HIGH cost bounded | ≤3 LLM gens / list request |
| Specs + smoke | Above |

---

## Out of scope (reconfirmed)

- Sprint 42 openers  
- Chip / token language redesign  
- Eager narrative for GOOD/OTHER on list  
- Second LLM or prompt v5 for TLDR  
- i18n narrative  

---

## Open questions / non-blockers

- None blocking Agent 1.  
- Future: same-call LLM `{narrative,tldr}` if extract quality disappoints — new story / prompt bump.  
- Future: raise HIGH eager cap after measuring p95 list latency.

---

## Agent 1 brief

1. Read this handoff + `STORY_04_why_tldr_from_narrative.md`.
2. Add `buildNarrativeTldr` + schema `narrativeTldr`; extend cache service.
3. Wire list `whyTldr` + HIGH eager ≤3; stop template takeaways on list browse path.
4. UI: one-liner / why body from `whyTldr` only.
5. Specs + local smoke notes in Agent 1 handoff.

**Next command:**

```text
--agent 1 sprint 41 story 4
```
