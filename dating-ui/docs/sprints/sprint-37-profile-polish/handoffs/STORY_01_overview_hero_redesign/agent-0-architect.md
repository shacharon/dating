# Handoff: Agent 0 — Architect — Sprint 37 Story 1

**Agent:** 0 architect  
**Story:** Profile overview hero redesign  
**Sprint:** sprint-37-profile-polish  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** **Skip Agent 4.**

---

## Summary

Lock for Overview → **Hero Match Card**. Keep quality meter as hub chrome above tabs. Overlay uses nickname/age/location/`desiredPartnerGenders` — **not** a non-existent `relationshipGoal`. Photos via existing list + blob fetch; upload stays on Edit.

Full lock: [STORY_01_overview_hero_redesign.md](../../STORY_01_overview_hero_redesign.md)

---

## Decisions (do not reverse)

1. **Hero card** on Overview; remove admin photo UI / basics `<dl>` / triple CTAs / PhotoGate from Overview.  
2. **Meter stays** above tabs in `profile-hub-client` — do not duplicate in Overview.  
3. **Looking for** = partner genders i18n, not relationshipGoal.  
4. Reuse `MatchPhoto` hero + `ageFromBirthInput` + photo APIs.  
5. dating-ui only; preserve `profile-overview-tab` + `profile-overview-edit` testids.

---

## Agent 1 brief

1. Read `STORY_01_overview_hero_redesign.md`  
2. Implement hero + story prose; slim Overview tab; update hub page spec  
3. No dating-api / no Edit tab rewrite  

**Next command:**

```
--agent 1 sprint 37 story 1
```
