# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_landing_language_settings.md](../../STORY_01_landing_language_settings.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — Story 1 wires Story 0 foundation into **two user-facing surfaces**: public landing (`/`) and authenticated language settings (`/settings/language`).
- **Public landing** replaces any hardcoded copy (including legacy Hebrew joke strings) with `getCopy(locale).landing`; page wrapper sets `dir` + `lang` from locale helpers.
- **Language settings page** lets logged-in users pick **EN / ES / HE**; choice calls `writeStoredLocale` → `LocaleDocumentSync` updates `<html lang dir>` app-wide.
- **Authenticated app shell** subscribes to locale storage/events and wraps product chrome in `dir={getLocaleDirection(locale)}` when user is signed in (RTL for `he`).
- **Nav entry:** avatar menu link to `/settings/language` uses `copy.nav.language` (menu item already exists; ensure label is i18n, not hardcoded English).

**Out of scope for Story 1:** language picker on public landing before sign-in → **Story 7**. Match/conversation page wiring → Stories 2–5.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/components/landing/public-landing-client.tsx` | updated — `getCopy(locale).landing` for title, subtitle, CTA strings, footer links; `dir`/`lang` on `<main>` |
| `dating-ui/src/app/(authenticated)/settings/language/page.tsx` | created/updated — client page with EN/ES/HE `<select>`, `writeStoredLocale` on change |
| `dating-ui/src/components/authenticated-app-shell.tsx` | updated — locale state from storage + events; `getCopy(locale)` for shell strings; outer `dir` wrapper when authenticated |
| `dating-ui/src/components/nav-auth.tsx` | verify — `/settings/language` menu item uses `copy.nav.language` |
| `dating-ui/src/lib/i18n/types.ts` | extend if needed — `landing`, `languageSettings`, `nav.language` keys (minimal; may already exist from Story 0) |
| `dating-ui/src/lib/i18n/en.ts` | `landing.*`, `languageSettings.*`, `nav.language` strings |
| `dating-ui/src/lib/i18n/es.ts` | full mirror |
| `dating-ui/src/lib/i18n/he.ts` | full mirror |

**Optional (recommended DRY, not required for DoD):**

| Path | Change |
|------|--------|
| `dating-ui/src/components/language-picker.tsx` | shared `<select>` used by settings page (Story 7 may reuse on landing) |

**No changes:** `dating-api/*`

**Depends on Story 0 (frozen):** `readStoredLocale`, `writeStoredLocale`, `getCopy`, `getLocaleDirection`, `getLocaleHtmlLang`, `LocaleDocumentSync` in root `providers.tsx`.

---

## Decisions (do not reverse without discussion)

### 1. Landing locale source

| Approach | Verdict |
|----------|---------|
| Hardcoded Hebrew marketing copy | **Rejected** — default `en`; user picks language in Settings (or Story 7 landing picker) |
| Server-side locale from cookie | **Rejected** — Story 0 localStorage contract |
| `readStoredLocale()` on landing mount | **Accepted** — first visit = `en`; returning visitor sees stored choice |

Landing component pattern:

```tsx
const [locale, setLocale] = useState<AppLocale>(() => readStoredLocale());
const copy = getCopy(locale).landing;
const dir = getLocaleDirection(locale);
const lang = getLocaleHtmlLang(locale);

// subscribe to APP_LOCALE_CHANGE_EVENT + storage (same as shell)

return (
  <main dir={dir} lang={lang}>
    <h1>{copy.title}</h1>
    <p>{copy.subtitle}</p>
    {/* Google CTA uses copy.googleSignIn, copy.signingIn, etc. */}
  </main>
);
```

**Error/API strings** from auth context may remain English technical messages in v1; landing chrome must be localized.

**Footer** Privacy/Terms link **labels** use `copy.privacyLink` / `copy.termsLink`; page bodies stay English (sprint decision).

---

### 2. Language settings page contract

**Route:** `/settings/language`  
**Layout:** `(authenticated)` — protected by middleware + `AuthenticatedAppShell`.

```tsx
// settings/language/page.tsx — "use client"
const [locale, setLocale] = useState(() => readStoredLocale());
const copy = getCopy(locale).languageSettings;

function onLocaleChange(next: AppLocale) {
  setLocale(next);
  writeStoredLocale(next); // triggers LocaleDocumentSync + shell re-render
}

return (
  <main>
    <h1>{copy.title}</h1>
    <label htmlFor="settings-language">{copy.label}</label>
    <select id="settings-language" value={locale} onChange={...}>
      <option value="en">{copy.optionEn}</option>
      <option value="es">{copy.optionEs}</option>
      <option value="he">{copy.optionHe}</option>
    </select>
    <p>{copy.description}</p>
  </main>
);
```

**Copy keys (frozen for Story 1):**

| Key | Purpose |
|-----|---------|
| `languageSettings.title` | Page H1 |
| `languageSettings.label` | Select label |
| `languageSettings.description` | Help text (may note engine text still EN) |
| `languageSettings.optionEn/Es/He` | Option labels |

No save button — change is **immediate** on select (persist + event).

---

### 3. Authenticated shell RTL + locale subscription

When `status === "authenticated"` and `user` present:

```tsx
<div dir={getLocaleDirection(locale)}>
  <DatingMainNav copy={getCopy(locale)} locale={locale} ... />
  {children}
</div>
```

Shell must listen to `APP_LOCALE_CHANGE_EVENT` and `storage` on `APP_LOCALE_STORAGE_KEY` (same pattern as landing) so nav labels update without full page reload when user changes language on `/settings/language`.

**Nav labels in Story 1:** at minimum shell error/loading strings (`copy.appShell`, `copy.common`) and avatar menu **Language** item (`copy.nav.language`). Full main nav i18n (`copy.nav.home`, etc.) may ship here or Story 5 — **prefer wiring all `DatingMainNav` labels in Story 1** if keys exist, since shell already loads `getCopy(locale)`.

Pass `locale` into `NavAuth` so account dropdown can use RTL in Story 8 (Story 1 passes prop; menu `dir` is Story 8).

---

### 4. Global document sync (Story 0 integration)

`LocaleDocumentSync` in root `providers.tsx` remains the **single place** that sets `document.documentElement.lang` and `.dir`.

Story 1 surfaces must **not** duplicate document-level sync logic — only page-level `dir` on landing `<main>` and shell wrapper for layout consistency before/after hydration.

---

### 5. i18n keys to add/verify in locale files

**`landing`** (public `/`):

| Key | EN example |
|-----|------------|
| `title` | Find your match |
| `subtitle` | Sign in with Google to get started. |
| `checkingSession` | Checking sign-in… |
| `googleSignIn` | Sign in with Google |
| `signingIn` | Signing in… |
| `retryApi` | Retry connection to API |
| `privacyLink` | Privacy |
| `termsLink` | Terms |

**`languageSettings`** — see §2.

**`nav.language`** — e.g. `"Language"` / `"שפה"` / `"Idioma"`.

---

## Runtime topology (architect — realtime / proxy / cookies only)

- **REST browser target:** unchanged — landing auth still `POST /api/v1/auth/google` via same-origin proxy.
- **Socket browser target:** N/A for Story 1.
- **Cookie host rule:** session cookie only; locale in **localStorage**, not cookie.
- **Connection policy:** N/A.
- **Expected Network tab:** no new endpoints; after settings change, verify `localStorage['dating-ui.locale']` updates and subsequent navigations show localized nav (no extra API calls).

---

## Tests / verification (agent 1 smoke; agent 2 full)

- [ ] `cd dating-ui && npm test` — add/update specs for landing copy + settings page if missing
- [ ] Manual: fresh browser → `/` shows **English** landing
- [ ] Manual: Settings → Hebrew → `<html dir="rtl">`, nav/shell RTL, revisit `/` → Hebrew landing copy
- [ ] `prisma migrate deploy`: N/A

---

## Acceptance criteria mapping

| Story AC | Implementation |
|----------|----------------|
| Landing English by default | `readStoredLocale()` → `en` when empty |
| Hebrew selectable; RTL applies | Settings select `he` → `writeStoredLocale` + shell `dir=rtl` + `LocaleDocumentSync` |
| No TODO on language settings | Page fully wired to `languageSettings` copy |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 12 story 1
```

**Notes for next agent:**

1. Do **not** add landing language picker UI (Story 7) unless product explicitly folds it into Story 1 — architect scope is Settings + localized landing **copy** only.
2. Remove any remaining hardcoded Hebrew/English strings on landing and settings page.
3. Ensure authenticated shell re-renders nav when locale changes on settings page without refresh.
4. No API/Prisma — CR will reject backend diffs.
