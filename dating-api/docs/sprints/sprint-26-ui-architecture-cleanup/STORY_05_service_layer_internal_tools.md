# Story 5: Move internal-tool fetch to service layer

**Priority:** P0 (Critical)  
**Estimated effort:** 2–3 days  
**Agent:** `generalPurpose`  
**Dependencies:** None

---

## Problem

4 internal tool files call `fetch()` directly, bypassing the service layer pattern used on product routes:
- `app/profiles/page.tsx` (list, detail, analyze, compare)
- `app/profiles/compare/profiles-compare-client.tsx`
- `app/matches/matches-page-client.tsx`
- `app/auto-matches/page.tsx`
- `app/evaluate/page.tsx`

This creates:
- Inconsistent error handling
- No centralized logging/observability
- Hard to test (mocked fetch instead of mocked service)
- Duplicated fetch boilerplate

---

## Goal

Create service modules for internal tools following the same pattern as `me-profile-api.ts`:
- `lib/profiles-api.ts` — internal profiles list/detail/analyze/compare
- `lib/matches-internal-api.ts` — decision engine/match generation (if kept client-side)
- `lib/evaluate-api.ts` — evaluation triggers

Move all `fetch()` calls to these services.

---

## Acceptance Criteria

- [ ] `lib/profiles-api.ts` created (~150-200 lines)
- [ ] `lib/matches-internal-api.ts` created (if needed, ~100 lines)
- [ ] `lib/evaluate-api.ts` created (~100 lines)
- [ ] All 4 internal tool files refactored to use services
- [ ] Same patterns as product APIs:
  - Error handling with try/catch
  - Credentials: 'include'
  - Observability: `emitProductLog` on errors
  - TypeScript types for all requests/responses
- [ ] Manual smoke test all internal tools
- [ ] Commit follows convention

---

## Current inline fetch examples

### profiles/page.tsx
```typescript
// Line ~411
const res = await fetch(API_BASE);
if (!res.ok) throw new Error('...');
const json = await res.json();

// Line ~450
const res = await fetch(`${API_BASE}/${encodeURIComponent(selectedId)}`);
// ...

// Line ~500
const res = await fetch(`${API_BASE}/${id}/analyze`, { method: 'POST' });
```

### matches/matches-page-client.tsx
```typescript
// Decision engine endpoint (if exists)
const res = await fetch('/api/v1/internal/matches/decision', { ... });
```

### evaluate/page.tsx
```typescript
const res = await fetch('/api/v1/admin/evaluate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

---

## Proposed service structure

### `lib/profiles-api.ts`
```typescript
import { emitProductLog } from './observability';
import { UiErrorCodes } from './ui-error-codes';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ProfileListItem {
  id: string;
  userId: string;
  displayName: string;
  // ...
}

export async function listProfiles(): Promise<ProfileListItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/profiles`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    emitProductLog({
      level: 'error',
      message: 'profiles_list_failed',
      code: UiErrorCodes.PROFILES_LIST_FAILED,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getProfileById(id: string): Promise<ProfileDetail> {
  // Similar pattern
}

export async function analyzeProfile(id: string): Promise<void> {
  // Similar pattern
}

export async function compareProfiles(
  profileAId: string,
  profileBId: string
): Promise<CompareResult> {
  // Similar pattern
}
```

### `lib/evaluate-api.ts`
```typescript
export interface EvaluatePayload {
  // ...
}

export async function triggerEvaluation(
  payload: EvaluatePayload
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/evaluate`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    emitProductLog({
      level: 'error',
      message: 'evaluation_trigger_failed',
      code: UiErrorCodes.EVALUATION_TRIGGER_FAILED,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
```

---

## Agent instructions

### Step 1: Grep all inline fetch calls
```bash
cd dating-ui
grep -n "fetch(" src/app/profiles/page.tsx
grep -n "fetch(" src/app/profiles/compare/*.tsx
grep -n "fetch(" src/app/matches/matches-page-client.tsx
grep -n "fetch(" src/app/auto-matches/page.tsx
grep -n "fetch(" src/app/evaluate/page.tsx
```

### Step 2: Group by domain
```bash
# Profiles: list, detail, analyze, compare
# Matches: decision engine (if API exists)
# Evaluate: trigger evaluation
# Auto-matches: (analyze endpoint calls)
```

### Step 3: Create service modules
```bash
1. Create lib/profiles-api.ts
2. Create lib/evaluate-api.ts
3. Create lib/matches-internal-api.ts (if needed)
4. Follow me-profile-api.ts pattern exactly:
   - try/catch blocks
   - credentials: 'include'
   - emitProductLog on errors
   - TypeScript types for all data
```

### Step 4: Update internal tool pages
```bash
1. Import services in each page
2. Replace inline fetch with service calls
3. Keep existing UI logic (just swap fetch for service)
4. Example:
   - Old: const res = await fetch(API_BASE); const data = await res.json();
   - New: const data = await listProfiles();
```

### Step 5: Test each internal tool
```bash
1. Open /profiles (verify list loads)
2. Click a profile (verify detail loads)
3. Click "Analyze" (verify analysis triggers)
4. Open /profiles/compare (verify compare works)
5. Open /evaluate (verify evaluation triggers)
6. Open /matches (verify page works)
7. Check console for errors/warnings
```

### Step 6: Commit
```bash
git add lib/profiles-api.ts
git add lib/evaluate-api.ts
git add lib/matches-internal-api.ts
git add app/profiles/*.tsx
git add app/matches/*.tsx
git add app/evaluate/*.tsx
git add app/auto-matches/*.tsx
git commit -m "refactor(ui): move internal-tool fetch to service layer

Create service modules for internal tools:
- lib/profiles-api.ts (list/detail/analyze/compare)
- lib/evaluate-api.ts (trigger evaluation)
- lib/matches-internal-api.ts (decision engine)

Adopt same patterns as product APIs:
- Centralized error handling + observability
- TypeScript types
- credentials: 'include'

Refactor 4 internal tool files to use services.
No behavior change.

Sprint 26 Story 5"
```

---

## Testing checklist

Manual (all internal tools):
- [ ] /profiles — list loads
- [ ] /profiles — click profile, detail loads
- [ ] /profiles — click "Analyze", triggers successfully
- [ ] /profiles/compare — compare two profiles
- [ ] /evaluate — form submits, evaluation triggers
- [ ] /matches — page loads (decision engine if used)
- [ ] /auto-matches — page works
- [ ] No console errors

---

## Success criteria

- ✅ 3 service modules created
- ✅ All inline fetch moved to services
- ✅ Same patterns as product APIs
- ✅ All internal tools tested and working
