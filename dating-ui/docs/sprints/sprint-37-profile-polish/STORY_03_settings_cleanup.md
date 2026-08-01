# Story 37.3 — Settings Tab Cleanup (LOCKED)

**Sprint:** 37 — Profile Polish  
**Story:** 3 — Clean up settings tab (remove duplicates, upgrade match prefs)  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** ACCEPT  
**Prerequisite:** Prefer **37.2** ACCEPT (independent enough to run after 37.1 if needed)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3`.  
**Repo:** `dating-ui` only  
**Needs mockup:** Design locked below

---

## Goal

Settings tab becomes a clean 2-section hub: keep **Notifications**, upgrade **Match preferences** to a preview card (real profile prefs), **remove** duplicate Account/Language links (already in avatar menu).

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Settings today | `profile-settings-tab.tsx`: Notifications + text link to `/settings/preferences` + Account/Language links |
| Avatar menu | `nav-auth.tsx` already links Account, Match preferences, Language |
| Prefs data | On **`MeProfileDto`**: `partnerAgeMin`, `partnerAgeMax`, `maxDistanceKm`, `desiredPartnerGenders` — loaded via `fetchMyProfile` / `resolveEditableProfile` |
| Prefs form helpers | `lib/match-preferences-form.ts` → `profileToMatchPreferencesForm` |
| Prefs editor page | `/settings/preferences` → `MatchPreferencesForm` (unchanged) |
| Testid | `profile-settings-tab`, `profile-match-preferences-link` |

### Draft corrections (outdated — ignore)

- ❌ Show “Looking for: Long-term” / `relationshipGoal` — **does not exist** on profile. Use **open-to-matching** (`desiredPartnerGenders`) + age range + distance.  
- ❌ Invent a separate preferences REST resource — use existing profile fetch.  
- ❌ Emoji/target sticker in the card (🎯) — use plain typography; no decorative emoji.  
- ❌ Inline edit of prefs on the Settings tab — CTA still goes to `/settings/preferences`.  
- ❌ dating-api / Overview / Edit redesign.

---

## Locked UX

### Before → After

| Before | After |
|--------|--------|
| Notifications | Unchanged |
| Match prefs blurb + text link | Preview **card** + primary CTA button |
| Account + Language links | **Removed** |

### Match preferences preview card

```
Match preferences
┌─────────────────────────────────────┐
│  Who you want to see                │
│                                     │
│  • Age range: 25–35                 │  ← if min/max present
│  • Distance: within 50 km           │  ← if maxDistanceKm present
│  • Open to matching with: Men, …    │  ← partner genders i18n
│                                     │
│       [ Open match preferences ]    │  ← keep testid on CTA
└─────────────────────────────────────┘
```

**Data mapping (from `MeProfileDto` / form state):**

| Line | Source |
|------|--------|
| Age range | `partnerAgeMin`–`partnerAgeMax` (show partial if only one set; omit line if both null) |
| Distance | `maxDistanceKm` → “within N km” using existing prefs copy where possible |
| Open to matching | `desiredPartnerGenders` via `copy.gender` labels |

**Empty / loading:**  
- Loading: short status text (`copy.common.loading`) or skeleton — keep light.  
- No profile / all prefs empty: body text (reuse `hub.settingsMatchPrefsBody` or minimal new `settingsMatchPrefsEmpty` in en/he/es + types) + CTA still shown.  
- Fetch error: soft message + CTA still links to `/settings/preferences`.

**CTA:**  
- Href `/settings/preferences`  
- Preserve `data-testid="profile-match-preferences-link"` (on the button/link)  
- Prefer button styling (emerald/solid) over bare text link; label: reuse `hub.settingsMatchPrefsCta`

### Account section

Delete the Account heading + `/settings/account` + `/settings/language` links from Settings tab only. Do **not** remove those routes or avatar-menu entries.

---

## File plan

| Path | Action |
|------|--------|
| `components/profile/profile-settings-tab.tsx` | Remove Account; fetch profile; render preview card |
| `components/profile/match-preferences-preview-card.tsx` | **new** presentational card |
| Optional | tiny display helper for age/distance/partner lines |
| `lib/i18n/*` | Optional empty-state string only |
| `profile-settings-tab.spec.tsx` | **new** (or extend hub page.spec) — Account gone; CTA href; preview lines when mocked profile |

Reuse: `resolveEditableProfile` / `fetchMyProfile`, `profileToMatchPreferencesForm`, gender copy.  
Do **not** change `MatchPreferencesForm` or preferences page.

Line budgets: soft ≤150 per new file; hard fail >200.

---

## Behavior freeze

- No dating-api changes.  
- No new routes.  
- Notifications section unchanged.  
- Prefs editing still only on `/settings/preferences`.  
- Preserve `data-testid="profile-settings-tab"` and `profile-match-preferences-link`.

---

## Tests / gates

1. Spec: Account links absent from Settings tab.  
2. Spec: CTA href `/settings/preferences` + testid.  
3. Spec: with mocked profile, age/distance/genders appear (at least one assertion).  
4. Hub `page.spec.tsx` still green if Settings is mocked there.

---

## Acceptance criteria

- [x] Account/Language section removed from Settings tab  
- [x] Match prefs preview card shows age / distance / partner genders from profile (when set)  
- [x] No `relationshipGoal` / no emoji chrome  
- [x] CTA to `/settings/preferences` with existing testid  
- [x] Notifications unchanged  
- [x] Specs green; dating-ui only  

---

## Out of scope

| Item | Notes |
|------|--------|
| Inline prefs editor | Out |
| Embedding full `MatchPreferencesForm` | Out |
| Avatar menu changes | Out |
| 37.2 commit | Separate Agent 3 for story 2 |

---

## Agent 1 implementation order

1. Add `MatchPreferencesPreviewCard`.  
2. Wire fetch in `ProfileSettingsTab`; remove Account block.  
3. Specs + handoff `agent-1-implement.md`.

---

## Done

Accepted 2026-08-01. See [agent-3-pm.md](./handoffs/STORY_03_settings_cleanup/agent-3-pm.md).

**Still owed (Sprint 37):** `--agent 3 sprint 37 story 2` if Edit tab is CR PASS.
