# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_mode_c_new_chapter.md](../../STORY_04_mode_c_new_chapter.md)  
**Sprint:** sprint-44-teaser-modes  
**Date:** 2026-08-06  
**Status:** complete  

---

## Summary

- **UI-only:** Mode C (`new_chapter`) browse presentation — **photo-first hybrid**: two-line teaser (`lines[0]` score·seriousness, `lines[1]` practical), **not** a Mode B clone (no giant centered `%` hero).
- **Extend** `MatchBrowseCard` with a third mode branch. Do **not** fork a separate card component.
- Until Story 5, API still defaults `teaser.mode = first_chapter` — Mode C renders when mode is `new_chapter`, or QA preview `dating.teaserModePreview=new_chapter` (already supported by `resolveBrowseTeaserMode`).
- New i18n `browse.modeC` (section label / Why expand / empty lines). Analytics already emits `teaser_mode` → `new_chapter` when active.
- **No API / Prisma / ranking changes.** **Skip Agent 4.**

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/.../match-display.ts` | design — `resolveMatchBrowseHybridLines` |
| `dating-ui/.../match-browse-card.tsx` | design — Mode C body branch; hide corner badge when C; Why overrides |
| `dating-ui/.../match-why-section.tsx` | design — reuse optional `whyToggle` (Story 3); no new props required |
| `dating-ui/src/lib/i18n/types.ts` + `en.ts` / `he.ts` / `es.ts` | design — `browse.modeC.*` |
| Specs: `match-browse-card.spec.tsx`, `match-display.spec.ts` | design — Agent 1/2 |
| `dating-api/*` | **no change** (DTO + `buildModeC` already ship `lines` / `new_chapter`) |

---

## Decisions (do not reverse without discussion)

### 1. Keep single `MatchBrowseCard` — branch on mode (locked)

```tsx
const mode = resolveBrowseTeaserMode(m);
if (mode === 'ready_again') {
  // Mode B (Story 3) — unchanged
} else if (mode === 'new_chapter') {
  // Mode C hybrid — this story
} else {
  // Mode A hook (Story 2) — first_chapter default
}
```

Do **not** create `MatchBrowseCardNewChapter`. Prefer inline teaser block; optional tiny extract only if file bloats.

### 2. Hybrid ≠ Mode B (locked) — wife insight: attraction first

| Element | Mode A | Mode B | Mode C (this story) |
|---------|--------|--------|---------------------|
| Photo closed | `h-[70vh]` | same | **same** — attraction first |
| Corner `%` badge | small | hidden | **hidden** (score already in `lines[0]`) |
| Teaser body | short hook | giant `%` + quoted claim | **2 lines** from `teaser.lines` |
| Alignment | start | center | **start** (`text-start`) — calmer than B |
| Why chrome | default | Mode B expand/sublabel | Mode C section + expand |
| Like/Pass | primary | primary | primary |

**Do not** reuse Mode B score hero / quoted claim for Mode C. Product wants C calmer/clearer than B: score sits **inline** in line 1 (`88% · both want a real partnership`), not as a billboard.

### 3. Line source (locked)

```ts
export type BrowseHybridLines = { line1: string; line2: string | null };

export function resolveMatchBrowseHybridLines(
  m: MeMatchItemDto,
  linesEmpty: string,
): BrowseHybridLines {
  const lines = m.teaser?.lines ?? [];
  const line1 = lines[0]?.trim() ?? '';
  const line2 = lines[1]?.trim() || null;
  if (!line1) {
    return { line1: linesEmpty, line2: null };
  }
  return { line1, line2 };
}
```

**Rules:**

1. Prefer `teaser.lines[0]` / `[1]` only — **do not** fall back to Mode A hook, Mode B claim, takeaway, or chips (avoids inventing / pity fluff).
2. Empty / missing `lines[0]` → i18n `modeC.linesEmpty` as sole line; `line2 = null`.
3. One-line builder output (only `lines[0]`) → render **one** line; do **not** invent a second line.
4. Render API strings as-is (builder already joins with ` · `, truncates ≤90 chars, embeds `%` when score known).
5. **No** client re-split of `%` vs seriousness for Story 4 — treat each line as one string. Contrast: `tabular-nums` on the line-1 element is enough (Agent 2 checks readable `%`).

**Golden fixture (API already):**

```json
{
  "teaser": {
    "mode": "new_chapter",
    "lines": [
      "88% · both want a real partnership",
      "Kids situation aligned · same city · ask about her travel"
    ],
    "showScore": true,
    "score": 88
  }
}
```

### 4. Typography / clamp (locked)

```
[PHOTO ~70vh closed / 40vh Why open]
Name, age · city   (no corner % in Mode C)
─────────────────────────────────────
88% · both want a real partnership     ← line1, text-base–lg, font-medium
Kids aligned · same city · ask…        ← line2, text-sm, muted-er
What lines up
⌄ Full why
[Like]  [Pass]
```

- Wrapper: `data-testid="match-browse-mode-c-teaser"`, `text-start`, `space-y-1.5` (compact).
- Line 1: `data-testid="match-browse-hybrid-line1"` — `text-base`–`text-lg`, `font-medium`, `leading-snug`, `line-clamp-2`, `break-words`, `tabular-nums`, zinc-900/50 dark.
- Line 2 (when present): `data-testid="match-browse-hybrid-line2"` — `text-sm`, zinc-600/400 dark, `line-clamp-2`, `break-words`.
- Clamp **per line** (not one clamp-3 blob) so mid-word cuts stay rare; Agent 2 eyeballs awkward mid-word.
- Photo still ≥60% card height when Why closed — hybrid text must not steal the fold.

### 5. When Mode C shows (locked)

Reuse Story 3 `resolveBrowseTeaserMode` / `dating.teaserModePreview` — **no new preview key**.

| Mechanism | Detail |
|-----------|--------|
| Prod until Story 5 | API sends `first_chapter` → Mode A; Mode C dead path unless preview |
| Fixture tests | `teaser.mode: 'new_chapter'` |
| QA preview | `localStorage.setItem('dating.teaserModePreview', 'new_chapter')` |

**Invariant:** Mode C layout never activates for `first_chapter` / `ready_again` without preview override.

### 6. Score badge / showScore (locked)

- Corner badge **off** when `mode === 'new_chapter'` (same reason as Mode B — avoid double `%`).
- Do **not** add a Mode-B-style score hero.
- Ignore `teaser.score` for a separate UI number; list SOT for any future use remains `matchScore`, but Mode C display is **lines only**.
- If `teaser.showScore === false` somehow ships with Mode C: still render `lines` as returned (builder currently always embeds score in line1 when score exists). Do **not** strip `%` client-side in Story 4.

### 7. Why section labels for Mode C (locked)

| Slot | EN | HE |
|------|----|----|
| Section label (above Why, outside section) | `What lines up` | `מה מסתדר` |
| Why toggle (collapsed) | `Full why` | `כל הסיבה` |
| Why heading (expanded) | keep Mode A `whyHeading` | same |

- `data-testid="match-browse-mode-c-section-label"` on section label.
- Pass `whyToggle={modeCCopy.whyExpand}` into existing `MatchWhySection`.
- Do **not** use `whyToggleWithScore` on Mode C (score already in line 1).
- Why panel body unchanged.

### 8. i18n (locked)

Add under `matches.list.browse`:

```ts
modeC: {
  sectionLabel: string;
  whyExpand: string;
  linesEmpty: string;
}
```

| Key | EN | HE |
|-----|----|----|
| `sectionLabel` | `What lines up` | `מה מסתדר` |
| `whyExpand` | `Full why` | `כל הסיבה` |
| `linesEmpty` | `Clear life-goal overlap — open to learn more` | `יש חפיפה ברורה במטרות — כדאי לפתוח` |

ES: schema parity (plain Spanish). Mode A/B strings **unchanged**.

**Banned in UI chrome (locked):** “Younger”, “Senior”, “Mature singles”, “Second chance at love”, Gen-Z slang, pity (“despite your divorce”). Prefer **new chapter** language only in product docs / Story 5 onboarding — **not** as card chrome labels.

### 9. Analytics (locked)

Reuse `match.card_viewed` + `teaser_mode`. When Mode C active, `teaser_mode: 'new_chapter'` from `resolveBrowseTeaserMode`. No new event name. `data-teaser-mode` on card already set from resolver — keep that.

### 10. Mode A / B regression (locked)

- Mode A path unchanged when `first_chapter`.
- Mode B path unchanged when `ready_again`.
- `resolveMatchBrowseHook` / `resolveMatchBrowseClaim` untouched except callers only use them on their modes (card branch owns routing).

### 11. Untouched (locked)

- API `buildMatchTeaser` / list DTO / ranking / Prisma.
- Story 5 chapter onboarding / persistence (preview remains QA-only).
- Mode B hero/claim design.

---

## API contract

**No HTTP changes.** Mode C consumes existing:

```json
{
  "teaser": {
    "mode": "new_chapter",
    "lines": [
      "88% · both want a real partnership",
      "Kids situation aligned · same city · ask about her travel"
    ],
    "showScore": true,
    "score": 88,
    "askHint": "ask about her travel"
  },
  "matchScore": 88
}
```

---

## Service / function signatures

```ts
// match-display.ts
resolveMatchBrowseHybridLines(
  m: MeMatchItemDto,
  linesEmpty: string,
): { line1: string; line2: string | null }
// resolveBrowseTeaserMode / preview — already ship Story 3

// match-browse-card.tsx
// branch: ready_again | new_chapter | first_chapter (else)
// Mode C: hybrid lines + sectionLabel; hide corner badge; whyToggle = modeC.whyExpand
```

---

## Migration plan

**N/A.** Rollback = remove Mode C branch. Clear `dating.teaserModePreview` for QA.

---

## Integration points

| Component | Action |
|-----------|--------|
| `match-display.ts` | Hybrid lines helper |
| `match-browse-card.tsx` | Mode C UI branch |
| `match-why-section.tsx` | Reuse `whyToggle` |
| i18n en/he/es + types | `browse.modeC.*` |
| Specs | Fixture `new_chapter`; assert 2 lines + no Mode B hero; A/B regression |

---

## Runtime topology

**N/A** — no realtime / proxy / cookies / migrations. Optional QA: `dating.teaserModePreview=new_chapter`.

---

## E2E verification (agent 4)

**Skip Agent 4** — UI presentation only; eligibility/ranking unchanged.

---

## Tests / verification (plan for Agent 1–2)

- [ ] Mode C fixture: line1 + line2 visible; Why collapsed; Like/Pass present
- [ ] Photo region still `h-[70vh]` when Why closed
- [ ] Corner badge **absent** in Mode C; Mode A badge still present; Mode B hero still present
- [ ] Empty lines → `linesEmpty`; no Mode B claim quotes
- [ ] One-line teaser → only hybrid-line1 (no invented line2)
- [ ] `teaser_mode: 'new_chapter'` on `match.card_viewed`
- [ ] HE `modeC` strings match story table
- [ ] No ageist/pity chrome strings in i18n keys added this story
- [ ] Mode A + Mode B regression green
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network: N/A
- [ ] Socket: N/A

---

## Open questions / blockers

- None. Depends on Story 01 Mode C builder (Done). Prod Mode C traffic waits on Story 5; QA uses fixture or preview.

---

## Next agent

```text
--agent 1 sprint 44 story 4
```

**Notes for next agent:**

1. Implement Mode C branch in `MatchBrowseCard` + i18n `modeC` + `resolveMatchBrowseHybridLines`.
2. Keep Mode A/B green; do not reuse Mode B score hero for C.
3. Do not change API; do not implement Story 5 routing (preview localStorage only).
4. Suggested commit: `feat(ui): Mode C new-chapter match card (hybrid teaser)` / Sprint 44 Story 4.
