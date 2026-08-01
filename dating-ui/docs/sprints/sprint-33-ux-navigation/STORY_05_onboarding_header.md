# Story 33.5 — Fixed Onboarding Progress Header (LOCKED)

**Sprint:** 33 — UX Navigation  
**Story:** 5 — Fixed onboarding progress header  
**Agent 0:** Architect / UX  
**Date:** 2026-08-01  
**Status:** Done (PM ACCEPT)  
**Skip Agent 4:** yes  
**Depends on:** Story 33.1/33.2 (nav shell exists — must be suppressed here)

---

## Goal

Users always see **where they are** in onboarding, with always-reachable **Exit** and **Skip for now**, without fighting the global AppNav chrome.

---

## Current baseline

| Fact | Detail |
|------|--------|
| Routes | `/onboarding` (resume), `/onboarding/basic`, `/onboarding/texts` |
| Backend steps | `BASIC` \| `TEXTS` \| `COMPLETED` — **no** `PHOTOS` |
| Photos UI | Embedded in `OnboardingBasicForm` via `ProfilePhotoSection` |
| Progress today | `OnboardingPageHeading` H1 (“Step 1 — …”) scrolls away |
| Leave today | Basic only: `Link` “Continue later” → `/dating/me-matches` |
| Shell | `(authenticated)/layout` → `AuthenticatedAppShell` always renders **AppNav** + mobile `pb-20` |
| i18n | `getCopy(locale).onboarding` (en/he/es) — **not** next-intl for forms |

---

## Locked design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Chrome | **Hide AppNav** when `pathname.startsWith('/onboarding')` | Mockup is a dedicated flow header; double chrome (top tabs + progress + bottom tabs) fails mobile |
| Mobile padding | When AppNav hidden, **do not** apply shell `pb-20` | Bottom tabs gone — reclaim space |
| Header position | **`fixed` top**, full width | Matches plan/AC; content offset via layout `main` padding |
| Z-index | Header **`z-40`**; exit dialog overlay **`z-50`** (or higher) | Above page; below nothing critical; dialog above header |
| Steps shown | **2 only: Basic → Texts** | Honest to routes + `MeProfileOnboardingStep`. **No Photos step** until a real `/onboarding/photos` route exists |
| Step source | Derive from `usePathname()` | `/onboarding/basic` → basic; `/onboarding/texts` → texts; index → no current / inactive |
| Exit (left) | Opens **confirm dialog** → leave destination | Prevents accidental leave |
| Skip (right) | **Immediate** navigate to leave destination (no dialog) | Same destination as Exit confirm; lower friction (“Skip for now”) |
| Leave destination (normal) | `/dating/me-matches` | Matches Story 33.4 defaults + today’s Continue later |
| Leave destination (`?edit=1`) | `/dating/profile` | Edit deep-links came from profile; don’t dump editors into Matches |
| Skip in edit mode | **Hide Skip** | Only Exit (with confirm) → profile |
| Auto-save on Exit/Skip | **No** | Existing Save progress / draft buttons remain; dialog copy must not promise unsaved data is saved |
| Index `/onboarding` | Layout wraps; header may show **inactive** stepper + Exit/Skip | Brief flash before client redirect is OK |
| Page headings | **Keep** `OnboardingPageHeading` | Stepper = location; H1/subtitle = task. Optional later copy trim of “Step N —” is **out of scope** |
| Remove from forms | **Remove** Continue later `Link` from `onboarding-basic-form.tsx` | Replaced by header Exit/Skip |
| Keep in forms | Save progress + primary CTAs + texts “Back to basics” | Still needed |
| Dialog UI | Lightweight custom dialog (same pattern as `report-user-dialog`: `role="dialog"`, backdrop, focusable actions) | No new dependency |
| i18n | Extend **`copy.onboarding`** in en / he / es + types | Match forms; do not introduce next-intl for this story |
| Dark mode | Full zinc parity | Same as AppNav / shell |
| Tap targets | ≥ 44px height for Exit / Skip / dialog buttons | AC mobile |

---

## ASCII mockup (locked)

### Normal flow — Basic

```
┌─────────────────────────────────────────────────────────────┐
│ [← Exit]      ●────────○         Skip for now               │  ← fixed z-40
│              Basic    Texts                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Step 1 — Basics                                           │
│   (form scrolls under header)                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Texts

```
│ [← Exit]      ●────────●         Skip for now               │
│              Basic    Texts                                 │
```

### Edit mode (`?edit=1`)

```
│ [← Exit]      ●────────○                                    │  ← no Skip
```

### Exit dialog

```
┌─────────────────────────────────────┐
│  Leave onboarding?                  │
│  Saved progress stays saved.        │
│  Unsaved changes may be lost.       │
│                                     │
│        [Cancel]    [Leave]          │
└─────────────────────────────────────┘
```

(Copy keys below — Agent 1 may tighten wording but must keep the unsaved caveat.)

---

## Stepper rules

```
steps = [
  { id: 'basic', labelKey: 'stepBasic', href: '/onboarding/basic' },
  { id: 'texts', labelKey: 'stepTexts', href: '/onboarding/texts' },
]

current:
  pathname.startsWith('/onboarding/texts') → 'texts'
  pathname.startsWith('/onboarding/basic') → 'basic'
  else → null (index / unknown)

filled:
  basic completed visually when current === 'texts' OR current === 'basic' (current always filled)
  For current 'basic': Basic filled, Texts empty
  For current 'texts': both filled
  For null: both empty (or both muted)

Interaction:
  - Labels are visual only for this story (optional: clicking a completed/previous step allowed via Link)
  - Locked: **allow** Link to `/onboarding/basic` from texts (matches existing “Back to basics”)
  - Locked: **do not** Link forward to texts from basic via stepper (must use form Continue — avoids skipping validation)
```

---

## Component / file plan

| Path | Action |
|------|--------|
| `app/(authenticated)/onboarding/layout.tsx` | **Create** — fixed header + `main` with top padding |
| `components/onboarding/onboarding-header.tsx` | **Create** — Exit / stepper / Skip; reads pathname + `edit` search param |
| `components/onboarding/onboarding-stepper.tsx` | **Create** — 2-step visual |
| `components/onboarding/exit-confirmation-dialog.tsx` | **Create** — confirm leave |
| `components/authenticated-app-shell.tsx` | **Update** — hide `AppNav` + `pb-20` on `/onboarding*` |
| `components/onboarding-basic-form.tsx` | **Update** — remove Continue later link |
| `lib/i18n/{types,en,he,es}.ts` | **Update** — header/dialog strings |
| Specs | Header/stepper/dialog (+ shell hide if easy) |

**Do not** put header inside each page — layout only.

---

## i18n keys (add under `copy.onboarding`)

| Key | EN intent |
|-----|-----------|
| `header.exit` | Exit |
| `header.skip` | Skip for now |
| `header.aria` | Onboarding progress |
| `stepBasic` | Basic |
| `stepTexts` | Texts / Story (match product voice; prefer short) |
| `exitDialog.title` | Leave onboarding? |
| `exitDialog.body` | Saved progress stays saved. Unsaved changes may be lost. |
| `exitDialog.cancel` | Cancel |
| `exitDialog.confirm` | Leave |

Reuse `common` cancel/confirm only if already identical — prefer dedicated keys for clarity.

---

## Out of scope

- Creating `/onboarding/photos` or changing `MeProfileOnboardingStep`
- Auto-saving drafts on Exit/Skip
- Hiding AppNav on `/settings/profile/*` edit routes
- Rewriting H1 copy to remove “Step N —”
- next-intl migration for onboarding
- Redesigning form fields / validation

---

## Acceptance criteria

- [x] Fixed progress header on `/onboarding/basic` and `/onboarding/texts`
- [x] AppNav (desktop + mobile bottom) **hidden** on `/onboarding*`
- [x] Current step highlighted (2-step: Basic / Texts)
- [x] Exit opens cancellable confirm dialog → leave destination
- [x] Skip for now visible in normal flow → leave destination without dialog
- [x] Skip hidden when `?edit=1`; Exit → `/dating/profile`
- [x] Header does not scroll away (incl. mobile)
- [x] Responsive ≥ 320px; tap targets usable
- [x] z-index: header above content, dialog above header
- [x] Dark mode parity
- [x] Continue later removed from basic form
- [x] i18n en/he/es for new strings
- [x] Unit tests for stepper current/filled + dialog open/cancel/confirm (and/or header)

---

## Done

PM **ACCEPT** — see [agent-3-pm.md](./handoffs/STORY_05_onboarding_header/agent-3-pm.md).

```
--agent 0 sprint 33 story 6
```
