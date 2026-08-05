# Handoff: Agent 0 — Architect — Sprint 43 Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_empty_states_polish.md](../../STORY_03_empty_states_polish.md)  
**Sprint:** sprint-43-smart-triage-launch  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** Frontend (`dating-ui`) only. **Skip Agent 4** (no eligibility / ranking / score changes).

---

## Summary

**Polish existing empty / loading / error UX** — do not rebuild onboarding or invent new API reasons. Baselines from Sprints 9–37 already cover photo gate, zero matches, analysis wait, conversations empty. Story mocks overshoot a 1-day ship; lock a tight copy + CTA pass plus a small shared layout helper.

---

## Baseline facts (verified)

| Surface | Today |
|---------|--------|
| Match loading | Plain `common.loading` text — no skeleton |
| Match error | Red alert text only — **no Try again** (`me-matches-page-client.tsx`) |
| Photo gate | In-page `MatchListPhotoGate` → `/profile?tab=edit#photos` |
| `not_ready` no_profile / not_analyzed | Silent redirect → onboarding / analysis hub |
| `listBuilding` | One-line copy + poll; then `MatchListEmptyState` |
| Zero matches | `MatchListEmptyState` — prefs / profile / invite |
| Conversations empty | Title **“Keep swiping!”** (wrong product language) + Browse matches |
| Filtered conversations | Title/body — **no clear-filters CTA** |
| Thread empty | Soft “No messages yet. Say hi!” — OK |
| Analysis wait | `AnalysisProgressPanel` on `/profile?tab=analysis` |
| Shared `EmptyState` | **None** |
| lucide / heroicons | **Not in package.json** |
| `/support` | **Does not exist** |
| Orphans | `photo-gate-banner.tsx`, `profile-completeness-hints.tsx` — not mounted |

API `not_ready.reason`: `'no_profile' | 'not_analyzed' | 'no_photo'` only — **no** `'analyzing'`.

---

## Decision 1 — Scope: polish, not greenfield (locked)

| In scope | Out of scope |
|----------|--------------|
| Copy pass EN/ES/HE for listed surfaces | Onboarding flow rewrite |
| Match list error **Try again** (`reload`) | Contact Support / `/support` |
| `listBuilding` richer wait copy + optional Refresh | Fake “2–3 min” guarantees / fake “10x” photo stats |
| Conversations empty copy fix | Remount orphan PhotoGateBanner / CompletenessHints |
| Filtered-empty **Clear filters** CTA | Pool-empty vs prefs-too-strict split (no API signal) |
| Photo gate copy tighten (no fake stats) | In-Matches analyzing panel (keep redirect) |
| Optional link to `/about/algorithm` from analysis wait | Lottie / custom illustrations |
| Small shared empty-state **layout** helper | New icon library; emoji chrome |
| | Match card skeletons (defer) |
| | Priority-section “no HIGH yet” empty |

**Effort budget:** ~1 day UI-only. Backend unchanged.

---

## Decision 2 — Reject story sample invents (locked)

| Story draft | Verdict |
|-------------|---------|
| `reason === 'analyzing'` on matches list | **Reject** — not an API reason; analyzing = redirect + `AnalysisProgressPanel` |
| Contact Support CTA | **Reject** — no route; Story 4 may define support |
| Unified EmptyState with lucide/emoji icons | **Reject icons library**; allow thin shared layout (title / body / primary / secondary) using existing Tailwind + zinc/emerald |
| Photo gate “10x match rate” | **Reject** — unverified claim |
| Prefs path `/settings/preferences` | Use existing **`/settings/preferences`** or profile prefs link already used by `MatchListEmptyState` — verify current CTA hrefs and keep consistent |

---

## Decision 3 — Screen map & CTAs (locked)

### Matches (`/dating/me-matches`)

| State | Presentation | Primary CTA | Secondary |
|-------|--------------|-------------|-----------|
| Initial loading (no prior cards) | Short wait copy (not forever spinner theater) | — | — |
| Load error | Friendly title + body | **Try again** → `reload()` | — (no support) |
| Photo gate | Keep `MatchListPhotoGate` | Upload / manage photos → existing photos deep-link | Optional expand “Why a photo?” from existing hint copy — **no stats** |
| `listBuilding` | Stronger “Finding your matches…” + short wait hint | **Refresh** → `reload()` | Optional: Learn how matching works → `/about/algorithm` |
| Ready + empty | Keep `MatchListEmptyState` actions | Prefs / profile / invite (existing) | Soften copy if “check back” feels vague — still actionable |
| Stale analysis | Keep existing amber banner + refresh | unchanged | — |

Silent redirects for `no_profile` / `not_analyzed` **stay** — destinations are correct; do not replace with in-page dead ends.

### Conversations (`/dating/conversations`)

| State | Lock |
|-------|------|
| Empty list | Fix title/body (drop “swiping”); keep **Browse matches** |
| Filtered empty | Add **Clear filters** / reset to All (wire existing filter state) |
| List error | Already has Try again — keep |
| Thread empty | Copy polish only if needed; composer remains the action |

### Analysis hub (`/profile?tab=analysis`)

| State | Lock |
|-------|------|
| In progress / failed | Keep `AnalysisProgressPanel`; add secondary **Learn how matching works** → `/about/algorithm` if not already present |
| Do not duplicate analyzing UI on Matches | |

---

## Decision 4 — Shared component (locked)

Optional thin helper (not a design-system overhaul):

```text
dating-ui/src/components/empty-state-panel.tsx
```

Props: `title`, `description`, `primaryAction?`, `secondaryAction?`, `testId?`.  
Style: centered stack, `min-h` reasonable, zinc text, emerald primary button consistent with match UI — **no emoji icons**, no new deps.

Prefer refactoring match error / conversations empty / filtered empty onto this helper **where it reduces duplication**. Do **not** force-rewrite `MatchListEmptyState` / `MatchListPhotoGate` if they already work — wrap or lightly align classes/copy only.

---

## Decision 5 — Copy tone (locked)

- Friendly, clear, actionable — same spirit as Story 1 honesty / Story 2 email.
- **Never:** “Nobody matched with you”, “Keep swiping”, raw HTTP/stack errors as the only message.
- **Prefer:** “No conversations yet”, “Finding your matches…”, “Try widening your preferences”.
- Technical `error` string may remain as detail under a friendly title, or map `loadFailed` i18n as the visible message + Try again.

i18n: update **en + es + he** together for every changed key.

---

## Decision 6 — Loading / timeout (locked)

- Do **not** invent a hard “5 min timeout” error without backend support.
- Existing `listBuilding` poll ceiling → fall through to empty state: **keep**; improve copy so that fall-through feels intentional (“Still looking — adjust prefs or invite friends”) if needed via empty state, not a fake failure.

---

## Out of scope (Story 3)

- Backend API / new `not_ready` reasons  
- Push / notifications (Story 2)  
- Algorithm transparency (Story 1) beyond linking to `/about/algorithm`  
- Beta launch checklist (Story 4)  
- Remounting Sprint 37-removed completeness banner  
- A/B testing empty states  

---

## Acceptance mapping

| Criterion | How we meet it |
|-----------|----------------|
| Major pages have empty/error guidance | Matches + conversations + analysis (existing + polish) |
| Every polished empty has a CTA | Decision 3 |
| Friendly actionable copy | Decision 5 + i18n |
| Loading shows progress intent | `listBuilding` + analysis panel; not fake ETA |
| Error allows retry | Match list Try again; conversations already |
| Mobile / dark mode | Existing zinc tokens; no new theme |
| Support contact | **Deferred** (no route) |

---

## Agent 1 checklist

1. Add `empty-state-panel.tsx` (+ light spec) if used by ≥2 call sites.  
2. Matches: error Try again; `listBuilding` copy + Refresh; photo gate copy polish.  
3. Conversations: fix empty title/body (all locales); filtered-empty Clear filters.  
4. Analysis panel: optional algorithm link.  
5. i18n EN/ES/HE; update specs that assert old “Keep swiping” / copy.  
6. **No** backend, no new deps, no orphan remounts, no `/support`.

---

## Next

```text
--agent 1 sprint 43 story 3
```
