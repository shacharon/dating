# Handoff: Agent 1 — Senior dev — Story 7

**Agent:** 1 dev  
**Story:** [STORY_07_landing_language_picker.md](../../STORY_07_landing_language_picker.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- Verified **landing language picker** against `agent-0-architect.md` — all artifacts present on branch; no new code required for Story 7 DoD.
- **`LanguagePicker`** — shared component using `copy.languageSettings` + `writeStoredLocale()` + optional `onLocaleChange`.
- **`PublicLandingClient`** mounts picker in `showCta` block (`unauthenticated` / `error` / `signingIn`); hidden during session bootstrap loading.
- Landing locale listeners + `main dir`/`lang` align with stored locale; **`LocaleDocumentSync`** handles document root (Story 0).
- **`/settings/language`** — verify-only; same `dating-ui.locale` storage key (Story 1).
- **No backend / Prisma changes.**

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/components/language-picker.tsx` | verified — shared picker component |
| `dating-ui/src/components/landing/public-landing-client.tsx` | verified — `LanguagePicker` in CTA block |
| `dating-ui/src/lib/i18n/types.ts` | verified — `languageSettings.*` |
| `dating-ui/src/lib/i18n/en.ts` | verified — `languageSettings` + `landing.*` |
| `dating-ui/src/lib/i18n/es.ts` | verified — mirror |
| `dating-ui/src/lib/i18n/he.ts` | verified — mirror |
| `dating-ui/src/components/locale-document-sync.tsx` | verified — Story 0 |
| `dating-ui/src/app/(authenticated)/settings/language/page.tsx` | verified — unchanged behavior |
| `dating-ui/src/components/landing/public-landing-client.spec.tsx` | existing — 3 tests green |

**No changes:** `dating-api/*`, Google auth, settings page refactor to `LanguagePicker`

---

## Decisions (do not reverse without discussion)

- Picker uses `languageSettings` copy keys (shared with settings page labels).
- Settings page keeps inline `<select>` — not refactored to `LanguagePicker` (out of scope).
- Footer legal links stay `dir=ltr` / `lang=en` per sprint decision.

---

## Runtime topology

| Item | Value |
|------|--------|
| REST | Auth Google + referral unchanged |
| Locale | `localStorage` + `writeStoredLocale` + document sync |
| Browser smoke | **Deferred** — operator / Story 6 |

---

## Tests / verification

- [x] `cd dating-ui && npm test -- src/components/landing/public-landing-client.spec.tsx` → **3/3 pass**
- [x] `cd dating-ui && npm test -- src/app/(authenticated)/settings/language/page.spec.tsx` → **2/2 pass**
- [ ] Full `npm test` — agent 2 gate
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: deferred

### How to manual smoke

1. Open `/` (logged out) → language dropdown above Google sign-in; default English.
2. Select Hebrew → landing title RTL + Hebrew copy immediately.
3. Sign in → app shell/nav follow Hebrew from same storage.
4. Settings → Language → change locale still works.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 12 story 7
```

**Notes for agent 2:**

- CR against `agent-0-architect.md` — `LanguagePicker` + landing mount only.
- Optional: test picker visible + `<select>` change updates H1 without reload.
- Do not fail CR for settings page not using `LanguagePicker` component.
