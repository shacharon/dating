# Story 4: Add route-level loading/error UI to `/dating/*`

**Priority:** P0 (Critical)  
**Estimated effort:** 1 day  
**Agent:** `generalPurpose`  
**Dependencies:** None

---

## Problem

Zero `loading.tsx` or `error.tsx` files in `dating-ui/src/app/`. Only `global-error.tsx` exists. This means:
- No streaming skeletons (poor perceived performance)
- Errors bubble to global handler (inconsistent UX)
- Can't leverage App Router's segment-level error recovery

---

## Goal

Add route-level `loading.tsx` and `error.tsx` to main route groups:
- `app/dating/loading.tsx` + `error.tsx`
- `app/(authenticated)/loading.tsx` + `error.tsx`
- Nested detail routes if needed

---

## Acceptance Criteria

- [ ] `app/dating/loading.tsx` created (shell skeleton with nav + content)
- [ ] `app/dating/error.tsx` created (i18n error, retry, observability)
- [ ] `app/(authenticated)/loading.tsx` created (onboarding/settings skeleton)
- [ ] `app/(authenticated)/error.tsx` created
- [ ] Nested `loading.tsx` for detail pages if helpful:
  - `app/dating/conversations/[id]/loading.tsx`
  - `app/dating/me-matches/[id]/loading.tsx`
- [ ] Test streaming: verify skeletons show during slow loads
- [ ] Test errors: verify segment errors caught, retry button works
- [ ] i18n for error messages (use `useAppLocale`)
- [ ] Errors logged to observability (`emitProductLog`)
- [ ] Commit follows convention

---

## Loading UI design

### `app/dating/loading.tsx`
```typescript
export default function DatingLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800">
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
          <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        </div>
      </main>
    </div>
  );
}
```

### `app/dating/error.tsx`
```typescript
'use client';

import { useEffect } from 'react';
import { useAppLocale } from '@/lib/i18n/use-app-locale';
import { emitProductLog } from '@/lib/observability';
import { UiErrorCodes } from '@/lib/ui-error-codes';

export default function DatingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { getCopy } = useAppLocale();

  useEffect(() => {
    emitProductLog({
      level: 'error',
      message: 'dating_route_error',
      code: UiErrorCodes.DATING_ROUTE_ERROR,
      error: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">
          {getCopy('error.dating.title')}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {getCopy('error.dating.message')}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          {getCopy('error.retry')}
        </button>
      </div>
    </div>
  );
}
```

---

## Agent instructions

### Step 1: Create dating loading/error
```bash
1. Create app/dating/loading.tsx (shell skeleton matching layout)
2. Create app/dating/error.tsx (i18n, retry, observability)
3. Add i18n keys to lib/i18n/locales/en.json and he.json:
   - error.dating.title
   - error.dating.message
   - error.retry
```

### Step 2: Create authenticated loading/error
```bash
1. Create app/(authenticated)/loading.tsx (simpler skeleton for onboarding)
2. Create app/(authenticated)/error.tsx (same pattern)
```

### Step 3: Optional nested loading
```bash
# If helpful for detail pages:
1. Create app/dating/conversations/[id]/loading.tsx
2. Create app/dating/me-matches/[id]/loading.tsx
```

### Step 4: Test streaming
```bash
1. Add artificial delay to a page (simulate slow API):
   await new Promise(resolve => setTimeout(resolve, 3000))
2. Verify loading skeleton shows
3. Verify page loads after delay
4. Remove artificial delay
```

### Step 5: Test error boundary
```bash
1. Add throw new Error('test') to a page
2. Verify error.tsx catches it
3. Verify retry button works (calls reset())
4. Verify error logged to observability
5. Remove test error
```

### Step 6: Commit
```bash
git add app/dating/loading.tsx
git add app/dating/error.tsx
git add app/(authenticated)/loading.tsx
git add app/(authenticated)/error.tsx
git add lib/i18n/locales/*.json
git commit -m "feat(ui): add route-level loading/error boundaries

Add loading.tsx and error.tsx to main route groups:
- app/dating/ (shell skeleton + error recovery)
- app/(authenticated)/ (onboarding/settings)

Streaming skeletons improve perceived performance.
Segment errors caught with retry + observability.
i18n for all error messages.

Sprint 26 Story 4"
```

---

## Testing checklist

Manual:
- [ ] Navigate to /dating/profile (see loading skeleton briefly)
- [ ] Navigate to /dating/me-matches (see skeleton)
- [ ] Simulate error (throw in page) — error.tsx catches it
- [ ] Click retry button — page reloads
- [ ] Check console for observability log
- [ ] Test with Hebrew locale — error message in Hebrew

Automated:
- [ ] TypeScript clean
- [ ] Build succeeds

---

## Success criteria

- ✅ Route-level loading/error UI added
- ✅ Streaming works
- ✅ Error recovery works
- ✅ i18n complete
- ✅ Observability logs errors
