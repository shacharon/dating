# Sprint 74 Story 8: Multi-Tab Onboarding with Filtered Locations
## Agent 0: Architecture Design ✅

**Timestamp**: 2026-09-22T18:15:00Z  
**Status**: COMPLETE - Ready for Agent 1 (Development)

---

## Architecture Overview

This story transforms `/onboarding/basic` from a single-page scrolling form into a **tabbed interface** with three sections (Basic, Story, Other), implements **filtered country selection** (English/Spanish/EU-15 only), and simplifies navigation to a single "Skip for now" action.

---

## Component Architecture

### 1. Tab Navigation System

**Decision**: Use **local component state** for tab management (not URL-based routing).

**Rationale**:
- Simpler implementation (no query param sync)
- No browser history pollution from tab switches
- Validation happens on "Continue" button, not tab switches
- User can freely explore tabs before completing

**Implementation**:
```typescript
// In onboarding-basic-form.tsx
type OnboardingTab = 'basic' | 'story' | 'other';
const [activeTab, setActiveTab] = useState<OnboardingTab>('basic');
```

**Tab Indicator Component**:
```tsx
<div className="flex items-center gap-4 border-b border-zinc-200">
  <button 
    onClick={() => setActiveTab('basic')}
    className={activeTab === 'basic' ? 'filled' : 'empty'}
  >
    Basic
  </button>
  <button 
    onClick={() => setActiveTab('story')}
    className={activeTab === 'story' ? 'filled' : 'empty'}
  >
    Story
  </button>
  <button 
    onClick={() => setActiveTab('other')}
    className={activeTab === 'other' ? 'filled' : 'empty'}
  >
    Other
  </button>
</div>
```

---

### 2. Component Hierarchy

```
OnboardingBasicForm (onboarding-basic-form.tsx)
├── TabNavigation (new inline component)
│   ├── Tab Button: Basic
│   ├── Tab Button: Story
│   └── Tab Button: Other
│
├── TabContent (conditional render based on activeTab)
│   ├── BasicTab
│   │   ├── GoogleNameDisplay (read-only)
│   │   ├── GenderSelect
│   │   ├── PartnerGendersCheckboxes
│   │   ├── LocationSelects (filtered countries)
│   │   └── ProfilePhotoSection (if variant="onboarding")
│   │
│   ├── StoryTab
│   │   └── DatingChapterFields (3 radio choices)
│   │
│   └── OtherTab
│       ├── NicknameInput (editable)
│       └── BirthDateInput
│
└── ActionBar
    ├── "Skip for now" → /dating/me-matches (all tabs)
    └── "Continue" → validation + advance (all tabs)
```

**Key Decision**: Extract tab content into **inline sections within onboarding-basic-form.tsx**, not separate component files. This keeps state management simple and avoids prop drilling.

---

### 3. Field Distribution by Tab

#### **Basic Tab** (default):
- Google name (read-only display from `googleName`)
- Gender select (required for advance)
- Partner genders checkboxes (≥1 required for advance)
- Country select (filtered, required for advance)
- US State select (if country=US, required for advance)
- City select (if cities available, required for advance)
- Photos (if `variant="onboarding"`)

#### **Story Tab**:
- Dating chapter 3-choice radio group (`DatingChapterFields`)
- Title: "Where are you in your dating journey?"
- Options: first_chapter, ready_again, new_chapter

#### **Other Tab**:
- Nickname input (editable, optional)
- Birth date input (optional)
- Helper text: "These fields are optional but help personalize your experience"

---

### 4. Navigation & Actions

#### **Skip for now** button:
- **Label**: "Skip for now"
- **Behavior**: `router.push('/dating/me-matches')` (no validation)
- **Visible**: On ALL tabs
- **Position**: Top-right of tab content area (not in tab bar)
- **Style**: Secondary/ghost button

#### **Continue** button:
- **Label**: 
  - Basic/Story tabs: "Continue"
  - Other tab: "Finish" or "Complete profile"
- **Behavior**: 
  - Validates required fields (gender, partner, location)
  - Calls `handleContinueToTexts()` → saves + routes to `/onboarding/texts`
  - Validation errors stay on current tab, show error messages
- **Visible**: On ALL tabs (validation same regardless of which tab user is on)
- **Position**: Bottom-right of form
- **Style**: Primary button

#### **Save Progress** button:
- **Label**: "Save progress"
- **Behavior**: Saves current state without validation, shows "Saved!" flash
- **Visible**: On ALL tabs
- **Position**: Bottom-left of form (before Continue)
- **Style**: Secondary button

**Removed**: "Exit" button (previously shown in nav bar)

---

## Country Filtering Architecture

### 1. Filter Strategy

**Decision**: Use **query parameter** `?filter=onboarding` on existing endpoint.

**Rationale**:
- Backward compatible (no filter = all countries)
- ProfileHub can use unfiltered list if needed in future
- Clear API contract

**API Endpoint**:
```
GET /api/v1/places/countries?filter=onboarding
→ Returns 28 countries (English/Spanish/EU-15 + US first)

GET /api/v1/places/countries
→ Returns all 249 countries (current behavior)
```

### 2. Filtered Country List (28 countries)

**US First** (1):
- `US` - United States of America

**English-speaking** (5 more):
- `AU` - Australia
- `CA` - Canada
- `GB` - United Kingdom
- `IE` - Ireland
- `NZ` - New Zealand

**Spanish-speaking** (6):
- `AR` - Argentina
- `CL` - Chile
- `CO` - Colombia
- `ES` - Spain
- `MX` - Mexico
- `PE` - Peru

**Top 15 EU** (16, includes ES already counted):
- `AT` - Austria
- `BE` - Belgium
- `CZ` - Czech Republic
- `DK` - Denmark
- `FI` - Finland
- `FR` - France
- `DE` - Germany
- `GR` - Greece
- `HU` - Hungary
- `IT` - Italy
- `NL` - Netherlands
- `PL` - Poland
- `PT` - Portugal
- `RO` - Romania
- `SE` - Sweden

**Total**: 28 unique country codes (ES counted once)

**Sort Order**:
1. US always first
2. Remaining 27 alphabetically by `nameEn`

### 3. Implementation Details

**Backend** (`places.service.ts`):
```typescript
listCountries(filter?: 'onboarding') {
  const ONBOARDING_COUNTRIES = new Set([
    'US', 'AU', 'CA', 'GB', 'IE', 'NZ',
    'AR', 'CL', 'CO', 'ES', 'MX', 'PE',
    'AT', 'BE', 'CZ', 'DK', 'FI', 'FR', 'DE', 'GR',
    'HU', 'IT', 'NL', 'PL', 'PT', 'RO', 'SE'
  ]);
  
  const where = filter === 'onboarding' 
    ? { code: { in: Array.from(ONBOARDING_COUNTRIES) } }
    : undefined;
    
  return this.prisma.country.findMany({
    where,
    orderBy: { nameEn: 'asc' },
    select: { code: true, nameEn: true },
  }).then(countries => {
    // Move US to front
    const usIndex = countries.findIndex(c => c.code === 'US');
    if (usIndex > 0) {
      const [us] = countries.splice(usIndex, 1);
      countries.unshift(us);
    }
    return countries;
  });
}
```

**Frontend** (`places-api.ts`):
```typescript
export function listPlaceCountries(filter?: 'onboarding') {
  const params = filter ? `?filter=${filter}` : '';
  return getJson<{ countries: PlaceCountry[] }>(
    `/api/v1/places/countries${params}`
  );
}
```

**Hook** (`use-onboarding-basic-form.ts`):
```typescript
useEffect(() => {
  listPlaceCountries('onboarding')  // Pass filter
    .then(res => setCountries(res.countries))
    .catch(() => setCountries([]));
}, []);
```

---

## i18n Updates

### New Copy Keys

**Tab Labels** (`types.ts` → `AppCopySchema.onboarding.tabs`):
```typescript
tabs: {
  basic: string;      // "Basic" / "בסיס" / "Basico"
  story: string;      // "Story" / "סיפור" / "Historia"
  other: string;      // "Other" / "אחר" / "Otro"
}
```

**Tab Content Titles** (`types.ts` → `AppCopySchema.onboarding.basicForm`):
```typescript
basicForm: {
  // Existing fields...
  basicTabTitle: string;      // "About you"
  storyTabTitle: string;      // "Your dating journey"
  otherTabTitle: string;      // "Additional details"
  otherTabSubtitle: string;   // "Optional but recommended"
  skipButton: string;         // "Skip for now"
  continueButton: string;     // "Continue"
  finishButton: string;       // "Complete profile"
}
```

**English** (`en.ts`):
```typescript
onboarding: {
  tabs: {
    basic: "Basic",
    story: "Story",
    other: "Other",
  },
  basicForm: {
    // Existing...
    basicTabTitle: "About you",
    storyTabTitle: "Your dating journey",
    otherTabTitle: "Additional details",
    otherTabSubtitle: "Optional but recommended",
    skipButton: "Skip for now",
    continueButton: "Continue",
    finishButton: "Complete profile",
  },
}
```

---

## Validation Strategy

**No changes to validation logic** from Story 6:
- `validateOnboardingBasicAdvance()` already requires gender, partner genders, location
- Validation runs when user clicks "Continue" from ANY tab
- Tab switches are validation-free (user can explore)

**Error Display**:
- If validation fails, errors appear in respective tab sections
- Active tab does NOT auto-switch to show errors
- Recommendation: Add error summary at top of form:
  ```tsx
  {(genderStepError || partnerError || locationError) && (
    <div className="p-3 bg-red-50 border border-red-200 rounded">
      <p className="text-sm text-red-700">
        Please complete required fields in the Basic tab before continuing.
      </p>
    </div>
  )}
  ```

---

## Photos Placement Decision

**For `variant="onboarding"`**: Keep photos in **Basic tab** (after location fields)

**For `variant="profileHub"`**: Photos are in separate "Photos" tab (out of scope for this story)

**Rationale**:
- User feedback: "photos in Basic for onboarding"
- Photos are required for matching, so grouping with other required fields makes sense
- Other tab is truly optional/supplementary

---

## File Changes Summary

### Backend Files

#### **MODIFY**: `dating-api/src/places/places.controller.ts`
```typescript
@Get('countries')
async countries(@Query('filter') filter?: string) {
  const onboardingFilter = filter === 'onboarding' ? 'onboarding' : undefined;
  const countries = await this.places.listCountries(onboardingFilter);
  return { countries };
}
```

#### **MODIFY**: `dating-api/src/places/places.service.ts`
- Add `listCountries(filter?: 'onboarding')` parameter
- Implement filter logic with hardcoded country set
- Implement US-first sort

### Frontend Files

#### **MODIFY**: `dating-ui/src/components/onboarding-basic-form.tsx`
Major refactor:
- Add `useState<OnboardingTab>('basic')`
- Render tab navigation UI
- Conditionally render tab content based on `activeTab`
- Move "Skip for now" to top-right of content area
- Keep action buttons (Save/Continue) at bottom for all tabs

#### **MODIFY**: `dating-ui/src/components/onboarding-basic-fields.tsx`
Split into conditional sections:
- Remove `part` prop (no longer needed)
- Render based on parent's `activeTab` state
- Keep all field logic, just change layout structure

**OR create new components**:
- `onboarding-basic-tab.tsx` (Google name + gender + partner + location)
- `onboarding-story-tab.tsx` (dating chapter wrapper)
- `onboarding-other-tab.tsx` (nickname + birth date)

**Decision for Agent 1**: Recommend inline sections in `onboarding-basic-form.tsx` for simplicity.

#### **MODIFY**: `dating-ui/src/hooks/use-onboarding-basic-form.ts`
- Update `listPlaceCountries()` call to pass `'onboarding'` filter

#### **MODIFY**: `dating-ui/src/lib/api/places-api.ts`
- Add optional `filter` parameter to `listPlaceCountries(filter?: 'onboarding')`

#### **MODIFY**: `dating-ui/src/lib/i18n/types.ts`
- Add `tabs` object to `onboarding` schema
- Add new strings to `basicForm`

#### **MODIFY**: `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts`
- Add tab labels and new copy

---

## Migration & Deployment Plan

### 1. Local Development Testing
- **Step 1**: Run `npm run dev` in both `dating-api` and `dating-ui`
- **Step 2**: Delete `shacharon@gmail.com` from Docker Postgres (reset first-login)
- **Step 3**: Sign in with Google, verify first-login lands on Basic tab
- **Step 4**: Test tab switches (Basic → Story → Other)
- **Step 5**: Test "Skip for now" from each tab → lands on Matches page
- **Step 6**: Test "Continue" without required fields → see validation errors
- **Step 7**: Fill required fields, click "Continue" → advances to `/onboarding/texts`
- **Step 8**: Verify country dropdown shows only 28 countries, US first

### 2. Database Changes
**None required** - Story 5 already created place tables

### 3. Deployment Order
1. Deploy **API** changes (country filter endpoint)
2. Deploy **UI** changes (tabbed form)
3. No downtime risk (backward compatible)

---

## Edge Cases & Error Handling

### 1. Tab Switch with Unsaved Changes
**Behavior**: Allow switches freely. Show "Save progress" button on all tabs.
**No warning modal** (YAGNI - keep it simple)

### 2. Validation Errors on Non-Active Tab
**Example**: User is on Story tab, clicks "Continue", but missing gender on Basic tab.
**Behavior**:
- Show error summary at top: "Please complete required fields in the Basic tab"
- Error messages remain in their respective fields (visible when user switches to Basic)
- Do NOT auto-switch to Basic tab (user should navigate intentionally)

### 3. Returning to Onboarding After Skip
**Scenario**: User clicks "Skip for now" → Matches page → clicks "Finish your profile" CTA
**Behavior**: Always land on Basic tab (default `activeTab='basic'`)

### 4. Profile Hub (Edit Mode)
**Scenario**: `variant="profileHub"` on `/profile` page
**Behavior**: 
- Photos are in separate tab (existing implementation, out of scope)
- This story only touches `variant="onboarding"` behavior

### 5. Countries Not in Filtered List
**Scenario**: User previously set `country="JP"` (Japan, not in filtered list), then edits profile
**Behavior**: 
- ProfileHub uses unfiltered endpoint (no `?filter=onboarding`)
- Onboarding always uses filtered list (first-time users only)
- **Decision**: This is acceptable. Advanced users can set any country via ProfileHub later.

---

## Testing Strategy

### Unit Tests

#### **Backend** (`places.service.spec.ts`):
```typescript
describe('listCountries', () => {
  it('returns all countries without filter', async () => {
    const countries = await service.listCountries();
    expect(countries.length).toBe(249);
  });
  
  it('returns 28 countries with onboarding filter', async () => {
    const countries = await service.listCountries('onboarding');
    expect(countries.length).toBe(28);
    expect(countries[0].code).toBe('US');
  });
  
  it('includes English-speaking countries', async () => {
    const countries = await service.listCountries('onboarding');
    const codes = countries.map(c => c.code);
    expect(codes).toContain('GB');
    expect(codes).toContain('CA');
    expect(codes).toContain('AU');
  });
});
```

#### **Frontend** (`onboarding-basic-form.spec.tsx` - create if missing):
```typescript
describe('OnboardingBasicForm tabs', () => {
  it('renders Basic tab by default', () => {
    render(<OnboardingBasicForm />);
    expect(screen.getByText(/About you/i)).toBeInTheDocument();
  });
  
  it('switches to Story tab on click', () => {
    render(<OnboardingBasicForm />);
    fireEvent.click(screen.getByText('Story'));
    expect(screen.getByText(/Your dating journey/i)).toBeInTheDocument();
  });
  
  it('shows Skip for now button on all tabs', () => {
    const { rerender } = render(<OnboardingBasicForm />);
    expect(screen.getByText('Skip for now')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Story'));
    expect(screen.getByText('Skip for now')).toBeInTheDocument();
  });
  
  it('fetches filtered countries on mount', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ countries: [] });
    vi.mock('@/lib/api/places-api', () => ({
      listPlaceCountries: mockFetch,
    }));
    
    render(<OnboardingBasicForm />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('onboarding');
    });
  });
});
```

### Integration Tests
- **Manual test**: Full first-login flow (Google sign-in → Basic → Story → Other → Continue)
- **Visual test**: Screenshots of each tab on local and staging

---

## Acceptance Criteria Review

Using Story 8 AC from Agent -1:

✅ **AC1**: `/onboarding/basic` renders 3 clickable tabs: Basic (default), Story, Other
- Architecture: Local state tab switcher, inline content sections

✅ **AC2**: Only "Skip for now" button in nav (no "Exit"), routes to `/dating/me-matches`
- Architecture: Single "Skip for now" button top-right on all tabs

✅ **AC3**: Basic tab: Google name (read-only) + Gender + Partner + Location (filtered countries)
- Architecture: BasicTab section with GoogleNameDisplay component

✅ **AC4**: Story tab: 3 dating-story fields
- Architecture: DatingChapterFields component in StoryTab section

✅ **AC5**: Other tab: Birth date + nickname edit
- Architecture: OtherTab section with nickname input + birth date input

✅ **AC6**: Country dropdown: US first, then only English/Spanish/top-15-EU countries (alphabetical after US)
- Architecture: `?filter=onboarding` endpoint returns 28 countries, US-first sort

✅ **AC7**: Visual test: First-login flow navigates Basic→Story→Other→Matches with Skip working at each step
- Testing strategy: Manual + unit tests for tab switches

---

## Open Questions for Agent 1

1. **Component extraction**: Should Agent 1 create separate `onboarding-basic-tab.tsx`, `onboarding-story-tab.tsx`, `onboarding-other-tab.tsx` files, or keep all inline in `onboarding-basic-form.tsx`?
   - **Recommendation**: Keep inline for simplicity (avoid prop drilling)

2. **Tab indicator style**: Use the existing image as reference, or create new design?
   - **Recommendation**: Match the image (filled circle for active, empty circle for inactive)

3. **Error summary placement**: Above tabs or below tab content?
   - **Recommendation**: Below tab nav, above content (consistent visibility)

4. **"Continue" button label**: Should it say "Continue" on all tabs, or "Finish" on Other tab?
   - **Recommendation**: "Continue" on all tabs (keeps action consistent)

---

## Risks & Mitigations

### Risk 1: User Confusion on Validation Errors
**Risk**: User on Story tab clicks "Continue", sees "Please complete Basic fields" error, doesn't understand what to do.
**Mitigation**: 
- Clear error message: "Please complete required fields in the Basic tab before continuing"
- Consider adding "Go to Basic" link in error message

### Risk 2: Country Filter Maintenance
**Risk**: Hardcoded country list in service gets out of sync with user expectations.
**Mitigation**: 
- Document the list in this handoff
- Future story: Add `is_onboarding_visible` column to `country` table for DB-driven filter

### Risk 3: Photos Section Size
**Risk**: Basic tab becomes too long with Google name + gender + partner + location + photos.
**Mitigation**: 
- Use collapsible sections if needed
- Keep photos at bottom of Basic tab (least critical)

---

## Handoff to Agent 1 (Development)

**Status**: ✅ READY

### Implementation Checklist for Agent 1:

#### Backend (dating-api)
- [ ] Add `filter` query param to `PlacesController.countries()`
- [ ] Update `PlacesService.listCountries()` to accept `filter?: 'onboarding'`
- [ ] Implement 28-country filter set
- [ ] Implement US-first sort
- [ ] Write unit tests for filtered endpoint

#### Frontend (dating-ui)
- [ ] Add `useState<OnboardingTab>('basic')` to `onboarding-basic-form.tsx`
- [ ] Create tab navigation UI (3 buttons: Basic, Story, Other)
- [ ] Refactor form content into 3 conditional sections
- [ ] Move "Skip for now" to top-right of content area
- [ ] Update `listPlaceCountries()` to pass `'onboarding'` filter
- [ ] Add i18n keys for tabs and new strings
- [ ] Remove "Exit" button (if present)
- [ ] Update `places-api.ts` to accept filter param
- [ ] Write unit tests for tab switches
- [ ] Write unit tests for filtered countries fetch

#### Testing
- [ ] Run local first-login flow end-to-end
- [ ] Verify 28 countries in dropdown, US first
- [ ] Test tab switches
- [ ] Test "Skip for now" from each tab
- [ ] Test validation errors with different active tabs

---

**Agent 0 Sign-off**: Architecture complete. Tab system designed with local state. Country filter uses query param with 28-country hardcoded list. Ready for implementation.

**Next Agent**: `--agent 1 sprint 74 story 8`
