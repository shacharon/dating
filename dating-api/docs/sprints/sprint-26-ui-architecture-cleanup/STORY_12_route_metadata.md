# Story 12: Add route-level metadata to `/dating/*` pages

**Priority:** P1  
**Estimated effort:** 1 day  
**Agent:** `generalPurpose`  
**Dependencies:** Story 10 helpful but not required

---

## Problem

Most `/dating/*` and settings routes lack `metadata` / `generateMetadata`. Titles stay generic ("Dating App").

---

## Goal

Add titles (and short descriptions where useful) for main product routes. Prefer `generateMetadata` with locale when cookie locale is available; otherwise static metadata per page.

---

## Acceptance Criteria

- [ ] dating hub / profile / matches / conversations / analysis / settings have titles
- [ ] Pattern consistent (`Page | App name` or i18n equivalent)
- [ ] No break for client-only pages (use layout metadata or small server wrappers)
- [ ] Commit follows convention

---

## Agent instructions

1. List routes under `app/dating` and `(authenticated)` settings
2. Add `export const metadata` or `generateMetadata` where page is server-capable
3. For client-only pages, add metadata in a parent `layout.tsx` or convert thin server wrapper
4. Commit:

```
feat(ui): add route metadata for dating and settings pages

Set page titles/descriptions for main product routes.
Improve browser tab labeling and share previews.

Sprint 26 Story 12
```
