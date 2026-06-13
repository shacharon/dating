# Handoff: Agent 1 — Senior dev — Story 5

**Agent:** 1 dev  
**Story:** [STORY_05_app_shell_shared_hooks.md](../../STORY_05_app_shell_shared_hooks.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- Verified **app shell + shared hook** against `agent-0-architect.md` — all artifacts present on branch; no new code required for Story 5 DoD.
- **`useAppLocale()`** exported from `@/lib/i18n` and used on all dating pages listed in architect handoff (hub, matches, detail, celebration, conversations, analysis).
- **`AuthenticatedAppShell`** uses inline locale listener + `getCopy(locale)` for `appShell.*`, `common.*` session gates, and `nav.*` (including `conversationsUnreadLabel`); wraps authenticated chrome in `dir={getLocaleDirection(locale)}`.
- **`lastError`** from auth context renders unchanged when present (not translated).
- **`NavAuth`** / `LocaleDocumentSync` — verify-only (Stories 8/9 / Story 0).
- **No backend / Prisma changes.**

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/i18n/use-app-locale.ts` | verified — hook + storage/event listeners |
| `dating-ui/src/lib/i18n/index.ts` | verified — re-export `useAppLocale` |
| `dating-ui/src/components/authenticated-app-shell.tsx` | verified — `appShell`, `common`, `nav` copy + RTL wrapper |
| `dating-ui/src/lib/i18n/types.ts` | verified — `common`, `appShell`, `nav` schema |
| `dating-ui/src/lib/i18n/en.ts` | verified — canonical strings |
| `dating-ui/src/lib/i18n/es.ts` | verified — mirror |
| `dating-ui/src/lib/i18n/he.ts` | verified — mirror |
| `dating-ui/src/components/authenticated-app-shell.spec.tsx` | existing — 5 tests green |

**No changes:** `dating-api/*`, `nav-auth.tsx`, `AuthProvider`, `MessagingShellProvider`

---

## Decisions (do not reverse without discussion)

- Shell uses **inline locale listener** (not `useAppLocale()`) — passes `locale` to `NavAuth` per architect.
- Session loading: `common.syncingSession` / `checkingSession` / `loading` on loading branches.
- Auth error: `appShell.apiUnreachableTitle` + `retryConnection`.

---

## Runtime topology

| Item | Value |
|------|--------|
| Auth | `GET /api/v1/auth/me` unchanged |
| Nav unread | `fetchMyConversations` via unread context — unchanged |
| Locale | localStorage + `useAppLocale()` / shell listeners |
| Browser smoke | **Deferred** — operator / Story 6 |

---

## Tests / verification

- [x] `cd dating-ui && npm test -- src/components/authenticated-app-shell.spec.tsx` → **5/5 pass**
- [x] `cd dating-ui && npm test -- src/lib/i18n/index.spec.ts` → **7/7 pass**
- [ ] Full `npm test` — agent 2 gate
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: deferred

### How to manual smoke

1. Break API (stop server) → shell shows localized “Cannot reach dating-api” + Retry (EN default).
2. Settings → Hebrew → main nav shows `בית`, `התאמות`, `שיחות`; chrome `dir=rtl`.
3. Unread conversations → nav pill aria uses Hebrew label when locale is `he`.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 12 story 5
```

**Notes for agent 2:**

- CR against `agent-0-architect.md` — shell + hook export only; do not scope `NavAuth`.
- Optional: test `appShell` error branch copy; `useAppLocale` locale change in a small hook test.
