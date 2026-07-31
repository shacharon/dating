# Story 10: Convert dating pages to Server Component shells

**Priority:** P1  
**Estimated effort:** 2–3 days  
**Agent:** `generalPurpose`  
**Dependencies:** Stories 1–4 preferred

---

## Problem

Most `/dating/*` pages are `'use client'` with `useEffect` data fetching. Larger bundles, weaker SSR for shells.

---

## Goal

For 2–3 high-value routes, introduce Server Component page shells that pass initial data (or empty props) to client islands for interactive parts.

**Scope (pragmatic):** Do **not** convert every page. Target:
1. `dating/page.tsx` (home/profile hub) if feasible with auth
2. `dating/analysis/page.tsx` — server shell + client poll island
3. One list page if auth cookie fetching works cleanly

Skip real-time heavy pages (conversations detail) if auth/session fetch is awkward.

---

## Acceptance Criteria

- [ ] At least 2 dating routes use Server Component shells + client islands
- [ ] Auth/session still works (no regression)
- [ ] No waterfalls worse than before
- [ ] Build succeeds
- [ ] Document which pages stayed client and why
- [ ] Commit follows convention

---

## Agent instructions

1. Study `(authenticated)/onboarding/basic/page.tsx` as the pattern
2. For each target route: extract `*-client.tsx`, keep `page.tsx` as async server
3. Prefer cookies/session fetch helpers that already exist
4. If auth cannot be done safely on server for a route, skip and document
5. Commit:

```
feat(ui): add Server Component shells for dating routes

Convert selected /dating pages to server shells with client islands.
Preserve auth and interactivity. Document remaining client-only pages.

Sprint 26 Story 10
```
