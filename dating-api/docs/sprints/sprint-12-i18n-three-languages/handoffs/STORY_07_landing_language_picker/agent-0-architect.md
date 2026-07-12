# Handoff: Agent 0 — Architect — Story 7

**Agent:** 0 architect  
**Story:** [STORY_07_landing_language_picker.md](../../STORY_07_landing_language_picker.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — Story 7 adds a **shared `LanguagePicker`** on the **public landing** (`/`) so visitors can choose locale **before** Google sign-in.
- **`LanguagePicker`** calls `writeStoredLocale()` → persists `localStorage` + dispatches `dating-ui:locale-change` → **`LocaleDocumentSync`** updates `<html lang dir>` and landing re-renders via local state + event listeners.
- Reuses **`copy.languageSettings`** (label + option labels) — same strings as `/settings/language` (Story 1).
- **Default English** when no stored locale (`readStoredLocale()` → `en`).
- **`/settings/language`** unchanged in behavior — verify-only for AC “Settings still works”.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/components/language-picker.tsx` | created — shared `<select>` + `writeStoredLocale` |
| `dating-ui/src/components/landing/public-landing-client.tsx` | updated — mount `LanguagePicker` in CTA block |
| `dating-ui/src/lib/i18n/types.ts` | verify — `languageSettings.*` (Story 0/1) |
| `dating-ui/src/lib/i18n/en.ts` | verify — `languageSettings` + `landing.*` |
| `dating-ui/src/lib/i18n/es.ts` | full mirror |
| `dating-ui/src/lib/i18n/he.ts` | full mirror |
| `dating-ui/src/components/locale-document-sync.tsx` | verify — `<html lang dir>` (Story 0) |
| `dating-ui/src/app/(authenticated)/settings/language/page.tsx` | verify-only — still writes same storage key |
| `dating-ui/src/components/landing/public-landing-client.spec.tsx` | updated by agent 2 — picker + locale change tests |

**No changes:** `dating-api/*`, Google auth flow, referral attribution

---

## Decisions (do not reverse without discussion)

### 1. Scope — landing picker only

| Surface | Story |
|---------|--------|
| `LanguagePicker` component | **Story 7** |
| Landing mounts picker in Google CTA block | **Story 7** |
| Landing copy (`landing.*`) | Story 1 (already wired) |
| Settings language page | Story 1 — **verify only** |
| Refactor settings to use `LanguagePicker` | Out of scope (optional follow-up) |

---

### 2. Integration pattern

**`LanguagePicker`:**

```tsx
import { getCopy, getLocaleDirection, writeStoredLocale, type AppLocale } from '@/lib/i18n';

// Props: locale, onLocaleChange?, className?, id?
const copy = getCopy(locale).languageSettings;

function onChange(next: AppLocale) {
  writeStoredLocale(next);       // localStorage + APP_LOCALE_CHANGE_EVENT
  onLocaleChange?.(next);        // parent optimistic re-render
}

// Render: label + <select en|es|he> with dir={getLocaleDirection(locale)}
```

**`PublicLandingClient`:**

```tsx
const [locale, setLocale] = useState(() => readStoredLocale());
const copy = getCopy(locale).landing;
// inline APP_LOCALE_CHANGE_EVENT + storage listeners (same contract as useAppLocale)

const showCta =
  status === 'unauthenticated' || status === 'error' || signingIn;

{showCta ? (
  <>
    <LanguagePicker
      locale={locale}
      onLocaleChange={setLocale}
      id="landing-language-picker"
    />
    {/* Google CTA, errors, retry */}
  </>
) : null}
```

Picker **hidden** when `showBootstrapLoading` (session cookie + auth loading) — returning user path only.

---

### 3. Copy keys (frozen for Story 7)

**From `languageSettings` (picker UI):**

| Key | Use |
|-----|-----|
| `label` | Select label above dropdown |
| `optionEn`, `optionEs`, `optionHe` | `<option>` text |

**From `landing` (page body — Story 1, not new in Story 7):**

| Key | Use |
|-----|-----|
| `title`, `subtitle` | H1 + lead |
| `googleSignIn`, `signingIn`, `checkingSession`, `retryApi` | CTA block |
| `privacyLink`, `termsLink` | Footer (footer stays `dir=ltr` / `lang=en`) |

---

### 4. Visibility rules (AC)

| Auth state | Picker visible? |
|------------|-----------------|
| `unauthenticated` | Yes (with Google CTA) |
| `error` | Yes (+ retry button) |
| `signingIn` | Yes |
| `loading` + session cookie | No — `checkingSession` only |
| `authenticated` | No — redirect to `next` |

---

### 5. Persistence + RTL

1. User selects Hebrew on landing → `writeStoredLocale('he')`.
2. `PublicLandingClient` updates `locale` → `main dir=rtl lang=he`, landing copy from `heCopy.landing`.
3. `LocaleDocumentSync` sets `document.documentElement.dir/lang`.
4. After sign-in → authenticated shell reads same storage key (Story 5).

---

## Runtime topology (architect — auth / cookies)

| Item | Value |
|------|--------|
| REST | Unchanged — `POST /api/v1/auth/google`, referral beacon optional |
| Locale storage | `localStorage` key `dating-ui.locale` only |
| Cookie | Session HttpOnly — unrelated to locale |
| Document sync | `LocaleDocumentSync` in root `Providers` |
| Expected Network tab | Same auth endpoints; no i18n API |
| `prisma migrate deploy` | **N/A** |

---

## Tests / verification (agent 1 smoke; agent 2 full)

- [ ] `cd dating-ui && npm test -- src/components/landing/public-landing-client.spec.tsx`
- [ ] Picker visible when `status === 'unauthenticated'`
- [ ] Default EN when storage empty; HE when stored
- [ ] Optional agent 2: change `<select>` → landing H1 updates + `writeStoredLocale` called
- [ ] Settings page spec still green — `settings/language/page.spec.tsx`
- [ ] `prisma migrate deploy`: N/A

---

## Acceptance criteria mapping

| Story AC | Implementation |
|----------|----------------|
| Selector visible when Google CTA shown | `showCta` block includes `LanguagePicker` |
| Default English first visit | `readStoredLocale()` → `en` |
| Persists + updates copy + `dir` immediately | `writeStoredLocale` + listeners + `LocaleDocumentSync` |
| Settings → Language still works | Same storage key; verify Story 1 page |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 12 story 7
```

**Notes for next agent:**

1. Touch **`language-picker.tsx`** + **`public-landing-client.tsx`** for Story 7 DoD.
2. Do not refactor settings page to use `LanguagePicker` unless required for tests.
3. Implementation likely **already on branch** — verify against this handoff.
4. Footer legal links stay LTR/EN per sprint decision.
