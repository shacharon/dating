# Story 35.4 — Profile Route Redirects & Regression (LOCKED)

**Sprint:** 35 — Profile Consolidation  
**Story:** 4 — Test and migrate profile routes  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** ACCEPT  
**Prerequisite:** Story **35.2 ACCEPT** (hub + redirects exist); **35.3** optional (meter already API-bound)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3`.  
**Repo:** `dating-ui` only  
**Needs mockup:** no

---

## Goal

Prove legacy profile URLs **redirect** to the hub, eliminate remaining **product deep links** to old paths, remove **dead page clients** that only exist for obsolete specs, and leave a small **automated regression pack** so consolidation does not regress. Manual multi-browser theater is **not** the deliverable.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Hub | `(authenticated)/profile` — `?tab=overview\|edit\|analysis\|settings` |
| Redirects already shipped (35.2) | See matrix below — **page-level** `redirect()`, not middleware rewrites |
| Meter | API-bound (35.3) — do not rework scoring |
| Analysis modules | Hub imports `useAnalysisPage` + `analysis-results-view` from `dating/analysis/` — **keep those** |
| Orphan clients | `dating/profile/profile-page-client.tsx` and `dating/analysis/analysis-page-client.tsx` are **not** used by route `page.tsx` (routes are redirects) — only old specs import them |
| Leftover product links | Matches list still links / redirects to `/dating/analysis` |

### AGENT_COMMANDS corrections (outdated — ignore)

- ❌ `/settings/profile` → `?tab=edit` — lock is **`/profile`** (overview), per 35.1/35.2  
- ❌ `/settings/profile/basic|story` → bare `?tab=edit` — must keep **`#basic` / `#story`**  
- ❌ Middleware rewrite block as the migration mechanism — keep thin **page** redirects  
- ❌ Require Chrome/Firefox/Safari/mobile manual matrix as Agent 1 gate  
- ❌ “All test cases” from the mega checklist — use **locked regression pack** below  
- ❌ Rewrite README unless a clear route table already exists to update — prefer sprint lock + thin UX review note  

---

## Locked redirect matrix

| From (bookmark / old link) | To |
|----------------------------|-----|
| `/dating/profile` | `/profile` |
| `/dating/analysis` | `/profile?tab=analysis` |
| `/settings/profile` | `/profile` |
| `/settings/profile/basic` | `/profile?tab=edit#basic` |
| `/settings/profile/story` | `/profile?tab=edit#story` |

Hash preservation on `/dating/profile#…` → optional; drop OK if Next `redirect()` strips hash.

**Do not change** these targets without PM + Architect.

---

## Locked product link updates

Search `src/` (product code, not historical docs) and update:

| Location | Today | Required |
|----------|-------|----------|
| `me-matches-page-client.tsx` “back to analysis” | `/dating/analysis` | `/profile?tab=analysis` |
| `use-infinite-matches.ts` not_ready (non–no_photo) | `router.replace('/dating/analysis')` | `router.replace('/profile?tab=analysis')` |
| `onboarding-texts-form.tsx` finish (default/`onboarding` variant) | `router.replace('/dating/analysis')` | `router.replace('/profile?tab=analysis')` |

**Keep as-is (OK):**

- `isProfileActive` still true for `/dating/profile` and `/settings/profile*` (redirect bounce / bookmarks).  
- Middleware auth for `/dating/profile` and `/profile` (both stay protected).  
- Imports of analysis **helpers** under `app/dating/analysis/` from hub.  
- Spec mocks that use pathname `/dating/profile` for nav-active fixtures.  
- Comments in docs/history mentioning old paths.

After edits: `rg '/dating/profile|/dating/analysis|/settings/profile' dating-ui/src` should show **only** redirects, nav-active helpers, middleware tests, comments, or intentional legacy path checks — **no** user-facing `Link`/`router.*` to those paths except redirect pages themselves.

---

## Locked dead-code cleanup

| Path | Action |
|------|--------|
| `dating/profile/page.tsx` | **Keep** redirect |
| `dating/profile/profile-page-client.tsx` | **Delete** |
| `dating/profile/page.spec.tsx` | **Replace** with redirect assertion (mock `next/navigation` `redirect`) |
| `dating/analysis/page.tsx` | **Keep** redirect |
| `dating/analysis/analysis-page-client.tsx` | **Delete** |
| `dating/analysis/page.spec.tsx` | **Replace** with redirect assertion; move any still-valuable behavior coverage only if not already covered by hub analysis / `use-analysis-page` / results specs — **prefer delete heavy client specs** rather than porting the whole file |
| `dating/analysis/page.smoke.e2e.spec.tsx` | Retarget to hub analysis tab **or** delete if redundant with existing analysis specs — Agent 1 choose; must not import deleted client |
| Settings profile redirect pages | **Keep**; add specs if missing |

Do **not** move analysis hooks/views out of `dating/analysis/` in this story (churn).

---

## Locked automated regression pack (Agent 1 must green)

1. **Redirect specs** — each matrix row calls `redirect` with exact target string.  
2. **Hub smoke** — existing `(authenticated)/profile/page.spec.tsx` still green.  
3. **Nav** — Profile href `/profile`; `isProfileActive('/profile')` true.  
4. **Matches** — link/redirect targets updated (update `me-matches` specs if they assert old URL).  
5. **Onboarding texts finish** — default variant navigates to `/profile?tab=analysis` (update form spec if present).  
6. **Meter** — existing quality meter specs still green (no changes required unless broken by cleanup).  

Optional nice-to-have (not required for ACCEPT): assert `variant="profileHub"` does not call analysis navigate.

---

## Documentation (minimal)

| Doc | Change |
|-----|--------|
| This lock | Binding QA matrix |
| `docs/UX_UI_PAGE_REVIEW.md` | Short note at top of profile/route sections: canonical `/profile?tab=`; legacy paths redirect — **do not** rewrite the entire review |
| Sprint AGENT_COMMANDS / QUICK_START | No required edit |

No Figma. No dating-api.

---

## Out of scope

| Item | Where |
|------|--------|
| Redesign tabs / meter UI | Done 35.1–35.3 |
| Middleware-based redirects | Not needed |
| Delete `ProfileCompletenessHints` / align ≥50 | Later |
| Overview draft reload after edit | Later polish |
| Multi-browser manual checklist as CI gate | Human smoke only |
| Sprint 36 work | Later |

---

## Acceptance criteria

- [x] Redirect matrix implemented + **spec’d** for all five rows (exact targets)  
- [x] No user-facing product navigations to `/dating/profile`, `/dating/analysis`, or `/settings/profile*` (except redirect pages / nav-active / middleware tests)  
- [x] Orphan `*-page-client` for dating profile & analysis **removed**; specs adjusted  
- [x] Onboarding finish → hub analysis URL  
- [x] Regression pack green  
- [x] Thin UX_UI note updated  
- [x] No dating-api changes  

---

## Agent 1 implementation order

1. Add/replace redirect specs for matrix pages.  
2. Fix Matches + onboarding finish URLs (+ their specs).  
3. Delete orphan clients; fix/delete dependent specs & smoke e2e.  
4. `rg` sweep for leftover product links.  
5. UX_UI one-paragraph note.  
6. Run regression pack; write `agent-1-implement.md`.

---

## Done

Story **35.4 ACCEPT**. **Sprint 35 complete.**
