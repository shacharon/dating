# Story 35.2 — Implement Unified Profile Hub (LOCKED)

**Sprint:** 35 — Profile Consolidation  
**Story:** 2 — Implement unified profile page  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** ACCEPT  
**Prerequisite:** Story **35.1 ACCEPT** — [STORY_01_unified_profile_design.md](./STORY_01_unified_profile_design.md)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` (frontend).  
**Needs mockup:** no (use 35.1 lock)

---

## Goal

Ship canonical **`/profile?tab=`** hub (Overview · Edit · Analysis · Settings) with quality-meter **chrome**, redirects from legacy surfaces, and nav pointing at `/profile` — without inventing new basic/story forms or a quality **API** (that is 35.3).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Design | Binding: 35.1 lock (tabs, hashes, i18n sketch, a11y, suggestion map) |
| `/profile` today | `(authenticated)/profile/page.tsx` → `redirect('/dating/profile')` |
| View UI | `dating/profile/profile-page-client.tsx` |
| Analysis UI | `dating/analysis/analysis-page-client.tsx` + `useAnalysisPage` + panels |
| Edit UI | `OnboardingBasicForm` / `OnboardingTextsForm` — **no hub props yet**; `?edit=1` only; texts finish → `/dating/analysis` |
| Stepper | Lives in **onboarding chrome**, not inside the forms |
| Nav Profile | `href="/dating/profile"`; `isProfileActive` already true for `/profile*` |
| Middleware | Auths `/profile`; **no** rewrite needed for hub |
| Completeness | `ProfileCompletenessHints` on view page only |
| Notifications | On view page; account links `#notification-prefs` |

### AGENT_COMMANDS / sample code corrections (outdated — ignore)

- ❌ Emoji tab icons; ❌ `border-blue-600` active tabs — use **zinc/emerald** shell tokens  
- ❌ `app/profile/page.tsx` outside authenticated group — use **`(authenticated)/profile/`** (flip existing redirect page)  
- ❌ New `ProfileViewCard` / duplicate forms — **migrate** overview; **embed** existing forms  
- ❌ Photos “future” only — Edit tab **must** include `ProfilePhotoSection` `#photos`  
- ❌ Quality **API** / weighted score server — **35.3**; this story = chrome + client completeness  
- ❌ Full redirect QA matrix ownership — implement redirects here; exhaustive QA = **35.4**  
- ❌ Unsaved-leave dialog required — nice-to-have only  

---

## Locked product behavior

### URL & tabs

| Rule | Spec |
|------|------|
| Canonical | `/profile` |
| Query | `?tab=overview\|edit\|analysis\|settings` |
| Default / invalid tab | `overview` |
| Hashes | `#basic` `#story` `#photos` `#notifications` `#match-prefs` |
| Tab change | `<Link href={`/profile?tab=…`}>` (or equivalent) so refresh keeps tab |
| Hash on load | After active tab mounts, `scrollIntoView` for hash if present |

### Redirects (thin `redirect()` pages)

| From | To |
|------|----|
| `/dating/profile` | `/profile` (+ preserve hash if Next redirect API allows; else drop hash OK) |
| `/settings/profile` | `/profile` |
| `/settings/profile/basic` | `/profile?tab=edit#basic` |
| `/settings/profile/story` | `/profile?tab=edit#story` |
| `/dating/analysis` | `/profile?tab=analysis` |

Keep first-time **`/onboarding/*`** (no edit) unchanged.  
`/onboarding/*?edit=1` may remain; **product CTAs** (nav, overview Edit, analysis “edit profile”, avatar menu edit links) → hub URLs.

### Nav

- Desktop + mobile Profile **`href="/profile"`**  
- `isProfileActive`: keep `/profile*`, `/dating/profile` (until gone), `/settings/profile*`  
- After analysis redirect, pathname is `/profile` → already profile-active (no query parsing required)

### Tabs content

| Tab | Content |
|-----|---------|
| **Overview** | Migrate read-only view from `profile-page-client` (photos read-only, basics, story). **Remove** notifications + prefer completeness → meter. CTA → `?tab=edit`. Drop old Analysis link or point to `?tab=analysis`. |
| **Edit** | Sections `#basic` / `#story` / `#photos` with headings from `profile.hub`. Embed forms + `ProfilePhotoSection`. **No** onboarding stepper on this page. |
| **Analysis** | Compose `useAnalysisPage` + `AnalysisProgressPanel` + `AnalysisResultsView` (strip full-page chrome duplication). Update internal “edit profile” / photo links → `/profile?tab=edit…`. |
| **Settings** | `#notifications` → `NotificationPreferencesSection`; `#match-prefs` blurb + link `/settings/preferences`; account + language links. |

### Form embedding (required code change)

Add optional props (names locked):

```ts
// OnboardingBasicForm & OnboardingTextsForm
type ProfileHubFormProps = {
  /** When true: hub embed — no onboarding navigation after save */
  variant?: 'onboarding' | 'profileHub'; // default 'onboarding'
};
```

| Behavior | `onboarding` (default) | `profileHub` |
|----------|------------------------|--------------|
| Basic success | → `/onboarding/texts` (current) | Stay; optional scroll `#story` |
| Texts success | → `/dating/analysis` (current) | Stay on hub (no analysis redirect) |
| Back / leave links | Current onboarding | Hide or point to `/profile` / `#basic` |
| `?edit=1` | Still works on onboarding routes | Not required when `variant="profileHub"` |

Do **not** render `OnboardingChrome` / stepper on the hub Edit tab.

### Quality meter (35.2 chrome)

- Always above tabs.  
- Client-derived % from same signals as completeness (photo approved, basics, story fields) — extract shared helper if needed.  
- Show % + bar + Improve → `/profile?tab=edit` + up to **2** suggestion chips per 35.1 map.  
- No dating-api quality endpoint.  
- `ProfileCompletenessHints` may be removed from Overview once meter covers it (or keep collapsed — prefer **replace** to avoid duplicate checklists).

### i18n

Implement `copy.profile.hub` keys from 35.1 sketch in **types + en + he + es**.

### Visual / a11y

- Zinc shell; active tab: bottom border zinc-900 / zinc-100 dark, semibold — **not** blue.  
- Meet 35.1 a11y checklist (tablist, progressbar-or-text, ≥44px targets).  
- No emoji in tab chrome.

---

## Locked file touchpoints

### Create / replace

| Path | Role |
|------|------|
| `(authenticated)/profile/page.tsx` | Hub entry (replace redirect) — server metadata OK |
| `(authenticated)/profile/profile-hub-client.tsx` | Client: tab state, meter, panels, hash scroll |
| `components/profile/profile-hub-tabs.tsx` | Tablist |
| `components/profile/profile-quality-meter.tsx` | Meter chrome |
| `components/profile/profile-overview-tab.tsx` | Overview |
| `components/profile/profile-edit-tab.tsx` | Edit sections |
| `components/profile/profile-analysis-tab.tsx` | Analysis |
| `components/profile/profile-settings-tab.tsx` | Settings |
| Optional `lib/profile-completeness.ts` | Shared scoring for meter / hints |

### Update

| Path | Change |
|------|--------|
| `onboarding-basic-form.tsx` / `onboarding-texts-form.tsx` (+ specs) | `variant` prop behavior |
| `nav/app-nav-desktop.tsx` / `app-nav-mobile.tsx` | Profile → `/profile` |
| `nav/nav-active.ts` (+ spec) | Keep profile paths; no analysis path needed if redirected |
| `nav-auth.tsx` (if edit links) | Prefer hub edit URLs |
| Analysis progress / results links | `/profile…` |
| Account `#notification-prefs` link | `/profile?tab=settings#notifications` |
| i18n `types` / `en` / `he` / `es` | `profile.hub` |

### Redirect wrappers

| Path | Becomes |
|------|---------|
| `dating/profile/page.tsx` | `redirect('/profile')` (client may delete or leave unused) |
| `dating/analysis/page.tsx` | `redirect('/profile?tab=analysis')` |
| `settings/profile/page.tsx` | `redirect('/profile')` |
| `settings/profile/basic/page.tsx` | `redirect('/profile?tab=edit#basic')` |
| `settings/profile/story/page.tsx` | `redirect('/profile?tab=edit#story')` |

Prefer moving reusable logic out of `dating/profile/profile-page-client.tsx` into overview tab; then dating profile page is redirect-only. Same for analysis client → analysis tab module (keep helpers under `dating/analysis/` or move to `components/profile/` — **prefer** import hook/views from existing analysis folder to minimize churn).

### Specs (required)

- Hub: default tab, `?tab=` switching, invalid tab → overview, hash scroll (smoke), filtered sections render  
- Redirects: settings basic/story, dating profile/analysis (unit or page-level)  
- Nav href `/profile`  
- Forms: `variant="profileHub"` does not navigate to analysis / texts onboarding  
- Meter: renders % / Improve; chips link map  
- i18n: HE title/tabs smoke  
- Existing onboarding form specs still green (default variant)

---

## Out of scope

| Item | Owner |
|------|--------|
| Quality API / weighted server score | **35.3** |
| Exhaustive redirect / regression matrix | **35.4** |
| Analysis history | Later |
| Inline full match-prefs form | Later (link out) |
| Required unsaved-leave modal | Nice-to-have |
| dating-api changes | None this story |

---

## Acceptance criteria

- [x] `/profile` hub with 4 tabs + deep links + invalid tab fallback  
- [x] Overview / Edit / Analysis / Settings match 35.1 IA  
- [x] Forms embed with `variant="profileHub"`; no forced analysis redirect from Edit  
- [x] Photos editable on Edit `#photos`  
- [x] Meter chrome above tabs (client completeness)  
- [x] Legacy redirects wired  
- [x] Nav Profile → `/profile`  
- [x] `profile.hub` en/he/es  
- [x] A11y basics (tablist + meter)  
- [x] Specs green; onboarding first-time flow unbroken  

---

## Done

Story **35.2 ACCEPT**. Next: `--agent 0 sprint 35 story 3 backend` (or story 4 after quality work).
