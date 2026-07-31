# Story 6: Fix root `lang="en"` SSR mismatch for RTL

**Priority:** P0 (Critical)  
**Estimated effort:** 0.5 day  
**Agent:** `generalPurpose`  
**Dependencies:** None

---

## Problem

Root layout has hardcoded `<html lang="en">`. `LocaleDocumentSync` fixes it client-side after hydration, causing:
- Flash of wrong `lang` and `dir` for Hebrew users
- Incorrect initial accessibility tree (screen readers see English)
- Hydration mismatch warning in console

---

## Goal

Server-render correct `lang` and `dir` attributes based on user's locale (from cookie or header).

---

## Acceptance Criteria

- [ ] Root layout reads locale from cookie/header (server-side)
- [ ] `<html lang={locale} dir={dir}>` server-rendered correctly
- [ ] No hydration mismatch warning
- [ ] Hebrew users see `dir="rtl"` from first paint (no flash)
- [ ] `LocaleDocumentSync` removed OR scoped to client-only locale switches
- [ ] Test with Hebrew user (cookie `locale=he`)
- [ ] Test with English user (cookie `locale=en`)
- [ ] Commit follows convention

---

## Current code (problem)

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"> {/* ⚠️ Hardcoded, causes flash for RTL users */}
      <body>
        <LocaleDocumentSync /> {/* Fixes it after hydration */}
        {children}
      </body>
    </html>
  );
}
```

```typescript
// components/locale-document-sync.tsx (runs client-side)
'use client';

export function LocaleDocumentSync() {
  const { locale } = useAppLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
  }, [locale]);

  return null;
}
```

---

## Proposed solution

### app/layout.tsx (server component)
```typescript
import { cookies } from 'next/headers';
import type { Locale } from '@/lib/i18n/types';

// Helper to get locale from cookie (server-side)
function getServerLocale(): Locale {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('locale');
  const locale = localeCookie?.value as Locale | undefined;
  return locale === 'he' ? 'he' : 'en'; // Default to 'en'
}

// Helper to get dir from locale
function getDir(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'he' ? 'rtl' : 'ltr';
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getServerLocale();
  const dir = getDir(locale);

  return (
    <html lang={locale} dir={dir}>
      <body>
        <LocaleDocumentSync /> {/* Now only handles client-side switches */}
        {children}
      </body>
    </html>
  );
}
```

### components/locale-document-sync.tsx (updated)
```typescript
'use client';

import { useEffect } from 'react';
import { useAppLocale } from '@/lib/i18n/use-app-locale';

/**
 * Updates lang/dir when user switches locale client-side.
 * Server-rendered initial locale is correct from layout.
 */
export function LocaleDocumentSync() {
  const { locale } = useAppLocale();

  useEffect(() => {
    // Only update if locale changed (client-side switch)
    if (document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
    }
  }, [locale]);

  return null;
}
```

---

## Agent instructions

### Step 1: Read current files
```bash
1. Read app/layout.tsx
2. Read components/locale-document-sync.tsx (or wherever it is)
3. Read lib/i18n/* to understand locale types
```

### Step 2: Update root layout
```bash
1. Import { cookies } from 'next/headers'
2. Create getServerLocale() helper:
   - Read 'locale' cookie
   - Return 'he' or 'en' (default 'en')
3. Create getDir(locale) helper:
   - Return 'rtl' for 'he', 'ltr' for 'en'
4. Update <html lang={locale} dir={dir}>
5. Ensure layout is NOT marked 'use client' (must be server component)
```

### Step 3: Update LocaleDocumentSync
```bash
1. Add check: only update if locale changed
2. Add comment explaining it's now for client-side switches only
```

### Step 4: Test with Hebrew
```bash
1. Set cookie: locale=he (use browser dev tools)
2. Hard refresh page
3. View source — verify <html lang="he" dir="rtl">
4. Check no hydration warning in console
5. Verify no flash (lang/dir correct from first paint)
```

### Step 5: Test with English
```bash
1. Set cookie: locale=en
2. Hard refresh
3. View source — verify <html lang="en" dir="ltr">
4. No warnings
```

### Step 6: Test client-side locale switch
```bash
1. Start with locale=en
2. Use UI to switch to Hebrew (if such UI exists)
3. Verify LocaleDocumentSync updates lang/dir
4. Verify no flash or warning
```

### Step 7: Commit
```bash
git add app/layout.tsx
git add components/locale-document-sync.tsx
git commit -m "fix(ui): server-render correct lang/dir for RTL

Read locale from cookie in root layout (server-side).
Render <html lang={locale} dir={dir}> correctly from first paint.

Fixes:
- No flash for Hebrew users
- Correct initial a11y tree
- No hydration mismatch warning

LocaleDocumentSync now only handles client-side locale switches.

Sprint 26 Story 6"
```

---

## Testing checklist

Manual:
- [ ] Hebrew user (locale=he cookie):
  - View source: `<html lang="he" dir="rtl">`
  - No flash on load
  - No hydration warning
- [ ] English user (locale=en cookie):
  - View source: `<html lang="en" dir="ltr">`
  - No issues
- [ ] Client-side switch (if applicable):
  - Switch from en → he in UI
  - lang/dir updates correctly
  - No warnings

---

## Success criteria

- ✅ Server-rendered lang/dir correct
- ✅ No flash for RTL users
- ✅ No hydration warnings
- ✅ Accessibility tree correct from first paint
