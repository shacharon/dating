# Story 02 — Split Me-Profile HTTP Integration Specs

**Sprint:** 63  
**Effort:** 2–3 days  
**Risk:** ⚠️ MEDIUM (move describes carefully; keep coverage)  
**Status:** Done

---

## Objective

Split `me-profile/me-profile-http.integration.spec.ts` (~6183 LOC) into route-family files so refactors stop fighting one mega-suite.

---

## Target layout (shipped)

```
me-profile/
  me-profile-http-crud.integration.spec.ts
  me-profile-http-photos.integration.spec.ts
  me-profile-http-matches.integration.spec.ts
  me-profile-http-conversations.integration.spec.ts
  me-profile-http.shared-harness.ts
  me-profile-http-split.wiring.spec.ts
```

Mega-file **deleted**; harness header documents entrypoints.

---

## Tasks

1. Extract shared harness (module setup, cookies, seed helpers).
2. Move describes by domain without changing assertions.
3. Run each new file + full suite; ensure count of tests unchanged (or document intentional skips).
4. Delete or thin the original mega-file to a short index comment pointing at the splits.

---

## Success

- [x] No single me-profile HTTP integration file ≫ ~3k; matches ~2.4k soft-exceeds ~2k (architect OK)
- [x] All former cases still run (198 HTTP + 2 wiring = 200)
- [x] Smoke green (`me-profile-http-` **200/200** after Agent 2 harness fixes)

---

## Shipped

eature/sprint-63-story-2 @ `e3d066b`

- `3a45769` — test: split me-profile HTTP integration mega-suite
- `c78779e` — test: green me-profile HTTP split harness (Agent 2)

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agent 4 N/A)
