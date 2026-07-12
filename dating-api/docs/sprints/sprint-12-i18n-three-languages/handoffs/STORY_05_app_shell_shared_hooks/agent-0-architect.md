# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_app_shell_shared_hooks.md](../../STORY_05_app_shell_shared_hooks.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — Story 5 wires **authenticated app shell chrome** and confirms the **shared `useAppLocale()` hook** for dating pages.
- **`AuthenticatedAppShell`** uses `getCopy(locale)` for auth-gate strings (`appShell.*`), session loading (`common.*`), and main nav labels (`nav.*` including unread aria).
- **`useAppLocale()`** (Story 0) is the **page-level** locale listener — export from `@/lib/i18n`; dating routes import it instead of duplicating storage/event wiring.
- Shell keeps an **inline locale listener** (same storage + `APP_LOCALE_CHANGE_EVENT` contract) — intentional: layout passes `locale` to `NavAuth` and wraps `dir=rtl` without coupling shell to the page hook.
- Depends on Story 0 (`getCopy`, storage events, `LocaleDocumentSync` in root providers).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/i18n/use-app-locale.ts` | verify — hook implementation |
| `dating-ui/src/lib/i18n/index.ts` | verify — re-export `useAppLocale` |
| `dating-ui/src/components/authenticated-app-shell.tsx` | updated — `appShell`, `common`, `nav` copy + RTL wrapper |
| `dating-ui/src/lib/i18n/types.ts` | verify — `common`, `appShell`, `nav` schema |
| `dating-ui/src/lib/i18n/en.ts` | canonical strings |
| `dating-ui/src/lib/i18n/es.ts` | full mirror |
| `dating-ui/src/lib/i18n/he.ts` | full mirror |
| `dating-ui/src/components/authenticated-app-shell.spec.tsx` | updated by agent 2 — locale + unread EN/HE tests |

**Verify only (Story 0 / other stories):**

| Path | Story |
|------|--------|
| `dating-ui/src/components/locale-document-sync.tsx` | Story 0 |
| `dating-ui/src/app/providers.tsx` | Story 0 |
| `dating-ui/src/components/nav-auth.tsx` | Story 8/9 (`navAuth.*`, dropdown RTL) |

**No changes:** `dating-api/*`, `AuthProvider` logic, `MessagingShellProvider` transport

---

## Decisions (do not reverse without discussion)

### 1. Scope — shell chrome + page hook contract

| Surface | Story |
|---------|--------|
| `useAppLocale()` export + page usage | **Story 5** (hook from Story 0) |
| `AuthenticatedAppShell` auth gates + main nav | **Story 5** |
| `NavAuth` menu copy / RTL dropdown | Story 8 / 9 |
| Per-route page copy (matches, conversations, …) | Stories 1–4 |
| `LocaleDocumentSync` on `<html>` | Story 0 |

---

### 2. Integration pattern

**Pages (prefer hook):**

```tsx
import { useAppLocale } from '@/lib/i18n';

const { locale, copy } = useAppLocale();
// locale for Intl; copy.* for strings
```

**Authenticated app shell (inline listener — do not switch to hook in Story 5):**

```tsx
const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);
// same APP_LOCALE_CHANGE_EVENT + storage listeners as useAppLocale
const copy = getCopy(locale);

// Auth error
{copy.appShell.apiUnreachableTitle}
{copy.appShell.retryConnection}

// Redirect / session gates
{copy.appShell.redirecting}
{copy.common.syncingSession}
{copy.common.checkingSession}
{copy.common.loading}

// Main nav
{copy.nav.home} | {matches} | {conversations} | {profile} | {analysis}
{copy.nav.conversationsUnreadLabel(totalUnread)}

// RTL product chrome
<div dir={getLocaleDirection(locale)}>
  <NavAuth locale={locale} />
  …
</div>
```

**`lastError` from auth context** — render API message as-is when present (not translated).

---

### 3. Copy keys (frozen for Story 5)

**`appShell`:**

| Key | Use |
|-----|-----|
| `apiUnreachableTitle` | Header when `status === 'error'` |
| `retryConnection` | Retry button |
| `redirecting` | Unauthenticated redirect banner |

**`common` (session gates):**

| Key | Use |
|-----|-----|
| `syncingSession` | Loading + session cookie present |
| `checkingSession` | Loading, no cookie yet |
| `loading` | Body placeholder while checking |

**`nav` (main nav only):**

| Key | Use |
|-----|-----|
| `home`, `matches`, `conversations`, `profile`, `analysis` | Nav links |
| `conversationsUnreadLabel(count)` | Unread pill aria on Conversations link |

**Out of shell scope:** `nav.accountSettings`, `nav.language`, etc. — used in `NavAuth` (Story 8/9).

---

### 4. Pages using `useAppLocale()` (verify wired)

| Route / component | File |
|-------------------|------|
| Dating hub | `app/dating/page.tsx` |
| Match list | `me-matches/page.tsx` |
| Match detail | `me-matches/[id]/page.tsx` |
| Celebration modal | `match-celebration-modal.tsx` |
| Conversations list | `conversations/page.tsx` |
| Conversation detail | `conversations/[id]/page.tsx` |
| Analysis | `analysis/page.tsx` |

Do **not** add new page i18n in Story 5 — verify imports only.

---

### 5. Realtime / auth (behavior unchanged)

- `MessagingShellProvider` mounts inside authenticated shell only.
- Nav unread pill reads `useConversationUnread()` — REST list unchanged.
- i18n must not alter socket singleton or auth refresh flow.

---

## Runtime topology (architect — auth / realtime)

Story 5 is **UI copy + locale listeners**; auth and messaging transport unchanged:

| Item | Value |
|------|--------|
| Auth REST | `GET /api/v1/auth/me` via `AuthProvider` (unchanged) |
| Session cookie | UI hostname; shell redirects unauthenticated to `/` with `next` |
| Messaging socket | `MessagingShellProvider` when user authenticated — singleton policy unchanged |
| Locale | `localStorage` + `dating-ui:locale-change`; no i18n API |
| Expected Network tab | Same auth/me + conversations list for nav unread; no new endpoints |
| `prisma migrate deploy` | **N/A** |

**Agent 1 browser smoke:** deferred — i18n-only; existing shell specs mock auth/socket.

---

## Tests / verification (agent 1 smoke; agent 2 full)

- [ ] `cd dating-ui && npm test -- src/components/authenticated-app-shell.spec.tsx`
- [ ] `cd dating-ui && npm test -- src/lib/i18n/index.spec.ts`
- [ ] Existing: RTL wrapper + nav label swap on `writeStoredLocale('he')`
- [ ] Optional agent 2: shell `appShell` error copy when `status === 'error'`; `useAppLocale` returns updated copy on locale event
- [ ] `prisma migrate deploy`: N/A

---

## Acceptance criteria mapping

| Story AC | Implementation |
|----------|----------------|
| Hook exported from `@/lib/i18n` | `index.ts` re-export |
| Shell error state uses copy | `appShell.*` on error branch |
| Session loading strings | `common.*` on loading branches |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 12 story 5
```

**Notes for next agent:**

1. Touch **`authenticated-app-shell.tsx`** (+ verify hook export) for Story 5 DoD.
2. Do not refactor shell to `useAppLocale()` unless tests require it — inline listener is by design.
3. Do not change `NavAuth` menu strings (Story 8/9).
4. Implementation likely **already on branch** — verify and run shell spec before agent 2.
