# Handoff: Agent 0 — Architect / Design — Sprint 33 Story 6

**Agent:** 0 architect / designer  
**Story:** Landing page value proposition  
**Sprint:** sprint-33-ux-navigation  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Design lock (ASCII + copy + component plan). **Skip Agent 4**.

---

## Summary

Redesign `/` as a single page: **brand-first hero** with value prop + Google CTA on a full-bleed atmosphere; below fold = honest trust strip + how it works + benefits + scroll-back closing CTA. **No fake social proof.**

Full lock: [STORY_06_landing_design.md](../STORY_06_landing_design.md)

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `components/landing/*` | split hero / trust / how / benefits / closing / footer / atmosphere |
| `public-landing-client.tsx` | compose + preserve auth/referral |
| `lib/i18n/*` | expand `landing` copy (EN locked in design doc) |
| specs | update landing tests |

---

## Decisions (do not reverse)

1. Hero budget: brand + H1 + one sentence + CTA + full-bleed visual only.  
2. No fabricated user counts / testimonials.  
3. Mount GIS **once** (hero); closing scrolls to `#landing-sign-in`.  
4. Visual: custom atmosphere SVG/CSS — not inset media cards.  
5. Teal/zinc personality — not purple glow or cream+terracotta cliché.  
6. Skip Agent 4.

---

## Agent 1 brief

1. Read `STORY_06_landing_design.md`  
2. Implement sections + i18n + preserve auth  
3. Update specs  

**Next command:**

```
--agent 1 sprint 33 story 6
```
