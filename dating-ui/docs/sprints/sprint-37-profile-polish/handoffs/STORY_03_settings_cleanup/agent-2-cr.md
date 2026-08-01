# Handoff: Agent 2 — CR — Sprint 37 Story 3

**Agent:** 2 CR  
**Story:** Settings tab cleanup  
**Sprint:** sprint-37-profile-polish  
**Date:** 2026-08-01  
**Status:** complete  
**Verdict:** **PASS**  
**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-implement.md](./agent-1-implement.md), [STORY_03_settings_cleanup.md](../../STORY_03_settings_cleanup.md)

---

## Summary

Settings matches the lock: Notifications unchanged; Account/Language removed from the tab only (avatar menu intact); match-prefs preview card shows age / distance / partner genders from `MeProfileDto` via `resolveEditableProfile` + `profileToMatchPreferencesForm`; CTA keeps testid → `/settings/preferences`. Specs **10 passed**. Safe for PM ACCEPT.

---

## Architect lock checklist

| Item | Result |
|------|--------|
| Account/Language removed from Settings tab only | **Pass** |
| Avatar menu `/settings/account` + language + prefs unchanged | **Pass** |
| Notifications section unchanged | **Pass** |
| Preview card: age / distance / `desiredPartnerGenders` | **Pass** |
| No `relationshipGoal` / no emoji chrome | **Pass** |
| Loading / empty / error + CTA still shown | **Pass** |
| CTA href `/settings/preferences` + `profile-match-preferences-link` | **Pass** |
| Emerald button CTA (not bare text link) | **Pass** |
| Reuse `profileToMatchPreferencesForm`; no new REST resource | **Pass** |
| No `MatchPreferencesForm` / preferences page / dating-api changes | **Pass** |
| New files ≤200 lines (card ~63, display ~67, tab ~85) | **Pass** |
| Specs: Account gone, CTA, preview lines; hub page green | **Pass** |

---

## Verification re-run

```text
npm test -- src/components/profile/profile-settings-tab.spec.tsx \
  src/components/profile/match-preferences-preview-display.spec.ts \
  "src/app/(authenticated)/profile/page.spec.tsx"
— 10 passed
```

---

## Findings

### Required fixes for PASS

None.

### Accepted / non-blocking

| Severity | Finding | Disposition |
|----------|---------|-------------|
| Info | Card title reuses `sections.partnerGenders` (“Open to matching with”) vs mockup “Who you want to see” | **Accepted** — lock allows existing prefs copy; no new i18n required |
| Info | Distance line is `Maximum distance: N km` not “within N km” | **Accepted** — uses `sections.distance` |
| Info | Fetch error reuses `matchPreferences.saveError` (“Could not save…”) | **Accepted** — soft message + CTA still works; optional copy polish later |
| Info | Hub `settingsAccount*` i18n keys left unused | **Accepted** — lock does not require deleting keys |

---

## Agent 3 note

Safe to **ACCEPT** and commit **only Story 37.3** files:

- `profile-settings-tab.tsx` + `profile-settings-tab.spec.tsx`
- `match-preferences-preview-card.tsx`
- `match-preferences-preview-display.ts` + `.spec.ts`
- `STORY_03_settings_cleanup.md` + `handoffs/STORY_03_settings_cleanup/`

**Do not** bundle Story 37.2 edit-tab files (`profile-edit-*`) in this commit unless also accepting 37.2 in the same PM pass. Exclude `.env.bak`, `.next`, unrelated.

**Next command:**

```
--agent 3 sprint 37 story 3
```
