# Handoff: Agent 1 — Implement — Sprint 37 Story 3

**Agent:** 1 implement  
**Story:** Settings tab cleanup  
**Sprint:** sprint-37-profile-polish  
**Date:** 2026-08-01  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [STORY_03_settings_cleanup.md](../../STORY_03_settings_cleanup.md)

---

## Summary

Settings tab is now Notifications + match-prefs **preview card** (age / distance / partner genders from `MeProfileDto`). Account/Language section removed (avatar menu unchanged). CTA keeps `data-testid="profile-match-preferences-link"` → `/settings/preferences`. **10 related specs passed** (5 new + 5 hub page).

---

## Files

| Path | Change |
|------|--------|
| `components/profile/match-preferences-preview-card.tsx` | **new** presentational card + emerald CTA |
| `components/profile/match-preferences-preview-display.ts` | **new** preview line helpers |
| `components/profile/match-preferences-preview-display.spec.ts` | **new** |
| `components/profile/profile-settings-tab.tsx` | Fetch profile; remove Account; wire card |
| `components/profile/profile-settings-tab.spec.tsx` | **new** Account gone; CTA; preview lines |

---

## Specs run

```
npm test -- src/components/profile/profile-settings-tab.spec.tsx \
  src/components/profile/match-preferences-preview-display.spec.ts \
  "src/app/(authenticated)/profile/page.spec.tsx"
```

**10 passed.**

---

## Agent 2 notes

1. No `relationshipGoal` / no emoji.  
2. Data via `resolveEditableProfile` + `profileToMatchPreferencesForm`.  
3. Account i18n keys left in hub copy (still unused here; avatar menu may use different keys) — OK not to delete.  
4. Error state reuses `matchPreferences.saveError` (soft message; CTA still works).  
5. Story 37.2 may still be uncommitted — keep scopes separate.

**Next command:**

```
--agent 2 sprint 37 story 3
```
