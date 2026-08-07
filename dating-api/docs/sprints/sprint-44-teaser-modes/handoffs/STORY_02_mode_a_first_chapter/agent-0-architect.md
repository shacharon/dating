# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_mode_a_first_chapter.md](../../STORY_02_mode_a_first_chapter.md)  
**Sprint:** sprint-44-teaser-modes  
**Date:** 2026-08-06  
**Status:** complete  

---

## Summary

- **UI-only:** Mode A (`first_chapter`) browse card consumes Story 01 `teaser` — always-visible short hook from `teaser.lines[0]`.
- **Extend** existing `MatchBrowseCard` (do **not** fork `MatchBrowseCardFirstChapter`). Stories 3–4 add mode branches later; until Story 5 API always sends `first_chapter`.
- Keep photo-dominant layout (`h-[70vh]` closed), small corner `%` badge, Why + Like/Pass unchanged.
- Add i18n empty-hook fallback (EN + HE + ES schema parity). Analytics: `teaser_mode` on `match.card_viewed`.
- **No API / Prisma / ranking changes.** **Skip Agent 4.**

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/match-display.ts` | design — `resolveMatchBrowseHook` (Mode A hook from teaser) |
| `dating-ui/src/app/dating/me-matches/match-browse-card.tsx` | design — render hook; clamp; analytics `teaser_mode` |
| `dating-ui/src/lib/i18n/types.ts` + `en.ts` / `he.ts` / `es.ts` | design — `matches.list.browse.hookEmpty` |
| `dating-ui/.../match-browse-card.spec.tsx` + `match-display.spec.ts` + `page.spec.tsx` | design — Agent 1/2 |
| `dating-api/*` | **no change** (DTO already shipped Story 01) |
| Prisma / scores / Mode B–C layouts | **no change** |

---

## Decisions (do not reverse without discussion)

### 1. Extend `MatchBrowseCard` — no new card component (locked)

| Option | Verdict |
|--------|---------|
| New `MatchBrowseCardFirstChapter` | Reject — duplicates photo/Why/actions; Stories 3–4 would multiply forks |
| **Extend `MatchBrowseCard`** | **Locked** — Mode A is the default path; later stories branch on `teaser.mode` inside this component (or extract tiny presentational slots) |

Until Story 5, every list row’s `teaser.mode` is `first_chapter`. Story 2 implements the Mode A presentation path and treats missing `teaser` as Mode A (safe default).

### 2. Hook source (locked)

New helper in `match-display.ts`:

```ts
/** Mode A always-visible hook. Never invent facts — API teaser or i18n empty only. */
export function resolveMatchBrowseHook(
  m: MeMatchItemDto,
  hookEmpty: string,
): string {
  const mode = m.teaser?.mode ?? 'first_chapter';
  // Story 2 owns first_chapter only; other modes keep legacy one-liner until Stories 3–4.
  if (mode !== 'first_chapter') {
    return matchBrowseOneLiner(m) ?? hookEmpty;
  }
  const line = m.teaser?.lines?.[0]?.trim();
  if (line) return line;
  return hookEmpty;
}
```

**Rules:**

1. Mode A hook = `teaser.lines[0]` (builder already joins with ` · `).
2. If missing/blank → **i18n** `hookEmpty` (not `matchBrowseOneLiner`, not chip labels).
3. **Do not** client-rewrite / dedupe “hiking · ask about hiking” in Story 2 — render API string as-is (CR minor deferred; avoid inventing).
4. Keep `matchBrowseOneLiner` exported for non–Mode-A interim + any other callers; Why body stays `matchBrowseWhyBody` / existing Why section (no change).

### 3. Typography / clamp (locked)

- Hook element: always visible above Why (not inside collapsed Why).
- Classes intent: `text-sm`–`text-base`, readable on mobile; `line-clamp-3` (hard max 3 lines); optional `break-words`.
- `data-testid="match-browse-hook"` for tests.
- Long hooks must **not** shrink photo region when Why is closed (photo stays `h-[70vh]` / `max-h-[640px]`).

### 4. Score badge (locked)

- Keep current corner badge (`end-3 top-3`, rounded `%`).
- **Do not** enlarge into Mode B hero.
- Visibility: show when `matchScore` is finite **and** (`teaser?.showScore !== false`). Mode A always has `showScore: true`.
- Value: continue using `matchScore` (list SOT), not a second number from `teaser.score` (they should match; avoid drift on remap).

### 5. Empty-hook i18n (locked)

Add under `matches.list.browse`:

| Locale | Key | Copy |
|--------|-----|------|
| EN | `hookEmpty` | `A little in common — open to see more` |
| HE | `hookEmpty` | `יש קצת במשותף — כדאי לפתוח ולראות` |
| ES | `hookEmpty` | Short equivalent (schema parity; not product-modeled — Agent 1 may use a plain ES line) |

Why toggle / heading strings **unchanged**.

### 6. Analytics (locked)

Extend existing `match.card_viewed` meta (do **not** invent a separate top-level product event name unless logging infra requires it):

```ts
meta: {
  event: 'match.card_viewed',
  matchProfileId,
  explanation_expanded,
  teaser_mode: m.teaser?.mode ?? 'first_chapter', // Story AC: match.teaser_mode
}
```

Emit on first IntersectionObserver view **and** on Why expand (same as today). Property name: `teaser_mode` (snake_case to match `explanation_expanded`).

### 7. Layout invariants (locked)

```
Photo ~70vh (closed) / ~40vh (Why open)
Name, age · city overlay
Small % badge
Always-visible hook (2–3 lines clamp)
Why control (existing i18n)
Like / Pass primary
```

- Photo still ≥60% of card height when Why closed (current 70vh satisfies; test asserts `h-[70vh]` or computed height ratio).
- Like/Pass remain primary CTAs (`MatchBrowseActions`).
- Dark mode: keep existing `dark:` tokens on hook text.
- RTL: use logical properties (`text-start` if touching Why toggle alignment; badge already `end-3`). Hook text inherits app `dir`.

### 8. Untouched (locked)

- API / `buildMatchTeaser` / ranking / Prisma.
- Mode B hero % / Mode C two-line layout (Stories 3–4).
- Chapter intent routing (Story 5).
- Hard-blocked rows still use `MatchListItem` (not browse card).

---

## API contract

**No HTTP changes.** Client already receives:

```json
{
  "teaser": {
    "mode": "first_chapter",
    "lines": ["Both night owls · she bakes on Saturdays · ask about Japan"],
    "showScore": true,
    "score": 78,
    "askHint": "ask about Japan"
  }
}
```

`teaser` may be absent on stale cache → Mode A + `hookEmpty`.

---

## Service / function signatures

```ts
// match-display.ts
resolveMatchBrowseHook(m: MeMatchItemDto, hookEmpty: string): string
// matchBrowseOneLiner — keep; not used for Mode A always-visible hook

// match-browse-card.tsx
const hook = resolveMatchBrowseHook(m, listCopy.browse.hookEmpty);
// render hook with line-clamp-3; emitCardViewed(..., teaser_mode)
```

No Nest services.

---

## Migration plan

**N/A.** Rollback = revert UI to `matchBrowseOneLiner`.

---

## Integration points

| Component | Action |
|-----------|--------|
| `match-display.ts` | Add `resolveMatchBrowseHook` |
| `match-browse-card.tsx` | Hook from teaser; clamp; analytics |
| i18n en/he/es + types | `hookEmpty` |
| Specs | Hook visible without Why; empty fallback; `teaser_mode` in log meta; photo 70vh closed |
| `page.spec.tsx` | Fixtures include `teaser: { mode: 'first_chapter', lines: [...], showScore: true, score: n }` |

---

## Runtime topology

**N/A** — no realtime / proxy / cookies / migrations. Optional browser visual smoke for Agent 2/3 (dark + RTL).

---

## E2E verification (agent 4)

**Skip Agent 4** — UI presentation only; eligibility/ranking unchanged.

---

## Tests / verification (plan for Agent 1–2)

- [ ] `resolveMatchBrowseHook`: teaser line → that string; blank teaser → `hookEmpty`; ignores chip one-liner for Mode A
- [ ] Card: hook visible with Why closed (`data-testid="match-browse-hook"`)
- [ ] `line-clamp-3` present; long string does not remove `h-[70vh]` on photo when Why closed
- [ ] Score badge still small corner (not hero)
- [ ] `match.card_viewed` meta includes `teaser_mode: 'first_chapter'`
- [ ] Dark/RTL smoke: Agent 2 checklist
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network: N/A (optional visual)
- [ ] Socket: N/A

---

## Open questions / blockers

- None. Depends on Story 01 Done (`teaser` on list DTO).

---

## Next agent

```text
--agent 1 sprint 44 story 2
```

**Notes for next agent:**

1. Implement `resolveMatchBrowseHook` + wire `MatchBrowseCard`; add `hookEmpty` to en/he/es + types.
2. Update browse card / page fixtures to include `teaser`.
3. Do not change API; do not build Mode B/C layouts.
4. Suggested commit: `feat(ui): Mode A first-chapter match card (short hook)` / Sprint 44 Story 2.
