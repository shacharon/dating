# Dating App - UX/UI Page Review

**Last updated:** 2026-08-01  
**Reviewer perspective:** Product Design + UX Best Practices

---

## Table of Contents

1. [Page Route Summary](#page-route-summary)
2. [Detailed Page Analysis](#detailed-page-analysis)
   - [Public Pages](#public-pages)
   - [Onboarding Flow](#onboarding-flow)
   - [Dating App Pages](#dating-app-pages)
   - [Settings Pages](#settings-pages)
   - [Admin Pages](#admin-pages)
   - [Developer Pages](#developer-pages)
3. [Cross-Cutting UX Observations](#cross-cutting-ux-observations)
4. [Priority Recommendations](#priority-recommendations)

---

## Page Route Summary

### Public Pages (Unauthenticated)
| Route | Purpose |
|-------|---------|
| `/` | Landing page with Google sign-in |
| `/privacy` | Privacy policy (legal) |
| `/terms` | Terms of service (legal) |

### Onboarding Flow (Authenticated, Incomplete Profile)
| Route | Purpose |
|-------|---------|
| `/onboarding` | Router - redirects to current onboarding step |
| `/onboarding/basic` | Collect: name, location, matching preferences |
| `/onboarding/texts` | Collect: about me, about partner, relationship goals |

### Dating App Pages (Core Product)
| Route | Purpose |
|-------|---------|
| `/dating` | Hub/landing page for authenticated users |
| `/dating/me-matches` | List of potential matches (infinite scroll) |
| `/dating/me-matches/[id]` | Match detail with like/pass/block actions |
| `/dating/matches` | Legacy redirect to `/dating/me-matches` |
| `/dating/matches/[id]` | Legacy redirect to `/dating/me-matches/[id]` |
| `/dating/conversations` | List of active conversations |
| `/dating/conversations/[id]` | Real-time messaging interface |
| `/dating/profile` | View your own profile |
| `/dating/analysis` | Profile analysis results and progress |
| `/dating/onboarding` | Alternate onboarding entry (redirects) |

### Settings Pages
| Route | Purpose |
|-------|---------|
| `/settings/profile` | Redirect to `/dating/profile` |
| `/settings/profile/basic` | Edit basic profile info |
| `/settings/profile/story` | Edit story/text fields |
| `/settings/preferences` | Edit matching preferences |
| `/settings/account` | Account settings |
| `/settings/language` | Language selection |
| `/profile` | Redirect to `/dating/profile` |
| `/app` | Redirect (deprecated) |

### Admin Pages (Staff Only)
| Route | Purpose |
|-------|---------|
| `/admin` | Admin dashboard/index |
| `/admin/photos` | Photo moderation queue |
| `/admin/reports` | User reports queue |
| `/admin/match-quality` | Match quality insights |
| `/admin/match-quality/[profileId]` | Individual profile quality review |
| `/admin/content-violations` | Content moderation violations + blocked users |

### Developer Pages
| Route | Purpose |
|-------|---------|
| `/dev/auth-test` | Authentication testing utilities |

---

## Detailed Page Analysis

## Public Pages

### `/` - Landing Page

**What it does:**
- First touchpoint for new users
- Google OAuth sign-in
- Language picker
- Links to privacy/terms

**Product Pros:**
- Single, clear CTA (Google sign-in) reduces decision paralysis
- Multi-language support from the start shows inclusivity
- Referral tracking captures attribution
- Auto-redirects authenticated users (good DX)

**Product Cons:**
- **No value proposition visible** - Users don't see *what* they're signing up for
- **Missing social proof** - No testimonials, stats, or success stories
- **No preview** - Can't see the app before committing to OAuth
- **Single auth method** - Google-only may exclude users without Google accounts

**UX Pros:**
- Clean, focused design
- Immediate language selection (accessibility++)
- Error states handled with retry button
- Loading states prevent confusion
- Proper ARIA labels and semantic HTML

**UX Cons:**
- **No progressive disclosure** - All or nothing (sign in or leave)
- **Missing "Learn More" option** - No way to explore before committing
- **Unclear value prop** - "Find your match" is generic, not differentiated
- **No trust signals** - No security badges, user count, or legitimacy indicators

**UI Pros:**
- Minimal, modern design
- Good contrast ratios
- Responsive layout
- Dark mode support

**UI Cons:**
- **Bland/generic** - Looks like a template, not a brand
- **No personality** - Missing imagery, color, or emotional hooks
- **Centered layout wastes space on desktop** - Could use asymmetric design for more visual interest

**Priority Issues:**
1. 🔴 **CRITICAL:** Add value proposition above the fold
2. 🟡 **MEDIUM:** Add "Learn more" or "How it works" section
3. 🟡 **MEDIUM:** Consider adding social proof or trust signals

---

### `/privacy` & `/terms` - Legal Pages

**What they do:**
- Display privacy policy and terms of service
- Server-rendered from markdown files

**Product Pros:**
- Legally compliant
- Easy to update (markdown)
- Separate pages (best practice)

**Product Cons:**
- No summary/TL;DR for users who won't read walls of text
- No "effective date" prominently displayed

**UX Pros:**
- Accessible from landing page footer
- Clean, readable typography

**UX Cons:**
- **No table of contents** for long documents
- **No "last updated" timestamp** visible
- **No highlight of key points** (e.g., data usage, user rights)

**UI Pros:**
- Consistent with app design
- Good readability

**UI Cons:**
- **Could use better information hierarchy** (headings, callouts)
- **No print stylesheet** for users who want offline copy

**Priority Issues:**
1. 🟢 **LOW:** Add table of contents for long documents
2. 🟢 **LOW:** Add "last updated" date at top

---

## Onboarding Flow

### `/onboarding` - Router

**What it does:**
- Redirects to the appropriate onboarding step based on profile completion

**Product Pros:**
- Smart routing reduces user confusion
- Allows deep-linking to onboarding

**Product Cons:**
- None (utility page)

**UX Pros:**
- Prevents users from getting lost

**UX Cons:**
- **No loading state** - Flash of blank page before redirect

**Priority Issues:**
1. 🟢 **LOW:** Add loading indicator during redirect calculation

---

### `/onboarding/basic` - Basic Profile Info

**What it does:**
- Collects: nickname, location, gender, looking for, age range
- First step in onboarding

**Product Pros:**
- **Minimal friction** - Only essential fields
- **Clear expectations** - Progress indicator shows step
- **Save as you go** - No "submit" button, auto-saves
- **Can skip** - Users aren't locked in

**Product Cons:**
- **No preview** - Users can't see what their profile will look like
- **No explanation** - Why do we need this info? (privacy concern)
- **Location required** - May deter privacy-conscious users

**UX Pros:**
- **Step indicator** - Users know where they are in the flow
- **Inline validation** - Immediate feedback on errors
- **Clear labels** - No jargon
- **Escape hatch** - Can navigate away

**UX Cons:**
- **No guidance on nickname** - Is it public? Can it be changed?
- **Age range slider UX unclear** - No visual indication of how it works
- **Missing field explanations** - "Why do you ask?" tooltips would help
- **No "skip" button** - Users have to manually navigate away

**UI Pros:**
- Clean, focused layout
- Good form spacing
- Accessible form controls

**UI Cons:**
- **Generic form design** - Looks like every other form
- **No personality** - Could use illustrations or encouragement
- **Desktop layout underutilized** - Max-width container wastes space

**Priority Issues:**
1. 🔴 **CRITICAL:** Add field-level explanations ("Why we ask")
2. 🟡 **MEDIUM:** Add visual preview of profile
3. 🟡 **MEDIUM:** Add explicit "Skip for now" button

---

### `/onboarding/texts` - Story & Text Fields

**What it does:**
- Collects: about me, about ideal partner, relationship goals
- Content moderation on save
- Second/final onboarding step

**Product Pros:**
- **Rich profile data** - Text fields allow personality to shine
- **Content moderation** - Proactive safety/quality
- **Save as you go** - Low risk of data loss
- **Example text** - Placeholder guides users

**Product Cons:**
- **Content moderation is black box** - Users get rejected but don't know why (recently improved)
- **No character guidance** - How much should I write?
- **No prompt/guidance** - Users staring at blank textarea can be intimidating
- **Error handling could be better** - "Your profile contains inappropriate content" is vague (even with field name)

**UX Pros:**
- **Real-time character count** - Users know limits
- **Inline error messages** - Clear feedback
- **Recoverable errors** - Users can edit and retry
- **Accessible textareas** - Proper labels

**UX Cons:**
- **No writing prompts** - "Tell us about yourself" is paralyzing
- **No examples** - Users don't know what "good" looks like
- **Content moderation feels punitive** - No explanation of *why* content was flagged
- **No "save draft" affordance** - Users unsure if their work is saved
- **Blocked users get generic error** - Could be more empathetic

**UI Pros:**
- Consistent with step 1
- Clean textarea design

**UI Cons:**
- **Intimidating blank canvas** - Large textareas can feel overwhelming
- **No visual warmth** - Could use encouragement or personality
- **Error states are red/harsh** - Could be more constructive

**Priority Issues:**
1. 🔴 **CRITICAL:** Add writing prompts/examples for each field
2. 🔴 **CRITICAL:** Improve content moderation error messaging (explain *what* was flagged and *why*)
3. 🟡 **MEDIUM:** Add character count *guidance* (not just limits) - e.g., "50-200 words recommended"
4. 🟡 **MEDIUM:** Add "See example profiles" link

---

## Dating App Pages

### `/dating` - Hub/Landing

**What it does:**
- Authenticated user landing page
- Links to matches and onboarding

**Product Pros:**
- Simple navigation hub
- Low cognitive load

**Product Cons:**
- **Unnecessary layer** - Most users will want to go directly to matches
- **No value beyond navigation** - Could show stats, notifications, or recent activity
- **Forces extra click** - Friction between login and action

**UX Pros:**
- Clear CTAs
- Consistent branding

**UX Cons:**
- **Extra navigation layer** - Users have to click twice to get anywhere
- **No context** - Doesn't show user's current state (new matches, unread messages)
- **Could be eliminated** - Auto-redirect to `/dating/me-matches` on login would be better

**UI Pros:**
- Clean, simple

**UI Cons:**
- **Underutilized real estate** - Could be a dashboard

**Priority Issues:**
1. 🔴 **CRITICAL:** Consider eliminating this page entirely and auto-redirecting to `/dating/me-matches`
2. 🟡 **MEDIUM:** OR convert to a dashboard with stats, recent activity, and quick actions

---

### `/dating/me-matches` - Match List

**What it does:**
- Shows potential matches in infinite scroll list
- Card-based UI with photo, name, age, location
- Tap to view detail

**Product Pros:**
- **Infinite scroll** - No pagination friction
- **Fast browsing** - Users can scan many profiles quickly
- **Card preview** - Enough info to decide if interested

**Product Cons:**
- **List vs. swipe debate** - Most dating apps use swipe UI (Tinder, Bumble) for engagement
- **No filtering** - Users can't narrow by interest, distance, etc.
- **No sorting** - Can't sort by new, recommended, etc.
- **No bulk actions** - Can't pass on multiple at once

**UX Pros:**
- **Familiar pattern** - Grid/list is understood
- **Responsive design** - Works on mobile/desktop
- **Loading states** - Clear feedback

**UX Cons:**
- **Requires drilling in** - Must tap each card to take action
- **No quick actions** - Can't like/pass from list view
- **Back button friction** - After viewing detail, have to navigate back
- **Lost scroll position** - After returning from detail, list may reset
- **No batch actions** - Tedious for power users

**UI Pros:**
- Clean card design
- Good photo prominence
- Readable text hierarchy

**UI Cons:**
- **Generic card design** - Looks like every other dating app
- **No personality** - Could use micro-interactions or delight
- **Desktop layout could be better** - Single column wastes space

**Priority Issues:**
1. 🔴 **CRITICAL:** Preserve scroll position when returning from detail page
2. 🟡 **MEDIUM:** Consider adding quick actions (like/pass) on cards
3. 🟡 **MEDIUM:** Add filtering/sorting options
4. 🟢 **LOW:** Explore swipe UI as alternative (A/B test candidate)

---

### `/dating/me-matches/[id]` - Match Detail

**What it does:**
- Full match profile with photo, bio, AI-generated narrative
- Actions: Like, Pass, Block, Report
- Feedback widget (thumbs up/down on match quality)
- Hard block reasons displayed if applicable
- Celebration modal on mutual match

**Product Pros:**
- **Rich profile view** - Users get full context before deciding
- **Multiple actions** - Like, pass, block, report covers all cases
- **Undo feature** - Reduces anxiety about mistakes
- **Feedback loop** - Thumbs up/down improves matching algorithm
- **Mutual match celebration** - Rewarding moment of connection
- **Hard block transparency** - Users understand why some matches won't work

**Product Cons:**
- **Too much friction** - Drill-in required for every match (vs. swipe)
- **Feedback widget may be confusing** - Users may not understand its purpose
- **Block confirmation could be stronger** - Easy to accidentally block
- **No "maybe later" option** - Forces binary decision
- **AI narrative could be off-putting** - Some users may prefer raw profile

**UX Pros:**
- **Clear action hierarchy** - Primary (like) vs. secondary (pass/block)
- **Confirmation dialogs** - Prevents accidental blocks
- **Error recovery** - Undo for like/pass
- **Accessible** - Proper ARIA labels, keyboard nav
- **Loading states** - Clear feedback during actions
- **Celebration modal** - Positive reinforcement

**UX Cons:**
- **Action overload** - Too many options may cause decision paralysis
- **Feedback widget placement unclear** - May be missed or misunderstood
- **Back navigation unclear** - Users may not know how to return to list
- **No keyboard shortcuts** - Power users can't quickly act
- **Hard block UI is jarring** - Could be more empathetic
- **Report flow requires extra clicks** - Friction for safety reporting

**UI Pros:**
- Beautiful hero photo
- Good content hierarchy
- Responsive design
- Clean typography

**UI Cons:**
- **Long page** - Requires scrolling to see actions
- **Actions buried** - CTA buttons not visible above the fold
- **Hard block banner too prominent** - May discourage engagement
- **Feedback widget looks like UI error** - Border style is ambiguous
- **Report/Block links easy to miss** - Should be more accessible

**Priority Issues:**
1. 🔴 **CRITICAL:** Move primary actions (Like/Pass) above the fold or make sticky
2. 🟡 **MEDIUM:** Improve feedback widget labeling ("Help us improve matches")
3. 🟡 **MEDIUM:** Add keyboard shortcuts (L for like, P for pass, etc.)
4. 🟡 **MEDIUM:** Consider "Save for later" option
5. 🟢 **LOW:** Redesign hard block banner to be less jarring

---

### `/dating/conversations` - Conversation List

**What it does:**
- Lists active conversations
- Shows unread indicators
- Real-time updates (WebSocket)

**Product Pros:**
- **Unified inbox** - All conversations in one place
- **Unread badges** - Clear what needs attention
- **Real-time** - Messages appear instantly

**Product Cons:**
- **No conversation previews** - Can't see last message without drilling in
- **No search** - Can't find specific conversation
- **No filtering** - Can't sort by unread, recent, etc.
- **No archiving** - All conversations forever visible

**UX Pros:**
- **Real-time updates** - Notifications on new messages
- **Clear unread state** - Visual indicator
- **Tap to open** - Simple interaction

**UX Cons:**
- **No message preview** - Users have to open to see context
- **No timestamps** - Can't tell when last message was sent
- **No swipe actions** - Can't archive/delete without opening
- **Lost conversations** - Long list becomes unwieldy

**UI Pros:**
- Clean list design
- Good avatar/name hierarchy

**UI Cons:**
- **Bland list UI** - Could use more visual interest
- **No visual indication of conversation state** - (e.g., waiting for response, active chat)

**Priority Issues:**
1. 🔴 **CRITICAL:** Add last message preview
2. 🔴 **CRITICAL:** Add timestamps for each conversation
3. 🟡 **MEDIUM:** Add search functionality
4. 🟡 **MEDIUM:** Add filtering/sorting (unread first, recent, etc.)
5. 🟢 **LOW:** Add archive/delete actions

---

### `/dating/conversations/[id]` - Conversation Detail / Messaging

**What it does:**
- Real-time chat interface
- Send/receive messages with WebSocket updates
- Message history with "load earlier" pagination
- Character limit (500) with counter
- Unmatch and report options

**Product Pros:**
- **Real-time messaging** - Feels modern and responsive
- **Character limit** - Encourages concise communication
- **Load earlier** - Good balance of performance and history
- **Unmatch option** - Users can exit unwanted conversations
- **Report option** - Safety mechanism

**Product Cons:**
- **500 char limit may be too restrictive** - Deep conversations truncated
- **No media support** - Text-only limits expression
- **No read receipts** - Users don't know if message was seen
- **No typing indicators** - Can't tell if other person is responding
- **Unmatch is destructive** - No archive option

**UX Pros:**
- **Auto-scroll to bottom** - New messages visible immediately
- **Enter to send** - Familiar pattern
- **Character counter** - Clear limit feedback
- **Loading states** - Good feedback
- **Reconnection handling** - Users notified of connection issues
- **Send error handling** - Clear error messages

**UX Cons:**
- **No timestamp on each message** - Hard to track conversation timeline
- **Match info minimal** - Can't easily reference profile
- **Unmatch confirmation could be stronger** - Easy to accidentally unmatch
- **Report requires menu drill-down** - Friction for safety action
- **No emoji picker** - Users have to use OS emoji keyboard
- **No message editing** - Typos permanent
- **No message deletion** - Can't remove accidentally sent messages

**UI Pros:**
- Clean bubble design
- Good sender differentiation (color)
- Responsive layout
- Textarea auto-grows

**UI Cons:**
- **Timestamp only on hover** - Not discoverable
- **Match card takes up space** - Could be collapsed/sticky header
- **Actions buried in footer** - Unmatch/report not accessible
- **No visual personality** - Generic chat UI

**Priority Issues:**
1. 🟡 **MEDIUM:** Add timestamp to each message bubble
2. 🟡 **MEDIUM:** Add typing indicators
3. 🟡 **MEDIUM:** Add read receipts (opt-in)
4. 🟡 **MEDIUM:** Make report action more accessible
5. 🟢 **LOW:** Add emoji picker
6. 🟢 **LOW:** Consider allowing photo sharing (moderated)

---

### `/dating/profile` - Own Profile View

**What it does:**
- Shows user's own complete profile
- Links to edit sections

**Product Pros:**
- **Profile visibility** - Users can see what others see
- **Edit access** - Quick path to settings

**Product Cons:**
- **View-only by default** - Extra click to edit
- **No analytics** - Users don't know how profile is performing
- **No prompts to improve** - Could suggest incomplete fields

**UX Pros:**
- **Self-review** - Users can audit their own profile
- **Clear edit links** - Obvious how to change things

**UX Cons:**
- **Extra navigation layer** - Why not edit directly?
- **No quality score** - Users don't know if profile is "good"
- **No suggestions** - Missed coaching opportunity

**UI Pros:**
- Consistent with match detail view

**UI Cons:**
- **Could show performance metrics** - Views, likes received, etc.

**Priority Issues:**
1. 🟡 **MEDIUM:** Add profile quality score/meter
2. 🟡 **MEDIUM:** Add suggestions to improve profile
3. 🟢 **LOW:** Add profile analytics (views, likes received)

---

### `/dating/analysis` - Profile Analysis

**What it does:**
- Shows AI-generated profile analysis
- Progress indicator
- Re-analyze button

**Product Pros:**
- **Value-add feature** - Differentiator from competitors
- **Actionable insights** - Helps users improve profiles

**Product Cons:**
- **Unclear value prop** - Users may not understand what this does
- **Analysis opacity** - Black box AI results
- **No history** - Can't see previous analyses

**UX Pros:**
- **Re-analyze option** - Users can refresh
- **Loading state** - Polling UI

**UX Cons:**
- **Polling UX is clunky** - Could use WebSocket/SSE
- **No guidance on what to do with results** - Insights without action steps
- **Could be integrated into profile page** - Extra navigation layer

**UI Pros:**
- Clean results display

**UI Cons:**
- **Could use better visualization** - Charts, scores, comparisons

**Priority Issues:**
1. 🟡 **MEDIUM:** Add actionable suggestions based on analysis
2. 🟡 **MEDIUM:** Integrate into profile page instead of separate page
3. 🟢 **LOW:** Add analysis history

---

## Settings Pages

### `/settings/profile/basic` - Edit Basic Info

**What it does:**
- Edit: nickname, location, gender, looking for, age range
- Same fields as onboarding step 1

**Product/UX/UI Analysis:**
- Same pros/cons as `/onboarding/basic`
- **PRO:** Separated from onboarding flow (less pressure)
- **CON:** Redundant page - could be combined with profile view

---

### `/settings/profile/story` - Edit Story Fields

**What it does:**
- Edit: about me, about partner, relationship goals
- Same fields as onboarding step 2

**Product/UX/UI Analysis:**
- Same pros/cons as `/onboarding/texts`
- **CON:** Separated from basic settings - users have to navigate between pages
- **CON:** No unified "edit profile" experience

---

### `/settings/preferences` - Matching Preferences

**What it does:**
- Edit matching algorithm preferences
- Distance, age range, etc.

**Product Pros:**
- **User control** - Empowers users to tune matching

**Product Cons:**
- **Complex settings** - May confuse non-technical users
- **Immediate effect** - No "save" button may be surprising

**UX Pros:**
- **Clear labels**
- **Immediate feedback**

**UX Cons:**
- **No explanation of impact** - Users don't know how settings affect matches
- **Could use guidance** - Tooltips or help text

**Priority Issues:**
1. 🟡 **MEDIUM:** Add explanations of how each setting affects matching

---

### `/settings/account` - Account Settings

**What it does:**
- Account-level settings (email, privacy, etc.)

**Analysis:**
- Standard settings page
- **No major issues** if implemented correctly

---

### `/settings/language` - Language Selection

**What it does:**
- Change app language
- Same as picker on landing page

**Product Pros:**
- **Accessibility** - Multi-language support

**UX Pros:**
- **Persistent setting** - Saved across sessions

**UX Cons:**
- **Requires page reload** - Could be smoother

---

## Admin Pages

### `/admin` - Admin Dashboard

**What it does:**
- Landing page with links to admin tools

**Product Pros:**
- **Centralized access** - All admin tools in one place

**Product Cons:**
- **English only** - Not localized (acceptable for internal tool)

**UX Pros:**
- **Simple navigation**

**UX Cons:**
- **No dashboard metrics** - Could show queue sizes, alerts

**Priority Issues:**
1. 🟡 **MEDIUM:** Add metrics dashboard (queue sizes, recent activity)

---

### `/admin/photos` - Photo Moderation Queue

**What it does:**
- Review pending photos
- Approve/reject actions

**Product Pros:**
- **Dedicated queue** - Efficient moderation workflow

**UX Pros:**
- **Clear actions** (assumed)

**UX Cons:**
- **Queue management unclear** - How are photos prioritized?
- **No batch actions** - Inefficient for volume

**Priority Issues:**
1. 🟡 **MEDIUM:** Add batch approve/reject
2. 🟡 **MEDIUM:** Add filtering/sorting

---

### `/admin/reports` - User Reports Queue

**What it does:**
- Review user-generated reports
- Take action on reports

**Analysis:**
- Same pros/cons as photo queue
- **CRITICAL:** Needs clear escalation paths for serious reports

---

### `/admin/match-quality` - Match Quality Insights

**What it does:**
- Analyze matching algorithm performance
- Individual profile quality reviews

**Product Pros:**
- **Data-driven optimization** - Helps improve product

**UX Pros:**
- **Insights dashboard** (assumed)

**UX Cons:**
- **Complex data** - Needs good visualization

**Priority Issues:**
1. 🟡 **MEDIUM:** Ensure visualizations are clear and actionable

---

### `/admin/content-violations` - Content Violations & Blocked Users

**What it does:**
- Lists content moderation violations
- Blocked users section (NEW in Sprint 32)
- Filtering by action, user status, has recipient
- Full violation text toggle
- Unblock functionality

**Product Pros:**
- **Comprehensive moderation tools** - All violation types visible
- **Blocked users prioritized** - Separate section for active enforcement
- **Full context available** - Can see full flagged text
- **Unblock path** - Recovery mechanism

**Product Cons:**
- **Complex UI** - Many filters may be overwhelming
- **No bulk actions** - Unblocking one at a time is slow

**UX Pros:**
- **Clear filtering** - Users can narrow results
- **Copyable conversation IDs** - Easy to investigate
- **Stat cards** - Quick overview

**UX Cons:**
- **Filter overload** - Too many options may slow workflow
- **No saved views** - Can't save common filter combinations
- **Table can be dense** - Lots of columns

**UI Pros:**
- **Clean table design**
- **Responsive layout**

**UI Cons:**
- **Could use better visual hierarchy** - Important info (like blocked status) should stand out more

**Priority Issues:**
1. 🟡 **MEDIUM:** Add bulk unblock action
2. 🟡 **MEDIUM:** Add saved filter views ("Show me all recent sexual content blocks")
3. 🟢 **LOW:** Improve visual hierarchy (use color/badges for severity)

---

## Developer Pages

### `/dev/auth-test` - Auth Testing

**What it does:**
- Utilities for testing authentication flows

**Analysis:**
- **Internal tool** - Not user-facing
- **No UX review needed** - Functionality over polish

---

## Cross-Cutting UX Observations

### 1. **Navigation Inconsistency**
- Multiple paths to same destination (e.g., `/profile`, `/settings/profile`, `/dating/profile`)
- Users may get confused about "canonical" location
- **Fix:** Consolidate routes and use redirects consistently

### 2. **Mobile vs. Desktop Experience**
- Most pages use centered, narrow layout (max-width: 2xl)
- Desktop users see wasted whitespace
- **Fix:** Consider asymmetric layouts, sidebars, or multi-column designs for desktop

### 3. **Loading States**
- Generally well-handled with skeleton screens and spinners
- **Good practice** ✅

### 4. **Error Handling**
- Error messages are clear and actionable
- Content moderation errors recently improved (Sprint 32)
- **Good practice** ✅

### 5. **Dark Mode Support**
- Consistent dark mode throughout app
- Good contrast ratios
- **Good practice** ✅

### 6. **Accessibility**
- Proper ARIA labels, semantic HTML, keyboard navigation
- **Good practice** ✅
- **Improvement:** Add skip links, focus management on route changes

### 7. **Real-time Features**
- WebSocket for conversations and notifications
- Good reconnection handling
- **Good practice** ✅

### 8. **Content Moderation UX**
- Recently improved with better error messages (Sprint 32)
- Still could use more transparency and guidance
- **Improvement:** Add "What can I say?" help articles

### 9. **Onboarding vs. Settings Duplication**
- `/onboarding/basic` and `/settings/profile/basic` are nearly identical
- Confusing for users - where is the "source of truth"?
- **Fix:** Unify into single profile edit experience

### 10. **Missing Features**
- No search functionality (conversations, matches)
- No notifications center
- No profile completeness meter
- No referral/invite friends flow
- No help/support center

---

## Priority Recommendations

### 🔴 **CRITICAL (Do First)**

1. **Add value proposition to landing page** - Users need to know *what* they're signing up for
2. **Preserve scroll position in match list** - Losing place is frustrating
3. **Move match actions above the fold** - Users shouldn't have to scroll to like/pass
4. **Add message previews to conversation list** - Essential for inbox UX
5. **Add timestamps to conversation messages** - Temporal context is important
6. **Improve content moderation messaging** - Users need to understand *what* was flagged and *why*

### 🟡 **MEDIUM (Do Soon)**

7. **Consolidate navigation** - Too many routes to same destinations
8. **Add writing prompts to text fields** - Reduce blank canvas anxiety
9. **Add profile quality score** - Help users improve profiles
10. **Add quick actions to match cards** - Reduce drill-in friction
11. **Add filtering/sorting to conversation list** - Users need to find specific conversations
12. **Improve desktop layouts** - Use space better on large screens
13. **Add keyboard shortcuts to match detail** - Power user efficiency

### 🟢 **LOW (Nice to Have)**

14. **Eliminate `/dating` hub page** - Direct users to matches
15. **Add profile analytics** - Show users how profile is performing
16. **Add emoji picker to messaging** - Enhance expression
17. **Add typing indicators** - Improve conversation UX
18. **Add saved filter views to admin tools** - Moderator efficiency
19. **Explore swipe UI** - A/B test vs. list view

---

## Page Architecture Issues

### 🚨 Redundant Pages (Consolidate These)

#### 1. **Profile Pages - TOO MANY ROUTES TO SAME THING**

**Current mess:**
- `/profile` → redirects to `/dating/profile`
- `/settings/profile` → redirects to `/dating/profile`
- `/settings/profile/basic` → separate edit page
- `/settings/profile/story` → separate edit page
- `/dating/profile` → view-only page

**Problem:**
- **5 different routes** for profile-related stuff
- Users confused about where to go
- Cognitive overhead: "Where do I edit my bio again?"
- Redirects add latency
- Harder to maintain

**Solution:**
```
Consolidate to ONE profile page with tabs/sections:

/profile (or /dating/profile)
  ├─ View mode (default)
  ├─ Edit mode (toggle or inline edit)
  └─ Sections: Basic Info | Story | Photos | Preferences

Kill these routes:
  ❌ /settings/profile/*
  ❌ /profile (redirect)
```

**Benefits:**
- ✅ Single source of truth
- ✅ Users always know where to go
- ✅ Can edit inline without navigation
- ✅ Better desktop UX (sidebar for sections)

---

#### 2. **Matches Pages - Legacy Cruft**

**Current:**
- `/dating/matches` → redirects to `/dating/me-matches`
- `/dating/matches/[id]` → redirects to `/dating/me-matches/[id]`
- `/dating/me-matches` → actual list
- `/dating/me-matches/[id]` → actual detail

**Problem:**
- **4 routes for 2 pages**
- Legacy routes from old naming scheme
- Confusing for developers (which is canonical?)
- Wasted code

**Solution:**
```
Remove legacy routes entirely:
  ❌ /dating/matches
  ❌ /dating/matches/[id]

Keep only:
  ✅ /dating/me-matches
  ✅ /dating/me-matches/[id]

(Legacy routes already marked for removal in code comments)
```

---

#### 3. **Onboarding Duplication**

**Current:**
- `/onboarding/basic` → used during signup
- `/settings/profile/basic` → exact same fields, different URL
- `/onboarding/texts` → used during signup
- `/settings/profile/story` → exact same fields, different URL

**Problem:**
- **Duplicate component logic** (forms, validation, moderation)
- Inconsistent behavior between onboarding and settings
- Bug fixes have to be applied twice
- User confusion: "Why does this look the same but live in different places?"

**Solution:**
```
Use SAME components, different context:

Onboarding flow:
  /onboarding → shows stepper + progress
  /onboarding/basic → <ProfileBasicForm flow="onboarding" />
  /onboarding/texts → <ProfileTextsForm flow="onboarding" />

Profile edit:
  /profile → unified page with inline edit
    Uses same <ProfileBasicForm flow="edit" /> component
    Uses same <ProfileTextsForm flow="edit" /> component

Difference is UI chrome (stepper vs. page layout), NOT logic.
```

---

### 🔀 Pages That Need to Be SPLIT

#### 1. **`/dating/me-matches/[id]` - Match Detail Page is TOO LONG**

**Current problems:**
- **~575 lines** of complex client component
- Handles: photo, bio, AI narrative, shared interests, feedback widget, actions (like/pass/block), block confirmation, report dialog, unmatch, mutual match modal, hard block reasons, loading states, error states
- **Too many responsibilities** in one component
- Hard to maintain
- Slow to load (bundle size)

**Solution - Split into smaller components:**
```
/dating/me-matches/[id]/page.tsx (orchestrator, ~100 lines)
  ├─ <MatchDetailHeader /> - photo, name, age, location
  ├─ <MatchDetailContent /> - bio, AI narrative, shared interests
  ├─ <MatchDetailActions /> - like, pass, block buttons
  ├─ <MatchFeedbackWidget /> - thumbs up/down
  ├─ <MatchDetailModals /> - report, unmatch, celebration
  └─ <HardBlockBanner /> - hard block reasons (conditional)

Benefits:
  ✅ Each component under 150 lines
  ✅ Easier to test
  ✅ Code splitting (lazy load modals)
  ✅ Easier to modify one section without breaking others
```

---

#### 2. **`/dating/conversations/[id]` - Messaging Page is TOO COMPLEX**

**Current problems:**
- **~460 lines** of messaging logic
- Handles: WebSocket, message list, pagination, scroll behavior, send message, character limit, unmatch, report, match info card, loading/error states
- **Too many concerns** in one file
- Hard to test WebSocket logic

**Solution - Split by concern:**
```
/dating/conversations/[id]/page.tsx (orchestrator, ~100 lines)
  ├─ <ConversationHeader /> - match info card, back button
  ├─ <MessageList /> - messages, scroll, "load earlier"
  ├─ <MessageComposer /> - textarea, send button, char count
  ├─ <ConversationActions /> - unmatch, report (footer)
  └─ hooks:
      ├─ useConversationMessages (WebSocket, pagination)
      ├─ useConversationActions (unmatch, report)
      └─ useMessageComposer (draft, send, validation)

Benefits:
  ✅ WebSocket logic isolated in hook (testable)
  ✅ Message composer reusable
  ✅ Easier to add features (e.g., emoji picker)
```

---

### 📐 Navigation & Header Issues

#### Problem 1: **Inconsistent Header/Nav Patterns**

**Current state:**
- Some pages have **back links** (e.g., conversation detail, match detail)
- Some pages have **no navigation** (e.g., profile, analysis)
- Some pages have **breadcrumbs** (admin pages)
- No **global header** with consistent nav
- Users don't know where they are in the app

**Example of confusion:**
```
User journey:
  /dating → hub with links
  /dating/me-matches → match list (no back button, but why go back?)
  /dating/me-matches/123 → match detail (back button to list)
  /dating/conversations/456 → conversation (back button to list)
  
Where's the global "I want to see all my options" nav?
```

**Solution - Add Global App Shell:**
```html
Every dating page should have:

┌─────────────────────────────────────────────┐
│ [Logo]  Matches  Conversations  Profile  ☰  │ ← Global header
├─────────────────────────────────────────────┤
│                                             │
│         Page content here                   │
│                                             │
└─────────────────────────────────────────────┘

Desktop: Sidebar nav (always visible)
Mobile: Bottom tab bar or hamburger menu

Benefits:
  ✅ Users always know where they are
  ✅ One tap to switch contexts
  ✅ Consistent UX across all pages
```

**Implement:**
```tsx
// Layout component
/dating/layout.tsx
  ├─ <AppHeader /> (desktop: horizontal, mobile: bottom tabs)
  └─ {children}

Kill individual "back buttons" - use global nav instead.
```

---

#### Problem 2: **No Persistent Navigation Context**

**Current:**
- Each page is **isolated**
- No "active" indicator (which section am I in?)
- No quick access to other sections

**Solution:**
```tsx
Add active state to nav:

<AppHeader>
  <NavLink href="/dating/me-matches" active={pathname === '/dating/me-matches'}>
    Matches
    {newMatchCount > 0 && <Badge>{newMatchCount}</Badge>}
  </NavLink>
  
  <NavLink href="/dating/conversations" active={pathname.startsWith('/dating/conversations')}>
    Messages
    {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
  </NavLink>
  
  <NavLink href="/dating/profile" active={pathname === '/dating/profile'}>
    Profile
  </NavLink>
</AppHeader>

Benefits:
  ✅ Users see where they are
  ✅ Unread counts encourage engagement
  ✅ One-tap navigation between sections
```

---

#### Problem 3: **Onboarding Has No Fixed Progress Bar**

**Current:**
- Progress indicator lives **inside** each onboarding page
- Scrolls away on mobile
- Users don't see where they are in the flow

**Solution:**
```
Add FIXED header during onboarding:

┌─────────────────────────────────────────────┐
│ [← Exit]  ●━━━━━━○━━━━━━○  Skip           │ ← FIXED
│          Basic   Texts   Photos             │
├─────────────────────────────────────────────┤
│                                             │
│         Form content here (scrollable)      │
│                                             │
└─────────────────────────────────────────────┘

Benefits:
  ✅ Users always see progress
  ✅ Clear "exit" affordance
  ✅ Skip button always accessible
```

**Implement:**
```tsx
// Onboarding layout
/onboarding/layout.tsx
  ├─ <OnboardingHeader> (fixed position)
  │    ├─ Exit button
  │    ├─ Progress stepper
  │    └─ Skip button
  └─ {children} (scrollable content)
```

---

### 🎯 Specific Page Recommendations

#### **KILL THESE PAGES:**

1. **`/dating` - Dating Hub** ❌
   - **Why:** Unnecessary navigation layer
   - **Replace with:** Auto-redirect to `/dating/me-matches` after login
   - **Save:** One click per session × every user

2. **`/onboarding` - Router Page** ❌
   - **Why:** Just redirects, no UI value
   - **Replace with:** Server-side redirect in middleware
   - **Save:** Flash of blank page

3. **`/settings/profile/*` - All Settings Profile Pages** ❌
   - **Why:** Duplicate functionality
   - **Replace with:** Consolidated `/profile` page
   - **Save:** User confusion, maintenance burden

---

#### **SPLIT THESE PAGES:**

1. **`/admin/content-violations` - Already Getting Too Large**
   - Currently handles: violations list + blocked users list + filtering + stats
   - **Split into:**
     - `/admin/content-violations` - violations list only
     - `/admin/content-violations/blocked` - blocked users queue
     - Shared filter components

2. **`/dating/profile` - Will Grow with Features**
   - Currently view-only
   - When you add editing, photos, preferences → will be too big
   - **Split into tabs:**
     - `/profile` with tabs (not separate routes)
     - Overview | Edit | Photos | Privacy

---

#### **COMBINE THESE PAGES:**

1. **Analysis + Profile**
   - `/dating/analysis` should be a **section** of `/dating/profile`
   - Why have separate page for profile insights?
   - **Consolidate:** Profile page with "Analysis" tab

2. **Settings Pages**
   - `/settings/account`, `/settings/language`, `/settings/preferences`
   - All lightweight pages
   - **Combine into:** `/settings` with tabs/sections

---

### 📊 Proposed New Information Architecture

```
PUBLIC
  /                        Landing (Google sign-in)
  /privacy                 Privacy policy
  /terms                   Terms of service

ONBOARDING (fixed progress header)
  /onboarding/basic        Step 1: Basic info
  /onboarding/texts        Step 2: Story
  /onboarding/photos       Step 3: Photos (future)

AUTHENTICATED (global nav shell)
  /matches                 Matches list (infinite scroll)
  /matches/[id]            Match detail (split into components)
  /conversations           Conversation list
  /conversations/[id]      Conversation detail (split into components)
  /profile                 Unified profile (view + edit tabs)
    ├─ Overview            View profile as others see it
    ├─ Edit                Edit all fields inline
    ├─ Analysis            AI analysis (tab, not separate page)
    └─ Settings            Privacy, preferences
  
ADMIN (breadcrumb nav)
  /admin                   Dashboard with metrics
  /admin/photos            Photo queue
  /admin/reports           Reports queue
  /admin/content           Content violations
  /admin/blocked           Blocked users (separate from violations)
  /admin/match-quality     Match quality insights
```

**Key changes:**
- ✅ Removed `/dating/` prefix (unnecessary nesting)
- ✅ Removed duplicate `/settings/profile/*` routes
- ✅ Removed `/dating` hub page
- ✅ Removed `/onboarding` router
- ✅ Split admin content violations into two pages
- ✅ Consolidated profile into single page with tabs
- ✅ Flatter hierarchy (fewer clicks)

---

### 🛠️ Implementation Priority

**Phase 1: Quick Wins (Low Risk)**
1. ✅ Remove legacy `/dating/matches` redirect routes
2. ✅ Add fixed progress bar to onboarding
3. ✅ Kill `/dating` hub page (auto-redirect)

**Phase 2: Navigation (Medium Risk)**
4. Add global app header/nav shell
5. Add active states and unread badges

**Phase 3: Consolidation (Higher Risk)**
6. Consolidate `/settings/profile/*` into `/profile`
7. Split match detail into smaller components
8. Split conversation detail into smaller components

**Phase 4: Architecture Redesign (Riskiest)**
9. Remove `/dating/` prefix from all routes
10. Implement tabbed profile page
11. Restructure admin pages

---

## Summary

**Strengths:**
- ✅ Clean, modern design system
- ✅ Good accessibility baseline
- ✅ Solid error handling and loading states
- ✅ Real-time features work well
- ✅ Content moderation is improving (Sprint 32)

**Weaknesses:**
- ❌ Landing page lacks value proposition
- ❌ Too much navigation friction (extra clicks)
- ❌ Desktop layouts underutilized
- ❌ Missing search/filtering in key areas
- ❌ Onboarding/settings duplication
- ❌ **Redundant page routes (5 for profile!)**
- ❌ **No global navigation shell**
- ❌ **Large components need splitting**

**Biggest Opportunity:**
Reduce friction in core flow (landing → onboarding → match browsing → conversation). Every extra click or navigation layer costs user engagement. **Fix the information architecture first** - consolidate redundant pages, add global nav, then optimize individual pages.

---

**End of Review**
