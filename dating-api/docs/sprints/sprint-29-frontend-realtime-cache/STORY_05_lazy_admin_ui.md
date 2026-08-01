# Story 05 — Lazy-load admin / heavy UI

**Sprint 29 · Status: Architect locked → Agent 1 Dev**  
**Priority:** P2  
**Estimated effort:** 0.5 day  
**Dependencies:** None (FE-only)

**Handoff:** [`handoffs/STORY_05_lazy_admin_ui/agent-0-architect.md`](./handoffs/STORY_05_lazy_admin_ui/agent-0-architect.md)

---

## Objective

Code-split admin (and other Architect-locked heavy routes) via `dynamic()` / route-level splitting so dating product bundles stay smaller.

## Why

SCALE CR: admin + heavy panels inflate initial JS for all users.

## Scope / tasks

1. Identify admin entry routes and heaviest dating panels. ✅
2. Architect locks: which routes must dynamic-import; SSR vs `ssr: false` for admin. ✅
3. Apply dynamic imports; verify middleware/auth still gate correctly.
4. Specs: smoke that admin page still mounts; optional bundle note in handoff.

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| Heavy admin pages | Thin `page.tsx` + `dynamic(…-page-client, { ssr: false })` |
| Admin index `/admin` | Leave eager (tiny hub) |
| Middleware / `admin-routes-gate` | Unchanged |
| Product overlays | `MatchCelebrationModal`, `ReportUserDialog`, `AnalysisResultsView` via `dynamic`; modals mount only when open |
| Out of scope | Legal markdown, virtualization, i18n locale split |

## Acceptance criteria

- [ ] Locked admin (or heavy) routes lazy-loaded
- [ ] Auth/middleware gates unchanged
- [ ] Product dating routes do not eagerly import admin trees
- [ ] Basic mount tests still pass

## Commit message

```
perf(ui): lazy-load admin and heavy route chunks

Sprint 29 Story 5
```
