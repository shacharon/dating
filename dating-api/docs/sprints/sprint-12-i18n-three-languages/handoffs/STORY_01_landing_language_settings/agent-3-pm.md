# Handoff: Agent 3 — PM — Story 1

**Agent:** 3 pm  
**Story:** [STORY_01_landing_language_settings.md](../../STORY_01_landing_language_settings.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Story 1 closed as Done (engineering gate)** — localized public landing, authenticated language settings page, shell RTL + nav locale subscription.
- Full pipeline: architect → dev → code review (+6 tests) → pm.
- **No API / Prisma work.**
- Manual browser smoke (Settings → Hebrew → revisit `/`) deferred to **operator / Story 6**.

**Branch note:** Public landing also shows `LanguagePicker` from **Story 7** on the same branch. Story 1 AC is met via Settings path; not a regression.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Schema migrated | N/A | UI-only |
| API implemented | N/A | No backend changes |
| Landing `getCopy()` | Done | `public-landing-client.tsx` + 2 tests |
| `/settings/language` picker | Done | `page.tsx` + 2 tests |
| Shell RTL when `he` | Done | `authenticated-app-shell.tsx` + 2 tests |
| `LocaleDocumentSync` | Done | Story 0; exercised via `writeStoredLocale` |
| Nav → language settings | Done | `nav-auth.tsx` → `copy.nav.language` |
| Tests passing | Done | **335/335** UI |
| Manual smoke | Pending operator | Story 6 sprint checklist |

---

## Acceptance criteria

**3 / 3** story DoD items met.

---

## Sprint 12 progress (Story 1)

| # | Story | Status |
|---|--------|--------|
| 0 | i18n foundation | **Done** |
| 1 | Landing + language settings | **Done** |
| 2–9 | … | Done on branch (pipelines may vary) |
| 6 | Manual smoke | Pending operator |

Handoffs: `handoffs/STORY_01_landing_language_settings/agent-*.md`

---

## Artifacts updated

| Path | Change |
|------|--------|
| `STORY_01_landing_language_settings.md` | Pipeline note, test DoD |
| `handoffs/STORY_01_landing_language_settings/agent-3-pm.md` | this file |

---

## Deferred (not Story 1 blockers)

- Landing language picker before sign-in — **Story 7** (already on branch)
- Privacy/Terms page bodies — English v1
- Auth API error strings on landing — English v1
- Operator manual smoke — Story 6

---

## Tests / verification

- [x] Full UI suite — **335/335** pass
- [ ] Operator manual smoke — pending

### Operator manual smoke (Story 1 / Story 6)

1. Incognito → `/` → English landing.
2. Sign in → avatar menu → Language → `/settings/language`.
3. Select Hebrew → nav RTL, Hebrew labels, `<html dir="rtl">`.
4. Sign out → `/` → Hebrew landing (stored locale).

---

## Open questions / blockers

- None.

---

## Next work

Per sprint order:

```text
--agent 0 sprint 12 story 2
```

**Note:** Stories 2–9 may already be implemented on the branch; re-run agents only if formal handoffs are needed.
