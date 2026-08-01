# Story 35.1 — Unified Profile Design (LOCKED)

**Sprint:** 35 — Profile Consolidation  
**Story:** 1 — Design unified profile page  
**Agent 0:** Architect / UX  
**Date:** 2026-08-01  
**Status:** ACCEPT  
**Blocks:** Story 35.2 (implement), informs 35.3 (quality meter chrome)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` (design artifacts only — **no product code** in 35.1).  
**Needs mockup:** yes (ASCII + component spec = approved design for this repo; no Figma required to unblock 35.2)

---

## Goal

Replace fragmented profile surfaces with **one** hub at `/profile` with four tabs: Overview · Edit · Analysis · Settings — plus a **profile quality meter** chrome that Story 35.3 will power with real scores.

---

## Baseline (do not reverse without new lock)

| Surface today | Role |
|---------------|------|
| `/dating/profile` | Canonical **view** (photos, basics, story, completeness hints, notifications) |
| `/onboarding/basic?edit=1` / `/onboarding/texts?edit=1` | **Edit** (forms reused; stepper UI) |
| `/dating/analysis` | **Analysis** (progress + results); not primary-nav-active under Profile |
| `/settings/profile*` / `/profile` | Redirect aliases only |
| `/settings/preferences` | Match prefs (linked from profile) |
| Nav Profile | Points at `/dating/profile` |

**Pain:** View / edit / analysis feel like three products; edit reuses onboarding URLs; analysis orphaned from Profile active state.

### AGENT_COMMANDS corrections (outdated — ignore)

- ❌ Tab icons as emoji (👤✏️📊⚙️) — **text labels only** (optional outline icons later; none required in 35.2)
- ❌ Implementing `/profile` page in Story **35.1** — design lock only; code is **35.2**
- ❌ Shipping quality **API** in 35.1 — chrome + interaction only; score math is **35.3**
- ❌ Vertical sidebar as V1 requirement — rejected below

---

## Locked design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Canonical URL | **`/profile`** | Single source of truth; matches Sprint 33/35 plan |
| Deep link | **`?tab=overview\|edit\|analysis\|settings`** (default `overview`) | Shareable; back-button friendly |
| Section anchors | `#photos`, `#basic`, `#story`, `#notifications`, `#match-prefs` | Meter / CTAs jump into Edit or Settings |
| Tab style | **Horizontal underline tabs** (`role="tablist"`) | Matches plan ASCII; a11y; low novelty |
| Desktop (≥768) | Horizontal tabs under title + meter | No sidebar V1 |
| Mobile (<768) | **Same tabs**, wrap or horizontal scroll; full-width tab hit targets | Avoid dropdown (extra tap); bottom nav already used |
| Edit interaction | **Edit tab** with stacked sections (not modal) | Reuse existing forms; modal fights long story fields |
| Form reuse | Embed **`OnboardingBasicForm`** + **`OnboardingTextsForm`** + **`ProfilePhotoSection`** in Edit | One codepath with onboarding; context = edit (no onboarding stepper on this tab) |
| Save | **Manual** per section (existing Save on forms) | No auto-save V1 |
| Unsaved leave | Soft warn if dirty when switching tabs (nice-to-have 35.2; not blocking) | |
| Overview | Read-only “as others see you” + **Edit profile** → `?tab=edit` | Preserve current review UX |
| Notifications | Move from Overview → **Settings** tab | Clearer IA; account deep-link `#notifications` |
| Match prefs | Settings tab: summary + link/embed to prefs | Keep `/settings/preferences` page; don’t fork prefs logic in V1 |
| Analysis | Embed existing analysis progress + results in tab | No analysis history/timeline V1 |
| Quality meter | **Always above tabs** (all tabs) | Persistent motivation; 35.3 fills score |
| Meter V1 chrome | Compact: label + % + bar + “Improve” → `?tab=edit` | Expandable checklist optional |
| Photos | Overview: read-only gallery; Edit: `#photos` upload UI | Future “photo polish” stays Edit |
| Primary nav Profile href | **`/profile`** (35.2 updates nav) | |
| Profile active | `/profile*` + legacy redirects until 35.4 | Include `?tab=analysis` as profile-active (not Matches) |
| Analysis primary nav | **Stay out** (already Sprint 33) | Reach via Profile → Analysis tab |
| Visual language | Existing zinc / emerald shell; dark mode parity | No purple/glow; no new card-heavy chrome |
| i18n | New `copy.profile.hub.*` (tabs, meter, empty) + reuse field labels | en/he/es in 35.2 |
| RTL | Logical CSS (`ps`/`pe`, `start`/`end`); tab order follows locale | |

---

## Information architecture

```
/profile?tab=…
├─ overview   ← default
│    photos (read-only) · basics · story · quality meter (global) · CTA Edit
├─ edit
│    #basic · #story · #photos
├─ analysis
│    progress | results | re-analyze
└─ settings
     #notifications · #match-prefs · links: account, language
```

### Redirect map (implement in **35.2** / verify in **35.4**)

| From | To |
|------|----|
| `/dating/profile` | `/profile` (preserve hash if any) |
| `/profile` (today’s redirect-to-dating) | **becomes** the real page (flip redirect) |
| `/settings/profile` | `/profile` |
| `/settings/profile/basic` | `/profile?tab=edit#basic` |
| `/settings/profile/story` | `/profile?tab=edit#story` |
| `/dating/analysis` | `/profile?tab=analysis` |
| `/onboarding/basic?edit=1` | May remain for onboarding; **product CTAs** should prefer `/profile?tab=edit#basic` after 35.2 |
| `/onboarding/texts?edit=1` | Same → `#story` |

Onboarding **first-time** flow (`/onboarding/*` without edit) **unchanged**.

---

## Mockups (ASCII)

### Desktop — Overview

```
┌──────────────────────────────────────────────────────────────────┐
│ Brand … Matches · Conversations · Profile              NavAuth   │
├──────────────────────────────────────────────────────────────────┤
│ Your profile                                                     │
│                                                                  │
│ Profile quality  72%   ████████████░░░░░    [Improve profile]    │
│                                                                  │
│ [ Overview ]  Edit   Analysis   Settings                         │
│ ═══════════                                                      │
│                                                                  │
│  (photo strip)                                                   │
│  Nickname · age · location · looking for                         │
│  About me / partner / relationship (read-only)                   │
│                                                                  │
│  [ Edit profile ]                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Desktop — Edit

```
│ Your profile                                                     │
│ Profile quality …                                                │
│ Overview  [ Edit ]  Analysis   Settings                          │
│           ═══════                                                │
│                                                                  │
│ ## Basic info                                         #basic     │
│   (OnboardingBasicForm — save in place)                          │
│                                                                  │
│ ## Your story                                         #story     │
│   (OnboardingTextsForm — prompts stay; save in place)            │
│                                                                  │
│ ## Photos                                             #photos    │
│   (ProfilePhotoSection)                                          │
```

### Desktop — Analysis

```
│ … [ Analysis ] …                                                 │
│                                                                  │
│  (AnalysisProgressPanel | AnalysisResultsView — existing UX)     │
│  [ Re-analyze ] when applicable                                  │
```

### Desktop — Settings

```
│ … [ Settings ] …                                                 │
│                                                                  │
│ ## Notifications                                      #notif…    │
│   (NotificationPreferencesSection)                               │
│                                                                  │
│ ## Match preferences                                  #match…    │
│   Short blurb + [ Open match preferences → ] /settings/prefs     │
│                                                                  │
│ ## Account                                                       │
│   Links: Account · Language                                      │
```

### Mobile (<768) — tabs

```
┌─────────────────────────────┐
│ Your profile                │
│ Quality 72% ████░░ [Improve]│
│                             │
│ Overview Edit Analysis Sett…│  ← scroll/wrap; active underline
│ ════════                    │
│ (tab body)                  │
│                             │
├─────────────────────────────┤
│ Matches · Chats · Profile   │  ← existing bottom nav
└─────────────────────────────┘
```

### Quality meter — compact (default)

```
┌─────────────────────────────────────────────┐
│ Profile quality   72%                       │
│ ████████████████░░░░░░░░░░░░                │
│ Add relationship goals · Describe partner   │  ← up to 2 suggestion chips
│                              [Improve →]    │
└─────────────────────────────────────────────┘
```

- Chip / Improve → `/profile?tab=edit#…` (mapped by suggestion id)  
- Full scoring copy / tooltip → Story **35.3**  
- Until API exists: meter may use **client completeness** (evolve `ProfileCompletenessHints`) or skeleton — 35.2 ships chrome; 35.3 binds score  

### Dark mode

Same structure; zinc-50/950 page, zinc borders, emerald progress fill (existing tokens). No glow.

---

## Component hierarchy (for 35.2)

```
app/(authenticated)/profile/page.tsx          ← server shell / auth
app/(authenticated)/profile/profile-hub-client.tsx
  ProfileQualityMeter                         ← chrome; score wired in 35.3
  ProfileHubTabs                              ← tablist + Links ?tab=
  ProfileOverviewTab                          ← migrate dating/profile view
  ProfileEditTab
    section#basic → OnboardingBasicForm (edit context)
    section#story → OnboardingTextsForm (edit context, no post-save → analysis forced)
    section#photos → ProfilePhotoSection
  ProfileAnalysisTab                          ← wrap analysis client pieces
  ProfileSettingsTab
    NotificationPreferencesSection
    match prefs CTA
    account / language links
```

**Deprecate as full pages (redirect):** `/dating/profile`, `/dating/analysis` content routes; keep thin redirect files.

**Do not** invent a second basic/story form implementation.

---

## Interaction notes

1. Tab change updates URL (`router.replace` or `<Link>`) so refresh keeps tab.  
2. Overview “Edit profile” → `?tab=edit` (optionally `#basic`).  
3. Analysis “Edit profile” links → `?tab=edit` (not onboarding URLs).  
4. Edit forms: hide **onboarding stepper**; show section headings instead.  
5. After texts save in Edit tab: stay on Edit (or Overview) — **do not** auto-route to analysis (analysis is a tab).  
6. Keyboard: arrow keys on tablist (standard tabs pattern).  
7. Focus: moving tabs focuses tab panel (`aria-controls` / `id`).

---

## Out of scope (35.1 / defer)

| Item | Where |
|------|--------|
| Product React implementation | **35.2** |
| Quality score API + weighted math | **35.3** |
| Redirect QA matrix | **35.4** |
| Analysis history timeline | Later |
| Inline prefs editor (full prefs form in tab) | Later — link out V1 |
| Privacy controls beyond what exists | Later |
| Figma file | Optional; ASCII lock is binding |

---

## Agent 1 polish (binding addenda)

### Suggestion id → deep link map (meter / completeness)

Used by quality meter chips and Improve CTA. Story **35.3** may rename suggestion ids; keep hashes stable.

| Suggestion id (stable) | Meaning (EN intent) | Target |
|------------------------|---------------------|--------|
| `photo` | Add or approve a photo | `/profile?tab=edit#photos` |
| `nickname` | Add a nickname | `/profile?tab=edit#basic` |
| `location` | Add location | `/profile?tab=edit#basic` |
| `basics` | Complete birth date / gender / looking-for | `/profile?tab=edit#basic` |
| `aboutMe` | Strengthen About me | `/profile?tab=edit#story` |
| `aboutPartner` | Describe ideal partner | `/profile?tab=edit#story` |
| `aboutRelationship` | Add relationship goals | `/profile?tab=edit#story` |
| `emailVerified` | Verify email (if scored in 35.3) | `/settings/account` (out of hub) |
| _(Improve fallback)_ | Generic improve | `/profile?tab=edit` |

Show **at most two** incomplete chips in the compact meter; prefer photo → basics → story order.

### i18n key sketch (`copy.profile.hub` — implement in 35.2)

Reuse existing field labels from `onboarding.*`, `profile.viewPage`, `analysisPage`, `profile.notifications`, `matchPreferences`. New hub chrome only:

| Key | EN intent |
|-----|-----------|
| `title` | Your profile |
| `tabOverview` | Overview |
| `tabEdit` | Edit |
| `tabAnalysis` | Analysis |
| `tabSettings` | Settings |
| `tablistAria` | Profile sections |
| `editProfileCta` | Edit profile |
| `meterLabel` | Profile quality |
| `meterImprove` | Improve profile |
| `meterLoading` | Checking profile quality… |
| `meterUnavailable` | Quality score unavailable |
| `settingsNotificationsHeading` | Notifications |
| `settingsMatchPrefsHeading` | Match preferences |
| `settingsMatchPrefsBody` | Choose who you want to see and dealbreakers. |
| `settingsMatchPrefsCta` | Open match preferences |
| `settingsAccountHeading` | Account |
| `settingsAccountLink` | Account settings |
| `settingsLanguageLink` | Language |
| `editSectionBasic` | Basic info |
| `editSectionStory` | Your story |
| `editSectionPhotos` | Photos |
| `unsavedLeaveTitle` | Discard unsaved changes? *(nice-to-have)* |
| `unsavedLeaveConfirm` | Leave |
| `unsavedLeaveCancel` | Stay |

Locales: **en / he / es** required in 35.2. Invalid `?tab=` → treat as `overview`.

### Accessibility checklist (35.2 must meet)

| Rule | Spec |
|------|------|
| Tabs | `role="tablist"`; each control `role="tab"` + `aria-selected`; panels `role="tabpanel"` + `aria-labelledby` |
| Keyboard | ←/→ (and Home/End) move selection; Enter/Space activate if focus≠selection pattern used |
| Focus | Activating a tab moves focus into the panel (or keeps on tab per APG; pick one and test) |
| Meter bar | `role="progressbar"` with `aria-valuenow/min/max` **or** text % adjacent + bar `aria-hidden` |
| Chips | Real `<a>` or `<button>` with visible name (not icon-only) |
| Hash scroll | After tab paint, scroll `#basic` / `#story` / `#photos` / `#notifications` / `#match-prefs` into view |
| Contrast | Zinc text on zinc-50/950; emerald bar OK if % also in text |
| RTL | Logical properties; tab order follows document/`dir` |
| Reduced motion | No required motion; optional tab underline transition ≤150ms |
| Mobile hit target | Tabs ≥44px height; meter Improve ≥44px |

### 35.2 implementer checklist (from this design)

1. Flip `/profile` to hub; redirect `/dating/profile` + `/dating/analysis` + settings profile aliases per map.  
2. Update primary nav Profile → `/profile`; `isProfileActive` includes hub + `?tab=analysis`.  
3. Migrate overview from `profile-page-client`; move notifications to Settings.  
4. Edit tab: forms without stepper; no post-save force to analysis.  
5. Analysis tab: wrap existing analysis client.  
6. Ship `ProfileQualityMeter` chrome (client completeness or skeleton until 35.3).  
7. i18n `profile.hub` en/he/es + specs for tabs/deep links/redirects.

---

## Acceptance criteria (Story 35.1)

- [x] Locked decisions for tabs, edit, save, meter, responsive, redirects  
- [x] ASCII mockups: all 4 tabs + mobile + meter  
- [x] Component hierarchy for Agent 1 of **35.2**  
- [x] Explicit out-of-scope vs 35.2/35.3/35.4  
- [x] Agent 1 polish: suggestion map + i18n sketch + a11y + 35.2 checklist  
- [x] Agent 2 CR PASS  
- [x] Agent 3 ACCEPT  

---

## Done

Story **35.1 ACCEPT**. Next: `--agent 0 sprint 35 story 2`.
