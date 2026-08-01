# Sprint 33-36: UX/UI Improvements - Master Plan

**Planning Date:** 2026-08-01  
**Scope:** All Critical + High + Medium UX/UI issues from review  
**Approach:** 4 sprints, parallel agent work, mockups first where needed  

---

## 📋 Sprint Overview

| Sprint | Focus | Stories | Mockups Needed | Estimated Duration |
|--------|-------|---------|----------------|-------------------|
| **Sprint 33** | Critical Fixes + Navigation | 6 | Yes (nav shell) | 1 week |
| **Sprint 34** | Content & Messaging UX | 5 | Yes (message previews, moderation) | 1 week |
| **Sprint 35** | Profile Consolidation | 4 | Yes (unified profile) | 1 week |
| **Sprint 36** | Component Refactoring | 3 | No | 1 week |

**Total:** 18 stories across 4 sprints

---

## Sprint 33: Critical Fixes + Navigation Foundation

**Theme:** Fix the most painful user experience issues and add global navigation

### Stories

#### 📐 Story 33.1: Design Global Navigation Shell
**Priority:** 🔴 CRITICAL (blocker for other work)  
**Needs mockup:** ✅ YES  
**Agent:** `--agent 0` (architect/designer)

**Objective:**  
Design global app navigation that works on mobile and desktop, with unread badges and active states.

**Mockup Requirements:**
- Desktop: Top horizontal nav OR left sidebar
- Mobile: Bottom tab bar OR hamburger menu
- States: Default, active, with badges (unread counts)
- Dark mode variants
- Responsive breakpoints

**Design Decisions Needed:**
1. Top nav vs. sidebar (desktop)?
2. Bottom tabs vs. hamburger (mobile)?
3. Icon style (outline, filled, custom)?
4. Badge styling for notifications?

**Deliverables:**
- Figma/design mockups (desktop + mobile)
- Component spec document
- Navigation structure (which links, order, labels)

**Acceptance Criteria:**
- [ ] Mockups approved for desktop (3 breakpoints)
- [ ] Mockups approved for mobile (portrait + landscape)
- [ ] Dark mode designs complete
- [ ] Badge/notification designs complete
- [ ] Component spec written (props, states, behavior)

**Estimated Time:** 4-6 hours (design + iteration)

---

#### 🏗️ Story 33.2: Implement Global Navigation Shell
**Priority:** 🔴 CRITICAL  
**Depends on:** Story 33.1 (mockups)  
**Agent:** `--agent 1` (frontend dev)

**Objective:**  
Build the global navigation component and layout wrapper for all dating pages.

**Technical Scope:**
- Create `<AppNav />` component (desktop + mobile responsive)
- Create `/dating/layout.tsx` that wraps all authenticated pages
- Add active route detection (usePathname)
- Add unread badge support (context from API)
- Add keyboard navigation (tab, arrow keys)
- Ensure ARIA labels and screen reader support

**Files to Create:**
```
dating-ui/src/components/app-nav.tsx
dating-ui/src/components/app-nav-desktop.tsx
dating-ui/src/components/app-nav-mobile.tsx
dating-ui/src/app/dating/layout.tsx (or top-level if removing /dating prefix)
dating-ui/src/contexts/nav-context.tsx (for unread counts)
```

**Acceptance Criteria:**
- [ ] Nav component renders on all dating pages
- [ ] Active page highlighted correctly
- [ ] Unread badges show in Conversations tab (live count)
- [ ] New match badges show in Matches tab (live count)
- [ ] Responsive: switches between desktop/mobile at 768px breakpoint
- [ ] Keyboard accessible (tab, enter, arrows)
- [ ] Dark mode works
- [ ] No layout shift when badges update

**Estimated Time:** 8-10 hours

---

#### 🔄 Story 33.3: Preserve Scroll Position in Match List
**Priority:** 🔴 CRITICAL  
**Needs mockup:** ❌ NO (technical fix)  
**Agent:** `--agent 2` (frontend dev)

**Objective:**  
When user navigates from match list → match detail → back to list, restore scroll position exactly where they left off.

**Technical Approach:**
```tsx
// Option A: Session Storage (simplest)
sessionStorage.setItem('matchListScroll', scrollY)
sessionStorage.getItem('matchListScroll')

// Option B: Next.js scroll restoration
router.push(url, { scroll: false })

// Option C: React state (if using layout)
Store scroll position in parent layout context
```

**Files to Modify:**
```
dating-ui/src/app/dating/me-matches/page.tsx
dating-ui/src/app/dating/me-matches/me-matches-page-client.tsx
```

**Acceptance Criteria:**
- [ ] User scrolls to match #15
- [ ] User taps match #15 to view detail
- [ ] User taps "Back to matches"
- [ ] Page restores to exact scroll position (match #15 visible)
- [ ] Works after Like/Pass/Block actions
- [ ] Works with browser back button
- [ ] Works on mobile and desktop
- [ ] Scroll position cleared when user navigates away from matches section

**Test Cases:**
1. Scroll → view detail → back (✓)
2. Scroll → view detail → like → back (✓)
3. Scroll → view detail → back → refresh page (scroll resets ✓)
4. Scroll → navigate to conversations → back to matches (scroll resets ✓)

**Estimated Time:** 2-3 hours

---

#### ❌ Story 33.4: Kill Redundant Routes
**Priority:** 🔴 CRITICAL  
**Needs mockup:** ❌ NO  
**Agent:** `--agent 3` (cleanup)

**Objective:**  
Remove unnecessary redirect pages and consolidate routes.

**Routes to Remove:**
1. `/dating` hub page → redirect to `/dating/me-matches`
2. `/dating/matches` → already redirects, remove route
3. `/dating/matches/[id]` → already redirects, remove route
4. `/onboarding` router page → handle in middleware instead

**Files to Delete:**
```
❌ dating-ui/src/app/dating/page.tsx
❌ dating-ui/src/app/dating/dating-page-client.tsx
❌ dating-ui/src/app/dating/matches/page.tsx
❌ dating-ui/src/app/dating/matches/[id]/page.tsx
❌ dating-ui/src/app/(authenticated)/onboarding/page.tsx
❌ dating-ui/src/components/onboarding-index-redirect.tsx
```

**Files to Modify:**
```
dating-ui/src/middleware.ts
  - Add redirect: /dating → /dating/me-matches
  - Add onboarding routing logic

dating-ui/src/components/auth/auth-context.tsx
  - Update default redirect after login
```

**Acceptance Criteria:**
- [ ] Navigating to `/dating` redirects to `/dating/me-matches`
- [ ] Navigating to `/dating/matches` redirects to `/dating/me-matches`
- [ ] Navigating to `/onboarding` routes to correct step
- [ ] All existing links updated (no 404s)
- [ ] Tests updated
- [ ] No broken links in documentation

**Estimated Time:** 2-3 hours

---

#### 📊 Story 33.5: Fixed Onboarding Progress Header
**Priority:** 🟡 MEDIUM  
**Needs mockup:** ✅ YES (simple)  
**Agent:** `--agent 1` (same as nav)

**Objective:**  
Add fixed position progress header to onboarding flow so users always see where they are.

**Mockup Requirements:**
```
┌─────────────────────────────────────────┐
│ [← Exit]  ●━━━━━━○━━━━━━○  Skip      │ ← FIXED
│          Basic   Texts   Photos         │
├─────────────────────────────────────────┤
│                                         │
│     Form content (scrollable)           │
│                                         │
```

**Technical Scope:**
- Create `/onboarding/layout.tsx` with fixed header
- Add progress stepper component
- Add exit confirmation dialog
- Add skip functionality
- Mobile-friendly (sticky header)

**Files to Create:**
```
dating-ui/src/app/(authenticated)/onboarding/layout.tsx
dating-ui/src/components/onboarding/onboarding-header.tsx
dating-ui/src/components/onboarding/onboarding-stepper.tsx
dating-ui/src/components/onboarding/exit-confirmation-dialog.tsx
```

**Acceptance Criteria:**
- [ ] Progress header fixed at top on all onboarding pages
- [ ] Current step highlighted
- [ ] Exit button shows confirmation dialog
- [ ] Skip button visible and functional
- [ ] Header doesn't scroll away on mobile
- [ ] Header responsive on all screen sizes
- [ ] Z-index correct (above content, below modals)

**Estimated Time:** 4-5 hours

---

#### 🎨 Story 33.6: Landing Page Value Proposition
**Priority:** 🔴 CRITICAL  
**Needs mockup:** ✅ YES  
**Agent:** `--agent 0` (designer) + `--agent 1` (implementation)

**Objective:**  
Add compelling value proposition and social proof to landing page so users understand what they're signing up for.

**Mockup Requirements:**
- Hero section with value prop headline
- 3-4 key benefits/features (with icons)
- Social proof section (user count, testimonials, or success stats)
- "How it works" section (3-step process)
- Imagery/illustrations (personality)
- Still focused on single CTA (Google sign-in)

**Content Needed:**
- Value prop headline (e.g., "Find meaningful connections through AI-powered matching")
- 3-4 benefit statements
- Testimonials or social proof
- "How it works" steps

**Design Decisions:**
1. Keep single-page or add sections?
2. Image style (photos, illustrations, abstract)?
3. How much content before overwhelming?
4. Mobile layout (stacked sections)

**Acceptance Criteria:**
- [ ] Value prop visible above the fold
- [ ] Benefits section explains differentiators
- [ ] Social proof builds trust
- [ ] Still maintains single CTA focus
- [ ] Mobile responsive
- [ ] Doesn't slow down auth flow (lazy load images)

**Estimated Time:** 6-8 hours (design 3h + implementation 5h)

---

### Sprint 33 Summary

**Total Stories:** 6  
**Critical Path:** Story 33.1 (nav design) → 33.2 (nav implementation)  
**Parallel Work:**
- Stories 33.3, 33.4 can run in parallel
- Story 33.5 can run after 33.2 (uses similar patterns)
- Story 33.6 can run in parallel (separate page)

**Sprint Goal:**  
By end of Sprint 33, users have:
- ✅ Global navigation to switch between sections
- ✅ Scroll position preserved in match list
- ✅ Cleaner route structure (no redundant pages)
- ✅ Better onboarding progress visibility
- ✅ Understanding of app value before signing up

---

## Sprint 34: Content & Messaging UX

**Theme:** Improve messaging inbox and content moderation transparency

### Stories

#### 💬 Story 34.1: Add Message Previews to Conversation List
**Priority:** 🔴 CRITICAL  
**Needs mockup:** ✅ YES  
**Agents:** `--agent 0` (backend API) + `--agent 1` (frontend)

**Objective:**  
Show last message preview, timestamp, and unread indicator in conversation list.

**Mockup Requirements:**
```
┌─────────────────────────────────────────┐
│ 👤 Sarah                          2h ago│
│    Hey, how are you?                  ●│ ← Unread dot
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 👤 Emma                       Yesterday │
│    You: Thanks for sharing!             │ ← "You:" prefix
└─────────────────────────────────────────┘
```

**Backend Changes (API):**
```typescript
// dating-api/src/me-profile/me-conversations.service.ts
// Add lastMessage to conversation DTO

interface ConversationListItemDto {
  id: string;
  otherUser: { ... };
  matchedAt: string;
  lastMessage: {          // NEW
    text: string;
    senderId: string;
    sentAt: string;
  } | null;
  unreadCount: number;    // NEW
}
```

**Frontend Changes:**
```typescript
// dating-ui/src/app/dating/conversations/conversations-page-client.tsx
// Display preview in card
```

**Acceptance Criteria:**
- [ ] API returns lastMessage for each conversation
- [ ] UI shows last 60 chars of message + "..."
- [ ] Shows "You:" prefix if current user sent it
- [ ] Shows relative timestamp (2h ago, Yesterday, Oct 15)
- [ ] Unread conversations have badge/bold text
- [ ] Empty conversations show "No messages yet"
- [ ] Truncation works for long messages and emojis
- [ ] Real-time updates when new message arrives

**Estimated Time:** 6-8 hours (backend 3h + frontend 4h)

---

#### ⚠️ Story 34.2: Improve Content Moderation Error Messages
**Priority:** 🔴 CRITICAL  
**Needs mockup:** ✅ YES  
**Agents:** `--agent 0` (backend) + `--agent 1` (frontend)

**Objective:**  
When content moderation rejects text, tell user exactly what was flagged and why.

**Mockup Requirements:**
```
❌ BEFORE:
Your profile contains inappropriate content

✅ AFTER:
⚠️ We found an issue in your profile

Field: About my ideal partner
Flagged phrase: "looking for someone freaky"
Category: Sexual content
Why: Direct sexual references aren't allowed

Suggestion: Describe personality traits instead
Example: "Looking for someone adventurous and open-minded"

[Edit Profile] [Learn About Guidelines]
```

**Backend Changes:**
```typescript
// dating-api/src/content-moderation/content-moderation.types.ts
interface ModerationResult {
  clean: boolean;
  category?: string;
  flaggedText?: string;        // NEW - what was flagged
  flaggedTextIndex?: number;   // NEW - position in text
  reason?: string;             // NEW - why it was flagged
  suggestion?: string;         // NEW - how to fix
}

// dating-api/src/content-moderation/dating-policy.ts
// Return more context when blocking

// dating-api/src/me-profile/me-profile.service.ts
// Pass detailed error to frontend
```

**Frontend Changes:**
```typescript
// dating-ui/src/components/onboarding-texts-form.tsx
// Show detailed error message
// Optionally highlight flagged text in textarea
```

**Acceptance Criteria:**
- [ ] Error shows which field was flagged
- [ ] Error shows flagged phrase/word
- [ ] Error shows category (sexual, violent, etc.)
- [ ] Error shows human-readable reason
- [ ] Error shows actionable suggestion
- [ ] Example of acceptable alternative shown
- [ ] Link to content guidelines
- [ ] Works for both profile fields and messages
- [ ] Dating policy violations show different message than OpenAI violations

**Estimated Time:** 8-10 hours (backend 5h + frontend 4h)

---

#### ⏱️ Story 34.3: Add Timestamps to Conversation Messages
**Priority:** 🟡 MEDIUM  
**Needs mockup:** ❌ NO (standard pattern)  
**Agent:** `--agent 1` (frontend)

**Objective:**  
Show timestamp on each message bubble in conversation detail, not just on hover.

**Current:** Timestamp only on hover (not discoverable)  
**New:** Timestamp visible below each bubble

**Design:**
```
┌─────────────────────────────┐
│ Hey, how are you doing?     │ ← Message bubble
└─────────────────────────────┘
  2:45 PM                      ← Timestamp always visible
```

**Files to Modify:**
```
dating-ui/src/app/dating/conversations/[id]/page.tsx
```

**Acceptance Criteria:**
- [ ] Each message shows timestamp below bubble
- [ ] Format: relative for today (2:45 PM), date for older (Oct 15, 2:45 PM)
- [ ] Timestamp color subtle (not distracting)
- [ ] Works for both sent and received messages
- [ ] Responsive on mobile

**Estimated Time:** 2-3 hours

---

#### 📝 Story 34.4: Add Writing Prompts to Text Fields
**Priority:** 🔴 CRITICAL  
**Needs mockup:** ✅ YES (content)  
**Agent:** `--agent 1` (frontend + content writing)

**Objective:**  
Add helpful prompts, examples, and guidance to onboarding text fields to reduce blank canvas anxiety.

**Mockup Requirements:**
- Prompt questions under each textarea
- "Show example" expandable section
- Character guidance (recommended length)
- Tone guidance (what to include/avoid)

**Example Design:**
```
About Me
┌─────────────────────────────────────────┐
│                                         │
│                                         │
└─────────────────────────────────────────┘
0 / 500 characters (50-200 recommended)

💡 What to include:
• Your hobbies and interests
• What you do for fun
• Your personality traits
• What makes you unique

[Show example profile →]

```

**Content to Write:**
- Prompt questions for each field:
  - About Me (3-4 questions)
  - About Ideal Partner (3-4 questions)
  - Relationship Goals (3-4 questions)
- Example profiles (2-3 per field)
- Character guidance
- Tone tips

**Files to Modify:**
```
dating-ui/src/components/onboarding-texts-form.tsx
dating-ui/src/lib/i18n/copy/en.ts (add prompt content)
dating-ui/src/components/onboarding/writing-prompts.tsx (new)
dating-ui/src/components/onboarding/example-profiles.tsx (new)
```

**Acceptance Criteria:**
- [ ] Each text field has prompt questions visible
- [ ] Character count shows recommended range
- [ ] "Show example" expandable works
- [ ] Examples are realistic and helpful
- [ ] Prompts don't overwhelm or clutter UI
- [ ] Works on mobile (prompts stack vertically)

**Estimated Time:** 6-8 hours (content 3h + implementation 4h)

---

#### 🔍 Story 34.5: Add Search/Filter to Conversation List
**Priority:** 🟡 MEDIUM  
**Needs mockup:** ❌ NO (standard pattern)  
**Agent:** `--agent 1` (frontend)

**Objective:**  
Let users search conversations by name and filter by unread/recent.

**Features:**
- Search input (filter by other user's name)
- Filter dropdown: All / Unread / Recent (24h)
- Sort: Recent first (default) / Alphabetical

**Files to Create:**
```
dating-ui/src/components/conversation-list-filters.tsx
```

**Files to Modify:**
```
dating-ui/src/app/dating/conversations/conversations-page-client.tsx
```

**Acceptance Criteria:**
- [ ] Search input filters conversations by name (client-side)
- [ ] Filter dropdown works (All/Unread/Recent)
- [ ] Sort dropdown works
- [ ] Filters persist during session
- [ ] Clear search button appears when typing
- [ ] Responsive on mobile

**Estimated Time:** 4-5 hours

---

### Sprint 34 Summary

**Total Stories:** 5  
**Critical Path:** Story 34.1 (message previews) is most impactful  
**Parallel Work:**
- Stories 34.2, 34.3, 34.4 can run in parallel
- Story 34.5 depends on 34.1 (needs message data)

**Sprint Goal:**  
By end of Sprint 34, users have:
- ✅ Useful conversation list (previews, timestamps)
- ✅ Clear moderation feedback (know what was flagged)
- ✅ Guided writing experience (prompts and examples)
- ✅ Ability to find conversations quickly

---

## Sprint 35: Profile Consolidation

**Theme:** Unify fragmented profile pages into single cohesive experience

### Stories

#### 🎨 Story 35.1: Design Unified Profile Page
**Priority:** 🟡 MEDIUM  
**Needs mockup:** ✅ YES  
**Agent:** `--agent 0` (architect/designer)

**Objective:**  
Design a single profile page with tabs/sections for view, edit, analysis, and settings.

**Mockup Requirements:**
```
/profile

┌─────────────────────────────────────────┐
│ [Overview] [Edit] [Analysis] [Settings]│ ← Tabs
├─────────────────────────────────────────┤
│                                         │
│  Tab content here                       │
│                                         │
└─────────────────────────────────────────┘

Tabs:
1. Overview - View profile as others see it
2. Edit - Inline editing (basic info + story)
3. Analysis - AI analysis results (moved from /dating/analysis)
4. Settings - Preferences, privacy
```

**Design Decisions:**
1. Tabs or accordion sections?
2. Edit inline or modal?
3. Desktop: sidebar navigation?
4. Mobile: tab bar or dropdown?
5. Profile quality score placement?

**Deliverables:**
- Profile page mockups (all tabs)
- Responsive designs
- Edit mode mockups (inline vs modal)
- Component hierarchy document

**Acceptance Criteria:**
- [ ] Mockups approved for all 4 tabs
- [ ] Mobile and desktop layouts designed
- [ ] Edit mode interaction defined
- [ ] Profile quality meter designed
- [ ] Dark mode variants

**Estimated Time:** 6-8 hours

---

#### 🏗️ Story 35.2: Implement Unified Profile Page
**Priority:** 🟡 MEDIUM  
**Depends on:** Story 35.1  
**Agent:** `--agent 1` (frontend)

**Objective:**  
Build the unified profile page with tabs and consolidate existing profile routes.

**Technical Scope:**
- Create new `/profile` page with tab navigation
- Move existing profile view logic to "Overview" tab
- Move existing edit forms to "Edit" tab
- Move analysis page to "Analysis" tab
- Move preferences to "Settings" tab
- Add profile quality meter component

**Files to Create:**
```
dating-ui/src/app/profile/page.tsx (new unified page)
dating-ui/src/app/profile/profile-tabs.tsx
dating-ui/src/components/profile/profile-overview-tab.tsx
dating-ui/src/components/profile/profile-edit-tab.tsx
dating-ui/src/components/profile/profile-analysis-tab.tsx
dating-ui/src/components/profile/profile-settings-tab.tsx
dating-ui/src/components/profile/profile-quality-meter.tsx
```

**Files to Deprecate (redirect):**
```
❌ /dating/profile → redirect to /profile
❌ /settings/profile/basic → redirect to /profile?tab=edit
❌ /settings/profile/story → redirect to /profile?tab=edit
❌ /dating/analysis → redirect to /profile?tab=analysis
```

**Acceptance Criteria:**
- [ ] All 4 tabs render correctly
- [ ] Tab navigation works (clicks and URL params)
- [ ] Deep linking works (/profile?tab=edit)
- [ ] Edit mode has save/cancel buttons
- [ ] Analysis tab shows AI results
- [ ] Settings tab has preferences
- [ ] Profile quality meter shows percentage
- [ ] Old routes redirect correctly
- [ ] No duplicate code from old pages

**Estimated Time:** 12-16 hours

---

#### 📊 Story 35.3: Add Profile Quality Score
**Priority:** 🟡 MEDIUM  
**Needs mockup:** Included in 35.1  
**Agent:** `--agent 0` (backend) + `--agent 1` (frontend)

**Objective:**  
Calculate and display profile completeness/quality score with suggestions for improvement.

**Backend Logic:**
```typescript
// dating-api/src/me-profile/profile-quality.service.ts (new)

interface ProfileQuality {
  score: number; // 0-100
  completeness: {
    hasNickname: boolean;
    hasLocation: boolean;
    hasAboutMe: boolean;
    hasAboutPartner: boolean;
    hasRelationshipGoals: boolean;
    hasPhoto: boolean;
    hasVerifiedEmail: boolean;
  };
  suggestions: string[]; // What to improve
}

Scoring:
- Nickname: 10 pts
- Location: 10 pts
- About Me (50+ chars): 20 pts
- About Partner (50+ chars): 20 pts
- Relationship Goals (50+ chars): 15 pts
- Photo uploaded: 15 pts
- Email verified: 10 pts
= 100 pts total
```

**Frontend Display:**
```
┌─────────────────────────────────────────┐
│ Profile Quality: 75%                    │
│ ████████████████░░░░░░░░░░░░░░░░░░░░░│
│                                         │
│ ✅ Complete:                            │
│   • Basic info                          │
│   • About me                            │
│   • Photo                               │
│                                         │
│ ⚠️ To improve:                          │
│   • Add relationship goals (+15%)       │
│   • Describe ideal partner (+20%)       │
│                                         │
│ [Improve Profile →]                     │
└─────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] API returns profile quality score
- [ ] UI shows percentage and progress bar
- [ ] Suggestions are actionable
- [ ] Clicking suggestion navigates to edit section
- [ ] Score updates in real-time after edits
- [ ] Tooltip explains scoring system

**Estimated Time:** 6-8 hours (backend 3h + frontend 4h)

---

#### 🧪 Story 35.4: Test and Migrate Profile Routes
**Priority:** 🟡 MEDIUM  
**Depends on:** Story 35.2  
**Agent:** `--agent 2` (testing)

**Objective:**  
Ensure all old profile routes redirect correctly and no functionality is lost.

**Test Cases:**
- [ ] Navigate to `/dating/profile` → redirects to `/profile`
- [ ] Navigate to `/settings/profile/basic` → redirects to `/profile?tab=edit`
- [ ] Navigate to `/dating/analysis` → redirects to `/profile?tab=analysis`
- [ ] Edit profile from new page → saves correctly
- [ ] View profile → shows all fields
- [ ] Profile quality score → calculates correctly
- [ ] All links updated in app (nav, buttons, etc.)
- [ ] Browser back button works with tabs
- [ ] Deep links work (/profile?tab=analysis)

**Files to Update:**
```
All components with links to profile pages:
- Navigation components
- Settings pages
- Onboarding completion redirects
```

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] No 404 errors
- [ ] No broken links
- [ ] Old bookmarks redirect correctly
- [ ] Documentation updated

**Estimated Time:** 4-6 hours

---

### Sprint 35 Summary

**Total Stories:** 4  
**Critical Path:** 35.1 (design) → 35.2 (implementation) → 35.4 (testing)  
**Parallel Work:** Story 35.3 (quality score) can run parallel to 35.2

**Sprint Goal:**  
By end of Sprint 35, users have:
- ✅ Single unified profile page (no confusion)
- ✅ Profile quality guidance (know how to improve)
- ✅ All profile features in one place
- ✅ Cleaner URL structure

---

## Sprint 36: Component Refactoring

**Theme:** Split large components for maintainability

### Stories

#### 🔧 Story 36.1: Refactor Match Detail Page
**Priority:** 🟢 LOW (technical debt)  
**Needs mockup:** ❌ NO  
**Agent:** `--agent 1` (frontend)

**Objective:**  
Split 575-line match detail component into smaller, testable pieces.

**Current Structure:**
```
/dating/me-matches/[id]/page.tsx (575 lines)
  - Everything in one file
```

**New Structure:**
```
/dating/me-matches/[id]/page.tsx (100 lines, orchestrator)
  ├─ <MatchDetailHeader />
  ├─ <MatchDetailContent />
  ├─ <MatchDetailActions />
  ├─ <MatchFeedbackWidget />
  ├─ <HardBlockBanner />
  └─ <MatchDetailModals />
```

**Files to Create:**
```
dating-ui/src/components/match-detail/match-detail-header.tsx
dating-ui/src/components/match-detail/match-detail-content.tsx
dating-ui/src/components/match-detail/match-detail-actions.tsx
dating-ui/src/components/match-detail/match-feedback-widget.tsx
dating-ui/src/components/match-detail/hard-block-banner.tsx
dating-ui/src/components/match-detail/match-detail-modals.tsx
```

**Acceptance Criteria:**
- [ ] All functionality preserved
- [ ] No visual regressions
- [ ] Each component < 150 lines
- [ ] Components are testable (unit tests)
- [ ] Modals are lazy-loaded (code splitting)
- [ ] Props are well-typed

**Estimated Time:** 8-10 hours

---

#### 🔧 Story 36.2: Refactor Conversation Detail Page
**Priority:** 🟢 LOW (technical debt)  
**Needs mockup:** ❌ NO  
**Agent:** `--agent 1` (frontend)

**Objective:**  
Split 460-line conversation component into smaller pieces and extract WebSocket logic.

**Current Structure:**
```
/dating/conversations/[id]/page.tsx (460 lines)
  - WebSocket logic
  - Message list
  - Composer
  - Actions
```

**New Structure:**
```
/dating/conversations/[id]/page.tsx (100 lines, orchestrator)
  ├─ <ConversationHeader />
  ├─ <MessageList />
  ├─ <MessageComposer />
  └─ <ConversationActions />

hooks/use-conversation-messages.ts (WebSocket logic)
hooks/use-message-composer.ts (draft, send, validation)
```

**Acceptance Criteria:**
- [ ] All functionality preserved
- [ ] WebSocket logic testable (extracted to hook)
- [ ] Each component < 150 lines
- [ ] Real-time messaging still works
- [ ] No visual regressions
- [ ] Components are unit testable

**Estimated Time:** 8-10 hours

---

#### 🧹 Story 36.3: Code Cleanup and Documentation
**Priority:** 🟢 LOW  
**Needs mockup:** ❌ NO  
**Agent:** `--agent 2` (documentation)

**Objective:**  
Update documentation, remove dead code, write component stories.

**Tasks:**
- [ ] Remove commented-out code
- [ ] Update README with new routes
- [ ] Document new components (JSDoc)
- [ ] Write Storybook stories for new components
- [ ] Update architecture diagrams
- [ ] Clean up unused imports
- [ ] Run linter and fix warnings

**Files to Update:**
- All new components (add JSDoc)
- README.md (update route table)
- docs/ARCHITECTURE.md (if exists)

**Acceptance Criteria:**
- [ ] No commented-out code
- [ ] All public components have JSDoc
- [ ] README is up to date
- [ ] No linter warnings
- [ ] Storybook stories for 5+ key components

**Estimated Time:** 4-6 hours

---

### Sprint 36 Summary

**Total Stories:** 3  
**Parallel Work:** All stories can run in parallel  

**Sprint Goal:**  
Clean up technical debt and make codebase more maintainable for future development.

---

## 🚀 Implementation Strategy

### Agent Orchestration

**Sprint 33:**
```
--agent 0 (architect): Story 33.1, 33.6 design
--agent 1 (frontend): Story 33.2, 33.5, 33.6 implementation
--agent 2 (frontend): Story 33.3 (parallel)
--agent 3 (cleanup): Story 33.4 (parallel)
```

**Sprint 34:**
```
--agent 0 (backend): Story 34.1 API, 34.2 backend
--agent 1 (frontend): Story 34.1 UI, 34.2 UI, 34.3, 34.4, 34.5
--agent 2 (content): Story 34.4 writing (parallel)
```

**Sprint 35:**
```
--agent 0 (architect): Story 35.1 design, 35.3 backend
--agent 1 (frontend): Story 35.2, 35.3 UI
--agent 2 (testing): Story 35.4
```

**Sprint 36:**
```
--agent 1 (frontend): Story 36.1, 36.2
--agent 2 (docs): Story 36.3 (parallel)
```

---

## 📐 Mockup Requirements Summary

| Sprint | Story | Mockup Type | Tools Needed |
|--------|-------|-------------|--------------|
| 33 | 33.1 | Global nav (mobile + desktop) | Figma, design system |
| 33 | 33.5 | Onboarding header | Simple, can sketch |
| 33 | 33.6 | Landing page redesign | Figma, copywriting |
| 34 | 34.1 | Message preview cards | Simple, can sketch |
| 34 | 34.2 | Error message UI | Simple, can sketch |
| 34 | 34.4 | Writing prompts layout | Simple, needs content |
| 35 | 35.1 | Unified profile (all tabs) | Figma, comprehensive |

**Mockup Strategy:**
1. **High-fidelity:** Stories 33.1, 33.6, 35.1 (use Figma, get feedback)
2. **Low-fidelity:** Others (sketch, HTML prototype, or just describe)

---

## 📊 Effort Summary

| Sprint | Stories | Design Hours | Dev Hours | Total Hours |
|--------|---------|--------------|-----------|-------------|
| Sprint 33 | 6 | 8-10h | 20-24h | 28-34h |
| Sprint 34 | 5 | 2-3h | 24-30h | 26-33h |
| Sprint 35 | 4 | 6-8h | 22-28h | 28-36h |
| Sprint 36 | 3 | 0h | 20-26h | 20-26h |
| **TOTAL** | **18** | **16-21h** | **86-108h** | **102-129h** |

**Assuming:**
- 1 sprint = 1 week
- 2-3 developers + 1 designer
- Parallel work where possible

**Timeline:** 4 weeks (1 month)

---

## ✅ Success Metrics

**After Sprint 33:**
- [ ] Time to switch between sections: < 1 second (global nav)
- [ ] Scroll position preserved: 100% of time
- [ ] Route redirects: < 50ms
- [ ] Landing page bounce rate: decrease by 20%

**After Sprint 34:**
- [ ] Inbox scan time: reduce by 50% (with previews)
- [ ] Content moderation rejections: reduce by 30% (better guidance)
- [ ] Profile completion rate: increase by 25% (prompts)

**After Sprint 35:**
- [ ] Profile edit confusion: eliminate (one place)
- [ ] Profile completion: increase by 40% (quality score)

**After Sprint 36:**
- [ ] Code maintainability: component average < 200 lines
- [ ] Test coverage: > 80%

---

## 🎯 Next Steps

1. **Review this plan** - Does prioritization make sense?
2. **Approve mockup strategy** - Do we need Figma for everything or can some be sketches?
3. **Start Sprint 33 Story 1** - Design global navigation shell
4. **Assign agents** - Who does what?

Ready to kick off Sprint 33? 🚀
