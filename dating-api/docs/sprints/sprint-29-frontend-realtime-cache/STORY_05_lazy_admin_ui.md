# Story 05 — Lazy-load admin / heavy UI

**Sprint 29 · Status: PLANNED**  
**Priority:** P2  
**Estimated effort:** 0.5 day  
**Dependencies:** None (FE-only)

---

## Objective

Code-split admin (and other Architect-locked heavy routes) via `dynamic()` / route-level splitting so dating product bundles stay smaller.

## Why

SCALE CR: admin + heavy panels inflate initial JS for all users.

## Scope / tasks

1. Identify admin entry routes and heaviest dating panels.
2. Architect locks: which routes must dynamic-import; SSR vs `ssr: false` for admin.
3. Apply dynamic imports; verify middleware/auth still gate correctly.
4. Specs: smoke that admin page still mounts; optional bundle note in handoff.

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
