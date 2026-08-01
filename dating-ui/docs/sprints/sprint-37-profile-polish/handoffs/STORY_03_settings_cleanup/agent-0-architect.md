# Handoff: Agent 0 — Architect — Sprint 37 Story 3

**Agent:** 0 architect  
**Story:** Settings tab cleanup  
**Sprint:** sprint-37-profile-polish  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** **Skip Agent 4.**

---

## Summary

Lock for Settings: remove duplicate Account/Language; upgrade match prefs to a **preview card** fed by `MeProfileDto` (`partnerAgeMin/Max`, `maxDistanceKm`, `desiredPartnerGenders`). No `relationshipGoal`. No emoji. CTA stays `/settings/preferences`.

Full lock: [STORY_03_settings_cleanup.md](../../STORY_03_settings_cleanup.md)

---

## Decisions (do not reverse)

1. Prefs preview from **profile** fetch + existing form mappers — not a new API.  
2. Lines: age range, distance, open-to-matching genders — **not** relationship goal.  
3. Remove Account section from Settings tab only; avatar menu unchanged.  
4. Keep `profile-match-preferences-link` testid on CTA.  
5. dating-ui only.

---

## Agent 1 brief

1. Read `STORY_03_settings_cleanup.md`  
2. Preview card + slim Settings tab; specs  
3. No dating-api  

**Note:** Story **37.2** may still need `--agent 3` commit before/parallel — Settings is independent code-wise.

**Next command:**

```
--agent 1 sprint 37 story 3
```
