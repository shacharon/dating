# Story 3: Extract match detail hooks from 591-line page

**Priority:** P0 (Critical)  
**Estimated effort:** 1–2 days  
**Agent:** `generalPurpose`  
**Dependencies:** None (can run parallel with Story 2)

---

## Problem

`dating-ui/src/app/dating/me-matches/[id]/page.tsx` is **591 lines** with like/pass/block/undo actions, feedback submission, celebration flow, and narrative display all mixed together.

---

## Goal

Extract reusable hooks:
1. `useMatchActions` — like, pass, block, undo with optimistic UI
2. `useMatchFeedback` — submit feedback + toast
3. `useCelebrationFlow` — mutual match celebration state

Page <300 lines, focused on UI composition.

---

## Acceptance Criteria

- [ ] `hooks/use-match-actions.ts` with tests
- [ ] `hooks/use-match-feedback.ts` with tests  
- [ ] `hooks/use-celebration-flow.ts` with tests
- [ ] Page <300 lines
- [ ] All actions work (like/pass/block/undo)
- [ ] Feedback submission works
- [ ] Celebration animation triggers on mutual match
- [ ] Tests cover happy + error paths
- [ ] Commit follows convention

---

## Proposed hooks

### 1. `use-match-actions.ts`
```typescript
interface UseMatchActionsReturn {
  like: () => Promise<void>;
  pass: () => Promise<void>;
  block: () => Promise<void>;
  undo: () => Promise<void>;
  actionLoading: boolean;
  currentAction: 'LIKE' | 'PASS' | 'BLOCK' | null;
  canUndo: boolean;
}

export function useMatchActions(matchId: string): UseMatchActionsReturn {
  // Optimistic UI updates
  // API calls to me-matches-api (from Story 1)
  // Handle mutual match trigger
  // Error handling + rollback on failure
}
```

### 2. `use-match-feedback.ts`
```typescript
interface UseMatchFeedbackReturn {
  submitFeedback: (data: FeedbackData) => Promise<void>;
  submitting: boolean;
}

export function useMatchFeedback(matchId: string): UseMatchFeedbackReturn {
  // Call API
  // Show toast on success
  // Handle errors
}
```

### 3. `use-celebration-flow.ts`
```typescript
interface UseCelebrationFlowReturn {
  showCelebration: boolean;
  dismissCelebration: () => void;
}

export function useCelebrationFlow(
  isMutualMatch: boolean
): UseCelebrationFlowReturn {
  // Track if celebration shown
  // Auto-dismiss after N seconds
  // Manual dismiss
}
```

---

## Agent instructions

### Step 1: Read current file
```bash
1. Read app/dating/me-matches/[id]/page.tsx
2. Identify sections:
   - Match actions (like/pass/block/undo)
   - Feedback form state + submission
   - Celebration overlay state
   - Match data loading
```

### Step 2-4: Create hooks (similar to Story 2)
```bash
# Same pattern as Story 2
1. Create use-match-actions.ts
2. Create use-match-feedback.ts
3. Create use-celebration-flow.ts
4. Extract logic from page
```

### Step 5: Refactor page
```bash
const { like, pass, block, undo, ... } = useMatchActions(matchId)
const { submitFeedback, ... } = useMatchFeedback(matchId)
const { showCelebration, dismissCelebration } = useCelebrationFlow(isMutualMatch)
```

### Step 6: Add tests
```bash
# Test optimistic UI, API calls, error handling for each hook
```

### Step 7: Manual test
```bash
- Like a match (verify optimistic + API)
- Pass a match
- Block a match
- Undo action
- Submit feedback
- Verify celebration on mutual match
```

### Step 8: Commit
```bash
git commit -m "refactor(ui): extract match detail hooks

Extract from 591-line match detail page:
- useMatchActions: like/pass/block/undo with optimistic UI
- useMatchFeedback: submission flow
- useCelebrationFlow: mutual match overlay

Page now <300 lines. Add vitest specs.
No behavior change.

Sprint 26 Story 3"
```

---

## Success criteria

- ✅ 3 hooks created with tests
- ✅ Page <300 lines
- ✅ Actions work with optimistic UI
- ✅ Celebration triggers correctly
