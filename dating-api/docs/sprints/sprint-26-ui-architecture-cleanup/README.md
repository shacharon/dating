# Sprint 26: UI Architecture Cleanup

**Epic:** The UI codebase has grown organically with strong patterns (service layer, i18n, TypeScript) on product routes but suffers from oversized client components, missing App Router patterns (loading/error segments), and internal tools that bypass architectural conventions. This sprint refactors high-traffic pages, establishes route-level boundaries, extracts business logic, and brings internal tools up to product-route standards.

**Duration:** ~3–4 weeks (14 stories)  
**Goal:** Thin client islands with Server Components, split mega-files into testable modules, establish route-level loading/error UI, move all fetch to service layer, extract business logic from UI, fix i18n/a11y gaps.  
**Status:** Done (Waves 1–3)  
**Depends on:** Current UI architecture (Next.js App Router, React 19, established service patterns)

---

## Why this sprint

Current state:
- **5 files >500 lines** mixing types, fetch, UI, and domain logic
- **~10 components >300 lines** that are hard to test and review
- **Zero route-level loading/error boundaries** (only global fallback)
- **Internal tools** (`/profiles`, `/matches`, `/evaluate`) still call `fetch` inline
- **Nearly all pages** are `'use client'` with `useEffect` data fetching
- **Business logic in UI** (decision engine runs in browser)
- **i18n incomplete** (admin, error boundaries, internal tools all English-only)

This creates:
- High regression risk (changes touch 600+ line monoliths)
- Poor testability (can't unit-test extraction logic separately)
- Inconsistent loading UX (no streaming skeletons)
- Larger JS bundles (everything is client-rendered)
- Hard to i18n (logic mixed with presentation)
- SEO/SSR weakness (authenticated shells could be server-rendered)

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| **Approach** | **Incremental refactor** — one page/service at a time. No big-bang rewrite. Ship after each story. |
| **Server vs Client** | **Server Component shells** for static layouts; client islands only for interactivity (forms, sockets, infinite scroll). |
| **Service layer** | **All fetch moves to `lib/*-api.ts`** modules. Internal tools adopt the same pattern as product routes. |
| **Component size target** | **<300 lines per component**, <500 lines per service module (split when exceeded). |
| **Loading/Error UI** | **Route-level `loading.tsx`/`error.tsx`** under `app/dating/`, `app/(authenticated)/`, `app/(internal)/`. |
| **Business logic** | **API-driven** — decision engine, chip extraction, etc. must call backend or live in shared `lib/` (not page components). |
| **i18n** | **Complete coverage** — error boundaries, admin (if user-facing), internal tools get `useAppLocale` treatment. |
| **Testing** | Each extracted hook/service gets vitest spec. Coverage target: maintain or improve current levels. |
| **Agent workflow** | One `generalPurpose` agent per story with refactor focus. Use `explore` for discovery when needed. |

---

## Story checklist

### **Wave 1: Critical (P0) — Must fix**

| # | Story | Priority | Estimated effort | Agent/Skill | Status |
|---|-------|----------|------------------|-------------|--------|
| 1 | [Split `lib/me-profile-api.ts` into focused modules](./STORY_01_split_me_profile_api.md) | **P0** | 1–2 days | `generalPurpose` | **Done** |
| 2 | [Extract conversation detail hooks](./STORY_02_extract_conversation_hooks.md) | **P0** | 1–2 days | `generalPurpose` | **Done** |
| 3 | [Extract match detail hooks](./STORY_03_extract_match_hooks.md) | **P0** | 1–2 days | `generalPurpose` | **Done** |
| 4 | [Route-level loading/error UI](./STORY_04_route_loading_error_ui.md) | **P0** | 1 day | `generalPurpose` | **Done** |
| 5 | [Internal-tool service layer](./STORY_05_service_layer_internal_tools.md) | **P0** | 2–3 days | `generalPurpose` | **Done** |
| 6 | [Fix RTL lang SSR](./STORY_06_fix_rtl_lang_ssr.md) | **P0** | 0.5 day | `generalPurpose` | **Done** |

### **Wave 2: Recommended (P1) — Should fix**

| # | Story | Priority | Estimated effort | Agent/Skill | Status |
|---|-------|----------|------------------|-------------|--------|
| 7 | [Refactor profiles page](./STORY_07_refactor_profiles_page.md) | **P1** | 2–3 days | `generalPurpose` + `explore` | **Done** |
| 8 | [Refactor matches page](./STORY_08_refactor_matches_page.md) | **P1** | 2 days | `generalPurpose` | **Done** |
| 9 | [Split large components](./STORY_09_split_large_components.md) | **P1** | 1–2 days | `generalPurpose` | **Done** |
| 10 | [Server Component shells](./STORY_10_server_component_shells.md) | **P1** | 2–3 days | `generalPurpose` | **Done** |
| 11 | [Complete product i18n](./STORY_11_complete_i18n.md) | **P1** | 1–2 days | `generalPurpose` | **Done** |
| 12 | [Route metadata](./STORY_12_route_metadata.md) | **P1** | 1 day | `generalPurpose` | **Done** |

### **Wave 3: Nice-to-have (P2) — Tech debt**

| # | Story | Priority | Estimated effort | Agent/Skill | Status |
|---|-------|----------|------------------|-------------|--------|
| 13 | [Delete deprecated draft + mock feedback](./STORY_13_delete_deprecated.md) | **P2** | 0.5 day | `generalPurpose` | **Done** |
| 14 | [Delete internal POC tools](./STORY_14_delete_poc_tools.md) | **P2** | 0.5 day | `generalPurpose` | **Done** |

**Recommended order:** Stories 1–6 (P0 wave) → 7–12 (P1 wave) → 13–14 (P2 cleanup)

---

## Story details

<a name="story-1"></a>
### Story 1: Split `lib/me-profile-api.ts` into focused modules

**Problem:** 983-line mega-module containing entire me/profile/matches/actions API surface.

**Goal:** Split into `me-profile-api.ts`, `me-matches-api.ts`, `me-analysis-api.ts`, `me-photos-api.ts` (or similar) — each <300 lines.

**Acceptance Criteria:**
- [ ] 4–5 focused API modules, each <300 lines
- [ ] Imports updated across all consuming pages
- [ ] No behavior change (same error handling, credentials, logging)
- [ ] Each module has barrel export from `lib/index.ts` or similar
- [ ] Tests pass (existing vitest specs)

**Agent approach:**
```bash
# Use generalPurpose agent for refactoring
1. Read full me-profile-api.ts
2. Group functions by domain (profile CRUD, matches list/detail, analysis, photos, actions)
3. Create new files with proper exports
4. Update imports in all pages (grep for 'from.*me-profile-api')
5. Run tests
6. Commit with clear message
```

**Skills:** None specific (standard refactoring)

---

<a name="story-2"></a>
### Story 2: Extract conversation detail hooks from 604-line page

**Problem:** `conversations/[id]/page.tsx` has ~10 `useState` hooks + polling + sockets + mark-read + unmatch + report in one file.

**Goal:** Extract reusable hooks: `useConversationMessages`, `useConversationActions`, `useConversationPolling`.

**Acceptance Criteria:**
- [ ] `hooks/use-conversation-messages.ts` — load, send, receive, mark-read
- [ ] `hooks/use-conversation-actions.ts` — unmatch, report
- [ ] `hooks/use-conversation-polling.ts` — 3s poll with cleanup
- [ ] Page component <300 lines
- [ ] Tests for each hook (vitest)
- [ ] Existing functionality unchanged

**Agent approach:**
```bash
# Use generalPurpose with clear extraction instructions
1. Identify stateful logic blocks (messages, actions, polling)
2. Extract each into custom hook with clear interface
3. Add hook tests (mock fetch, test state transitions)
4. Refactor page to use hooks
5. Test manually (verify send/receive/unmatch/mark-read)
6. Commit
```

**Skills:** None specific

---

<a name="story-3"></a>
### Story 3: Extract match detail hooks from 591-line page

**Problem:** `me-matches/[id]/page.tsx` has like/pass/block/feedback/celebration logic mixed with UI.

**Goal:** Extract `useMatchActions`, `useMatchFeedback`, `useCelebrationFlow`.

**Acceptance Criteria:**
- [ ] `hooks/use-match-actions.ts` — like, pass, block with optimistic UI
- [ ] `hooks/use-match-feedback.ts` — submit feedback + toast
- [ ] `hooks/use-celebration-flow.ts` — mutual match celebration state
- [ ] Page component <300 lines
- [ ] Tests for each hook
- [ ] Existing functionality unchanged

**Agent approach:** Same as Story 2 (extract → test → refactor page)

**Skills:** None specific

---

<a name="story-4"></a>
### Story 4: Add route-level loading/error UI to `/dating/*`

**Problem:** Zero `loading.tsx`/`error.tsx` files. Only global fallback. No streaming skeletons.

**Goal:** Add route-level boundaries for consistent UX.

**Acceptance Criteria:**
- [ ] `app/dating/loading.tsx` — shell skeleton with nav + content placeholder
- [ ] `app/dating/error.tsx` — error boundary with i18n, retry button, observability
- [ ] `app/(authenticated)/loading.tsx` — onboarding/settings skeleton
- [ ] Nested loading states for `/conversations/[id]`, `/me-matches/[id]` if needed
- [ ] Verify streaming works (test with slow API)
- [ ] Error boundary captures segment errors (test with forced throw)

**Agent approach:**
```bash
1. Create loading.tsx with app shell skeleton (nav, sidebar, content placeholder)
2. Create error.tsx with i18n error message, retry, log to observability
3. Add nested boundaries for detail pages
4. Test with simulated slow/error responses
5. Commit
```

**Skills:** None specific

---

<a name="story-5"></a>
### Story 5: Move internal-tool fetch to service layer

**Problem:** 4 files call `fetch` inline: `profiles/page.tsx`, `profiles/compare/*`, `matches/matches-page-client.tsx`, `auto-matches/page.tsx`, `evaluate/page.tsx`.

**Goal:** Create `lib/internal-tools-api.ts` (or split further) with all internal-tool API calls.

**Acceptance Criteria:**
- [ ] `lib/profiles-api.ts` — list, detail, analyze, compare
- [ ] `lib/matches-internal-api.ts` — decision engine endpoint (if kept)
- [ ] `lib/evaluate-api.ts` — evaluation endpoint
- [ ] All 4 files refactored to use service layer
- [ ] Same error handling, credentials, logging as product APIs
- [ ] Tests pass

**Agent approach:**
```bash
1. Grep for 'fetch(' in profiles/, matches/, evaluate/, auto-matches/
2. Extract each into typed service function
3. Create new api modules following me-profile-api.ts pattern
4. Update pages to use services
5. Test each internal tool manually
6. Commit
```

**Skills:** None specific

---

<a name="story-6"></a>
### Story 6: Fix root `lang="en"` SSR mismatch for RTL

**Problem:** Root layout has hardcoded `<html lang="en">`. `LocaleDocumentSync` fixes it after hydration, causing flash + wrong a11y tree.

**Goal:** Server-render correct `lang` and `dir` based on user locale (cookie/header).

**Acceptance Criteria:**
- [ ] Root layout reads locale from cookie/header
- [ ] `<html lang={locale} dir={dir}>` server-rendered correctly
- [ ] No hydration mismatch warning
- [ ] Hebrew users see correct `dir="rtl"` from first paint
- [ ] `LocaleDocumentSync` removed or only used for client-side locale switches
- [ ] Test with Hebrew and English users

**Agent approach:**
```bash
1. Read locale from cookie/header in root layout (server component)
2. Pass to html tag: lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'}
3. Update LocaleDocumentSync to only handle client switches (not initial load)
4. Test with both locales
5. Commit
```

**Skills:** None specific

---

<a name="story-7"></a>
### Story 7: Refactor 1006-line profiles page

**Problem:** `profiles/page.tsx` mixes types, chip heuristics (200+ lines of regex), fetch, and full UI.

**Goal:** Extract chip logic to `lib/profile-chip-extraction.ts`, fetch to service, types to separate file.

**Acceptance Criteria:**
- [ ] `lib/profile-chip-extraction.ts` — all boundary/chip regex logic
- [ ] `lib/profiles-api.ts` — all fetch calls (from Story 5)
- [ ] `types/profiles.ts` — all type definitions
- [ ] Page component <400 lines (ideally <300)
- [ ] Tests for chip extraction logic (unit tests with fixtures)
- [ ] Existing functionality unchanged

**Agent approach:**
```bash
# Use explore agent first to map out the page structure
1. Run explore agent to identify distinct sections
2. Extract chip logic (PROFILE_BOUNDARIES, CHIP_KEYWORDS, etc.) to separate module
3. Move types to dedicated file
4. Refactor page to use extracted modules
5. Add tests for chip extraction
6. Commit
```

**Skills:** `explore` for initial analysis, then `generalPurpose` for refactor

---

<a name="story-8"></a>
### Story 8: Refactor matches page - move decision engine to API

**Problem:** `matches/matches-page-client.tsx` (706 lines) runs `runDecisionEngineV1` + `buildMatchDecisionInsights` in browser with hard-coded copy.

**Goal:** Decision engine should be API-driven or clearly marked as client-only with i18n.

**Acceptance Criteria:**
- [ ] Decision: either (a) move to API endpoint, OR (b) keep in UI but with proper i18n + clear "client-only" marker
- [ ] If (a): Create `/api/v1/internal/decision-engine` endpoint
- [ ] If (b): Extract to `lib/decision-engine-client.ts` with i18n for all copy
- [ ] Page component <400 lines
- [ ] Hard-coded English copy removed
- [ ] Tests for decision logic

**Agent approach:**
```bash
1. Discuss with user: API endpoint or client-only?
2. If API: create endpoint in dating-api with same logic
3. If client: extract to lib/, add i18n, mark clearly as "for internal tools only"
4. Refactor page
5. Test decision flow
6. Commit
```

**Skills:** None specific (but may need user decision first)

---

<a name="story-9"></a>
### Story 9: Split large onboarding/settings components

**Problem:** 6 components >300 lines:
- `onboarding-draft-form.tsx` (486, deprecated)
- `onboarding-basic-form.tsx` (404)
- `profile-photo-section.tsx` (317)
- `match-preferences-form.tsx` (312)
- `analysis/page.tsx` (356)
- `me-matches/page.tsx` (309)

**Goal:** Each component <300 lines.

**Acceptance Criteria:**
- [ ] Delete `onboarding-draft-form.tsx` (deprecated, covered in Story 13)
- [ ] Split `onboarding-basic-form` into form sections (personal, location, about)
- [ ] Split `profile-photo-section` into upload/preview/list sub-components
- [ ] Split `match-preferences-form` into sections (age, distance, gender, lifestyle)
- [ ] Extract analysis polling to hook (already has helpers)
- [ ] Extract me-matches infinite scroll logic to existing `useInfiniteMatches` or enhance it
- [ ] Each split has clear single responsibility
- [ ] Tests pass

**Agent approach:**
```bash
# One agent call per component to split
1. Identify logical sections in component
2. Create sub-components with clear props
3. Update parent to compose sub-components
4. Test functionality
5. Commit each split separately
```

**Skills:** None specific

---

<a name="story-10"></a>
### Story 10: Convert dating pages to Server Component shells

**Problem:** Nearly all `/dating/*` pages are `'use client'` with `useEffect` fetch.

**Goal:** Server Component shells that fetch data, client islands for interactivity.

**Acceptance Criteria:**
- [ ] `dating/page.tsx` — server shell with profile data, client form for edits
- [ ] `dating/analysis/page.tsx` — server shell, client for polling/actions
- [ ] `dating/profile/page.tsx` — server shell, client for forms
- [ ] Other pages assessed (some may stay client for real-time needs)
- [ ] Smaller JS bundles (measure before/after)
- [ ] No waterfalls (use React.cache for dedupe if needed)
- [ ] SSR/SEO improved for authenticated shells

**Agent approach:**
```bash
# Per-page basis, careful with auth/session
1. Identify static vs interactive parts of page
2. Create async server component for static shell
3. Extract interactive parts to 'use client' islands
4. Pass data as props to islands
5. Test SSR output (view source, confirm server-rendered)
6. Measure bundle size change
7. Commit per page
```

**Skills:** None specific (but requires careful thought about auth/session)

---

<a name="story-11"></a>
### Story 11: Complete i18n for error boundaries and admin

**Problem:** Hard-coded English in `global-error.tsx`, `product-error-boundary.tsx`, `nav-auth.tsx`, admin tools, feedback form.

**Goal:** All user-facing strings use i18n.

**Acceptance Criteria:**
- [ ] `global-error.tsx` uses `useAppLocale` (or error-safe variant)
- [ ] `product-error-boundary.tsx` i18n for fallback copy
- [ ] `nav-auth.tsx` aria-label from i18n
- [ ] Admin tools either marked "internal only" or i18n'd (decide per tool)
- [ ] Feedback form uses i18n (if still in product; may be mock)
- [ ] Hebrew translations added for all new keys
- [ ] Test with Hebrew locale

**Agent approach:**
```bash
1. Grep for hard-coded English in error/admin files
2. Add keys to i18n dictionaries (en.json, he.json)
3. Update components to use getCopy/useAppLocale
4. Test with both locales
5. Commit
```

**Skills:** None specific

---

<a name="story-12"></a>
### Story 12: Add route-level metadata

**Problem:** Missing metadata on `/dating/*`, settings, admin, conversations.

**Goal:** Each route has `title` and `description` metadata.

**Acceptance Criteria:**
- [ ] `dating/page.tsx` — "Your Profile | Dating App"
- [ ] `dating/me-matches/page.tsx` — "Matches | Dating App"
- [ ] `dating/conversations/page.tsx` — "Conversations | Dating App"
- [ ] Settings pages — "Settings | Dating App"
- [ ] Admin pages — "Admin | Dating App" (or blocked in prod)
- [ ] i18n titles (use generateMetadata with locale)
- [ ] Test Open Graph tags work

**Agent approach:**
```bash
1. Add export const metadata or generateMetadata to each page
2. Use i18n for titles
3. Test meta tags in dev tools
4. Commit
```

**Skills:** None specific

---

<a name="story-13"></a>
### Story 13: Delete deprecated code

**Problem:** `onboarding-draft-form.tsx` marked deprecated but still in tree. `feedback` page uses mock data.

**Goal:** Remove dead code.

**Acceptance Criteria:**
- [ ] `onboarding-draft-form.tsx` deleted (verify no imports)
- [ ] `dating/feedback` deleted or marked "mock/disabled" (confirm with user)
- [ ] Run tests to ensure nothing breaks
- [ ] Commit

**Agent approach:**
```bash
1. Grep for imports of deprecated files
2. Delete if no imports (or only self-imports)
3. Test suite passes
4. Commit
```

**Skills:** None specific

---

<a name="story-14"></a>
### Story 14: Organize internal routes

**Problem:** Internal tools (`/profiles`, `/matches`, `/evaluate`, `/auto-matches`) mixed with product routes.

**Goal:** Group under `app/(internal)/` route group with clear "dev-only" marker.

**Acceptance Criteria:**
- [ ] Create `app/(internal)/` route group
- [ ] Move profiles, matches, evaluate, auto-matches into it
- [ ] Add middleware gate: only allow in dev/staging (or authed admins)
- [ ] Add layout with "Internal Tools" banner
- [ ] Test routes still work
- [ ] Commit

**Agent approach:**
```bash
1. Create (internal) route group
2. Move directories
3. Add layout with banner
4. Update middleware to gate routes
5. Test
6. Commit
```

**Skills:** None specific

---

## Agent workflow (per story)

### General pattern:
```bash
# 1. Launch agent with clear story context
/task Create agent for "Story X: [title]"

# 2. Agent reads relevant files
# 3. Agent makes changes
# 4. Agent runs tests
# 5. Agent commits with conventional message

# 6. Review agent output
# 7. Manual test if needed
# 8. Merge to main
```

### When to use `explore` skill:
- Stories 1, 7 (large file analysis before refactor)
- Any story where structure is unclear

### When to use `generalPurpose` (default):
- All stories (this is the default refactoring agent)

### When to use `review-bugbot`:
- After each story (optional quality gate)

---

## Testing strategy

Each story must:
1. Pass existing vitest specs
2. Add new specs for extracted hooks/services
3. Manual smoke test for affected UI
4. No console errors/warnings

Coverage targets:
- Maintain or improve current coverage
- New hooks: 80%+ line coverage
- New services: 90%+ line coverage

---

## Success metrics

**Before Sprint 26:**
- 5 files >500 lines
- ~10 components >300 lines
- 0 route-level loading/error UI
- 4 files with direct fetch

**After Sprint 26:**
- 0 files >500 lines
- 0 components >300 lines (target: all <300)
- 100% route coverage for loading/error UI
- 0 files with direct fetch (all use services)
- Smaller JS bundles (measure)
- Better test coverage (measure)
- Complete i18n coverage

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing flows | Manual smoke test after each story; run full test suite |
| Merge conflicts (if multiple stories in parallel) | Do stories sequentially; commit after each |
| Server Component auth issues | Use proven pattern from onboarding pages; test with session |
| Over-engineering (premature abstraction) | Only extract when clear benefit; YAGNI principle |
| Agent makes incorrect refactor | Review each agent commit before merge; run tests |

---

## Next steps

1. **Review this plan with team** — prioritize, adjust estimates
2. **Choose Story 1 to start** (split me-profile-api.ts)
3. **Launch agent with clear instructions**
4. **Review, test, merge**
5. **Repeat for Stories 2–14**

Estimated total: **3–4 weeks** if done sequentially, **2–3 weeks** if some stories parallelized (e.g., Stories 2 and 3 can run in parallel).
