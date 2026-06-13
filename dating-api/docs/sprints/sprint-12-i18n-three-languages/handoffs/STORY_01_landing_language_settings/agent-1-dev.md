# Handoff: Agent 1 — Senior dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_landing_language_settings.md](../../STORY_01_landing_language_settings.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- Verified **landing + language settings + authenticated shell** wiring against `agent-0-architect.md` — all artifacts present on branch.
- **Public landing** (`public-landing-client.tsx`): `getCopy(locale).landing`, `dir`/`lang` on `<main>`, locale event/storage subscription, localized footer link labels.
- **Settings** (`/settings/language`): EN/ES/HE `<select>`, immediate `writeStoredLocale` on change, full `languageSettings` copy (no TODOs).
- **Authenticated shell**: locale state + listeners; `getCopy(locale)` for nav/shell strings; outer `dir={getLocaleDirection(locale)}`; `NavAuth` receives `locale`.
- **Nav entry:** avatar menu uses `copy.nav.language` → `/settings/language`.
- **No backend / Prisma changes.**

**Branch note:** `LanguagePicker` on public landing is **Story 7** work already merged on this branch (architect Story 1 scope was settings-only picker). Story 1 AC is still satisfied via Settings path; Story 7 handoff should reference the same component.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/components/landing/public-landing-client.tsx` | verified — localized landing copy + locale subscription |
| `dating-ui/src/app/(authenticated)/settings/language/page.tsx` | verified — language settings page |
| `dating-ui/src/components/authenticated-app-shell.tsx` | verified — locale listeners, RTL wrapper, localized nav |
| `dating-ui/src/components/nav-auth.tsx` | verified — `copy.nav.language` menu link |
| `dating-ui/src/lib/i18n/en.ts` | verified — `landing`, `languageSettings`, `nav` keys |
| `dating-ui/src/lib/i18n/es.ts` | verified — mirror |
| `dating-ui/src/lib/i18n/he.ts` | verified — mirror |
| `dating-ui/src/components/language-picker.tsx` | present — shared select (landing Story 7; settings uses inline select) |

**No changes:** `dating-api/*`

---

## Decisions (do not reverse without discussion)

- Landing auth error strings from `auth-context` remain English technical text (architect v1 allowance).
- Privacy/Terms **page bodies** English; link **labels** localized via `copy.landing`.
- Footer forced `dir="ltr"` on landing for legal link punctuation (intentional).
- Settings page uses inline `<select>` (matches architect contract); `LanguagePicker` optional DRY deferred.

---

## Runtime topology

| Item | Value |
|------|--------|
| REST | Unchanged — Google sign-in via same-origin `/api` |
| Locale storage | `localStorage` key `dating-ui.locale` |
| Document sync | `LocaleDocumentSync` in root providers |
| Browser smoke | **Deferred** — operator: Settings → Hebrew → RTL nav + revisit `/` |

---

## Tests / verification

- [x] Story 0 i18n tests green (`index.spec.ts`, `locale-document-sync.spec.tsx`)
- [ ] Landing i18n assertions — **deferred to agent 2** (existing spec covers referral only)
- [ ] Settings page spec — **deferred to agent 2**
- [ ] Full `npm test` — agent 2 gate
- [ ] `prisma migrate deploy`: N/A

### How to manual smoke

1. Incognito → `/` → English title/subtitle (default `en`).
2. Sign in → avatar menu → **Language** / **שפה** → `/settings/language`.
3. Select **עברית** → `<html dir="rtl">`, main nav Hebrew labels, shell RTL.
4. Sign out → `/` → Hebrew landing copy (stored locale).
5. DevTools → Application → `dating-ui.locale` = `he`.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 12 story 1
```

**Notes for agent 2:**

- CR against `agent-0-architect.md` — no API drift.
- Add tests: landing renders English default copy; settings page renders localized title + persists locale on change.
- Landing `LanguagePicker` is Story 7 overlap — do not fail Story 1 CR for its presence.
- Verify shell nav updates locale without full page reload when changing language on settings page.
