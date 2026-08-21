# Story 03 — Auth cookie + locale + error primitives

**Sprint 56 · Done · P1 · ~1.5d · Agents 2.5 + 3.5**

**Status:** Done  
**Tip:** `feature/sprint-56-story-3` @ `b3b0df7` (impl `6724973`, CR `36d5a14`, UX `0807461`)

Single session-cookie helper for middleware + client. Kill duplicate APP_LOCALE listeners (use `useAppLocale` only). Shared `InlineError` / `RouteError` (role=alert, i18n, product palette).

## Definition of done

- [x] Middleware + client share `getSessionCookieName`; `hasSessionCookie` presence-only semantics documented
- [x] Copy-driving duplicate locale listeners → `useAppLocale`; `LocaleDocumentSync` retained
- [x] `InlineError` + `RouteError` landed; P0 adoption; purple route CTAs gone
- [x] Specs green; Agent 2 + 2.5 + 3.5 approved; Agent 3 closes
- [x] Browser auth smoke deferred with tracker → Agent 5 / operator
