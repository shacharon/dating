# Story 37.1 — Profile Overview Hero Redesign (LOCKED)

**Sprint:** 37 — Profile Polish  
**Story:** 1 — Redesign profile overview as hero match card  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** ACCEPT  
**Prerequisite:** none  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3`.  
**Repo:** `dating-ui` only  
**Needs mockup:** Design locked below (Option 1 — Hero Match Card)

---

## Goal

Replace Overview’s admin-card stack with a **hero match card**: primary photo + identity overlay, story teaser, 3 gallery dots, one Edit CTA, and read-only story prose below — so Overview feels like “me as others see me,” visually aligned with match detail.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Overview today | `components/profile/profile-overview-tab.tsx` — PhotoGateBanner + `ProfilePhotoSection` (upload) + basics `<dl>` + 3 story cards + 3 CTAs |
| Hub chrome | `profile-hub-client.tsx` — title → **`ProfileQualityMeter`** → tabs → panel. Meter is **above tabs for all tabs** |
| Draft shape | `ProfileFormState` / `ProfileDraft`: nickname, birthDate, gender, desiredPartnerGenders, city/country/locationLabel, aboutMe/Partner/Relationship — **no `relationshipGoal` field** |
| Age helper | `ageFromBirthInput` in `onboarding-basic-helpers.ts` |
| Photos | `listMyProfilePhotos` + `fetchMyProfilePhotoBlob` (blob URLs). Status: `APPROVED` / `PENDING` / `REJECTED` / `FLAGGED_FOR_REVIEW` |
| Match hero | `MatchPhoto` `variant="hero"` — `aspect-[4/3]` inside `max-w-2xl` (same shell as hub) |
| Specs | `(authenticated)/profile/page.spec.tsx` — asserts `profile-overview-tab` + meter; mocks photo section / photo gate. Update expectations if Overview no longer mounts those mocks |
| Edit tab | Unchanged this story — upload stays on Edit |

### Draft-story corrections (outdated — ignore)

- ❌ Overlay line “Looking for: Long-term” via `relationshipGoal` — **does not exist** on profile. Use **open-to-matching** (`desiredPartnerGenders`) with existing gender copy.  
- ❌ Move `ProfileQualityMeter` into Overview / below gallery — **keep hub placement** (above tabs). Overview must not remount a second meter.  
- ❌ Require hero to break out of hub `max-w-2xl` edge-to-edge — match match-detail: full width **of the hub column**, rounded/clipped OK. Soft prefer bleed; not a hard fail.  
- ❌ Invent height/education/smoking fields.  
- ❌ dating-api / route / tab IA changes.  
- ❌ Redesign Edit / Settings / Analysis (37.2 / 37.3).

---

## Locked UI structure

```
ProfileOverviewTab
├── ProfileOverviewHero
│   ├── Hero photo (MatchPhoto hero) + identity overlay
│   ├── Story teaser (aboutMe, line-clamp)
│   ├── Gallery dots (3 slots, view-only)
│   └── Primary CTA → /profile?tab=edit  (testid: profile-overview-edit)
└── ProfileOverviewStoryProse
    └── About me / partner / relationship as readable sections
```

Hub (unchanged order):

```
title → ProfileQualityMeter → ProfileHubTabs → tab panel (Overview as above)
```

### Identity overlay (on photo)

| Line | Source |
|------|--------|
| Title | `nickname` + age from `ageFromBirthInput(birthDate)` → e.g. `Ada, 28` (omit age if null) |
| Location | `locationLabel` \|\| `city` (omit line if both empty) |
| Looking for | Partner genders via existing gender i18n (same idea as today’s `formatPartnerGenders`) — omit if empty |

Gradient: `linear-gradient(to top, rgba(0,0,0,0.7), transparent)`; white text; truncate long strings.

### Hero photo

- Primary: `photos.find(p => p.isPrimary)` else first `APPROVED` else first photo else placeholder.  
- Load blob via `fetchMyProfilePhotoBlob`; pass object URL into `MatchPhoto` (revoke on cleanup).  
- Reuse `MatchPhoto` `variant="hero"` + initial placeholder when missing.

### Gallery dots (exactly 3)

Map up to 3 photos by list order / position (same slot model as photo section: pad to 3):

| Status | Dot |
|--------|-----|
| `APPROVED` | filled emerald |
| `PENDING` / `FLAGGED_FOR_REVIEW` | filled amber |
| missing / `REJECTED` | empty outline |

Not clickable. No upload UI on Overview.

### Story teaser

- Source: `aboutMe` trim; `line-clamp-3` desktop, `line-clamp-2` mobile.  
- If empty: empty-state copy + link `/profile?tab=edit#story` (prefer reuse existing hub/view copy; **minimal new i18n only if nothing fits**).

### CTAs

- **Keep:** one primary Edit — `data-testid="profile-overview-edit"`, href `/profile?tab=edit`, use `hub.editProfileCta`. Style: stronger primary (e.g. solid blue/zinc) OK.  
- **Remove from Overview:** Analysis link, Find matches link, PhotoGateBanner, `ProfilePhotoSection`, basics `<dl>`.

### Story prose below

- Read-only sections for aboutMe / aboutPartner / aboutRelationship with existing textsForm labels.  
- Empty → existing `emptyValue` (`—`) or soft empty; not form cards.

---

## Component / file plan

| Path | Action |
|------|--------|
| `components/profile/profile-overview-hero.tsx` | **new** — photo fetch + overlay + teaser + dots + Edit CTA |
| `components/profile/profile-overview-story-prose.tsx` | **new** — read-only story sections |
| `components/profile/profile-overview-tab.tsx` | Slim orchestrator composing the two |
| Optional tiny helper | e.g. `profile-overview-display.ts` for title/location/partner line — OK |
| `profile-hub-client.tsx` | **No meter move**; only touch if Overview needs nothing else |
| `profile/page.spec.tsx` | Update: Overview still mounts; may stop mocking PhotoGate / photo section if unused; add light asserts for hero/edit CTA if cheap |

Prefer each new file ≤ ~150 lines; hard fail > 200 without split.

---

## Behavior freeze

- No dating-api changes.  
- No hub tab routes / `?tab=` semantics change.  
- Quality meter API + hub placement unchanged.  
- Edit tab photo upload unchanged.  
- Preserve `data-testid="profile-overview-tab"` and `profile-overview-edit`.

---

## Tests / gates

1. `npm test -- "src/app/(authenticated)/profile/page.spec.tsx"` green (update as needed).  
2. `profile-quality-meter.spec.tsx` still green (no required changes).  
3. Manual: hero + overlay, no-photo placeholder, dots states, empty aboutMe, dark mode, mobile clamp.

---

## Acceptance criteria

- [x] Overview is hero card (not admin photo upload + `<dl>` stack)  
- [x] Overlay: nickname (+ age), location, open-to-matching — **not** fake relationshipGoal  
- [x] Story teaser + gallery dots + one Edit CTA  
- [x] Full story prose below; upload only on Edit  
- [x] Quality meter remains hub chrome above tabs (single instance)  
- [x] PhotoGateBanner / Analysis / Find matches removed from Overview  
- [x] `page.spec.tsx` (+ meter spec) green  
- [x] dating-ui only; no intentional API/route redesign  

---

## Out of scope

| Item | Where |
|------|--------|
| Edit sections | **37.2** |
| Settings cleanup | **37.3** |
| Analysis polish | Later |
| Match-detail layout tweaks | Later |
| Gallery lightbox / carousel | Later |

---

## Agent 1 implementation order

1. Add `ProfileOverviewHero` (photos list + blob primary + overlay + teaser + dots + Edit).  
2. Add `ProfileOverviewStoryProse`.  
3. Rewrite `ProfileOverviewTab` to compose them; delete old admin stack.  
4. Update `page.spec.tsx`; run specs.  
5. Handoff `agent-1-implement.md`.

---

## Done

```
--agent 0 sprint 37 story 2
```
