# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_match_browse_i18n.md](../../STORY_02_match_browse_i18n.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — Story 2 localizes the **match list** UI at `/dating/me-matches` only.
- Wire all user-visible chrome on the list page to `getCopy(locale)` via `useAppLocale()` (depends on Story 0).
- **Server-sourced match text stays English v1:** `explainability.reasonShort`, trait chips, and any engine summaries rendered on list rows.
- **Empty state** on the list uses existing `launch.emptyMatches` copy (Sprint 9 component); include in Story 2 verification but do not redesign empty-state UX here.
- **Match detail** (`/dating/me-matches/[id]`) is **Story 3** — do not expand Story 2 scope to detail actions/modals.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/me-matches/page.tsx` | updated — all list chrome via `copy.matches.list` + `copy.common.loading` |
| `dating-ui/src/lib/i18n/types.ts` | verify/extend — `matches.list` section (see §3) |
| `dating-ui/src/lib/i18n/en.ts` | canonical `matches.list` strings |
| `dating-ui/src/lib/i18n/es.ts` | full mirror |
| `dating-ui/src/lib/i18n/he.ts` | full mirror |
| `dating-ui/src/components/match-list-empty-state.tsx` | verify — already uses `launch.emptyMatches` + locale listeners (no new keys required for Story 2 DoD) |
| `dating-ui/src/app/dating/me-matches/page.spec.tsx` | updated by agent 2 — assertions remain valid under default `en` locale |

**No changes:** `dating-api/*`, `me-matches/[id]/page.tsx` (Story 3)

---

## Decisions (do not reverse without discussion)

### 1. Page scope — list only

| Surface | Story |
|---------|--------|
| `/dating/me-matches` list | **Story 2** |
| `/dating/me-matches/[id]` detail | Story 3 |
| Main nav labels (`copy.nav.matches`) | Story 1 / 5 (already wired in shell) |

---

### 2. Integration pattern

```tsx
const { locale, copy } = useAppLocale();
const listCopy = copy.matches.list;

// Loading
{copy.common.loading}

// Errors — prefer listCopy.loadFailed as fallback when Error has no message
catch (e) => setError(e instanceof Error ? e.message : listCopy.loadFailed);

// Analyzed date — locale-aware formatting
{listCopy.analyzedPrefix}{' '}
{new Date(m.analyzedAt).toLocaleDateString(locale, { dateStyle: 'medium' })}
```

Do **not** introduce page-local locale state unless required — `useAppLocale()` is the standard hook.

---

### 3. Copy keys (frozen for Story 2)

**`matches.list`:**

| Key | EN example | UI location |
|-----|------------|-------------|
| `backToAnalysis` | ← Your analysis | Top nav link |
| `editProfile` | Edit profile | Top nav link |
| `title` | Your matches | H1 |
| `subtitle` | People whose profile… | Subtitle |
| `analyzedPrefix` | Analyzed | Row meta before date |
| `staleRegionAria` | Profile analysis out of date | Stale banner `aria-label` |
| `staleMessage` | Your profile changed… | Stale banner body |
| `refreshAnalysis` | Refresh analysis | Stale banner button |
| `refreshStarted` | Refresh started —… | Success status after submit |
| `refreshFailed` | Refresh failed | Refresh error fallback |
| `loadFailed` | Failed to load matches | List load error fallback |
| `actionBadge.liked.label` | Liked | Badge text |
| `actionBadge.liked.ariaLabel` | You liked this match | Badge a11y |
| `actionBadge.passed.label` | Passed | Badge text |
| `actionBadge.passed.ariaLabel` | You passed on this match | Badge a11y |
| `actionBadge.blocked.label` | Blocked | Badge text |
| `actionBadge.blocked.ariaLabel` | You blocked this match | Badge a11y |

**Shared:**

| Key | Use on list page |
|-----|------------------|
| `common.loading` | Initial load status |

---

### 4. Explicitly English v1 (do not translate in UI)

| Content | Source | Notes |
|---------|--------|-------|
| `m.explainability.reasonShort` | API | Render as-is on list row |
| Match score number | API | Numeric only |
| `matchListPrimaryLabel` / `matchListSecondaryMeta` | `match-display.ts` | Nickname + `30y` age suffix — **acceptable EN meta v1**; optional follow-up sprint |
| Gender enum display strings | API/raw enum | Out of scope unless already localized elsewhere |

CR must **not** reject Story 2 for English `reasonShort` on rows — documented sprint gap.

---

### 5. Empty state

`MatchListEmptyState` already reads `getCopy(locale).launch.emptyMatches` with locale event subscription. Story 2 **verifies** it renders on zero-match list; no schema change required if keys exist in all three locale files.

---

### 6. Stale analysis refresh flow (unchanged behavior)

1. Banner when `viewerProfileAnalysisStale === true`.
2. Button calls existing `submitMyProfileForAnalysis()`.
3. Success → `listCopy.refreshStarted`; error → `listCopy.refreshFailed` or Error.message.

No API contract changes.

---

## Runtime topology (architect — realtime / proxy / cookies only)

- **REST:** unchanged — `GET /api/v1/me/matches` via same-origin proxy.
- **Socket:** N/A.
- **Cookie:** session only; locale from localStorage.
- **Expected Network tab:** same match list requests; no i18n-specific endpoints.

---

## Tests / verification (agent 1 smoke; agent 2 full)

- [ ] `cd dating-ui && npm test -- src/app/dating/me-matches/page.spec.tsx`
- [ ] Existing specs assume **English** default locale (`/Your matches/`, `Liked`) — must remain green.
- [ ] Optional agent 2: one test with `localStorage` `he` asserting Hebrew H1 (not required for Story 2 DoD if EN tests pass).
- [ ] `prisma migrate deploy`: N/A

---

## Acceptance criteria mapping

| Story AC | Implementation |
|----------|----------------|
| All user-visible strings on match list use `getCopy` | `matches.list` + `common.loading` + empty state component |
| UI tests pass with default English | `page.spec.tsx` green |
| API chips English | Unchanged — by design |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 12 story 2
```

**Notes for next agent:**

1. Touch **`me-matches/page.tsx` only** for Story 2 implementation; detail page is Story 3.
2. Use `useAppLocale()` — do not duplicate locale listeners on the list page unless hook insufficient.
3. Keep `reasonShort` rendering unchanged (English from API).
4. Run `page.spec.tsx` before handoff to agent 2.
