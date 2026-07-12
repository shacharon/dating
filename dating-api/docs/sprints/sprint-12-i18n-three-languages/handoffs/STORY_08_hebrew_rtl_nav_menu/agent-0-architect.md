# Handoff: Agent 0 — Architect — Story 8

**Agent:** 0 architect  
**Story:** [STORY_08_hebrew_rtl_nav_menu.md](../../STORY_08_hebrew_rtl_nav_menu.md)  
**Sprint:** sprint-12-i18n-three-languages  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — Story 8 fixes **Hebrew RTL alignment** for the authenticated **avatar dropdown** in `NavAuth`.
- Dropdown panel sets **`dir={getLocaleDirection(locale)}`** so Hebrew menu text flows right-to-left; English and Spanish stay LTR.
- Menu row classes use logical **`text-start`** (not `text-left` / `text-right`) so alignment follows `dir`.
- **`locale` prop** is passed from `AuthenticatedAppShell` (Story 5); copy keys (`nav.*`, `navAuth.*`) are already localized from Story 1 — Story 8 is layout-only.
- Depends on Story 0 (`getLocaleDirection`, locale storage) and Story 5 (`NavAuth locale={locale}`).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/components/nav-auth.tsx` | updated — `menuDir`, `dir={menuDir}` on dropdown; `text-start` on menu item classes |
| `dating-ui/src/components/authenticated-app-shell.tsx` | verify-only — passes `locale` to `NavAuth` (Story 5) |
| `dating-ui/src/lib/i18n/index.ts` | verify — `getLocaleDirection()` |
| `dating-ui/src/components/nav-auth.spec.tsx` | created by agent 2 — RTL/LTR menu `dir` tests |

**No changes:** `dating-api/*`, menu copy strings, avatar positioning (`absolute right-0`), shell outer `dir` wrapper

---

## Decisions (do not reverse without discussion)

### 1. Scope — dropdown panel RTL only

| Surface | Story |
|---------|--------|
| Account dropdown `dir` + item `text-start` | **Story 8** |
| `NavAuth` menu copy (`nav.*`, `navAuth.*`) | Story 1 |
| Shell passes `locale` to `NavAuth` | Story 5 |
| Avatar button position (`right-0` anchor) | Unchanged — physical corner placement, not text direction |
| Main nav links RTL | Story 5 shell wrapper (`dir` on product chrome) |

---

### 2. Integration pattern

**`NavAuth` (Story 8 contract):**

```tsx
import { DEFAULT_LOCALE, getCopy, getLocaleDirection, type AppLocale } from '@/lib/i18n';

export function NavAuth({ locale = DEFAULT_LOCALE }: { locale?: AppLocale }) {
  const copy = getCopy(locale);
  const menuDir = getLocaleDirection(locale);

  const menuItemClass =
    'block w-full px-4 py-2 text-start text-sm …';

  // Dropdown panel only — not the avatar button
  {menuOpen ? (
    <div role="menu" dir={menuDir} …>
      <Link className={menuItemClass}>…</Link>
      …
    </div>
  ) : null}
}
```

**Parent shell (verify, do not rewire in Story 8):**

```tsx
<div dir={getLocaleDirection(locale)}>
  …
  <NavAuth locale={locale} />
</div>
```

Nested `dir`: shell sets document chrome; dropdown **re-declares** `dir` on the menu panel so items align correctly even if future layout changes isolate the menu from the shell wrapper.

---

### 3. Direction matrix (frozen for Story 8)

| Locale | `getLocaleDirection` | Dropdown `dir` | Item alignment |
|--------|------------------------|----------------|----------------|
| `en` | `ltr` | `ltr` | start = left |
| `es` | `ltr` | `ltr` | start = left |
| `he` | `rtl` | `rtl` | start = right |

**Forbidden in menu items:** `text-left`, `text-right`, hardcoded `dir="ltr"` on the dropdown panel.

---

### 4. Copy keys (verify-only — not Story 8 edits)

| Namespace | Keys used in menu |
|-----------|-------------------|
| `navAuth` | `accountMenuAria`, `apiUnreachable`, `dismiss`, `signIn` |
| `nav` | `accountSettings`, `editBasicProfile`, `editStoryProfile`, `language`, `logout` |
| `profile` | `matchPreferencesLink` |

---

## Runtime topology (architect — auth / cookies)

| Item | Value |
|------|--------|
| REST | Unchanged — menu actions are client-side navigation + `logout()` |
| Locale storage | `localStorage` key `dating-ui.locale`; shell listener updates `NavAuth` prop |
| Cookie | Session HttpOnly — unrelated to menu `dir` |
| Document sync | `LocaleDocumentSync` sets `<html dir>` (Story 0); menu adds local `dir` on panel |
| Expected Network tab | Same auth/me endpoints; no i18n API |
| `prisma migrate deploy` | **N/A** |

---

## Tests / verification (agent 1 smoke; agent 2 full)

- [ ] `cd dating-ui && npm test -- src/components/nav-auth.spec.tsx` (agent 2 creates)
- [ ] Open avatar menu with `locale="he"` → panel has `dir="rtl"`
- [ ] Open avatar menu with `locale="en"` (default) → panel has `dir="ltr"`
- [ ] Menu item links/buttons use class containing `text-start` (no `text-left`)
- [ ] `authenticated-app-shell.spec.tsx` still green (NavAuth mocked — no regression)
- [ ] `prisma migrate deploy`: N/A

**Suggested agent 2 tests:**

```tsx
// nav-auth.spec.tsx — mock useAuth authenticated user, click avatar, assert role="menu" dir
render(<NavAuth locale="he" />);
fireEvent.click(screen.getByRole('button', { name: /…account menu/i }));
expect(screen.getByRole('menu')).toHaveAttribute('dir', 'rtl');
```

Use Hebrew `copy.navAuth.accountMenuAria` for button query when testing `locale="he"`.

---

## Acceptance criteria mapping

| Story AC | Implementation |
|----------|----------------|
| Account menu uses `dir=rtl` when locale is `he` | `dir={getLocaleDirection(locale)}` on dropdown panel |
| Menu items use logical `text-start` | `menuItemClass` / `menuItemDisabledClass` |
| EN/ES menus unchanged (LTR) | `getLocaleDirection('en'|'es')` → `ltr` |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 12 story 8
```

**Notes for next agent:**

1. Touch **`nav-auth.tsx` only** for Story 8 DoD — implementation likely **already on branch**; verify against this handoff.
2. Do not change menu strings or add new copy keys.
3. Do not refactor shell locale wiring — Story 5 owns `NavAuth locale={locale}`.
4. Agent 2 should add **`nav-auth.spec.tsx`** — no dedicated NavAuth tests exist today (shell mocks NavAuth).
