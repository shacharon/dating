# FE Sprint 04 — Component Cleanup (Optional Polish)

**Status:** ✅ Complete (Stories 1–3 Done)  
**Priority:** 🟢 **P2 NICE-TO-HAVE** — Can launch without, improves maintainability  
**Depends on:** FE-02 (unified data layer)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Repo:** `dating-ui` (frontend)  
**Target:** Lighter components, easier to extend for mobile features

---

## Problem

**Current state:** Large, complex components with many hooks and effects.

**Top offenders (from scan):**

| File | LOC | Issues |
|------|-----|--------|
| ~~`use-conversation-messages.ts`~~ | ~~371~~ → **63** (facade) | ✅ Story 1 — split into thread/sync/send modules |
| ~~`use-onboarding-basic-form.ts`~~ | ~310 | ✅ Story 2 — advance validation in `lib/*`; hook calls `validateOnboardingBasicAdvance` |
| ~~`content-violations-page-client.tsx`~~ | ~~392~~ → **76** (composer) | ✅ Story 3 — split into 6 presentational components |
| Various form components | 100-150 | Duplicate validation reduced (Story 2); further dedupe deferred |

**Why it matters for mobile:**
- Large components = slow re-renders on mobile devices
- Complex state = hard to debug mobile-specific issues
- Duplicate logic = harder to add Android-specific variants

---

## Goal

**Light refactoring** to improve component maintainability without blocking launch:

1. **Split hook gods** (`use-conversation-messages` → smaller hooks)
2. **Extract form logic** (shared validation, custom hooks)
3. **Simplify admin pages** (optional: can skip for Android launch)

**Non-goals:**
- Full rewrite (we're not replacing Next.js or React)
- Migrating to new UI framework
- Design system overhaul

---

## Success Criteria

- [x] `use-conversation-messages` split into focused sub-hooks (Story 1 — thread + sync + send + mutation facade)
- [x] `use-onboarding-basic-form` uses shared form validation (Story 2 — `profile-field-validation` + `onboarding-basic-validation`)
- [x] Admin pages: move data fetching to React Query — **partial** (content-violations done pre–Story 3 via `use-admin-content-violations.ts`; photos/match-quality deferred)
- [x] No regression in existing functionality (Stories 1–3 — **790/790** tests)

---

## Stories

### Story 1 — Split Hook Gods ✅ Done
**Effort:** 1-2 days  
**Risk:** 🟡 MEDIUM (risk of breaking existing pages)  
**Handoff:** [`handoffs/STORY_01_split_hook_gods/`](./handoffs/STORY_01_split_hook_gods/)

**Note:** README originally proposed `use-messages.ts` / `use-message-input.ts` / `use-message-send.ts` — **superseded** by architect design. Post–FE-02 Story 4 hook was already on React Query; split axes are **thread (query+pagination)**, **sync (WS/poll+mark-read)**, **send (orchestration)**. **No** `use-message-input.ts` — draft stays in `ConversationMessageComposer`.

**Tasks:**
1. [x] Extract `useSendConversationMessage` → `use-conversation-message-send-mutation.ts`
2. [x] Extract thread hook (query, pagination, scroll refs)
3. [x] Extract sync hook (WS/poll merge, mark-read)
4. [x] Extract send orchestration (errors, cooldown)
5. [x] Refactor facade — public `useConversationMessages` API unchanged
6. [x] All conversation page tests green

**Files (actual):**
- `dating-ui/src/hooks/use-conversation-messages.ts` — thin facade (~63 LOC)
- `dating-ui/src/hooks/use-conversation-message-send-mutation.ts` — RQ mutation
- `dating-ui/src/hooks/use-conversation-messages-thread.ts` — query + `loadEarlier` + scroll
- `dating-ui/src/hooks/use-conversation-messages-sync.ts` — WS/poll + mark-read
- `dating-ui/src/hooks/use-conversation-message-send.ts` — send orchestration

**Unchanged:** `conversation-messages-cache.ts`, `use-messaging-socket.ts`, `[id]/page.tsx`, `use-conversation-messages.spec.ts`

---

### Story 2 — Form Validation Extraction ✅ Done
**Effort:** 1 day  
**Risk:** 🟢 LOW  
**Handoff:** [`handoffs/STORY_02_form_validation_extraction/`](./handoffs/STORY_02_form_validation_extraction/)

**Note:** README originally proposed `lib/validation.ts` with `validateEmail` / `validateAge` and generic `useForm()` — **superseded**. No email field in basic onboarding; validators return **error codes** (match prefs pattern). **No** `use-form.ts`.

**Tasks:**
1. [x] Create `lib/profile-field-validation.ts` — shared field validators
2. [x] Create `lib/onboarding-basic-validation.ts` — advance-step composer
3. [x] Wire `use-onboarding-basic-form.ts` — `validateOnboardingBasicAdvance` in `persist()`
4. [x] Dedupe `validateMatchPreferencesForm` — shared partner-genders check
5. [x] Unit + component specs green

**Files (actual):**
- `dating-ui/src/lib/profile-field-validation.ts` — `validatePartnerGendersNonEmpty`, `validateGenderForOnboardingAdvance`
- `dating-ui/src/lib/onboarding-basic-validation.ts` — `validateOnboardingBasicAdvance`
- `dating-ui/src/lib/profile-field-validation.spec.ts` — 5 tests
- `dating-ui/src/lib/onboarding-basic-validation.spec.ts` — 3 tests
- `dating-ui/src/hooks/use-onboarding-basic-form.ts` — calls validators; maps codes → i18n
- `dating-ui/src/lib/match-preferences-form.ts` — uses shared partner validator

**Unchanged:** `onboarding-basic-form.tsx`, `onboarding-basic-helpers.ts`, i18n keys

---

### Story 3 — Admin Page Simplification ✅ Done
**Effort:** 1 day  
**Risk:** 🟢 LOW  
**Skip for Android launch:** Yes (admin pages are not used on mobile)  
**Handoff:** [`handoffs/STORY_03_admin_page_simplification/`](./handoffs/STORY_03_admin_page_simplification/)

**Note:** README Task 1 (RQ migrate) was **already done** before Story 3 — `use-admin-content-violations.ts` has 3× `useQuery` + unblock mutation. Story 3 = **UI component split only** (architect D1). Photos/match-quality admin pages **out of scope**.

**Tasks:**
1. [x] ~~Move admin page data fetching to React Query~~ — **pre-done** (content-violations hook)
2. [x] Split `content-violations-page-client.tsx` into smaller components

**Files (actual):**
- `dating-ui/src/app/admin/content-violations/content-violations-page-client.tsx` — thin composer (~76 LOC)
- `dating-ui/src/components/admin/content-violations/admin-stat-card.tsx`
- `dating-ui/src/components/admin/content-violations/copyable-conversation-id.tsx`
- `dating-ui/src/components/admin/content-violations/content-violations-stats-grid.tsx`
- `dating-ui/src/components/admin/content-violations/blocked-users-table.tsx`
- `dating-ui/src/components/admin/content-violations/content-violations-filters.tsx`
- `dating-ui/src/components/admin/content-violations/content-violations-table.tsx`

**Unchanged:** `use-admin-content-violations.ts`, `page.tsx`, `use-admin-content-violations.spec.tsx` (4/4)

---

## Example: Before → After

### Before (Hook God)

```typescript
// dating-ui/src/hooks/use-conversation-messages.ts (150 LOC, 6 useState, 7 useEffect)
export function useConversationMessages(conversationId: string) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Fetch messages
  }, [conversationId]);

  useEffect(() => {
    // Connect socket
  }, [conversationId]);

  useEffect(() => {
    // Listen for new messages
  }, [socket]);

  useEffect(() => {
    // Handle typing indicator
  }, [inputValue]);

  // ... 3 more useEffect, 200 lines of logic
}
```

### After (Split Hooks — Story 1 actual)

```typescript
// dating-ui/src/hooks/use-conversation-messages.ts — facade (~63 LOC)
export function useConversationMessages(options) {
  const thread = useConversationMessagesThread({ ... });
  const sync = useConversationMessagesSync({ messagesRef: thread.messagesRef, ... });
  const send = useConversationMessageSend(conversationId);
  return { ...thread, ...sync, ...send }; // stable public API
}

// Sub-hooks (internal): thread, sync, send, send-mutation
// Input draft: ConversationMessageComposer (unchanged)
```

### After (Validation — Story 2 actual)

```typescript
// lib/profile-field-validation.ts — pure validators, error codes
export function validatePartnerGendersNonEmpty(genders) { ... }
export function validateGenderForOnboardingAdvance(gender) { ... }

// lib/onboarding-basic-validation.ts — compose for "continue to texts"
export function validateOnboardingBasicAdvance({ gender, desiredPartnerGenders }) { ... }

// hooks/use-onboarding-basic-form.ts — hook maps codes → i18n in persist()
```

### After (Admin UI — Story 3 actual)

```typescript
// app/admin/content-violations/content-violations-page-client.tsx — composer (~76 LOC)
export default function AdminContentViolationsPageClient() {
  const page = useAdminContentViolationsPage();
  return (
    <main>
      {/* page chrome */}
      <ContentViolationsStatsGrid stats={page.stats} />
      <BlockedUsersTable ... onUnblock={page.unblock} />
      <ContentViolationsFilters ... />  {/* filter state stays in hook */}
      <ContentViolationsTable ... />
    </main>
  );
}

// components/admin/content-violations/* — presentational sections
// hooks/use-admin-content-violations.ts — UNCHANGED (RQ + filters + unblock)
```

**Benefits:**
- ✅ Easier to test (small, focused hooks)
- ✅ Easier to extend (add mobile-specific logic without breaking web)
- ✅ Easier to debug (clear separation of concerns)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking existing pages | Test thoroughly after each split, incremental changes |
| Over-engineering simple forms | Only extract if 3+ forms share logic |
| Time-boxed refactor goes long | Skip Story 3 (admin), defer to post-launch |

---

## Dependencies

- **Requires:** FE-02 (React Query hooks make splitting easier)
- **Before launch:** Optional (can skip entirely for Android launch)

---

## Testing Checklist

**After Story 1:**
- [x] Conversation page loads messages correctly
- [x] Send message works (optimistic + moderation errors)
- [x] Socket connection works (WS mode spec)
- [x] Poll merge + mark-read preserved
- [x] No test regressions (**782/782**)

**After Story 2:**
- [x] Onboarding advance validation works (gender + partner genders)
- [x] Save progress still allows partial save (no validation)
- [x] Localized error messages (EN/HE specs)
- [x] Match prefs partner-gender rule deduped
- [x] No test regressions (**790/790**)

**After Story 3:**
- [x] Admin content-violations page structure preserved (composer + 6 components)
- [x] Filter + unblock behavior unchanged (`use-admin-content-violations.spec.tsx` 4/4)
- [x] No test regressions (**790/790**)

---

## Launch Readiness

**Can launch Android without this?** ✅ **YES**

This sprint is **pure polish**. Mobile app will work fine without it. Defer to post-launch if time-constrained.

**When to do it:**
- After FE-01, FE-02, FE-03 are done
- If you have 3-5 days before launch
- If you want cleaner code for post-launch feature velocity

**When to skip:**
- Launch is in <2 weeks
- Backend refactoring (Sprints 64-65) still in progress
- Team wants to focus on mobile-specific features first

---

## References

- [React Hook Composition](https://kentcdodds.com/blog/compound-components-with-react-hooks)
- [Form Hooks Best Practices](https://react-hook-form.com/)
