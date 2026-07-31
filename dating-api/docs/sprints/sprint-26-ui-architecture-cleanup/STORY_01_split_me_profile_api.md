# Story 1: Split `lib/me-profile-api.ts` into focused modules

**Priority:** P0 (Critical)  
**Estimated effort:** 1–2 days  
**Agent:** `generalPurpose`  
**Dependencies:** None

---

## Problem

`dating-ui/src/lib/me-profile-api.ts` is **983 lines** containing the entire me/profile/matches/actions API surface. This mega-module is hard to navigate, test, and review. Functions are grouped by HTTP method rather than domain.

---

## Goal

Split into 4–5 focused API modules, each <300 lines, grouped by domain:
- `me-profile-api.ts` — profile CRUD (get, update, analyze, delete)
- `me-matches-api.ts` — matches list, detail, actions (like/pass/block)
- `me-analysis-api.ts` — analysis status, trigger, results
- `me-photos-api.ts` — upload, list, delete, reorder, moderate

---

## Acceptance Criteria

- [ ] 4–5 focused API modules, each <300 lines
- [ ] All consuming pages updated (grep for `from.*me-profile-api`)
- [ ] No behavior change (same error handling, credentials, logging, observability)
- [ ] Barrel export from `lib/index.ts` for clean imports
- [ ] All existing vitest specs pass
- [ ] No console errors/warnings
- [ ] Commit message follows conventional format

---

## Current file structure (reference)

```typescript
// Current: dating-ui/src/lib/me-profile-api.ts (~983 lines)

// Profile CRUD (~200 lines)
export async function getMyProfile(...)
export async function updateMyProfile(...)
export async function deleteMyProfile(...)
export async function triggerProfileAnalysis(...)

// Matches (~300 lines)
export async function getMyMatches(...)
export async function getMatchById(...)
export async function likeMatch(...)
export async function passMatch(...)
export async function blockMatch(...)
export async function undoMatchAction(...)

// Analysis (~150 lines)
export async function getMyAnalysisStatus(...)
export async function getMyAnalysisResults(...)

// Photos (~200 lines)
export async function uploadProfilePhoto(...)
export async function listProfilePhotos(...)
export async function deleteProfilePhoto(...)
export async function reorderProfilePhotos(...)

// Shared (~100 lines)
// Types, constants, error handling
```

---

## Proposed split

### 1. `me-profile-api.ts` (~200 lines)
```typescript
export async function getMyProfile(...)
export async function updateMyProfile(...)
export async function deleteMyProfile(...)
```

### 2. `me-matches-api.ts` (~300 lines)
```typescript
export async function getMyMatches(...)
export async function getMatchById(...)
export async function likeMatch(...)
export async function passMatch(...)
export async function blockMatch(...)
export async function undoMatchAction(...)
export async function submitMatchFeedback(...)
```

### 3. `me-analysis-api.ts` (~150 lines)
```typescript
export async function getMyAnalysisStatus(...)
export async function triggerProfileAnalysis(...)
export async function getMyAnalysisResults(...)
```

### 4. `me-photos-api.ts` (~200 lines)
```typescript
export async function uploadProfilePhoto(...)
export async function listProfilePhotos(...)
export async function deleteProfilePhoto(...)
export async function reorderProfilePhotos(...)
export async function setProfilePhotoPrimary(...)
```

### 5. Shared types/utilities
Move shared types to `lib/types/me-profile.ts` or keep inline in each module.

---

## Files to update (imports)

Grep for all imports:
```bash
grep -r "from.*me-profile-api" dating-ui/src/
```

Expected files:
- `app/dating/page.tsx`
- `app/dating/profile/page.tsx`
- `app/dating/me-matches/page.tsx`
- `app/dating/me-matches/[id]/page.tsx`
- `app/dating/analysis/page.tsx`
- `components/profile-photo-section.tsx`
- `components/match-preferences-form.tsx`
- Other components/hooks as needed

---

## Agent instructions

### Step 1: Read and analyze current file
```bash
1. Read full dating-ui/src/lib/me-profile-api.ts
2. Map out function groups by domain
3. Identify shared utilities, types, constants
```

### Step 2: Create new modules
```bash
1. Create dating-ui/src/lib/me-profile-api.ts (profile CRUD only)
2. Create dating-ui/src/lib/me-matches-api.ts (matches)
3. Create dating-ui/src/lib/me-analysis-api.ts (analysis)
4. Create dating-ui/src/lib/me-photos-api.ts (photos)
5. Keep shared error handling, observability in each (or extract to shared util)
```

### Step 3: Update imports
```bash
1. Grep for all imports: grep -r "from.*me-profile-api" dating-ui/src/
2. Update each import to use specific module
3. Example:
   - Old: import { getMyProfile, getMyMatches } from '@/lib/me-profile-api'
   - New: import { getMyProfile } from '@/lib/me-profile-api'
          import { getMyMatches } from '@/lib/me-matches-api'
```

### Step 4: Test
```bash
1. Run: npm test (in dating-ui/)
2. Fix any TypeScript errors
3. Manual smoke test: verify profile, matches, photos, analysis still work
```

### Step 5: Commit
```bash
git add dating-ui/src/lib/me-*.ts
git add <all updated import files>
git commit -m "refactor(ui): split me-profile-api into focused modules

Break 983-line me-profile-api.ts into 4 focused modules:
- me-profile-api.ts (profile CRUD)
- me-matches-api.ts (matches list/detail/actions)
- me-analysis-api.ts (analysis status/trigger)
- me-photos-api.ts (photo CRUD/moderation)

Each module <300 lines. No behavior change.
Update imports across 10+ files.

Sprint 26 Story 1"
```

---

## Testing checklist

Manual smoke tests:
- [ ] Profile page loads and displays data
- [ ] Profile edit form submits successfully
- [ ] Matches list loads
- [ ] Match detail loads with correct data
- [ ] Like/Pass/Block actions work
- [ ] Analysis page shows status and results
- [ ] Photo upload works
- [ ] Photo delete works
- [ ] No console errors

Automated:
- [ ] `npm test` passes (dating-ui/)
- [ ] `npm run build` succeeds
- [ ] TypeScript compilation clean

---

## Success criteria

- ✅ 4–5 modules, each <300 lines
- ✅ All imports updated
- ✅ Tests pass
- ✅ No behavior change
- ✅ Clean commit message

---

## Notes

- **Do not** change API contracts (function signatures, error handling, return types)
- **Do not** add new features (pure refactor)
- **Do not** change observability/logging behavior
- Keep error codes, UiErrorCodes, emitProductLog patterns consistent
- Maintain existing type safety (no `any` types)
