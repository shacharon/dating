# Sprint 74 Story 8: Multi-Tab Onboarding with Filtered Locations
## Agent -1: Preflight Check ✅

**Timestamp**: 2026-09-22T18:00:00Z  
**Status**: PASS - Ready for Agent 0 (Architecture)

---

## Story Summary

Convert `/onboarding/basic` from single-page form to tabbed interface (Basic/Story/Other) with working navigation, simplified "Skip" action, and filtered country dropdown showing only English/Spanish-speaking + top 15 European countries (US always first).

---

## Environment Check

### ✅ Git Status
- **Branch**: `main`
- **Uncommitted Changes**: 
  - New skill: `.cursor/skills/dating-reset-shacharon/`
  - New docs: `dating-api/docs/sprints/sprint-74-first-login/AGENT_COMMANDS.md`
  - Working files: `docs/work-items/`
- **Status**: Clean for new story work

### ✅ Dependencies
**dating-api**: 
- NestJS 11.1.17 ✅
- Prisma 6.19.2 ✅
- All core dependencies present

**dating-ui**: 
- Next.js ✅
- React Query 5.101.4 ✅
- Capacitor 7.6.8 ✅
- TailwindCSS 4.2.1 ✅

### ✅ Docker Services
```
dating-postgres   Up 8 hours (healthy)   0.0.0.0:5433->5432/tcp
dating-redis      Up 8 hours (healthy)   0.0.0.0:6380->6379/tcp
```

### ✅ Database: Place Tables (Story 5)
- **Countries**: 249 total in `country` table
- **Sample countries verified**: US, GB, CA, AU, ES, FR, DE, IT present
- **Structure**: `code`, `name_en`, `lat`, `lng` columns exist
- **Status**: Ready for filtering logic

---

## Current Implementation Context

### Existing Files (Story 6 - Basics Reorder)
```
dating-ui/src/components/onboarding-basic-form.tsx
├── Single-page layout
├── Sections: DatingChapter → BasicFields(required) → Photos → BasicFields(rest)
├── Buttons: "Save Progress" + "Continue to Story"
└── No tab navigation

dating-ui/src/components/onboarding-basic-fields.tsx
├── part="required": Gender + Partner + Location (all countries)
├── part="rest": Google name + Nickname + Birth date
└── Country dropdown: Shows all 249 countries

dating-ui/src/app/(authenticated)/onboarding/basic/page.tsx
└── Renders OnboardingBasicForm in single page container

dating-ui/src/hooks/use-onboarding-basic-form.ts
└── Fetches countries from /api/v1/places/countries (no filter)
```

### API Endpoints (Story 5)
```
GET /api/v1/places/countries       → All 249 countries
GET /api/v1/places/us-states       → US states
GET /api/v1/places/cities?country=X&state=Y
```

**NOTE**: No country filtering exists yet. All 249 countries are returned.

---

## Story 8 Requirements

### UI Changes
1. **Tab Navigation**:
   - Replace single-page scroll with 3 tabs: Basic / Story / Other
   - Tab indicator at top (like image shows "Basic" filled, "Story" empty)
   - Clicking tab switches content below

2. **Navigation Bar**:
   - Remove "Exit" button
   - Keep only "Skip for now" → routes to `/dating/me-matches`

3. **Basic Tab** (default):
   - Google name (read-only display, from googleName)
   - Gender select
   - Partner genders checkboxes
   - Location dropdowns (filtered countries)

4. **Story Tab**:
   - 3 dating-story choice fields (`DatingChapterFields`)

5. **Other Tab**:
   - Nickname input (editable)
   - Birth date input

6. **Photos**:
   - Keep in Basic tab for `variant="onboarding"`
   - Separate for `variant="profileHub"`

### API Changes
1. **Country Filter**:
   - Update `PlacesService.getCountries()` to accept optional filter
   - Filter categories:
     - English-speaking: US, GB, CA, AU, NZ, IE
     - Spanish-speaking: ES, MX, AR, CO, PE, CL, VE
     - Top 15 EU: DE, FR, IT, NL, BE, SE, PL, AT, DK, FI, GR, PT, CZ, HU, RO
   - US always first in list

2. **New Endpoint** (optional):
   - `GET /api/v1/places/countries?filter=onboarding` 
   - OR modify existing endpoint with query param

### Validation Changes
- No changes to `onboarding-basic-validation.ts` needed
- Location already required in Story 6
- Tab advance checks same fields

---

## File Inventory

### Files to Modify
```
dating-ui/src/components/onboarding-basic-form.tsx
  └── Convert to tabbed layout with state management

dating-ui/src/components/onboarding-basic-fields.tsx
  └── May need to split into BasicTab/StoryTab/OtherTab components

dating-ui/src/app/(authenticated)/onboarding/basic/page.tsx
  └── May add tab navigation UI or keep in form component

dating-ui/src/hooks/use-onboarding-basic-form.ts
  └── Update to fetch filtered countries

dating-api/src/places/places.service.ts
  └── Add country filter logic

dating-api/src/places/places.controller.ts
  └── Add query param to countries endpoint (optional)
```

### Files to Test
```
dating-ui/src/components/onboarding-basic-form.spec.tsx (if exists)
dating-ui/src/hooks/use-onboarding-basic-form.spec.tsx (if exists)
dating-api/src/places/places.service.spec.ts (if exists)
```

---

## Acceptance Criteria Checklist

- [ ] `/onboarding/basic` renders 3 clickable tabs: Basic (default), Story, Other
- [ ] Only "Skip for now" button in nav (no "Exit"), routes to `/dating/me-matches`
- [ ] Basic tab: Google name (read-only) + Gender + Partner + Location (filtered countries)
- [ ] Story tab: 3 dating-story fields
- [ ] Other tab: Birth date + nickname edit
- [ ] Country dropdown: US first, then only English/Spanish/top-15-EU countries (alphabetical after US)
- [ ] Visual test: First-login flow navigates Basic→Story→Other→Matches with Skip working at each step

---

## Risks & Notes

1. **Tab State Management**: Need to decide if tabs are:
   - URL-based (`/onboarding/basic?tab=story`)
   - Local state (`useState('basic')`)
   - Recommendation: Local state for simplicity

2. **Country Filter Maintenance**: 
   - Hardcoded list in service vs. DB flag (`is_onboarding_visible`)
   - Recommendation: Start with hardcoded, DB flag can come later

3. **Photos Placement**:
   - User said "photos in Basic for onboarding"
   - Current code has photos between required/rest sections
   - Decision needed: Photos in Basic tab or separate?

4. **Skip vs Exit**:
   - Both currently do same thing (navigate away)
   - Remove "Exit" completely or just rename to "Skip"?
   - Clarification: Remove "Exit", keep only "Skip for now"

5. **Navigation Persistence**:
   - If user clicks Skip, then returns to onboarding, which tab?
   - Recommendation: Always start on Basic tab

---

## Handoff to Agent 0 (Architecture)

**Status**: ✅ READY

### Next Steps for Agent 0:
1. Design tab navigation component structure
2. Define country filter list (exact codes for English/Spanish/EU-15)
3. Decide tab state management strategy (URL vs local state)
4. Plan component hierarchy for BasicTab/StoryTab/OtherTab
5. Design filtered countries endpoint contract
6. Document navigation flow: Basic → Story → Other → Continue
7. Specify "Skip for now" behavior from each tab

### Questions for Agent 0:
- Should photos be in Basic tab or separate section?
- Should country filter be hardcoded or use DB flag?
- Should tabs be URL-routed or local state?
- Should "Save Progress" work from all tabs or only certain tabs?

---

**Agent -1 Sign-off**: Environment verified, database ready, existing code reviewed. Ready for architecture phase.

**Next Agent**: `--agent 0 sprint 74 story 8`
