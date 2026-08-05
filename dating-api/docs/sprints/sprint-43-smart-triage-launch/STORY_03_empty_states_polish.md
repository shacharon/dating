# Story 03 — Empty states & onboarding polish

**Sprint 43 · Status: Done (ACCEPT)**  
**Priority:** P1 (UX completeness)  
**Estimated effort:** 1 day  
**Dependencies:** Sprints 41-42 complete; Stories 01–02 Done  
**Repo:** `dating-ui` primarily  
**Risk:** Low (UI polish only)  
**Handoffs:** `handoffs/STORY_03_empty_states_polish/agent-*.md`  
**Architect lock:** [`handoffs/STORY_03_empty_states_polish/agent-0-architect.md`](./handoffs/STORY_03_empty_states_polish/agent-0-architect.md) — **Skip Agent 4**  
**Dev handoff:** [`handoffs/STORY_03_empty_states_polish/agent-1-dev.md`](./handoffs/STORY_03_empty_states_polish/agent-1-dev.md)  
**CR handoff:** [`handoffs/STORY_03_empty_states_polish/agent-2-cr.md`](./handoffs/STORY_03_empty_states_polish/agent-2-cr.md)  
**PM handoff:** [`handoffs/STORY_03_empty_states_polish/agent-3-pm.md`](./handoffs/STORY_03_empty_states_polish/agent-3-pm.md) — **ACCEPT**

---

## Objective

Polish empty states and error states so users never hit dead ends. Every screen should guide users toward next action.

## Why

**Bad empty states kill products.** If a user hits:
- Empty match list → thinks "this app doesn't work"
- Loading screen forever → thinks "it's broken"
- Error with no guidance → abandons

**Good empty states:**
- Explain why empty
- Suggest next action
- Keep user engaged

---

## Current State

- Match list probably has basic empty state (Sprint 9 Story 6)
- Other screens may have generic "No data" messages
- Error states may be technical ("Error 500")

---

## Target State

### 1. No Matches Yet (New User)

```
┌─────────────────────────────────┐
│                                 │
│    [Illustration: empty box]    │
│                                 │
│  Finding Your Matches...        │
│                                 │
│  We're analyzing your profile   │
│  and finding compatible people. │
│                                 │
│  This takes about 2-3 minutes.  │
│                                 │
│  [Refresh] or check back soon!  │
└─────────────────────────────────┘
```

### 2. No Matches (Filters Too Strict)

```
┌─────────────────────────────────┐
│    [Icon: adjust sliders]       │
│                                 │
│  No Matches Found               │
│                                 │
│  Try widening your preferences: │
│  • Age range                    │
│  • Distance                     │
│  • Deal-breakers                │
│                                 │
│  [Adjust Preferences]           │
└─────────────────────────────────┘
```

### 3. Photo Gate (From Sprint 9)

```
┌─────────────────────────────────┐
│    [Icon: camera]               │
│                                 │
│  Add a Photo to See Matches     │
│                                 │
│  We need a photo to show you to │
│  potential matches.             │
│                                 │
│  [Upload Photo]                 │
│                                 │
│  Why? It increases your match   │
│  rate by 10x.                   │
└─────────────────────────────────┘
```

### 4. No Conversations Yet

```
┌─────────────────────────────────┐
│    [Icon: speech bubbles]       │
│                                 │
│  No Conversations Yet           │
│                                 │
│  Like matches to start chatting.│
│                                 │
│  [Browse Matches]               │
└─────────────────────────────────┘
```

### 5. Analysis Still Processing

```
┌─────────────────────────────────┐
│    [Animated spinner]           │
│                                 │
│  Analyzing Your Profile...      │
│                                 │
│  We're understanding your       │
│  personality, values, and       │
│  preferences.                   │
│                                 │
│  Estimated time: 2 minutes      │
│                                 │
│  [Learn how matching works]     │
└─────────────────────────────────┘
```

### 6. Error State (API Failure)

```
┌─────────────────────────────────┐
│    [Icon: exclamation]          │
│                                 │
│  Something Went Wrong           │
│                                 │
│  We couldn't load your matches. │
│  Please try again.              │
│                                 │
│  [Try Again]                    │
│                                 │
│  Still having issues?           │
│  [Contact Support]              │
└─────────────────────────────────┘
```

---

## Scope / Tasks

### Agent 0 (Architect)
1. Audit all pages for empty/error states
2. List: Which screens need polishing?
3. Design illustration style (simple icons vs custom graphics?)
4. Lock copy tone (friendly, encouraging, not desperate)
5. Define CTAs for each state (where do they go?)

### Agent 1 (Senior Dev)

**1. Create empty state component:**

```tsx
// components/empty-state.tsx

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction
}: Props) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2 className="empty-title">{title}</h2>
      <p className="empty-description">{description}</p>
      
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          className="btn-primary"
        >
          {primaryAction.label}
        </button>
      )}
      
      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          className="btn-secondary"
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
```

**2. Update match list empty states:**

```tsx
// In me-matches-page-client.tsx

if (loading) {
  return <EmptyState
    icon={<Spinner />}
    title="Loading your matches..."
    description="This will just take a moment."
  />;
}

if (data?.status === 'not_ready' && data.reason === 'no_photo') {
  return <EmptyState
    icon={<CameraIcon />}
    title="Add a Photo to See Matches"
    description="We need a photo to show you to potential matches."
    primaryAction={{
      label: "Upload Photo",
      onClick: () => router.push('/profile?tab=edit#photos')
    }}
    secondaryAction={{
      label: "Why?",
      onClick: () => setShowPhotoExplainer(true)
    }}
  />;
}

if (data?.status === 'not_ready' && data.reason === 'analyzing') {
  return <EmptyState
    icon={<SpinnerIcon />}
    title="Analyzing Your Profile..."
    description="We're understanding your personality and preferences. This takes 2-3 minutes."
    secondaryAction={{
      label: "Learn how matching works",
      onClick: () => router.push('/about/algorithm')
    }}
  />;
}

if (matches.length === 0) {
  return <EmptyState
    icon={<EmptyBoxIcon />}
    title="No Matches Yet"
    description="Try widening your preferences or check back soon as we add new members."
    primaryAction={{
      label: "Adjust Preferences",
      onClick: () => router.push('/settings/preferences')
    }}
  />;
}

if (error) {
  return <EmptyState
    icon={<ErrorIcon />}
    title="Something Went Wrong"
    description="We couldn't load your matches. Please try again."
    primaryAction={{
      label: "Try Again",
      onClick: () => reload()
    }}
    secondaryAction={{
      label: "Contact Support",
      onClick: () => router.push('/support')
    }}
  />;
}
```

**3. Update conversations empty state:**

```tsx
// In conversations-page-client.tsx

if (conversations.length === 0) {
  return <EmptyState
    icon={<ChatBubbleIcon />}
    title="No Conversations Yet"
    description="Like matches to start chatting."
    primaryAction={{
      label: "Browse Matches",
      onClick: () => router.push('/dating/me-matches')
    }}
  />;
}
```

**4. Add loading skeletons (optional polish):**

```tsx
// components/match-card-skeleton.tsx

export function MatchCardSkeleton() {
  return (
    <div className="match-card skeleton">
      <div className="skeleton-photo" />
      <div className="skeleton-text short" />
      <div className="skeleton-text long" />
    </div>
  );
}
```

**5. Add styles:**

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.3;
}

.empty-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
  color: rgb(17, 24, 39);
}

.empty-description {
  font-size: 16px;
  color: rgb(107, 114, 128);
  max-width: 400px;
  margin-bottom: 24px;
}

/* Dark mode */
.dark .empty-title {
  color: rgb(243, 244, 246);
}

.dark .empty-description {
  color: rgb(156, 163, 175);
}
```

### Agent 2 (Code Review)
1. Verify: All major pages have empty states
2. Check: CTAs go to correct destinations
3. Verify: Copy is friendly, not desperate ("No one likes you" ❌)
4. Check: Icons consistent across states
5. Verify: Mobile responsive (text not squeezed)
6. Check: Dark mode styling correct
7. Verify: Loading states don't show indefinitely (timeout?)

### Agent 3 (PM)
1. **Audit all screens:**
   - List every page that could be empty
   - Document current state vs target
2. **Test flow:**
   - Create new account (empty everything)
   - Walk through each screen
   - Verify: Never stuck, always has next action
3. **Copy review:**
   - Check tone: encouraging vs desperate
   - Verify: Clear, concise, actionable
4. **Screenshot documentation:**
   - Before/after for each improved state

---

## Locked Policy (Architect)

Full lock: [`handoffs/STORY_03_empty_states_polish/agent-0-architect.md`](./handoffs/STORY_03_empty_states_polish/agent-0-architect.md).

| Item | Decision |
|------|----------|
| Scope | **Polish existing** empties — not greenfield onboarding; no backend |
| Reject | Invented `analyzing` matches reason; `/support`; fake 10x stats; lucide/emoji icon pack; remount orphans |
| Matches | Error **Try again**; richer `listBuilding` + Refresh; photo gate copy; keep redirects + `MatchListEmptyState` |
| Conversations | Fix “Keep swiping!”; filtered-empty **Clear filters** |
| Analysis | Keep `AnalysisProgressPanel`; optional `/about/algorithm` link |
| Shared UI | Thin `EmptyStatePanel` layout helper (Tailwind only) — optional where it helps |
| Agent 4 | **Skip** |

---

## Copy Guidelines

**Good:**
- "No conversations yet" ✅ (neutral)
- "Finding your matches..." ✅ (active, optimistic)
- "Try widening your preferences" ✅ (actionable)

**Bad:**
- "Nobody matched with you" ❌ (negative, discouraging)
- "Error: NULL_POINTER_EXCEPTION" ❌ (technical jargon)
- "Check back later" ❌ (vague, no action)

---

## Out of Scope

- Animated illustrations (Lottie files)
- Custom graphics (use simple icons for v1)
- Personalized empty states ("Based on your profile...")
- Empty state A/B testing

---

## Acceptance Criteria

- [x] Match list error has Try again; `listBuilding` / empty / photo gate copy polished
- [x] Conversations empty copy fixed (no “swiping”); filtered-empty has Clear filters
- [x] Analysis wait keeps progress panel (+ optional algorithm link)
- [x] Copy friendly and actionable (EN/ES/HE)
- [x] No `/support`, no fake stats, no new icon library
- [x] Mobile / dark mode via existing tokens
- [x] Specs updated for changed copy / CTAs

---

## Testing

### Manual Walkthrough
1. Create brand new account
2. Visit each page BEFORE any data:
   - `/dating/me-matches` → should see "analyzing" or "no matches yet"
   - `/dating/conversations` → should see "no conversations yet"
   - `/profile?tab=analysis` → should see "analysis in progress"
3. Verify: Every screen has clear next step
4. Create match, conversation → verify empty states gone

### Edge Cases
- Network offline → error state shows
- Analysis takes >5 min → still shows progress
- User deletes all matches → empty state reappears

---

## Suggested Commit

```
feat(ui): polish empty states and error handling

- Unified EmptyState component
- Friendly copy with actionable CTAs
- Loading, error, and empty scenarios covered
- Match list, conversations, profile pages polished

Sprint 43 Story 3
```

---

## Follow-Up (Story 4)

After UX is polished, Story 4 prepares for beta launch: metrics dashboard, user list, support process.
