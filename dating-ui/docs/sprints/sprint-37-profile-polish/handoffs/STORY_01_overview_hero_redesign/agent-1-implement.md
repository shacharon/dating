# Handoff: Agent 1 — Implement — Sprint 37 Story 1

**Agent:** 1 implement  
**Story:** Profile overview hero redesign  
**Sprint:** sprint-37-profile-polish  
**Date:** 2026-08-01  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [STORY_01_overview_hero_redesign.md](../../STORY_01_overview_hero_redesign.md)

---

## Summary

Overview is now a hero match card: primary photo + identity overlay (nickname/age, location, open-to-matching), story teaser, gallery dots, one Edit CTA, plus read-only story prose. Upload / PhotoGate / Analysis / Find matches removed from Overview. Meter stays hub chrome. **13 specs passed.**

---

## Files

| Path | Change |
|------|--------|
| `components/profile/profile-overview-display.ts` | **new** helpers + dots |
| `components/profile/profile-overview-display.spec.ts` | **new** |
| `components/profile/profile-overview-hero.tsx` | **new** (~170 lines) |
| `components/profile/profile-overview-story-prose.tsx` | **new** |
| `components/profile/profile-overview-tab.tsx` | Slim composer |
| `lib/conversations-api.ts` | `conversationPhotoSrc` passes through `blob:` / `data:` / `http(s)` |
| `app/(authenticated)/profile/page.spec.tsx` | Hero + edit CTA asserts; mock photo blob |

---

## Specs run

```
npm test -- "src/app/(authenticated)/profile/page.spec.tsx" \
  src/components/profile/profile-quality-meter.spec.tsx \
  src/components/profile/profile-overview-display.spec.ts
```

**13 passed.**

---

## Agent 2 notes

1. Confirm meter not duplicated in Overview.  
2. Overlay uses partner genders, not relationshipGoal.  
3. Hero ~170 lines (over soft 150; under hard 200) — OK or split dots/overlay later.  
4. Empty aboutMe uses `vp.subtitle` + Edit link (no new i18n).

**Next command:**

```
--agent 2 sprint 37 story 1
```
