# Story 33.6 — Landing Page Value Proposition (LOCKED DESIGN)

**Sprint:** 33 — UX Navigation  
**Story:** 6 — Landing page value proposition  
**Agent 0:** Architect / UX designer  
**Date:** 2026-08-01  
**Status:** Done (PM ACCEPT)  
**Skip Agent 4:** yes  
**Blocks:** Agent 1 implementation (`--agent 1 sprint 33 story 6`)

---

## Goal

Make `/` communicate **what this product is** before Google sign-in, without turning auth into a brochure maze or inventing fake social proof.

---

## Current baseline

| Fact | Detail |
|------|--------|
| Route | `(public)/page.tsx` → `PublicLandingClient` |
| First viewport | Centered column: H1 “Find your match”, subtitle, language + Google CTA, legal footer |
| Brand | **Missing** as hero signal (nav brand exists in-app as `"Dating"`) |
| Imagery | None |
| Sections | None below CTA |
| Auth | GIS → cookie; `?next=` or `/dating/me-matches`; referral beacon unchanged |

---

## Locked product / design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Page shape | **Single long page** — hero + 3 below-fold sections + footer | Plan asks for sections; keep one URL / one CTA system |
| Hero budget | **Only:** brand · 1 headline · 1 support line · CTA group · 1 full-bleed visual | Avoid first-viewport clutter (no stats, benefit grids, or how-it-works in hero) |
| Brand | Hero wordmark **`Dating`** (same string as `nav.brand`) | Brand-first; passes “remove chrome → still branded” |
| Primary CTA | **Google sign-in only** (existing GIS button) | Do not add email/password this story |
| Secondary CTA | None in hero. Optional **repeat Google CTA** only at end of “How it works” / before footer | Single focus; re-offer after education |
| Language picker | **Top-end corner** of the page (start/end per `dir`) — text control, not a promo chip | Keeps locale without crowding hero center |
| Imagery | **Full-bleed illustration plane** (custom SVG / CSS scene), edge-to-edge behind hero copy | No photos in repo; avoid stock-photo delay; not an inset card |
| Visual tone | **Warm slate / zinc** + soft **teal** accent (already used for unread/success in product) | Avoid purple gradients, cream+terracotta+serif cliché, glow, pill spam |
| Typography | Use root **Geist** (`--font-geist-sans`) on landing; display weight for brand + H1 | Escape body `Arial` on this page only |
| Background | Layered full-bleed atmosphere (illustration + soft gradient wash) — never flat single fill | Atmosphere without purple neon |
| Cards | **No cards in hero.** Below fold: open sections (icon + text), not boxed card grids | Match design rules |
| Social proof | **Honest trust strip only** — no fake user counts, no invented testimonials | We have no approved metrics/quotes |
| Dark mode | Full parity (zinc dark surfaces) | Existing shell |
| Motion | **2–3** subtle motions: hero atmosphere drift (slow), CTA/focus fade-in, step markers soft stagger on scroll (optional `prefers-reduced-motion: reduce`) | Presence, not noise |
| Auth / referral | **Preserve** cookie GIS flow, `safeNextPath`, referral capture + beacon | Out of scope to change |
| i18n | Extend `copy.landing.*` in **en / he / es** + types | Locked EN copy below; Agent 1 translates |

### Rejected (do not ship)

- Fake “10,000+ users” or fabricated testimonials  
- Multiple auth providers  
- Inset / side-panel / floating hero photo cards  
- Stats row or benefit chips in the first viewport  
- Purple-on-white / indigo glow themes  

---

## Information architecture

```
/ (public landing)
├─ Hero (first viewport) — brand, value prop, CTA, full-bleed visual
├─ Trust strip (short, under fold or thin band immediately under hero)
├─ How it works (3 steps)
├─ Benefits (3 differentiators)
├─ Closing CTA (repeat Google sign-in)
└─ Footer (Privacy · Terms · language already in header)
```

**One job per section** — do not merge Benefits into How it works.

---

## ASCII mockups

### Mobile (< md) — first viewport

```
┌──────────────────────────────────────┐
│                         [EN ▾]       │  ← language, corner
│                                      │
│ ████ FULL-BLEED ILLUSTRATION ██████  │
│ ████ (abstract connection motif) ███ │
│                                      │
│  Dating                              │  ← brand (largest text)
│  Match on meaning,                   │
│  not endless swiping.                │  ← H1 value prop
│  Compatibility-first matching        │
│  with moderated conversations.       │  ← one support sentence
│                                      │
│  [  Continue with Google  ]          │  ← GIS widget
│                                      │
└──────────────────────────────────────┘
   ↓ scroll
```

### Mobile — below fold

```
│  Built with care                     │  ← trust strip title (optional)
│  Private by default · Moderated      │
│  chats · Compatibility-first         │
│                                      │
│  How it works                        │
│  1  Tell your story                  │
│  2  Get thoughtful matches           │
│  3  Talk when it feels right         │
│                                      │
│  Why Dating                          │
│  • Depth over volume                 │
│  • Clear matching signals            │
│  • Safer conversations               │
│                                      │
│  [  Continue with Google  ]          │
│  Privacy · Terms                     │
└──────────────────────────────────────┘
```

### Desktop (≥ md)

```
┌────────────────────────────────────────────────────────────────────┐
│                                                          [EN ▾]    │
│  FULL-BLEED VISUAL PLANE (illustration left→right atmosphere)      │
│                                                                    │
│     Dating                                                         │
│     Match on meaning, not endless swiping.                         │
│     Compatibility-first matching with moderated conversations.     │
│                                                                    │
│     [ Continue with Google ]                                       │
│                                                                    │
│  (copy left-aligned in a readable measure; visual remains          │
│   edge-to-edge behind — NOT a two-column card layout)              │
└────────────────────────────────────────────────────────────────────┘
```

Hero copy sits in a **max-w-xl** measure with padding; background still **full-bleed**. Do not split into “text column | image column” inset panels.

---

## Locked copy (English)

Agent 1 ports to `he` / `es` (not machine-identical to EN).

### Hero

| Key | Copy |
|-----|------|
| `brand` | Dating |
| `title` *(H1)* | Match on meaning, not endless swiping. |
| `subtitle` | Compatibility-first matching with moderated conversations. |
| `googleSignIn` | *(keep existing GIS label behavior; UI label may stay “Sign in with Google” / Continue with Google as today)* |
| `checkingSession` | Checking sign-in… |
| `signingIn` | Signing in… |
| `retryApi` | Retry connection to API |

### Trust strip

| Key | Copy |
|-----|------|
| `trust.privacy` | Private by default |
| `trust.moderation` | Moderated conversations |
| `trust.compatibility` | Compatibility-first matches |

No numeric claims.

### How it works

| Key | Copy |
|-----|------|
| `how.title` | How it works |
| `how.step1Title` | Tell your story |
| `how.step1Body` | Share the basics and what matters to you — save progress anytime. |
| `how.step2Title` | Get thoughtful matches |
| `how.step2Body` | We surface compatible people using your profile, not endless card spam. |
| `how.step3Title` | Start a real conversation |
| `how.step3Body` | When both sides are interested, talk in a moderated messaging space. |

### Benefits (“Why Dating”)

| Key | Copy |
|-----|------|
| `benefits.title` | Why Dating |
| `benefits.depthTitle` | Depth over volume |
| `benefits.depthBody` | Fewer, better matches — built for compatibility, not swipe fatigue. |
| `benefits.signalsTitle` | Clear matching signals |
| `benefits.signalsBody` | Understand why someone surfaced — not a black-box “for you” feed. |
| `benefits.safetyTitle` | Safer conversations |
| `benefits.safetyBody` | Reporting and moderation tools keep chats grounded and respectful. |

### Closing CTA

| Key | Copy |
|-----|------|
| `closing.title` | Ready when you are |
| `closing.subtitle` | Sign in with Google to build your profile and see matches. |

### Footer

Keep `privacyLink` / `termsLink`. Language stays in header (not duplicated unless needed for a11y).

---

## Visual / illustration requirements

**Hero atmosphere (required):**

- Full-bleed layer behind content (`absolute inset-0`, content `relative z-10`)
- Abstract **connection / dialogue** motif (two soft silhouettes or linked paths) — SVG preferred, no emoji
- Palette: zinc-950 → zinc-100 wash (light) / zinc-950 base (dark); teal accent sparingly on paths
- Soft vignette so text stays WCAG AA on overlay; may use semi-opaque scrim behind text measure only (not floating badge chips)

**Do not:** stock face photos, purple nebula, glassmorphism stacks, floating stat stickers on the art.

**Optional later:** replace SVG with `public/landing/hero.webp` without changing layout contract.

---

## Component breakdown (Agent 1)

| Path | Role |
|------|------|
| `components/landing/public-landing-client.tsx` | Orchestrates auth/locale/referral; composes sections |
| `components/landing/landing-hero.tsx` | Brand, H1, subtitle, CTA slot, atmosphere |
| `components/landing/landing-trust-strip.tsx` | 3 honest trust phrases |
| `components/landing/landing-how-it-works.tsx` | 3 steps |
| `components/landing/landing-benefits.tsx` | 3 benefits |
| `components/landing/landing-closing-cta.tsx` | Repeat title + Google button slot |
| `components/landing/landing-footer.tsx` | Privacy · Terms |
| `components/landing/landing-atmosphere.tsx` | Full-bleed SVG/CSS visual (lazy-friendly) |
| `lib/i18n/{types,en,he,es}.ts` | Expand `landing` schema |
| `public-landing-client.spec.tsx` | Update for new copy / structure |

**CTA rendering:** Keep a single shared render helper or pass `GoogleSignInButton` as children into hero + closing so GIS is not double-initialized incorrectly — **one visible GIS button in hero**; closing section may use the same component instance pattern carefully (prefer one active GIS mount: hero only, closing = scroll-to-hero button **or** second GIS if GIS allows — lock: **closing uses `button` that `scrollIntoView` on hero CTA** if dual GIS is risky; else mount GIS only once in hero and closing is text link “Back to sign in”).

**Locked CTA rule:** Mount **GoogleSignInButton once** (hero). Closing CTA is a native button that scrolls to `#landing-sign-in`. Avoid two GIS widgets.

---

## Layout / CSS tokens (landing-local)

```css
/* conceptual — implement via Tailwind on landing root */
--landing-bg: zinc scale;
--landing-accent: teal-700 / teal-400 (dark);
--landing-measure: max-w-xl;
--landing-section-y: py-16 md:py-24;
```

- Section titles: `text-xl` / `text-2xl` semibold — **must not** overpower brand in hero  
- Brand in hero: largest type on page (e.g. `text-4xl md:text-5xl` tracking-tight)  
- H1: one step below brand  
- `dir` / `lang` remain on `<main>` as today  

---

## Acceptance criteria

- [x] Brand wordmark visible as hero-level signal above the fold  
- [x] Value-prop H1 + one support sentence above the fold  
- [x] Google CTA above the fold; auth/`next`/referral behavior unchanged  
- [x] Full-bleed atmosphere (not inset card media)  
- [x] Trust strip without fake metrics/testimonials  
- [x] How it works (3) + Benefits (3) below fold  
- [x] Closing path back to sign-in (scroll or single GIS)  
- [x] Mobile + desktop readable; dark mode parity  
- [x] i18n en/he/es for new strings  
- [x] Landing uses Geist (not Arial) for this page  
- [x] Specs updated / passing  
- [x] No purple glow / no hero overlay badges  

---

## Out of scope

- New auth providers  
- Real photo shoot / paid stock pipeline  
- Blog, pricing, App Store badges  
- Changing post-login destination  
- Marketing site split / CMS  

---

## Done

PM **ACCEPT** — see [agent-3-pm.md](./handoffs/STORY_06_landing_design/agent-3-pm.md).

Sprint 33 complete.

```
--agent 0 sprint 34 story 1
```
