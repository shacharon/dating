# Story 0: i18n foundation

**Sprint:** 12  
**Status:** Done  
**Depends on:** —  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

- `SUPPORTED_LOCALES`: `en`, `es`, `he`
- Typed `AppCopySchema` + `getCopy(locale)`
- `he.ts` full copy mirror
- `getLocaleDirection`, `getLocaleHtmlLang`
- `useAppLocale()` hook + `LocaleDocumentSync` in root providers
- Unit tests: `dating-ui/src/lib/i18n/index.spec.ts` (7), `locale-document-sync.spec.tsx` (3)

---

## Definition of done

- [x] Hebrew in locale union
- [x] Default remains `en`
- [x] All three locale files compile against same schema
- [x] Storage + document `lang`/`dir` sync tested
- [x] UI tests **329/329** pass (full suite)
