# Handoff: Agent 1 — Senior dev — Story 0

**Agent:** 1 dev  
**Story:** [STORY_00_i18n_foundation.md](../../STORY_00_i18n_foundation.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- Verified **i18n foundation module** matches `agent-0-architect.md` — all listed artifacts present in repo.
- **`SUPPORTED_LOCALES`:** `en`, `es`, `he`; **`DEFAULT_LOCALE`:** `en`; invalid storage → `en`.
- **`getCopy(locale)`** registry over `enCopy` / `esCopy` / `heCopy`; all three compile against shared `AppCopySchema`.
- **Storage:** `dating-ui.locale` + `dating-ui:locale-change` custom event; `readStoredLocale` / `writeStoredLocale` implemented.
- **Direction:** `getLocaleDirection` → RTL only for `he`; `getLocaleHtmlLang` returns locale code.
- **`useAppLocale()`** hook returns `{ locale, copy }` with storage + cross-tab listeners.
- **`LocaleDocumentSync`** mounted in root `Providers` — sets `<html lang dir>` on load and locale change.
- **No backend / Prisma changes.**

**Note:** `AppCopySchema` in the working tree includes sections beyond Story 0 minimum (`matches`, `conversations`, etc.) from later Sprint 12 work merged in the same branch. Story 0 foundation keys (`common`, `landing`, `languageSettings`) and helpers are present; no Story 0 scope creep into page wiring required here.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/i18n/types.ts` | verified — locale union + `AppCopySchema` |
| `dating-ui/src/lib/i18n/en.ts` | verified — canonical copy |
| `dating-ui/src/lib/i18n/es.ts` | verified — full schema mirror |
| `dating-ui/src/lib/i18n/he.ts` | verified — full schema mirror |
| `dating-ui/src/lib/i18n/index.ts` | verified — registry, storage, direction helpers |
| `dating-ui/src/lib/i18n/use-app-locale.ts` | verified — React hook |
| `dating-ui/src/lib/i18n/index.spec.ts` | verified — 5 unit tests |
| `dating-ui/src/components/locale-document-sync.tsx` | verified — document `lang`/`dir` sync |
| `dating-ui/src/app/providers.tsx` | verified — `<LocaleDocumentSync />` inside `AuthProvider` |

**No changes:** `dating-api/*`

---

## Decisions (do not reverse without discussion)

- No i18next / next-intl — plain typed objects per architect.
- Locale persistence is **localStorage only** (no cookie, no DB field).
- Invalid stored locale silently falls back to `en` (no error UI at foundation layer).
- `t(locale, section)` helper exported for section-scoped access (optional sugar; `getCopy` is primary).

---

## Runtime topology

| Item | Value |
|------|--------|
| REST | Unchanged — locale does not alter API paths |
| Socket | N/A |
| Cookie | Session only — **no locale cookie** |
| Browser smoke | **Deferred** — Story 1+ wires Settings picker; verify `localStorage['dating-ui.locale']` then |

---

## Tests / verification

- [x] `cd dating-ui && npm test -- src/lib/i18n/index.spec.ts` → **5/5 pass**
- [ ] Full `npm test` suite: not re-run this step (agent 2 gate); i18n module green
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: N/A (no new network behavior)

### How to manual smoke (operator / Story 1)

1. Open DevTools → Application → Local Storage; confirm key `dating-ui.locale` absent on first visit.
2. After Story 1 settings wired: set `he` → `<html dir="rtl" lang="he">` via `LocaleDocumentSync`.
3. Refresh → locale persists from storage.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 12 story 0
```

**Notes for agent 2:**

- CR against `agent-0-architect.md` — confirm **no API/Prisma** files touched.
- Add/verify tests: invalid locale fallback, `writeStoredLocale` dispatches event, `LocaleDocumentSync` sets `document.documentElement.dir` for `he`.
- Do not require full-app page wiring in Story 0 CR — foundation module only.
- `AppCopySchema` size in repo may exceed Story 0 minimal set; CR should not reject if `en`/`es`/`he` compile together.
