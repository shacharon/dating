# Story 02 — Light FE lib/ Folders

**Sprint:** 73  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Optional  
**Repo:** `dating-ui`

---

## Objective

Organize `dating-ui/src/lib/` (~104 flat files) into domain folders. **Do not** rewrite APIs.

---

## Target layout (example)

```
lib/
  auth/           # auth-api, token storage, session helpers
  api/            # me-profile-api, me-matches-api, conversations-api, api-base
  matches/        # match display helpers, why/teaser utils
  i18n/           # already may exist — keep
  analytics/      # if present
  utils/          # pure helpers only
```

Cap: root ≤25 files. Prefer move-only; update imports.

---

## Out of scope

- New shared SDK package
- Capacitor / React Native rewrite
- Component folder reorganization (`src/components/`)

---

## Success

- [ ] `src/lib/` root ≤25 files
- [ ] Short `src/lib/README.md`
- [ ] `npm test` green in `dating-ui`

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
