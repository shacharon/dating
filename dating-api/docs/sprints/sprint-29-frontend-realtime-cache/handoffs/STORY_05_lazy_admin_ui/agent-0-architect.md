# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_lazy_admin_ui.md](../../STORY_05_lazy_admin_ui.md)  
**Sprint:** sprint-29-frontend-realtime-cache  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Code-split admin page bodies + Architect-locked heavy product overlays via `next/dynamic`. Do **not** change middleware / admin gates. Skip Agent 4 if mount specs still pass. FE-only.

---

## Summary

SCALE CR: zero `next/dynamic` / `React.lazy`; admin + heavy panels inflate product JS. App Router already puts `/admin/*` in separate routes (dating pages do **not** import admin modules today). This story still lands explicit `dynamic()` so (1) admin client trees are clearly deferred client chunks with `ssr: false`, and (2) product pages stop **eagerly bundling** celebration / report / analysis-results UI into their main client graphs.

---

## Inventory (current)

### Admin (`dating-ui/src/app/admin/`)

| Route | File | Notes |
|-------|------|-------|
| `/admin` | `page.tsx` | Tiny link hub — leave eager |
| `/admin/photos` | `photos/page.tsx` | Large `'use client'` moderation UI + `admin-photos-api` |
| `/admin/reports` | `reports/page.tsx` | Large `'use client'` + `admin-reports-api` |
| `/admin/match-quality` | `match-quality/page.tsx` | Large `'use client'` + API |
| `/admin/match-quality/[profileId]` | `…/[profileId]/page.tsx` | Audit detail `'use client'` |

- Middleware: session cookie + `isAdminRouteBlocked` (prod 404 unless `NEXT_PUBLIC_ADMIN_ENABLED`) — **unchanged**.  
- No `admin/layout.tsx`. No dating → admin imports found.  
- Specs import default from `./page` today.

### Heavy product (SCALE list)

| Surface | Import today | Bundled into |
|---------|--------------|--------------|
| `MatchCelebrationModal` | static in `me-matches/[id]/page.tsx` | Match detail client chunk |
| `ReportUserDialog` | static in match detail + `conversations/[id]/page.tsx` | Those page chunks |
| `AnalysisResultsView` | static in `analysis-page-client.tsx` | Analysis client chunk |
| Legal `react-markdown` | `LegalDocumentPage` on `/privacy` `/terms` only | Already route-isolated |

No `next/dynamic` / `React.lazy` anywhere in `dating-ui` yet.

---

## Decisions (do not reverse without discussion)

### 1. Admin: thin `page.tsx` + `dynamic(..., { ssr: false })` (locked)

For each **heavy** admin route (photos, reports, match-quality list, match-quality detail):

1. Move the current page implementation to a sibling `*-page-client.tsx` (keep `'use client'` there).  
2. Replace `page.tsx` with a thin wrapper that default-exports a `dynamic(() => import('./…-page-client'), { ssr: false, loading })`.  
3. Prefer **Server Component** wrappers (no `'use client'` on `page.tsx`) so `dynamic` is the client boundary.

| Route | Client module name (locked) |
|-------|-----------------------------|
| photos | `photos-page-client.tsx` |
| reports | `reports-page-client.tsx` |
| match-quality | `match-quality-page-client.tsx` |
| match-quality/[profileId] | `candidate-page-client.tsx` |

**Admin index `/admin`:** leave as-is (no dynamic required).

**`loading`:** minimal English placeholder (admin is English-only), e.g. a short paragraph or `data-testid="admin-chunk-loading"` — no fancy skeleton required.

**`ssr: false`:** locked for these admin clients (ops tools; no SEO; avoids SSR of admin trees).

### 2. Do not change auth / gates (locked)

- No edits to `middleware.ts`, `admin-routes-gate.ts`, or admin API client auth headers beyond what pages already do.  
- Specs that assert middleware redirect / prod 404 remain the gate regression suite (Agent 1 does not need to rework them unless a rename breaks imports — they should not).

### 3. Product heavy overlays via `dynamic` (locked)

| Component | Call sites | Pattern |
|-----------|------------|---------|
| `MatchCelebrationModal` | `me-matches/[id]/page.tsx` | `dynamic` + **`ssr: false`**; mount **only when open** (`open === true`) |
| `ReportUserDialog` | match detail + conversation detail | same: mount only when `open` |
| `AnalysisResultsView` | `analysis-page-client.tsx` | `dynamic` + `ssr: false`; render when results path already shows (no need to gate on a separate flag beyond existing UI branch) |

Use named-export → default mapping:

```ts
dynamic(
  () =>
    import('@/components/match-celebration-modal').then((m) => ({
      default: m.MatchCelebrationModal,
    })),
  { ssr: false },
);
```

(Same shape for `ReportUserDialog` / `AnalysisResultsView`.)

### 4. Out of scope (locked)

| Item | Why |
|------|-----|
| Legal / `react-markdown` | Already only on `/privacy` `/terms` |
| Admin index hub | Tiny |
| i18n locale splitting | Separate effort |
| List virtualization | SCALE separate bullet |
| Shared admin layout | Not required |
| Changing admin feature-flag / session rules | Security / ops |

### 5. Tests (locked)

1. **Admin page specs** import the **`*-page-client`** module (not the dynamic `page.tsx` wrapper) so Vitest does not need to resolve Next dynamic chunks. Update import paths in existing `page.spec.tsx` files.  
2. Existing product specs (match detail, conversation detail, analysis) must still pass — mock or real dynamic is fine; if flaky, `vi.mock('next/dynamic', …)` passthrough that renders the loaded component synchronously is allowed. Prefer keeping specs green without over-mocking.  
3. Optional one-liner in Dev handoff: note that admin routes are separate webpack/turbopack chunks (no full bundle analyzer required).

### 6. Agent 4

- **Skip** if §5 vitest suite for touched admin + product pages stays green.

---

## Artifacts

| Path | Change |
|------|--------|
| `admin/photos/page.tsx` + `photos-page-client.tsx` | Split + dynamic |
| `admin/reports/…` | same |
| `admin/match-quality/…` | same (list + detail) |
| `admin/*/page.spec.tsx` | Import client modules |
| `me-matches/[id]/page.tsx` | dynamic celebration + report |
| `conversations/[id]/page.tsx` | dynamic report |
| `analysis/analysis-page-client.tsx` | dynamic results view |

---

## Out of scope (recap)

Legal markdown, virtualization, i18n split, middleware/gate changes, admin index dynamic.

---

## Agent 1 instructions

1. Split four heavy admin pages → `*-page-client` + thin `dynamic` `page.tsx` (`ssr: false`).  
2. Dynamic-load celebration, report dialog, analysis results per §3; mount modals only when open.  
3. Point admin specs at client modules; keep product specs green.  
4. Confirm no new dating → admin imports.  
5. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
perf(ui): lazy-load admin and heavy route chunks

Sprint 29 Story 5
```

---

## Agent 2 instructions

- [ ] Heavy admin routes use `dynamic` + `ssr: false`  
- [ ] Middleware / admin gate untouched  
- [ ] Dating product pages do not static-import admin trees  
- [ ] Celebration / report / analysis-results not static-eager in parent graphs  
- [ ] Specs import client modules / still pass  
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story **Done**; sprint README → sprint complete (or note Done).  
- Write `agent-3-pm.md`.

---

## Open risks

1. Dynamic + Vitest: prefer testing client modules directly (§5).  
2. Modal-only-when-open: first open pays chunk load latency — acceptable; keep loading UI null/minimal.  
3. App Router already route-splits admin — story still required for explicit product overlay splitting + SCALE “zero dynamic” gap.
