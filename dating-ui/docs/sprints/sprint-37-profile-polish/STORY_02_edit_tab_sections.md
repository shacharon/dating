# Story 37.2 — Edit Tab Guided Sections

**Sprint:** 37 — Profile Polish  
**Story:** 2 — Redesign edit tab as 3 guided sections  
**Priority:** HIGH (UX polish)  
**Estimated effort:** 8-10 hours  
**Process:** Waterfall `0 → 1 → 2 → 3`  
**Repo:** `dating-ui` only  
**Needs mockup:** Design approved in this story lock

---

## Problem

Current Edit tab is a long onboarding dump: stacked forms for basics, story, and photos with no visual hierarchy or progress. Users face form fatigue; can't quickly jump to one section; no sense of completion.

---

## Goal

Redesign Edit tab as **3 focused sections** with sticky mini-nav, progress indicators, and collapsible completed sections. Make editing feel guided, not overwhelming.

---

## Design Spec

### Sticky Section Nav (top of Edit tab)

```
┌─────────────────────────────────────────────┐
│ [1. Basics] [2. Photos] [3. Story]         │ ← click to jump
│ ●●●                                          │ ← 3/3 complete
└─────────────────────────────────────────────┘
```

**Behavior:**
- Sticky at top when scrolling
- Active section: blue underline + bold
- Click = smooth scroll to section `#anchor`
- Progress dots: ● (complete) ○ (incomplete)
- Section "complete" = all required fields filled

**Responsive:**
- Mobile: Horizontal scroll tabs or dropdown
- Desktop: Inline tabs as shown

---

### Section 1: Basics

**5 core fields only — no bloat**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Basics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nickname *
[Ada                                    ]

Birth date *
[MM] / [DD] / [YYYY]

Location *
Tel Aviv, Israel                   [Change]

Gender *
[Woman              ▼]

Open to matching with *
☑ Men    ☑ Women

                    [Save basics]
```

**Fields:**
1. **Nickname** — text input, required, 2-30 chars
2. **Birth date** — 3 dropdowns (month/day/year), required, 18+ validation
3. **Location** — read-only display + [Change] button opens location picker modal (existing)
4. **Gender** — dropdown (Man/Woman/Non-binary/Other), required
5. **Open to matching with** — checkboxes (Men/Women/Everyone), at least one required

**Validation:**
- All fields required (asterisk)
- Save button disabled until valid
- Inline errors on blur

**Collapse behavior:**
- If section complete: show ✓ badge, allow collapse
- Collapsed: "Basics ✓ — Ada, 28, Tel Aviv" summary line
- Click to expand

---

### Section 2: Photos

**Gallery management — up to 3 photos**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. Photos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────┬─────────┬─────────┐
│ [IMG]   │ [IMG]   │  ┌───┐  │
│ PRIMARY │  ⏳     │  │ + │  │
│ ✓       │ Pending │  │   │  │
│[Change] │         │  └───┘  │
│[Delete] │         │ [Upload]│
└─────────┴─────────┴─────────┘

Primary photo: This appears in your matches.
Status: 1 approved, 1 under review

                [Done with photos]
```

**Reuse existing:**
- `ProfilePhotoSection` component (already handles upload/approval/delete)
- Same 3-photo limit
- Same moderation flow

**Changes from current:**
- Wrapped in section with header
- "Done" button = mark section visited (doesn't save; photos save on upload)

**Collapse behavior:**
- If ≥1 approved photo: show ✓ badge
- Collapsed: "Photos ✓ — 2 approved" summary
- Click to expand

---

### Section 3: Story (The Holy Grail)

**Three narrative prompts — the deep work**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. Story
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

About me *
[Textarea - 500 char limit]
140 / 500 characters

Writing prompt ⓘ [Show examples & tips]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

About my ideal partner
[Textarea - 500 char limit]
0 / 500 characters

Writing prompt ⓘ [Show examples & tips]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

About the relationship I want
[Textarea - 500 char limit]
0 / 500 characters

Writing prompt ⓘ [Show examples & tips]

                [Save your story]
```

**Reuse existing:**
- `OnboardingTextsForm` (variant: `profileHub`)
- Same writing prompt help component
- Same 500-char limits
- Same validation

**Changes:**
- Only "About me" required (others optional but encouraged)
- One "Save your story" button for all three fields
- Dirty warning if navigating away with unsaved changes

**Collapse behavior:**
- If "About me" filled: show ✓ badge
- Collapsed: "Story ✓ — About me complete" summary
- Click to expand

---

## Interaction Patterns

### 1. Section Navigation
- Click section name = smooth scroll to `#basics`, `#photos`, `#story`
- Active = blue underline + bold text
- Deep links work: `/profile?tab=edit#story` scrolls to Story on load

### 2. Progress Tracking
```
Progress: ●●○ (2/3 sections complete)
```
- Section complete = all required fields filled
- Updates live as user fills fields
- Motivates completion

### 3. Collapsible Sections
- Complete sections show collapse button (^)
- Collapsed = 1-line summary + expand button (v)
- Reduces visual overwhelm; focus on incomplete work

### 4. Dirty Warning (unsaved changes)
- If user edits Story fields and clicks another tab:
  ```
  ⚠️ Unsaved changes in Story
  [Save changes] [Discard] [Cancel]
  ```
- Only for Story section (has explicit Save button)
- Basics/Photos save immediately on action

### 5. Auto-scroll on Deep Link
- Quality meter chips link to `/profile?tab=edit#story`
- Page scrolls to Story section + focuses first textarea

---

## Responsive

### Mobile
**Section nav:**
- Horizontal scroll tabs OR dropdown selector
- Progress dots below nav

**Sections:**
- Full width
- Slightly more compact padding

### Desktop
- As specified
- `max-w-2xl` container
- Sticky nav fixed at top

---

## Implementation Notes

### Update `ProfileEditTab` Component

```tsx
// src/components/profile/profile-edit-tab.tsx

export function ProfileEditTab({ onProfileMutated }: Props) {
  const [activeSection, setActiveSection] = useState<'basics' | 'photos' | 'story'>('basics');
  const [dirtyStory, setDirtyStory] = useState(false);
  
  return (
    <div>
      {/* Sticky section nav */}
      <SectionNav 
        active={activeSection} 
        progress={calculateProgress()} 
        onChange={handleSectionChange}
      />
      
      {/* Section 1: Basics */}
      <section id="basics" className="scroll-mt-24">
        <BasicsSection onSave={onProfileMutated} />
      </section>
      
      {/* Section 2: Photos */}
      <section id="photos" className="scroll-mt-24">
        <ProfilePhotoSection variant="sectionWrap" />
      </section>
      
      {/* Section 3: Story */}
      <section id="story" className="scroll-mt-24">
        <OnboardingTextsForm 
          variant="profileHub" 
          onSaved={onProfileMutated}
          onDirtyChange={setDirtyStory}
        />
      </section>
    </div>
  );
}
```

### New Component: `BasicsSection`

```tsx
// src/components/profile/profile-edit-basics-section.tsx

export function BasicsSection({ onSave }: Props) {
  // Extracts nickname, birthDate, location, gender, lookingFor
  // from existing OnboardingBasicForm
  // Simplified to 5 fields only
  // Saves via existing profile mutation API
}
```

### Updates to Existing Components

**`OnboardingBasicForm`:**
- Extract 5 core fields into `BasicsSection`
- Remove height/education/smoking/etc. (not used)

**`ProfilePhotoSection`:**
- Add `variant="sectionWrap"` prop for section styling
- Unchanged upload/approval logic

**`OnboardingTextsForm`:**
- Add `onDirtyChange` callback for dirty tracking
- Already has `variant="profileHub"` support

---

## Behavior Freeze

- No API changes (same save endpoints)
- No new i18n keys (reuse existing onboarding copy)
- No route changes
- Photo upload/moderation flow unchanged
- Validation rules unchanged

---

## Tests

1. **Visual regression** (manual QA):
   - Section nav sticky + active state
   - Progress dots update on fill
   - Collapse/expand sections
   - Deep link scroll to section
   - Dirty warning on Story navigation
   - Mobile responsive nav

2. **Existing specs:**
   - `profile/page.spec.tsx` (update for new structure)
   - `onboarding-basic-form.spec.tsx` (may need split)
   - `onboarding-texts-form.spec.tsx` (no change)
   - `profile-photo-section.spec.tsx` (no change)

3. **Edge cases:**
   - All sections collapsed
   - Navigate away with dirty Story
   - Deep link to section before data loads

---

## Acceptance Criteria

- [ ] Sticky section nav with 3 sections (Basics, Photos, Story)
- [ ] Progress dots show X/3 complete
- [ ] Section 1 (Basics) = 5 fields only (nickname, birthDate, location, gender, lookingFor)
- [ ] Section 2 (Photos) = existing photo upload wrapped in section
- [ ] Section 3 (Story) = three textareas with writing prompts
- [ ] Collapse/expand completed sections with summary
- [ ] Dirty warning when leaving Story with unsaved changes
- [ ] Deep link `/profile?tab=edit#story` scrolls + focuses
- [ ] Responsive mobile/desktop
- [ ] Existing profile specs updated and green
- [ ] No removed fields (height/edu/etc.) were in use

---

## Out of Scope (Future)

- Nickname edit in page header (can keep in Basics for now)
- Advanced photo features (reorder, captions, filters)
- Story AI writing assistant
- Auto-save drafts
- Relationship goal expanded options

---

## Dependencies

**After Story 37.1** (Overview Hero) — users see the "Edit profile" CTA, then land here.

---

## Agent 0 Next

```
--agent 0 sprint 37 story 2
```
