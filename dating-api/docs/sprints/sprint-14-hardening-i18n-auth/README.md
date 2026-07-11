# Sprint 14: Hardening — i18n robustness, SSR/RTL, auth clarity

**Epic:** Pay down i18n/SSR/auth debt accumulated through Sprints 12–13  
**Duration:** ~1 week (6 stories; 1–4 are the core, 5–6 stretch)  
**Goal:** Make the localization foundation correct-by-construction (no drift, no RTL flash), make the auth boundary explicit and safe, and add the first real end-to-end coverage — without adding new product surface.  
**Status:** Planned  
**Depends on:** [Sprint 12](../sprint-12-i18n-three-languages/README.md) (i18n foundation) · [Sprint 13](../sprint-13-product-ux-polish/README.md) (onboarding + profile i18n)

---

## Why this sprint

Sprints 12–13 localized the app chrome across EN/HE/ES and polished match/onboarding/profile UX. That work surfaced structural debt that will compound if left:

- **i18n can silently rot** — three hand-mirrored locale files; TS types only prove keys exist, not that values are translated. No parity gate.
- **Hebrew users see an English LTR flash** — `<html lang="en">` is hardcoded and locale is applied client-side after hydration.
- **Auth gating is presence-only** — middleware checks the cookie exists, not that it's valid; the real boundary is the API. This is fine *if* no authed page renders sensitive data before the API confirms — which is currently unverified.
- **The test suite is all mocks** — 370 green unit tests, zero real-browser/transport coverage of auth redirect, locale persistence, or RTL.
- **The highest-value screens are the least localized** — engine analysis + API errors stay English inside an otherwise Hebrew/Spanish UI.

This sprint is **debt paydown and verification**, not new features.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Locale persistence | Move source of truth to a **cookie** (readable by SSR/middleware); keep `localStorage` mirror + change event for instant client switch |
| SSR `lang` / `dir` | Set from locale cookie in root layout — **no client-side flash** |
| i18n parity | **CI gate**: every locale must have every key, and no non-EN value may be byte-identical to EN (catches untranslated strings) |
| Auth boundary | Middleware stays a **routing/UX** layer (presence check). Security is the **API SessionGuard**. Authed pages must **render-gate on the API**, not the cookie |
| Locale subscription | Consolidate on **`useAppLocale()`**; delete hand-rolled `useEffect` listener duplicates |
| New product surface | **None** — hardening only |

---

## Story checklist

| # | Story | Priority | Depends on |
|---|--------|----------|------------|
| 1 | [Locale cookie + SSR `lang`/`dir` (kill RTL flash)](./STORY_01_locale_cookie_ssr_rtl.md) | **P0** | Sprint 12 |
| 2 | [i18n parity CI gate (missing + untranslated keys)](./STORY_02_i18n_parity_gate.md) | **P0** | Sprint 12 |
| 3 | [Auth boundary audit — render-gate on API, not cookie](./STORY_03_auth_boundary_audit.md) | **P0** | — |
| 4 | [First e2e: auth redirect + locale switch + RTL](./STORY_04_e2e_auth_locale_rtl.md) | **P1** | Stories 1, 3 |
| 5 | [Consolidate locale subscription on `useAppLocale()`](./STORY_05_locale_hook_consolidation.md) | **P1** | Story 1 |
| 6 | [Dedup gender enum copy + session-expiry UX](./STORY_06_enum_dedup_session_expiry.md) | **P2** | — |

**Order:** 1 → 2 → 3 → (4, 5 parallel) → 6

---

## Story sketches

### Story 1 — Locale cookie + SSR `lang`/`dir` (P0)
**Problem:** `app/layout.tsx` hardcodes `<html lang="en">` with no `dir`; locale resolves client-side from `localStorage` via `LocaleDocumentSync`, so HE users get an English-LTR → Hebrew-RTL flash, wrong `lang` for SEO/screen readers, and risk of hydration mismatch.  
**Outcome:** Locale read from a cookie on the server; root layout renders correct `lang` + `dir` on first paint. `localStorage` + `APP_LOCALE_CHANGE_EVENT` retained for instant in-session switching; language setting writes both.  
**Out of scope:** Server-rendering localized *copy* (can stay client for now) — this story only fixes document-level `lang`/`dir` and the cookie source of truth.

### Story 2 — i18n parity CI gate (P0)
**Problem:** `en.ts`/`he.ts`/`es.ts` are hand-mirrored; only structural `index.spec` + TS keys guard them. Untranslated values (EN left in HE/ES) pass silently; ES diacritics already inconsistent.  
**Outcome:** A test/script that fails CI when (a) any locale is missing a key the others have, or (b) any non-EN string value is identical to its EN counterpart (allow an explicit `SAME_AS_EN` allowlist for legitimate cases like `—`, brand names, `IL`).  
**Out of scope:** Adopting an external i18n framework (tracked as long-run).

### Story 3 — Auth boundary audit (P0)
**Problem:** `middleware.ts` allows any non-empty session cookie; `hasSessionCookie()` infers auth from a readable marker. Neither validates. Unknown whether any authed page renders sensitive data before the API 401s.  
**Outcome:** Audit every route under `needsAuthSession()`; confirm each render-gates on a successful `me`/profile fetch (not just the cookie). Document the model: *middleware = routing UX, API SessionGuard = security*. Fix any page that paints protected data pre-auth. Add a short `AUTH_MODEL.md`.  
**Out of scope:** Changing the cookie/session mechanism or adding refresh tokens.

### Story 4 — First e2e (P1)
**Problem:** All 370 tests mock router/fetch/sockets; no real-browser coverage.  
**Outcome:** One Playwright flow (or chosen runner) covering: unauthenticated `/dating` → redirect to landing with `next`; sign-in (mocked IdP ok) → reach app; switch language → persists across reload; HE → `dir=rtl` with no flash.  
**Out of scope:** Full e2e matrix — just the critical path.

### Story 5 — Locale hook consolidation (P1)
**Problem:** ~8 components hand-roll the same locale `useEffect` + listeners instead of `useAppLocale()`.  
**Outcome:** Replace duplicates with the hook; delete boilerplate; behavior unchanged (specs stay green).  
**Out of scope:** Behavior/visual changes.

### Story 6 — Enum dedup + session-expiry UX (P2)
**Problem:** `copy.gender` overlaps `matchPreferences.partnerGender` (divergence risk); no graceful handling when a session expires mid-use.  
**Outcome:** Single source for gender labels (migrate `matchPreferences.partnerGender` consumers to `copy.gender`, or vice-versa); add a "session expired — sign in again" path on API 401 instead of silent failure.  
**Out of scope:** Broader enum consolidation beyond gender.

---

## Explicitly deferred (long run, not this sprint)

- **Localizing engine analysis output + API error messages** — biggest product i18n gap, but large (touches API/LLM); needs its own epic.
- **External translation pipeline** (i18next/JSON extraction + Crowdin-style tooling) so non-devs can translate — only worth it past 3 locales / with real translators.
- **Locale namespacing / lazy-loading** of copy bundles — current single-object-per-locale is fine at this size.
- **RTL polish** of directional glyphs (e.g. ` →` arrows) — cosmetic.

---

## Sprint-level definition of done

- [ ] HE loads with `dir=rtl` + correct `lang` on first paint (no flash) — verified in browser
- [ ] CI fails on a missing or untranslated locale key (proven with a deliberate temp regression)
- [ ] Documented + verified that no authed page renders protected data before API auth; `AUTH_MODEL.md` exists
- [ ] At least one e2e green in CI (auth redirect + locale + RTL)
- [ ] Locale subscription boilerplate removed in favor of `useAppLocale()`
- [ ] Full UI unit suite still green (baseline **370/370** + any new tests)
