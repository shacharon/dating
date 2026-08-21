# Story 02 — Split Me-Profile HTTP Integration Specs

**Sprint:** 63  
**Effort:** 2–3 days  
**Risk:** ⚠️ MEDIUM (move describes carefully; keep coverage)  
**Status:** Planned

---

## Objective

Split `me-profile/me-profile-http.integration.spec.ts` (~6183 LOC) into route-family files so refactors stop fighting one mega-suite.

---

## Target layout (example)

```
me-profile/
  me-profile-http-crud.integration.spec.ts
  me-profile-http-photos.integration.spec.ts
  me-profile-http-matches.integration.spec.ts
  me-profile-http-conversations.integration.spec.ts
  me-profile-http.shared-harness.ts   # shared bootstrap / auth helpers
```

Keep shared app bootstrap in one harness; move `describe` blocks by route prefix.

---

## Tasks

1. Extract shared harness (module setup, cookies, seed helpers).
2. Move describes by domain without changing assertions.
3. Run each new file + full suite; ensure count of tests unchanged (or document intentional skips).
4. Delete or thin the original mega-file to a short index comment pointing at the splits.

---

## Success

- [ ] No single me-profile HTTP integration file > ~2000 LOC soft
- [ ] All former cases still run
- [ ] CI green
