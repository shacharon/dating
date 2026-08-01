# Sprint 33: Critical Fixes + Navigation - Agent Commands

**Sprint Goal:** Fix critical UX issues and add global navigation  
**Duration:** 1 week  
**Stories:** 6

---

## 📋 Story Execution Order

### Parallel Track A: Navigation (Blocking)
- Story 33.1: Design global nav (mockups) ← **START HERE**
- Story 33.2: Implement global nav (after 33.1)

### Parallel Track B: Quick Fixes (Can run immediately)
- Story 33.3: Preserve scroll position
- Story 33.4: Kill redundant routes

### Parallel Track C: Onboarding (After nav)
- Story 33.5: Fixed onboarding progress header

### Parallel Track D: Marketing (Separate)
- Story 33.6: Landing page value prop

---

## Story 33.1: Design Global Navigation Shell

**Phase:** 0 (Design/Mockup)  
**Priority:** 🔴 CRITICAL (blocks Story 33.2)  
**Estimated Time:** 4-6 hours

### Command:

```bash
--agent 0 sprint 33 story 1
```

### Agent Prompt:

```
You are a UX/UI architect designing the global navigation shell for a dating app.

OBJECTIVE:
Design global app navigation that works on mobile and desktop, with unread badges and active states.

DESIGN REQUIREMENTS:

1. Navigation Items:
   - Matches (with "new matches" badge)
   - Conversations (with "unread" badge)
   - Profile (no badge)
   - Settings/Menu

2. Layouts:
   - Desktop: Decide between top horizontal nav OR left sidebar
   - Mobile: Decide between bottom tab bar OR hamburger menu
   - Both must support badges and active states

3. States to Design:
   - Default (inactive)
   - Active (current page)
   - With badge (show count: "3")
   - Hover (desktop only)

4. Dark Mode:
   - All states must have dark mode variants

5. Responsive Breakpoints:
   - Mobile: < 768px (bottom tabs or hamburger)
   - Tablet: 768px - 1024px
   - Desktop: > 1024px

DELIVERABLES:
1. Mockups (Figma or detailed ASCII art/descriptions)
   - Desktop layout (all states)
   - Mobile layout (all states)
   - Dark mode variants
   
2. Component Specification Document:
   - Props needed
   - State management (active route, badge counts)
   - Accessibility requirements (ARIA labels)
   - Responsive behavior

3. Navigation Structure:
   - Which links appear where
   - Link labels and icons
   - Badge behavior (when to show, max count display)

DESIGN DECISIONS TO MAKE:
[ ] Desktop: Top nav or sidebar?
[ ] Mobile: Bottom tabs or hamburger?
[ ] Icon style: Outline, filled, or custom?
[ ] Badge style: Circle, rounded square, dot only?
[ ] Should nav be fixed or sticky?
[ ] Logo placement?

REFERENCE:
- dating-ui/docs/UX_UI_PAGE_REVIEW.md (see "Navigation & Header Issues" section)
- Modern examples: Instagram (bottom tabs), Twitter (sidebar), LinkedIn (top nav)

OUTPUT FORMAT:
Create a design document with mockups (or detailed descriptions) and component spec.
Save as: dating-ui/docs/sprints/sprint-33-ux-navigation/STORY_01_nav_design.md
```

---

## Story 33.2: Implement Global Navigation Shell

**Phase:** 1 (Implementation)  
**Priority:** 🔴 CRITICAL  
**Depends On:** Story 33.1 (must have approved mockups)  
**Estimated Time:** 8-10 hours

### Command:

```bash
--agent 1 sprint 33 story 2
```

### Agent Prompt:

```
You are a frontend developer implementing the global navigation shell.

PREREQUISITES:
- Read the approved design from Story 33.1: dating-ui/docs/sprints/sprint-33-ux-navigation/STORY_01_nav_design.md
- Ensure mockups are approved before starting

OBJECTIVE:
Build the global navigation component and layout wrapper for all authenticated pages.

TECHNICAL REQUIREMENTS:

1. Create Components:
   - <AppNav /> - Main navigation wrapper
   - <AppNavDesktop /> - Desktop variant
   - <AppNavMobile /> - Mobile variant
   - <NavLink /> - Individual nav links with active state and badge support

2. Create Layout:
   - /dating/layout.tsx (wraps all authenticated pages)
   OR
   - /layout.tsx if removing /dating prefix (see Story 33.4)

3. Features:
   - Active route detection (usePathname from next/navigation)
   - Unread badge support (from context/API)
   - Responsive breakpoint at 768px
   - Keyboard navigation (Tab, Enter, Arrow keys)
   - ARIA labels for screen readers
   - Dark mode support

4. Context for Badge Counts:
   - Create or update NavContext for:
     - Unread message count
     - New match count
   - Connect to real-time APIs

FILES TO CREATE:
- dating-ui/src/components/nav/app-nav.tsx
- dating-ui/src/components/nav/app-nav-desktop.tsx
- dating-ui/src/components/nav/app-nav-mobile.tsx
- dating-ui/src/components/nav/nav-link.tsx
- dating-ui/src/contexts/nav-context.tsx
- dating-ui/src/app/dating/layout.tsx (or adjust based on Story 33.4)

ACCEPTANCE CRITERIA:
- [ ] Nav renders on all authenticated pages
- [ ] Active page highlighted correctly
- [ ] Unread badges show (Conversations tab)
- [ ] New match badges show (Matches tab)
- [ ] Responsive: mobile < 768px, desktop >= 768px
- [ ] Keyboard accessible (Tab, Enter)
- [ ] ARIA labels present
- [ ] Dark mode works
- [ ] No layout shift when badges update
- [ ] Works with browser back/forward buttons

TESTING:
- Test on mobile (Chrome DevTools mobile view)
- Test on desktop
- Test keyboard navigation
- Test with real badge counts (mock API if needed)
- Test dark mode toggle

OUTPUT:
Implement all components, test thoroughly, and document any deviations from design.
```

---

## Story 33.3: Preserve Scroll Position in Match List

**Phase:** 1 (Implementation)  
**Priority:** 🔴 CRITICAL  
**Can Run In Parallel:** Yes (no dependencies)  
**Estimated Time:** 2-3 hours

### Command:

```bash
--agent 2 sprint 33 story 3
```

### Agent Prompt:

```
You are a frontend developer fixing a critical UX bug.

PROBLEM:
When users browse match list → view match detail → return to list, 
the scroll position resets to top. Users have to scroll down again to 
find where they were. This is extremely frustrating.

OBJECTIVE:
Preserve scroll position when navigating between match list and match detail.

TECHNICAL APPROACH (choose best one):

Option A: Session Storage (Simplest)
- Save scroll position to sessionStorage before navigating away
- Restore on component mount
- Clear when user leaves matches section entirely

Option B: Next.js Router (Better)
- Use router.push() with scroll: false option
- Next.js preserves scroll automatically

Option C: Layout Context (Best if using new layout)
- Store scroll in parent layout context
- Persist during navigation within matches section

IMPLEMENTATION:

FILES TO MODIFY:
- dating-ui/src/app/dating/me-matches/page.tsx
- dating-ui/src/app/dating/me-matches/me-matches-page-client.tsx

CODE EXAMPLE (Option A):
```tsx
useEffect(() => {
  // Restore scroll on mount
  const savedScroll = sessionStorage.getItem('matchListScroll');
  if (savedScroll) {
    window.scrollTo(0, parseInt(savedScroll, 10));
    sessionStorage.removeItem('matchListScroll'); // Clear after use
  }

  // Save scroll on unmount
  return () => {
    sessionStorage.setItem('matchListScroll', window.scrollY.toString());
  };
}, []);

// Clear scroll when navigating away from matches entirely
useEffect(() => {
  const handleRouteChange = (url: string) => {
    if (!url.includes('/me-matches')) {
      sessionStorage.removeItem('matchListScroll');
    }
  };
  
  router.events?.on('routeChangeStart', handleRouteChange);
  return () => router.events?.off('routeChangeStart', handleRouteChange);
}, []);
```

ACCEPTANCE CRITERIA:
- [ ] User scrolls to match #15
- [ ] User taps match #15 to view detail
- [ ] User taps "Back to matches"
- [ ] Page restores to EXACT scroll position (match #15 visible)
- [ ] Works after Like/Pass/Block actions
- [ ] Works with browser back button
- [ ] Works on mobile and desktop
- [ ] Scroll position cleared when user navigates to different section (conversations, profile)
- [ ] Scroll position cleared on page refresh (expected behavior)

TEST CASES:
1. Scroll → view detail → back (✓ position preserved)
2. Scroll → view detail → like → back (✓ position preserved)
3. Scroll → view detail → pass → back (✓ position preserved)
4. Scroll → navigate to conversations → back to matches (✓ position reset)
5. Scroll → refresh page (✓ position reset)
6. Use browser back button (✓ position preserved)

EDGE CASES:
- Handle infinite scroll (if list grows)
- Handle if user was at bottom and list shrinks
- Handle very fast navigation (debounce if needed)

OUTPUT:
Implement, test all cases, and document the approach taken.
```

---

## Story 33.4: Kill Redundant Routes

**Phase:** 1 (Cleanup)  
**Priority:** 🔴 CRITICAL  
**Can Run In Parallel:** Yes  
**Estimated Time:** 2-3 hours

### Command:

```bash
--agent 3 sprint 33 story 4
```

### Agent Prompt:

```
You are doing code cleanup to remove redundant routes.

OBJECTIVE:
Remove unnecessary redirect pages and consolidate routing.

ROUTES TO REMOVE:

1. /dating hub page
   DELETE: dating-ui/src/app/dating/page.tsx
   DELETE: dating-ui/src/app/dating/dating-page-client.tsx
   ADD REDIRECT: /dating → /dating/me-matches (in middleware)

2. Legacy /dating/matches routes
   DELETE: dating-ui/src/app/dating/matches/page.tsx
   DELETE: dating-ui/src/app/dating/matches/[id]/page.tsx
   These already just redirect, remove them entirely

3. /onboarding router page
   DELETE: dating-ui/src/app/(authenticated)/onboarding/page.tsx
   DELETE: dating-ui/src/components/onboarding-index-redirect.tsx
   MOVE LOGIC: to middleware (server-side routing)

IMPLEMENTATION STEPS:

1. DELETE FILES (safe, they're just redirects):
   - dating-ui/src/app/dating/page.tsx
   - dating-ui/src/app/dating/dating-page-client.tsx
   - dating-ui/src/app/dating/matches/page.tsx
   - dating-ui/src/app/dating/matches/[id]/page.tsx
   - dating-ui/src/app/(authenticated)/onboarding/page.tsx
   - dating-ui/src/components/onboarding-index-redirect.tsx

2. UPDATE MIDDLEWARE:
   FILE: dating-ui/src/middleware.ts
   
   Add redirects:
   ```typescript
   // Redirect /dating to matches
   if (pathname === '/dating') {
     return NextResponse.redirect(new URL('/dating/me-matches', request.url));
   }
   
   // Redirect legacy /dating/matches
   if (pathname === '/dating/matches') {
     return NextResponse.redirect(new URL('/dating/me-matches', request.url));
   }
   
   if (pathname.startsWith('/dating/matches/')) {
     const id = pathname.split('/').pop();
     return NextResponse.redirect(new URL(`/dating/me-matches/${id}`, request.url));
   }
   
   // Handle /onboarding routing
   if (pathname === '/onboarding') {
     // Fetch user profile completeness and redirect to correct step
     // (Move logic from onboarding-index-redirect.tsx here)
     return NextResponse.redirect(new URL('/onboarding/basic', request.url));
   }
   ```

3. UPDATE AUTH CONTEXT:
   FILE: dating-ui/src/contexts/auth-context.tsx
   
   Change default redirect after login:
   ```typescript
   - const DEFAULT_AFTER_LOGIN = '/dating';
   + const DEFAULT_AFTER_LOGIN = '/dating/me-matches';
   ```

4. UPDATE ALL LINKS:
   Search codebase for links to removed routes:
   ```bash
   # Search for links to /dating
   grep -r 'href="/dating"' dating-ui/src/
   
   # Update to /dating/me-matches or remove
   ```

5. UPDATE TESTS:
   - Remove tests for deleted pages
   - Update navigation tests

ACCEPTANCE CRITERIA:
- [ ] Navigating to /dating redirects to /dating/me-matches
- [ ] Navigating to /dating/matches redirects to /dating/me-matches
- [ ] Navigating to /dating/matches/[id] redirects to /dating/me-matches/[id]
- [ ] Navigating to /onboarding routes to correct step
- [ ] No 404 errors for old URLs
- [ ] All internal links updated (no broken links)
- [ ] Auth redirect goes to /dating/me-matches after login
- [ ] All tests pass
- [ ] No references to deleted files in code

VERIFICATION:
- Test old URLs manually (should redirect, not 404)
- Test login flow (should go to matches)
- Test all navigation in app (no broken links)
- Run test suite

OUTPUT:
List of deleted files, updated files, and verification results.
```

---

## Story 33.5: Fixed Onboarding Progress Header

**Phase:** 0 + 1 (Simple mockup + implementation)  
**Priority:** 🟡 MEDIUM  
**Depends On:** Story 33.2 (uses similar nav patterns)  
**Estimated Time:** 4-5 hours

### Command (combined design + implementation):

```bash
--agent 1 sprint 33 story 5
```

### Agent Prompt:

```
You are implementing a fixed progress header for the onboarding flow.

OBJECTIVE:
Add fixed-position progress header to onboarding so users always see:
- Where they are in the flow
- Exit button
- Skip button

DESIGN (simple, no full mockup needed):

```
┌─────────────────────────────────────────┐
│ [← Exit]  ●━━━━━━○━━━━━━○  Skip      │ ← FIXED HEADER
│          Step 1   Step 2   Step 3       │
├─────────────────────────────────────────┤
│                                         │
│     Form content (scrollable)           │
│                                         │
└─────────────────────────────────────────┘

States:
- Step 1 (Basic): Filled circle ●, others empty ○
- Step 2 (Texts): First two filled ●●, last empty ○
- Step 3 (Photos - future): All filled ●●●
```

TECHNICAL IMPLEMENTATION:

1. CREATE LAYOUT:
   FILE: dating-ui/src/app/(authenticated)/onboarding/layout.tsx
   
   ```tsx
   export default function OnboardingLayout({ children }) {
     return (
       <div className="min-h-screen">
         <OnboardingHeader />
         <main className="pt-20"> {/* Offset for fixed header */}
           {children}
         </main>
       </div>
     );
   }
   ```

2. CREATE HEADER COMPONENT:
   FILE: dating-ui/src/components/onboarding/onboarding-header.tsx
   
   Features:
   - Fixed position (top: 0, left: 0, right: 0)
   - Z-index above content, below modals (z-50)
   - Exit button (left) with confirmation dialog
   - Progress stepper (center)
   - Skip button (right)
   - Responsive (stack on very small mobile)

3. CREATE STEPPER:
   FILE: dating-ui/src/components/onboarding/onboarding-stepper.tsx
   
   Props:
   - currentStep: 'basic' | 'texts' | 'photos'
   - Steps display with labels and filled/empty state

4. CREATE EXIT DIALOG:
   FILE: dating-ui/src/components/onboarding/exit-confirmation-dialog.tsx
   
   Message: "Are you sure you want to exit? Your progress will be saved."
   Actions: [Cancel] [Exit]

5. UPDATE EXISTING PAGES:
   Remove individual back buttons or progress indicators from:
   - dating-ui/src/app/(authenticated)/onboarding/basic/page.tsx
   - dating-ui/src/app/(authenticated)/onboarding/texts/page.tsx

FILES TO CREATE:
- dating-ui/src/app/(authenticated)/onboarding/layout.tsx
- dating-ui/src/components/onboarding/onboarding-header.tsx
- dating-ui/src/components/onboarding/onboarding-stepper.tsx
- dating-ui/src/components/onboarding/exit-confirmation-dialog.tsx

ACCEPTANCE CRITERIA:
- [ ] Progress header fixed at top on all onboarding pages
- [ ] Current step highlighted (filled circle)
- [ ] Exit button shows confirmation dialog
- [ ] Skip button visible and functional (navigates to /dating/me-matches)
- [ ] Header doesn't scroll away on mobile
- [ ] Header responsive on all screen sizes (320px+)
- [ ] Z-index correct (above content, below modals)
- [ ] Works in dark mode
- [ ] Exit dialog cancellable
- [ ] Exit dialog redirects to matches on confirm

STYLING:
- Use existing design system (Tailwind)
- Match app color scheme
- Ensure good contrast (WCAG AA)
- Mobile-friendly tap targets (44px min)

OUTPUT:
Implement all components and test on mobile/desktop.
```

---

## Story 33.6: Landing Page Value Proposition

**Phase:** 0 + 1 (Design + implementation)  
**Priority:** 🔴 CRITICAL  
**Estimated Time:** 6-8 hours (design 3h + implementation 5h)

### Command (Phase 0 - Design):

```bash
--agent 0 sprint 33 story 6 phase 0
```

### Agent Prompt (Design Phase):

```
You are a UX/UI designer redesigning the landing page.

PROBLEM:
Current landing page is bland and generic:
- No value proposition (just "Find your match")
- No social proof or trust signals
- No explanation of what makes this dating app different
- Users don't know what they're signing up for

OBJECTIVE:
Design a compelling landing page that:
1. Communicates value proposition clearly
2. Builds trust with social proof
3. Explains how the app works
4. Maintains single CTA focus (Google sign-in)

CONTENT TO INCLUDE:

1. HERO SECTION:
   - Compelling headline (value proposition)
     Example: "Find meaningful connections through AI-powered matching"
   - Subheadline (benefit statement)
   - CTA: Google sign-in button
   - Hero image or illustration

2. BENEFITS SECTION:
   - 3-4 key differentiators
   Examples:
     • "AI-powered matching based on deep compatibility"
     • "Quality over quantity - see 10 matches, not 1000"
     • "Safe and moderated conversations"
     • "Transparent matching criteria"

3. HOW IT WORKS:
   - 3-step process
     1. Complete your profile (5 minutes)
     2. Get AI-matched with compatible people
     3. Start meaningful conversations

4. SOCIAL PROOF:
   - User count: "Join 10,000+ users finding meaningful connections"
   - Testimonial (if available)
   - Trust badges (privacy, security)

5. FOOTER:
   - Privacy policy
   - Terms of service
   - Language picker

DESIGN REQUIREMENTS:
- Single page (no navigation away from sign-in)
- CTA visible above the fold
- Mobile responsive
- Dark mode support
- Imagery style decision: photos, illustrations, or abstract?
- Brand personality: warm, professional, playful, or serious?

DELIVERABLES:
1. Mockup or detailed wireframe (desktop + mobile)
2. Copy for all sections (headline, benefits, how it works)
3. Image/illustration requirements
4. Component breakdown (what needs to be built)

Save as: dating-ui/docs/sprints/sprint-33-ux-navigation/STORY_06_landing_design.md

OUTPUT FORMAT:
- Mockup (Figma link or ASCII art with descriptions)
- All copy written out
- Design system notes (colors, spacing, typography)
- Implementation notes for developer
```

### Command (Phase 1 - Implementation):

```bash
--agent 1 sprint 33 story 6 phase 1
```

### Agent Prompt (Implementation Phase):

```
You are a frontend developer implementing the redesigned landing page.

PREREQUISITES:
- Read approved design: dating-ui/docs/sprints/sprint-33-ux-navigation/STORY_06_landing_design.md
- Ensure mockups and copy are approved

OBJECTIVE:
Implement the new landing page with value proposition and social proof.

TECHNICAL IMPLEMENTATION:

FILE TO MODIFY:
- dating-ui/src/components/landing/public-landing-client.tsx

STRUCTURE:
```tsx
export function PublicLandingClient() {
  return (
    <main>
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <SocialProofSection />
      <CTASection />
      <Footer />
    </main>
  );
}
```

COMPONENTS TO CREATE:
- dating-ui/src/components/landing/hero-section.tsx
- dating-ui/src/components/landing/benefits-section.tsx
- dating-ui/src/components/landing/how-it-works-section.tsx
- dating-ui/src/components/landing/social-proof-section.tsx
- dating-ui/src/components/landing/landing-footer.tsx

FEATURES:
- Responsive design (mobile, tablet, desktop)
- Smooth scroll between sections (optional)
- Animations on scroll (optional, subtle)
- Dark mode support
- Lazy load images (optimize performance)
- SEO meta tags
- Language picker integration

CONTENT:
- Use copy from design doc
- Use i18n system for translations
- Add proper alt text for images

PERFORMANCE:
- Lazy load images below the fold
- Optimize image sizes (WebP format)
- No blocking JavaScript
- Fast Time to Interactive (< 2s)

ACCEPTANCE CRITERIA:
- [ ] Value prop visible above the fold
- [ ] All 4 sections render correctly
- [ ] Benefits section explains differentiators
- [ ] "How it works" shows 3-step process
- [ ] Social proof builds trust
- [ ] CTA (Google sign-in) prominent and working
- [ ] Mobile responsive (320px+)
- [ ] Dark mode works
- [ ] Images optimized (lazy load)
- [ ] SEO meta tags present
- [ ] Language picker works
- [ ] Footer links (privacy, terms) work
- [ ] No performance regression (lighthouse score > 90)

TESTING:
- Test on mobile (various sizes)
- Test on desktop
- Test dark mode
- Test language switching
- Lighthouse audit (performance, accessibility, SEO)
- Cross-browser (Chrome, Safari, Firefox)

OUTPUT:
Implement all sections, optimize performance, and run Lighthouse audit.
```

---

## 🚀 Sprint 33 Execution Plan

### Week Timeline:

**Day 1 (Monday):**
```bash
# Start design work (blocking)
--agent 0 sprint 33 story 1        # Global nav design

# Start parallel technical work (non-blocking)
--agent 2 sprint 33 story 3        # Scroll position fix
--agent 3 sprint 33 story 4        # Kill redundant routes
```

**Day 2 (Tuesday):**
```bash
# Continue design
--agent 0 sprint 33 story 6 phase 0  # Landing page design

# Wait for Story 33.1 approval, then:
--agent 1 sprint 33 story 2        # Implement global nav (after 33.1 approved)
```

**Day 3 (Wednesday):**
```bash
# Implement nav-related features
--agent 1 sprint 33 story 5        # Onboarding header (uses nav patterns)

# Landing page implementation (after design approved)
--agent 1 sprint 33 story 6 phase 1  # Landing page implementation
```

**Day 4-5 (Thursday-Friday):**
- Testing and bug fixes
- Integration testing
- Code review
- Documentation

---

## 📊 Sprint 33 Summary

**Total Stories:** 6  
**Design Stories:** 2 (33.1, 33.6)  
**Implementation Stories:** 4 (33.2, 33.3, 33.4, 33.5)

**Agents Needed:**
- Agent 0: Architect/Designer (Stories 33.1, 33.6 phase 0)
- Agent 1: Frontend Lead (Stories 33.2, 33.5, 33.6 phase 1)
- Agent 2: Frontend Dev (Story 33.3)
- Agent 3: Cleanup (Story 33.4)

**Mockups to Create:**
- ✅ Global navigation shell (Story 33.1)
- ✅ Landing page redesign (Story 33.6)
- ❌ Onboarding header (simple, no mockup needed - just build it)

**By End of Sprint:**
- ✅ Global navigation on all pages
- ✅ Scroll position preserved
- ✅ Cleaner route structure
- ✅ Better onboarding UX
- ✅ Compelling landing page

Ready to start? Run the first command! 🚀
