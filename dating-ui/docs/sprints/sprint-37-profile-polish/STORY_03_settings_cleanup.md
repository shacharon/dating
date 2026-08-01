# Story 37.3 — Settings Tab Cleanup

**Sprint:** 37 — Profile Polish  
**Story:** 3 — Clean up settings tab (remove duplicates, upgrade match prefs)  
**Priority:** MEDIUM (polish)  
**Estimated effort:** 2-3 hours  
**Process:** Waterfall `0 → 1 → 2 → 3`  
**Repo:** `dating-ui` only  
**Needs mockup:** Design approved in this story lock

---

## Problem

Settings tab has duplicate navigation (Account/Language already in top-right nav) and match preferences is a boring text link. Feels like an afterthought, not a hub section.

---

## Goal

Clean up Settings tab: remove duplicate Account section, upgrade Match preferences to a preview card showing current settings.

---

## Design Spec

### Before (3 sections)
```
1. Notifications ✅ (inline toggles)
2. Match preferences 🔧 (boring link)
3. Account ❌ (duplicate nav)
```

### After (2 sections)
```
1. Notifications ✅ (unchanged)
2. Match preferences ✨ (preview card)
```

---

## Section 1: Notifications (No Change)

Keep existing `NotificationPreferencesSection` as-is:
```tsx
<section id="notifications">
  <h2>Notifications</h2>
  <NotificationPreferencesSection />
</section>
```

Works great, embedded toggles, nothing to fix.

---

## Section 2: Match Preferences (Upgraded)

### Current (boring)
```
Match preferences

Choose who you want to see and set your boundaries.

Open match preferences →
```

### New (preview card)
```
━━━ Match preferences ━━━

┌─────────────────────────────────────────┐
│  🎯 Who you want to see                 │
│                                          │
│  Current settings:                      │
│  • Age range: 25-35                     │
│  • Distance: within 50 km               │
│  • Looking for: Long-term               │
│                                          │
│         [Adjust preferences →]          │
└─────────────────────────────────────────┘
```

**Implementation:**

```tsx
<section id="match-prefs" className="scroll-mt-24 space-y-3">
  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
    {hub.settingsMatchPrefsHeading}
  </h2>
  
  <MatchPreferencesPreviewCard 
    preferences={preferences}
    copy={copy}
  />
</section>
```

**New Component: `MatchPreferencesPreviewCard`**

```tsx
// src/components/profile/match-preferences-preview-card.tsx

type Props = {
  preferences: MatchPreferences | null;
  copy: AppCopySchema['profile']['hub'];
};

export function MatchPreferencesPreviewCard({ preferences, copy }: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-start gap-3">
        <span className="text-2xl" role="img" aria-label="target">🎯</span>
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Who you want to see
          </h3>
        </div>
      </div>
      
      {preferences ? (
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-zinc-500 dark:text-zinc-400">•</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">
              Age range: {preferences.minAge}-{preferences.maxAge}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-zinc-500 dark:text-zinc-400">•</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">
              Distance: within {preferences.maxDistanceKm} km
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-zinc-500 dark:text-zinc-400">•</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">
              Looking for: {formatRelationshipGoal(preferences.relationshipGoal, copy)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {copy.settingsMatchPrefsEmpty}
        </p>
      )}
      
      <Link
        href="/settings/preferences"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
      >
        Adjust preferences →
      </Link>
    </div>
  );
}
```

**Data source:**
- Fetch from existing `/settings/preferences` API or profile preferences
- If not available, show empty state with CTA

---

## Section 3: Account (REMOVED)

Delete entirely:
```tsx
// ❌ DELETE THIS SECTION
<section>
  <h2>Account</h2>
  <Link href="/settings/account">Account settings</Link>
  <Link href="/settings/language">Language</Link>
</section>
```

**Why:** These links are already in top-right nav menu. No need to duplicate.

---

## Updated Component Structure

```tsx
// src/components/profile/profile-settings-tab.tsx

export function ProfileSettingsTab() {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;
  // TODO: fetch user preferences (existing API)
  const [preferences, setPreferences] = useState<MatchPreferences | null>(null);
  
  useEffect(() => {
    // Fetch preferences from /settings/preferences or profile
    fetchUserPreferences().then(setPreferences);
  }, []);

  return (
    <div className="space-y-8" data-testid="profile-settings-tab">
      {/* 1. Notifications (unchanged) */}
      <section id="notifications" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {hub.settingsNotificationsHeading}
        </h2>
        <NotificationPreferencesSection />
      </section>

      {/* 2. Match Preferences (upgraded) */}
      <section id="match-prefs" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {hub.settingsMatchPrefsHeading}
        </h2>
        <MatchPreferencesPreviewCard 
          preferences={preferences}
          copy={copy}
        />
      </section>
      
      {/* 3. Account section - REMOVED */}
    </div>
  );
}
```

---

## Types

```tsx
// Likely already exists in profile/preferences types
type MatchPreferences = {
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  relationshipGoal: string;
  // ... other prefs
};
```

---

## New i18n Keys (optional)

```tsx
// en.ts
settingsMatchPrefsEmpty: "Set your match preferences to start seeing compatible profiles."
```

If preferences null/empty, show this instead of bullet list.

---

## Responsive

### Mobile
- Card full width
- Button full width on small screens

### Desktop
- Card constrained in `max-w-2xl`
- Button inline

---

## Empty State (No Preferences)

```
┌─────────────────────────────────────────┐
│  🎯 Who you want to see                 │
│                                          │
│  Set your match preferences to start    │
│  seeing compatible profiles.            │
│                                          │
│         [Set preferences →]             │
└─────────────────────────────────────────┘
```

---

## Behavior Freeze

- No API changes (use existing preferences endpoints)
- No new routes
- Notifications section unchanged
- Removed Account links already exist elsewhere (nav menu)

---

## Tests

1. **Visual regression** (manual QA):
   - Account section gone
   - Match prefs card renders with data
   - Empty state when no preferences
   - Button links to `/settings/preferences`
   - Responsive mobile/desktop

2. **Existing specs:**
   - `profile-settings-tab` update assertions
   - Notification section specs unchanged

3. **Edge cases:**
   - No preferences data
   - Partial preferences
   - Long relationship goal text

---

## Acceptance Criteria

- [ ] Account section removed (links exist in top-right nav)
- [ ] Match preferences upgraded to preview card
- [ ] Card shows current age range, distance, relationship goal
- [ ] "Adjust preferences" button links to `/settings/preferences`
- [ ] Empty state when no preferences set
- [ ] Notifications section unchanged
- [ ] Responsive mobile/desktop
- [ ] Existing settings specs updated and green

---

## Out of Scope

- Inline preference editing (still goes to `/settings/preferences`)
- Additional preference fields (gender, etc.)
- Account section redesign (just removing duplicate)
- Language switcher redesign

---

## Dependencies

**After Story 37.1 + 37.2** (Overview + Edit) — completes the profile hub polish trifecta.

---

## Agent 0 Next

```
--agent 0 sprint 37 story 3
```
