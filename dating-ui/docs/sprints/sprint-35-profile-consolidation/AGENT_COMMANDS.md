# Sprint 35: Profile Consolidation - Agent Commands

**Sprint Goal:** Unify fragmented profile pages into single cohesive experience  
**Duration:** 1 week  
**Stories:** 4  
**Process (LOCKED):** Full waterfall per phase — `0 → 1 → 2 → 3`. Run **one command at a time**.

---

## Waterfall rule

```bash
--agent 0 sprint 35 story N <phase?>
--agent 1 sprint 35 story N <phase?>
--agent 2 sprint 35 story N <phase?>
--agent 3 sprint 35 story N <phase?>
```

---

## 📋 Story Execution Order

### Sequential (Design First):
- Story 35.1: Design unified profile page (mockups) ← **START HERE**
- Story 35.2: Implement unified profile (after 35.1)
- Story 35.4: Test and migrate routes (after 35.2)

### Parallel with 35.2:
- Story 35.3: Profile quality score (backend + frontend, parallel)

---

## Story 35.1: Design Unified Profile Page

**Phase:** 0 (Design/Mockup)  
**Priority:** 🟡 MEDIUM (blocks Story 35.2)  
**Estimated Time:** 6-8 hours

### Commands (waterfall):

```bash
--agent 0 sprint 35 story 1
--agent 1 sprint 35 story 1
--agent 2 sprint 35 story 1
--agent 3 sprint 35 story 1
```

### Agent Prompt (Agent 0 design lock / Agent 1 polish artifacts if needed):

```
You are a UX/UI architect designing a unified profile page.

PROBLEM:
Currently 5 different routes for profile stuff:
- /profile → redirect
- /settings/profile → redirect
- /settings/profile/basic → edit basic info
- /settings/profile/story → edit story
- /dating/profile → view profile
- /dating/analysis → profile analysis (separate page!)

Users confused about where to go. No single source of truth.

OBJECTIVE:
Design ONE profile page with tabs/sections for:
1. Overview - View profile as others see it
2. Edit - Edit all fields inline
3. Analysis - AI analysis results (moved from /dating/analysis)
4. Settings - Preferences, privacy

DESIGN REQUIREMENTS:

LAYOUT OPTIONS (decide):
A) Horizontal tabs (top of page)
B) Vertical sidebar (left side, desktop only)
C) Segmented control (mobile-friendly)

TABS TO DESIGN:

1. **Overview Tab** (Default)
   - Shows profile as others see it
   - "Preview mode"
   - Quick edit button → switches to Edit tab
   - Profile quality meter visible

2. **Edit Tab**
   - All editable fields in one place:
     * Basic Info section (nickname, location, age, gender, looking for)
     * Story section (about me, about partner, relationship goals)
     * Photo section (future)
   - Inline editing OR modal?
   - Save/Cancel buttons
   - Auto-save or manual save?

3. **Analysis Tab**
   - AI-generated profile analysis
   - Re-analyze button
   - History/timeline of analyses (optional)
   - Actionable suggestions

4. **Settings Tab**
   - Matching preferences
   - Privacy settings
   - Notification preferences

FEATURES TO DESIGN:
- Profile quality meter (0-100% score)
  - Shows what's complete
  - Shows what needs improvement
  - Click to jump to edit section
- Tab navigation (keyboard accessible)
- Mobile responsive (tabs → dropdown or bottom sheet?)
- Dark mode

RESPONSIVE BEHAVIOR:
- Desktop (> 1024px): Sidebar or horizontal tabs?
- Tablet (768-1024px): Horizontal tabs
- Mobile (< 768px): Dropdown or segmented control

DESIGN DECISIONS TO MAKE:
[ ] Tab style: Horizontal, vertical sidebar, or segmented control?
[ ] Edit mode: Inline or modal?
[ ] Save behavior: Auto-save or manual?
[ ] Profile quality meter placement?
[ ] How to handle photo upload (future)?

DELIVERABLES:
1. Mockups for all 4 tabs (desktop + mobile)
2. Profile quality meter design
3. Edit mode interaction design
4. Component spec document

REFERENCE:
- dating-ui/docs/UX_UI_PAGE_REVIEW.md (see "Profile Consolidation" section)
- Similar: LinkedIn profile (tabs), Facebook profile (sections), GitHub profile (tabs)

OUTPUT FORMAT:
Create design document with mockups and component spec.
Save as: dating-ui/docs/sprints/sprint-35-profile-consolidation/STORY_01_unified_profile_design.md
```

---

## Story 35.2: Implement Unified Profile Page

**Phase:** 1 (Implementation)  
**Priority:** 🟡 MEDIUM  
**Depends On:** Story 35.1 (must have approved mockups)  
**Estimated Time:** 12-16 hours

### Commands (waterfall; after 35.1 ACCEPT):

```bash
--agent 0 sprint 35 story 2
--agent 1 sprint 35 story 2
--agent 2 sprint 35 story 2
--agent 3 sprint 35 story 2
```

### Agent Prompt (Agent 0 lock / Agent 1 implement):

```
You are implementing the unified profile page.

PREREQUISITES:
- Read approved design: dating-ui/docs/sprints/sprint-35-profile-consolidation/STORY_01_unified_profile_design.md
- Ensure mockups are approved

OBJECTIVE:
Build one profile page with tabs that consolidates all existing profile functionality.

CURRENT STATE (to consolidate):
- /dating/profile → view profile
- /settings/profile/basic → edit basic info
- /settings/profile/story → edit story
- /dating/analysis → profile analysis

NEW STATE:
- /profile (or /dating/profile) → unified page with 4 tabs

FILES TO CREATE:
```
dating-ui/src/app/profile/page.tsx (new unified page)
dating-ui/src/app/profile/profile-tabs.tsx (tab navigation)
dating-ui/src/components/profile/profile-overview-tab.tsx
dating-ui/src/components/profile/profile-edit-tab.tsx
dating-ui/src/components/profile/profile-analysis-tab.tsx
dating-ui/src/components/profile/profile-settings-tab.tsx
dating-ui/src/components/profile/profile-quality-meter.tsx
```

FILES TO DEPRECATE (create redirects):
```
❌ /dating/profile → redirect to /profile
❌ /settings/profile/* → redirect to /profile?tab=edit
❌ /dating/analysis → redirect to /profile?tab=analysis
```

IMPLEMENTATION:

1. CREATE MAIN PAGE:
   FILE: dating-ui/src/app/profile/page.tsx
   
   ```tsx
   export default function ProfilePage() {
     const searchParams = useSearchParams();
     const tab = searchParams.get('tab') || 'overview';
     
     return (
       <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
         <div className="mx-auto max-w-4xl px-6 py-10">
           <h1>Your Profile</h1>
           
           <ProfileQualityMeter />
           
           <ProfileTabs activeTab={tab} />
           
           <div className="mt-6">
             {tab === 'overview' && <ProfileOverviewTab />}
             {tab === 'edit' && <ProfileEditTab />}
             {tab === 'analysis' && <ProfileAnalysisTab />}
             {tab === 'settings' && <ProfileSettingsTab />}
           </div>
         </div>
       </div>
     );
   }
   ```

2. CREATE TAB NAVIGATION:
   FILE: dating-ui/src/app/profile/profile-tabs.tsx
   
   ```tsx
   interface Props {
     activeTab: string;
   }
   
   export function ProfileTabs({ activeTab }: Props) {
     const tabs = [
       { id: 'overview', label: 'Overview', icon: '👤' },
       { id: 'edit', label: 'Edit', icon: '✏️' },
       { id: 'analysis', label: 'Analysis', icon: '📊' },
       { id: 'settings', label: 'Settings', icon: '⚙️' },
     ];
     
     return (
       <div className="border-b border-zinc-200 dark:border-zinc-800">
         <nav className="flex gap-8" role="tablist">
           {tabs.map((tab) => (
             <Link
               key={tab.id}
               href={`/profile?tab=${tab.id}`}
               className={`
                 flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium
                 ${activeTab === tab.id
                   ? 'border-blue-600 text-blue-600'
                   : 'border-transparent text-zinc-600 hover:text-zinc-900'
                 }
               `}
               role="tab"
               aria-selected={activeTab === tab.id}
             >
               <span aria-hidden="true">{tab.icon}</span>
               {tab.label}
             </Link>
           ))}
         </nav>
       </div>
     );
   }
   ```

3. OVERVIEW TAB:
   FILE: dating-ui/src/components/profile/profile-overview-tab.tsx
   
   Reuse existing profile view logic from /dating/profile:
   ```tsx
   export function ProfileOverviewTab() {
     const { user } = useAuth();
     const [profile, setProfile] = useState(null);
     
     // Fetch profile data
     useEffect(() => {
       fetchMyProfile().then(setProfile);
     }, []);
     
     return (
       <div className="space-y-6">
         <div className="flex justify-between items-center">
           <h2>Profile Preview</h2>
           <Link href="/profile?tab=edit" className="btn-primary">
             Edit Profile
           </Link>
         </div>
         
         {/* Render profile fields (reuse existing component) */}
         <ProfileViewCard profile={profile} />
       </div>
     );
   }
   ```

4. EDIT TAB:
   FILE: dating-ui/src/components/profile/profile-edit-tab.tsx
   
   Combine basic + story edit forms:
   ```tsx
   export function ProfileEditTab() {
     return (
       <div className="space-y-8">
         <section>
           <h3>Basic Info</h3>
           {/* Reuse OnboardingBasicForm component */}
           <OnboardingBasicForm flow="edit" />
         </section>
         
         <section>
           <h3>Your Story</h3>
           {/* Reuse OnboardingTextsForm component */}
           <OnboardingTextsForm flow="edit" />
         </section>
         
         <section>
           <h3>Photos</h3>
           {/* Future: PhotoUploadSection */}
         </section>
       </div>
     );
   }
   ```

5. ANALYSIS TAB:
   FILE: dating-ui/src/components/profile/profile-analysis-tab.tsx
   
   Move content from /dating/analysis:
   ```tsx
   export function ProfileAnalysisTab() {
     const [analysis, setAnalysis] = useState(null);
     const [loading, setLoading] = useState(true);
     
     // Fetch analysis
     useEffect(() => {
       fetchMyAnalysis().then(setAnalysis).finally(() => setLoading(false));
     }, []);
     
     return (
       <div className="space-y-6">
         <div className="flex justify-between">
           <h2>Profile Analysis</h2>
           <button onClick={handleReanalyze} className="btn-secondary">
             Re-analyze
           </button>
         </div>
         
         {loading ? <Spinner /> : <AnalysisResults data={analysis} />}
       </div>
     );
   }
   ```

6. SETTINGS TAB:
   FILE: dating-ui/src/components/profile/profile-settings-tab.tsx
   
   ```tsx
   export function ProfileSettingsTab() {
     return (
       <div className="space-y-8">
         <section>
           <h3>Matching Preferences</h3>
           {/* Reuse preferences form */}
           <PreferencesForm />
         </section>
         
         <section>
           <h3>Privacy</h3>
           {/* Privacy settings */}
         </section>
       </div>
     );
   }
   ```

7. ADD REDIRECTS:
   FILE: dating-ui/src/middleware.ts
   
   ```typescript
   // Redirect old profile routes
   if (pathname === '/dating/profile') {
     return NextResponse.redirect(new URL('/profile', request.url));
   }
   
   if (pathname.startsWith('/settings/profile')) {
     return NextResponse.redirect(new URL('/profile?tab=edit', request.url));
   }
   
   if (pathname === '/dating/analysis') {
     return NextResponse.redirect(new URL('/profile?tab=analysis', request.url));
   }
   ```

ACCEPTANCE CRITERIA:
- [ ] All 4 tabs render correctly
- [ ] Tab navigation works (clicks and URL params)
- [ ] Deep linking works (/profile?tab=edit)
- [ ] Overview tab shows profile as others see it
- [ ] Edit tab has all edit forms (basic + story)
- [ ] Analysis tab shows AI analysis
- [ ] Settings tab has preferences
- [ ] Profile quality meter visible
- [ ] Old routes redirect correctly
- [ ] No duplicate code from old pages
- [ ] Keyboard accessible (Tab, Enter)
- [ ] Mobile responsive (tabs → dropdown?)
- [ ] Dark mode works
- [ ] Browser back button works with tabs

TESTING:
- Test all tab switches
- Test deep links with ?tab= param
- Test old URL redirects
- Test edit forms save correctly
- Test mobile responsive layout
- Test keyboard navigation

OUTPUT:
Implement all tabs, test thoroughly, ensure no regressions.
```

---

## Story 35.3: Add Profile Quality Score

**Phase:** 0 + 1 (Backend + Frontend)  
**Priority:** 🟡 MEDIUM  
**Can Run Parallel:** Yes (with Story 35.2)  
**Estimated Time:** 6-8 hours

### Commands (Backend — waterfall):

```bash
--agent 0 sprint 35 story 3 backend
--agent 1 sprint 35 story 3 backend
--agent 2 sprint 35 story 3 backend
--agent 3 sprint 35 story 3 backend
```

### Agent Prompt (Backend — Agent 0 lock / Agent 1 implement):

```
You are implementing profile quality scoring.

OBJECTIVE:
Calculate profile completeness/quality score with suggestions for improvement.

SCORING LOGIC:
```
Total: 100 points

Basic Info (30 points):
- Nickname: 10 pts (required, always have)
- Location: 10 pts
- Age/Gender/Looking for: 10 pts (required, always have)

Story (60 points):
- About Me (50+ chars): 20 pts
- About Partner (50+ chars): 20 pts
- Relationship Goals (50+ chars): 20 pts

Future (10 points):
- Photo uploaded: 10 pts
- Email verified: Already required
```

FILES TO CREATE:
```
dating-api/src/me-profile/profile-quality.service.ts
dating-api/src/me-profile/dto/profile-quality.dto.ts
```

FILES TO MODIFY:
```
dating-api/src/me-profile/me-profile.controller.ts (add GET /quality endpoint)
```

IMPLEMENTATION:

1. CREATE DTO:
   FILE: dating-api/src/me-profile/dto/profile-quality.dto.ts
   
   ```typescript
   export class ProfileQualityDto {
     @ApiProperty({ description: 'Overall quality score 0-100' })
     score: number;
     
     @ApiProperty({ description: 'What is complete' })
     completeness: {
       hasNickname: boolean;
       hasLocation: boolean;
       hasAboutMe: boolean;
       hasAboutPartner: boolean;
       hasRelationshipGoals: boolean;
       hasPhoto: boolean;
     };
     
     @ApiProperty({ description: 'Actionable suggestions to improve', type: [String] })
     suggestions: string[];
   }
   ```

2. CREATE SERVICE:
   FILE: dating-api/src/me-profile/profile-quality.service.ts
   
   ```typescript
   @Injectable()
   export class ProfileQualityService {
     calculateQuality(profile: UserProfile): ProfileQualityDto {
       const completeness = {
         hasNickname: !!profile.nickname, // Always true (required)
         hasLocation: !!profile.locationName,
         hasAboutMe: (profile.aboutMe?.length || 0) >= 50,
         hasAboutPartner: (profile.aboutRelationship?.length || 0) >= 50,
         hasRelationshipGoals: (profile.relationshipGoals?.length || 0) >= 50,
         hasPhoto: !!profile.primaryPhotoUrl,
       };
       
       let score = 0;
       score += completeness.hasNickname ? 10 : 0;
       score += completeness.hasLocation ? 10 : 0;
       score += 10; // Age/gender/looking for (always required)
       score += completeness.hasAboutMe ? 20 : 0;
       score += completeness.hasAboutPartner ? 20 : 0;
       score += completeness.hasRelationshipGoals ? 20 : 0;
       score += completeness.hasPhoto ? 10 : 0;
       
       const suggestions = this.getSuggestions(completeness);
       
       return {
         score,
         completeness,
         suggestions,
       };
     }
     
     private getSuggestions(completeness: any): string[] {
       const suggestions: string[] = [];
       
       if (!completeness.hasLocation) {
         suggestions.push('Add your location to find matches nearby (+10%)');
       }
       if (!completeness.hasAboutMe) {
         suggestions.push('Write about yourself to help others get to know you (+20%)');
       }
       if (!completeness.hasAboutPartner) {
         suggestions.push('Describe your ideal partner to get better matches (+20%)');
       }
       if (!completeness.hasRelationshipGoals) {
         suggestions.push('Share your relationship goals to align expectations (+20%)');
       }
       if (!completeness.hasPhoto) {
         suggestions.push('Upload a photo to increase profile views (+10%)');
       }
       
       return suggestions;
     }
   }
   ```

3. ADD ENDPOINT:
   FILE: dating-api/src/me-profile/me-profile.controller.ts
   
   ```typescript
   @Get('quality')
   @UseGuards(AuthGuard)
   @ApiOperation({ summary: 'Get profile quality score' })
   @ApiResponse({ status: 200, type: ProfileQualityDto })
   async getProfileQuality(@AuthUser() user: User): Promise<ProfileQualityDto> {
     const profile = await this.profileService.findByUserId(user.id);
     return this.qualityService.calculateQuality(profile);
   }
   ```

ACCEPTANCE CRITERIA:
- [ ] GET /api/v1/me/profile/quality returns quality score
- [ ] Score is 0-100
- [ ] Completeness flags are accurate
- [ ] Suggestions are actionable
- [ ] Endpoint is authenticated
- [ ] Tests added (unit + integration)
- [ ] Swagger docs updated

TESTING:
```bash
# Test with empty profile (should be low score)
# Test with partial profile
# Test with complete profile (should be 100)
```

OUTPUT:
Implement scoring service and endpoint, add tests.
```

### Commands (Frontend — waterfall; after backend ACCEPT):

```bash
--agent 0 sprint 35 story 3 frontend
--agent 1 sprint 35 story 3 frontend
--agent 2 sprint 35 story 3 frontend
--agent 3 sprint 35 story 3 frontend
```

### Agent Prompt (Frontend — Agent 0 lock / Agent 1 implement):

```
You are implementing the profile quality meter UI.

PREREQUISITES:
- Backend API complete (Story 35.3 backend)

OBJECTIVE:
Display profile quality score with progress bar and suggestions.

DESIGN:
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
│   • Add relationship goals (+20%)       │
│     [Go to Edit →]                      │
│   • Describe ideal partner (+20%)       │
│     [Go to Edit →]                      │
│                                         │
│ 💡 Profiles with 90%+ quality get 3x   │
│    more matches                         │
└─────────────────────────────────────────┘
```

FILES TO CREATE:
- dating-ui/src/components/profile/profile-quality-meter.tsx
- dating-ui/src/lib/profile-quality-api.ts (API client)

IMPLEMENTATION:

1. CREATE API CLIENT:
   FILE: dating-ui/src/lib/profile-quality-api.ts
   
   ```typescript
   interface ProfileQuality {
     score: number;
     completeness: {
       hasNickname: boolean;
       hasLocation: boolean;
       hasAboutMe: boolean;
       hasAboutPartner: boolean;
       hasRelationshipGoals: boolean;
       hasPhoto: boolean;
     };
     suggestions: string[];
   }
   
   export async function fetchProfileQuality(): Promise<ProfileQuality> {
     const res = await fetch('/api/v1/me/profile/quality', {
       credentials: 'include',
     });
     if (!res.ok) throw new Error('Failed to fetch profile quality');
     return res.json();
   }
   ```

2. CREATE COMPONENT:
   FILE: dating-ui/src/components/profile/profile-quality-meter.tsx
   
   ```tsx
   export function ProfileQualityMeter() {
     const [quality, setQuality] = useState<ProfileQuality | null>(null);
     const [loading, setLoading] = useState(true);
     
     useEffect(() => {
       fetchProfileQuality()
         .then(setQuality)
         .finally(() => setLoading(false));
     }, []);
     
     if (loading) return <Skeleton />;
     if (!quality) return null;
     
     const complete = Object.entries(quality.completeness)
       .filter(([_, value]) => value)
       .map(([key]) => formatCompletionItem(key));
     
     return (
       <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
         <div className="flex items-center justify-between">
           <h3 className="text-lg font-semibold">Profile Quality</h3>
           <span className="text-2xl font-bold text-blue-600">
             {quality.score}%
           </span>
         </div>
         
         <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
           <div
             className="h-full bg-blue-600 transition-all duration-500"
             style={{ width: `${quality.score}%` }}
           />
         </div>
         
         {complete.length > 0 && (
           <div className="mt-4">
             <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
               ✅ Complete:
             </h4>
             <ul className="mt-1 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
               {complete.map((item, i) => (
                 <li key={i}>• {item}</li>
               ))}
             </ul>
           </div>
         )}
         
         {quality.suggestions.length > 0 && (
           <div className="mt-4">
             <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300">
               ⚠️ To improve:
             </h4>
             <ul className="mt-1 space-y-2">
               {quality.suggestions.map((suggestion, i) => (
                 <li key={i} className="flex items-start justify-between gap-2">
                   <span className="text-sm text-zinc-600 dark:text-zinc-400">
                     • {suggestion}
                   </span>
                   <Link
                     href="/profile?tab=edit"
                     className="text-sm font-medium text-blue-600 hover:text-blue-700"
                   >
                     Go to Edit →
                   </Link>
                 </li>
               ))}
             </ul>
           </div>
         )}
         
         {quality.score >= 90 && (
           <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
             🎉 Great job! Complete profiles get 3x more matches.
           </div>
         )}
         
         {quality.score < 90 && (
           <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
             💡 Profiles with 90%+ quality get 3x more matches
           </div>
         )}
       </div>
     );
   }
   
   function formatCompletionItem(key: string): string {
     const labels: Record<string, string> = {
       hasNickname: 'Basic info',
       hasLocation: 'Location',
       hasAboutMe: 'About me',
       hasAboutPartner: 'About ideal partner',
       hasRelationshipGoals: 'Relationship goals',
       hasPhoto: 'Profile photo',
     };
     return labels[key] || key;
   }
   ```

3. USE IN PROFILE PAGE:
   FILE: dating-ui/src/app/profile/page.tsx
   
   ```tsx
   <ProfileQualityMeter />
   ```

4. REFRESH ON EDIT:
   When user edits profile, refresh quality score:
   ```tsx
   // After profile save
   mutate('/api/v1/me/profile/quality'); // SWR revalidation
   ```

ACCEPTANCE CRITERIA:
- [ ] Quality meter displays percentage
- [ ] Progress bar animates to correct width
- [ ] Complete items listed with checkmarks
- [ ] Suggestions listed with improvement links
- [ ] Clicking "Go to Edit" navigates to edit tab
- [ ] Score updates after profile edits
- [ ] Tooltip explains scoring (optional)
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Accessible (screen reader friendly)

TESTING:
- Test with 0% profile
- Test with 50% profile
- Test with 100% profile
- Test clicking suggestions
- Test after editing profile (should refresh)

OUTPUT:
Implement quality meter and integrate into profile page.
```

---

## Story 35.4: Test and Migrate Profile Routes

**Phase:** 1 (Testing)  
**Priority:** 🟡 MEDIUM  
**Depends On:** Story 35.2  
**Estimated Time:** 4-6 hours

### Commands (waterfall; after 35.2 ACCEPT):

```bash
--agent 0 sprint 35 story 4
--agent 1 sprint 35 story 4
--agent 2 sprint 35 story 4
--agent 3 sprint 35 story 4
```

### Agent Prompt (Agent 0 lock / Agent 1 implement):

```
You are testing the unified profile page and migrating old routes.

OBJECTIVE:
Ensure all old profile routes redirect correctly and no functionality is lost.

TEST CASES TO VERIFY:

1. **URL Redirects:**
   - [ ] Navigate to /dating/profile → redirects to /profile
   - [ ] Navigate to /settings/profile → redirects to /profile?tab=edit
   - [ ] Navigate to /settings/profile/basic → redirects to /profile?tab=edit
   - [ ] Navigate to /settings/profile/story → redirects to /profile?tab=edit
   - [ ] Navigate to /dating/analysis → redirects to /profile?tab=analysis
   - [ ] Old bookmarks work (redirect, don't 404)

2. **Tab Navigation:**
   - [ ] Click Overview tab → shows profile preview
   - [ ] Click Edit tab → shows edit forms
   - [ ] Click Analysis tab → shows AI analysis
   - [ ] Click Settings tab → shows preferences
   - [ ] Browser back button works with tabs
   - [ ] Deep links work (/profile?tab=edit)

3. **Edit Functionality:**
   - [ ] Edit basic info → saves correctly
   - [ ] Edit story fields → saves correctly
   - [ ] Content moderation still works
   - [ ] Error messages display correctly

4. **Profile View:**
   - [ ] Overview tab shows all profile fields
   - [ ] Photo displays correctly
   - [ ] All text fields visible
   - [ ] Formatted nicely (not raw data)

5. **Analysis Tab:**
   - [ ] Analysis loads correctly
   - [ ] Re-analyze button works
   - [ ] Results display correctly

6. **Quality Meter:**
   - [ ] Score displays correctly
   - [ ] Progress bar accurate
   - [ ] Suggestions shown
   - [ ] Click suggestion → navigates to edit tab

7. **Responsive:**
   - [ ] Desktop layout works (all tabs visible)
   - [ ] Mobile layout works (tabs → dropdown or stacked)
   - [ ] No horizontal scroll
   - [ ] Buttons accessible on mobile

8. **Accessibility:**
   - [ ] Keyboard navigation works (Tab, Enter)
   - [ ] Screen reader announces tab changes
   - [ ] ARIA labels present
   - [ ] Focus management correct

9. **Performance:**
   - [ ] Page loads quickly (< 2s)
   - [ ] Tab switches instant (no loading)
   - [ ] No unnecessary API calls

10. **Dark Mode:**
    - [ ] All tabs work in dark mode
    - [ ] Contrast ratios good (WCAG AA)

FILES TO UPDATE:

1. **Update All Links in App:**
   Search for old profile links and update:
   ```bash
   # Find all references
   grep -r '/dating/profile' dating-ui/src/
   grep -r '/settings/profile' dating-ui/src/
   grep -r '/dating/analysis' dating-ui/src/
   
   # Update to /profile or /profile?tab=...
   ```

2. **Update Navigation:**
   - Global nav (if it links to profile)
   - Settings menu
   - Onboarding completion redirect
   - Any "View Profile" buttons

3. **Update Tests:**
   - Remove tests for old profile pages
   - Add tests for new unified page
   - Update E2E tests

4. **Update Documentation:**
   - README.md (route table)
   - API docs (if any profile route references)

MANUAL TESTING CHECKLIST:

```
□ Desktop Chrome: All tabs work
□ Desktop Firefox: All tabs work
□ Desktop Safari: All tabs work
□ Mobile Chrome: All tabs work
□ Mobile Safari: All tabs work

□ Logged in as new user (empty profile): Quality meter shows 0%
□ Logged in as partial user: Quality meter shows 50%
□ Logged in as complete user: Quality meter shows 100%

□ Edit profile → Save → Verify changes reflected in Overview tab
□ Edit profile → Error → Verify error displays correctly

□ Old bookmark /dating/profile → Redirects to /profile
□ Old bookmark /settings/profile/basic → Redirects to /profile?tab=edit

□ Browser back button works
□ Browser forward button works
□ Refresh page → Tab state preserved (via URL param)

□ Dark mode toggle → All tabs look good
```

ACCEPTANCE CRITERIA:
- [ ] All test cases pass
- [ ] No 404 errors for old URLs
- [ ] No broken links in app
- [ ] Old bookmarks redirect correctly
- [ ] All functionality works (view, edit, analysis)
- [ ] Quality meter accurate
- [ ] Mobile responsive
- [ ] Accessible (keyboard + screen reader)
- [ ] Documentation updated

REGRESSION TESTING:
- [ ] Onboarding still works (uses same forms)
- [ ] Content moderation still works
- [ ] Profile analysis still works
- [ ] Preferences saving still works

OUTPUT:
Test thoroughly, document any issues, update all links and docs.
```

---

## 🚀 Sprint 35 Execution Plan

**Process:** Full waterfall. One command at a time.

```bash
--agent 0 sprint 35 story 1
# … 1, 2, 3 then story 2, then 3 backend/frontend, then story 4
```

See `QUICK_START_COMMANDS.md` for the full expanded list.

**Start:**

```bash
--agent 0 sprint 35 story 1
```

---

## 📊 Sprint 35 Summary

**Total Stories:** 4  
**Design Stories:** 1 (35.1)  
**Implementation Stories:** 2 (35.2, 35.3)  
**Testing Stories:** 1 (35.4)

**Mockups Needed:**
- ✅ Unified profile page (all 4 tabs, desktop + mobile)

**By End of Sprint:**
- ✅ One profile page (no confusion)
- ✅ Profile quality guidance
- ✅ All profile features in one place
- ✅ Cleaner URL structure

Ready for Sprint 35! 🚀
