# Sprint 12: i18n — English, Spanish, Hebrew

**Epic:** One language system for the product UI  
**Duration:** ~2 weeks (9 stories)  
**Goal:** English default; Spanish aligned; Hebrew secondary with RTL. User picks language on landing or in Settings; all main dating flows follow the choice.  
**Status:** Engineering complete (Stories 0–9 done; Story 6 manual smoke pending operator)  
**Depends on:** Sprint 9 launch UX (empty state, analysis panel already on i18n contract)

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Default locale | **`en`** (English main) |
| Supported locales | **`en`**, **`es`**, **`he`** |
| Storage | `localStorage` key `dating-ui.locale` + `dating-ui:locale-change` event |
| RTL | **`he` only** — `document.documentElement.dir` + page wrappers |
| Engine/API text | **English for v1** — match chips, summaries, traits from server stay EN |
| Legal pages | **English for v1** — Privacy/Terms not translated this sprint |

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 0 | [i18n foundation](./STORY_00_i18n_foundation.md) | **Done** | — |
| 1 | [Landing + language settings](./STORY_01_landing_language_settings.md) | **Done** | Story 0 |
| 2 | [Match browse i18n](./STORY_02_match_browse_i18n.md) | **Done** | Story 0 |
| 3 | [Match detail i18n](./STORY_03_match_detail_i18n.md) | **Done** | Story 2 |
| 4 | [Conversations i18n](./STORY_04_conversations_i18n.md) | **Done** | Story 0 |
| 5 | [App shell + shared hooks](./STORY_05_app_shell_shared_hooks.md) | **Done** | Story 0 |
| 6 | [Manual smoke](./STORY_06_manual_smoke.md) | Pending operator | Stories 1–5 |
| 7 | [Landing language picker](./STORY_07_landing_language_picker.md) | **Done** | Story 1 |
| 8 | [Hebrew RTL nav menu](./STORY_08_hebrew_rtl_nav_menu.md) | **Done** | Story 0 |
| 9 | [Hebrew touch-up](./STORY_09_hebrew_touchup.md) | **Done** | Stories 2–5 |

**Order:** 0 → 1 → 2 → 3 → 4 → 5 → 7 → 8 → 9 → 6

---

## Manual smoke (sprint-level)

1. Fresh browser → landing in **English**; language picker visible before sign-in.
2. Landing → **Hebrew** → copy + RTL on `/`; sign in → nav menu RTL-aligned.
3. Settings → **Spanish** → match list + detail buttons in Spanish.
4. Match list, detail actions, conversations list + chat composer follow locale.
5. Match engine chips / “About them” body still **English** (expected v1 gap).

---

## Deferred (Sprint 13+)

- Localized match explainability from API
- Privacy / Terms in 3 languages
- Analysis **body** text from LLM (page chrome is localized; hero/insights from engine stay EN)
- Onboarding form field labels (if any remain EN)
