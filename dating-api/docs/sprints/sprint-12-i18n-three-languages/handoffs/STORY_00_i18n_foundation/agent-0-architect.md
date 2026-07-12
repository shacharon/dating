# Handoff: Agent 0 — Architect — Story 0

**Agent:** 0 architect  
**Story:** [STORY_00_i18n_foundation.md](../../STORY_00_i18n_foundation.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — locale is a **client-only UI concern** for Sprint 12 v1.
- **Foundation module** in `dating-ui/src/lib/i18n/` — typed copy contract, three locale files, storage helpers, direction helpers, unit tests.
- **Default locale remains `en`**; supported locales **`en`**, **`es`**, **`he`**; Hebrew is **RTL only**.
- **Persistence:** `localStorage` key + custom event; `<html lang dir>` synced globally via `LocaleDocumentSync` in app providers.
- **Migration strategy:** expand `AppCopySchema` incrementally per story; do **not** introduce a runtime i18n library (no i18next/react-intl) in v1.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/i18n/types.ts` | created — `SUPPORTED_LOCALES`, `AppLocale`, `DEFAULT_LOCALE`, `AppCopySchema` |
| `dating-ui/src/lib/i18n/en.ts` | created — `enCopy: AppCopySchema` (canonical / default strings) |
| `dating-ui/src/lib/i18n/es.ts` | created — `esCopy: AppCopySchema` (full mirror of schema) |
| `dating-ui/src/lib/i18n/he.ts` | created — `heCopy: AppCopySchema` (full mirror of schema) |
| `dating-ui/src/lib/i18n/index.ts` | created — registry, `getCopy`, storage, direction helpers |
| `dating-ui/src/lib/i18n/use-app-locale.ts` | created — React hook: `{ locale, copy }` + storage/event listeners |
| `dating-ui/src/lib/i18n/index.spec.ts` | created — locale union, default, RTL, copy smoke |
| `dating-ui/src/components/locale-document-sync.tsx` | created — sync `document.documentElement.lang` + `.dir` |
| `dating-ui/src/app/providers.tsx` | updated — mount `<LocaleDocumentSync />` |

**No changes:** `dating-api/*`

---

## Decisions (do not reverse without discussion)

### 1. No server-side locale (v1)

| Approach | Verdict |
|----------|---------|
| `Accept-Language` header → API localized responses | **Deferred** — match engine text stays EN |
| User profile field `preferredLocale` in DB | **Deferred** — localStorage sufficient for MVP |
| Cookie for locale | **Rejected** — unnecessary; no SSR locale routing in v1 |

Locale choice is **browser localStorage only**. Logged-out and logged-in users share the same key.

---

### 2. Storage contract (frozen)

```typescript
export const APP_LOCALE_STORAGE_KEY = "dating-ui.locale";
export const APP_LOCALE_CHANGE_EVENT = "dating-ui:locale-change";

export function readStoredLocale(): AppLocale; // invalid/missing → "en"
export function writeStoredLocale(locale: AppLocale): void; // sets storage + dispatches event
```

**Rules:**

- Invalid stored value → fall back to `DEFAULT_LOCALE` (`en`).
- `writeStoredLocale` must dispatch `CustomEvent<AppLocale>` so in-tab UI updates without reload.
- Cross-tab: listen to `storage` event on `APP_LOCALE_STORAGE_KEY`.

---

### 3. Typed copy contract

```typescript
export const SUPPORTED_LOCALES = ["en", "es", "he"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "en";

export type AppCopySchema = {
  common: { loading: string; save: string; /* … */ };
  landing: { title: string; /* … */ };
  languageSettings: { title: string; optionEn: string; optionEs: string; optionHe: string; /* … */ };
  // … sections added by later stories — all three locale files must compile together
};

export function getCopy(locale?: AppLocale): AppCopySchema;
```

**Rules:**

- `en.ts` is the **source of truth** for key shape; `es.ts` + `he.ts` must satisfy `AppCopySchema` at compile time.
- Start **minimal** in Story 0 (`common`, `landing`, `languageSettings` at minimum); later stories extend the schema — never duplicate string literals in components once wired.
- Function-valued keys (e.g. `(name: string) => string`) allowed for interpolation; keep signatures identical across locales.

---

### 4. Direction + HTML lang

```typescript
export function getLocaleDirection(locale: AppLocale): "ltr" | "rtl" {
  return locale === "he" ? "rtl" : "ltr";
}
export function getLocaleHtmlLang(locale: AppLocale): string {
  return locale; // "en" | "es" | "he"
}
```

| Locale | `dir` | Notes |
|--------|-------|-------|
| `en` | `ltr` | default |
| `es` | `ltr` | |
| `he` | `rtl` | menu, forms, page wrappers use logical CSS (`text-start`, not `text-left`) |

Global sync: `LocaleDocumentSync` sets `document.documentElement.lang` and `.dir` on load + on locale change.

Individual surfaces may also set `dir`/`lang` on `<main>` when rendered before shell sync (e.g. public landing).

---

### 5. React integration pattern

```typescript
// use-app-locale.ts
export function useAppLocale(): { locale: AppLocale; copy: AppCopySchema };
```

**Usage (later stories):**

```tsx
const { locale, copy } = useAppLocale();
return <h1>{copy.matches.list.title}</h1>;
```

Server components without hook: pass `locale` from client parent or use `readStoredLocale()` only in client boundaries.

---

### 6. Out of scope (explicit v1 gaps)

- API / LLM / match explainability localization
- Privacy / Terms page translation
- `next-intl` route segments (`/he/...`)
- Email notification locale

Document these as known gaps in PM closeout, not blockers for Story 0.

---

## Runtime topology (architect — realtime / proxy / cookies only)

- **REST browser target:** unchanged — same-origin `/api` via Next rewrite; locale does not affect API URLs.
- **Socket browser target:** N/A for Story 0.
- **Cookie host rule:** session cookie unchanged; **no locale cookie**.
- **Connection policy:** N/A.
- **Expected Network tab:** no new requests from i18n; verify `localStorage` key `dating-ui.locale` updates on language change in Settings (Story 1+).

---

## Tests / verification

- [x] Unit command: `cd dating-ui && npm test -- src/lib/i18n/index.spec.ts`
- [x] Result: pass (5 tests — default, union, copy smoke, RTL, html lang)
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: N/A (no transport)
- [ ] Socket transport: N/A

**Agent 1 must also run:** full `cd dating-ui && npm test` after wiring any missing files.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 12 story 0
```

**Notes for next agent:**

1. Implement (or verify) all artifacts in the table above; Story 0 DoD is **compile + tests green**, not feature wiring across the app.
2. `AppCopySchema` in Story 0 should be **small** — only keys needed for Story 1 landing/settings unless already expanded; do not wire every page in Story 0.
3. Ensure `LocaleDocumentSync` is mounted in root providers so RTL applies app-wide when user picks Hebrew.
4. Do **not** add API or Prisma changes — CR will reject scope creep.
