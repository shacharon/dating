# Handoff: Agent 1 — Implement — Sprint 33 Story 6

**Agent:** 1 implement  
**Story:** Landing page value proposition  
**Sprint:** sprint-33-ux-navigation  
**Date:** 2026-08-01  
**Status:** complete  

**Skip Agent 4:** yes  

---

## Summary

Implemented locked landing redesign: brand-first hero + full-bleed atmosphere, honest trust strip, how-it-works, benefits, scroll-back closing CTA. Auth/`next`/referral preserved; GIS mounted once.

---

## Changes

| Path | Change |
|------|--------|
| `landing-atmosphere.tsx` + `landing-motion.css` | full-bleed SVG + drift/fade motion |
| `landing-hero.tsx` | brand, H1, subtitle, `#landing-sign-in` CTA slot |
| `landing-trust-strip.tsx` | 3 trust phrases |
| `landing-how-it-works.tsx` | 3 steps |
| `landing-benefits.tsx` | 3 benefits |
| `landing-closing-cta.tsx` | scroll to `#landing-sign-in` |
| `landing-footer.tsx` | Privacy · Terms |
| `public-landing-client.tsx` | compose sections; GIS once; locale corner |
| `lib/i18n/{types,en,he,es}.ts` | expanded `landing` copy |
| `public-landing-client.spec.tsx` | brand/sections + cookie cleanup |

---

## Tests

```text
npx vitest run src/components/landing
# 6 passed
```

---

## Agent 2 next

```
--agent 2 sprint 33 story 6
```

Review against `STORY_06_landing_design.md`.
