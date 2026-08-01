# Story 33.1 — Global Navigation Design (LOCKED)

**Sprint:** 33 — UX Navigation  
**Story:** 1 — Design Global Navigation Shell  
**Agent 0:** Architect / UX  
**Date:** 2026-08-01  
**Status:** Done (Agent 3 ACCEPT)  
**Blocks:** Story 33.2

---

## Current state (baseline)

`AuthenticatedAppShell` already renders a **top text link bar**:

| Link | Route |
|------|-------|
| Home | `/dating` |
| Matches | `/dating/me-matches` |
| Conversations (+ unread pill) | `/dating/conversations` |
| Profile | `/dating/profile` |
| Analysis | `/dating/analysis` |

**Gaps this design fixes:**

- No mobile bottom tabs (links wrap / hard to thumb)
- No icons / weak active affordance (underline only)
- Home is a low-value hub (Story 33.4 will kill `/dating` hub)
- Analysis as primary nav is premature (Sprint 35 folds into Profile)
- No sticky/fixed thumb zone on mobile
- No reserved slot for “new matches” badge

---

## Locked design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Desktop layout | **Sticky top horizontal bar** | Keeps existing shell; low risk; familiar desktop dating UX |
| Mobile layout | **Fixed bottom tab bar** | Thumb reach; Instagram/Bumble pattern; primary 3 destinations |
| Tablet (768–1024) | **Same as desktop top bar** | Avoid sidebar complexity this sprint |
| Primary destinations | **Matches · Conversations · Profile** | Core product loop only |
| Home (`/dating`) | **Remove from primary nav** | Story 33.4 redirects hub → matches |
| Analysis | **Not primary** — link under Profile / account overflow | Sprint 35 consolidates into Profile tab |
| Settings / account | **Keep in top-right `NavAuth`** (desktop + mobile top strip) | Already exists; don’t duplicate in bottom tabs |
| Icon style | **Outline default · filled when active** | Clear active state without purple/glow |
| Badge style | **Circular pill** (existing emerald style) · max `99+` | Already shipped for conversations |
| Nav chrome | **Sticky top** (desktop) · **Fixed bottom** (mobile `< md`) | Always reachable |
| Logo / brand | **Desktop:** small text left of tabs · **Mobile bottom:** no logo | Preserve brand without crowding thumb bar |
| Dark mode | Full parity | Match zinc shell tokens already in use |
| Breakpoint | `md` = **768px** | Tailwind default; bottom tabs only below |

---

## Navigation structure

### Primary (always visible)

| ID | Label (i18n `copy.nav.*`) | Href | Badge |
|----|---------------------------|------|-------|
| `matches` | Matches | `/dating/me-matches` | Optional `newMatchCount` (show if > 0) |
| `conversations` | Conversations | `/dating/conversations` | `totalUnread` (existing context) |
| `profile` | Profile | `/dating/profile` | none |

### Secondary (not bottom tabs)

| Item | Where |
|------|-------|
| Analysis | Profile overflow / link on profile page (Agent 1: keep accessible via existing profile page links; remove from primary nav) |
| Account / Logout / Language | Existing `NavAuth` in **top strip** |
| Settings routes | Unchanged (`/settings/*`) — reachable from account menu / profile |

### Active route rules

```
matchesActive        = pathname.startsWith('/dating/me-matches')
                       || pathname.startsWith('/dating/matches')  // legacy until Story 33.4
conversationsActive  = pathname.startsWith('/dating/conversations')
profileActive        = pathname === '/dating/profile'
                       || pathname.startsWith('/settings/profile')
                       || pathname.startsWith('/profile')
```

Do **not** highlight Matches when on `/dating` hub (hub dies in Story 33.4).

---

## Mockups (ASCII)

### Desktop ≥ 768px — light

```
┌──────────────────────────────────────────────────────────────────────┐
│ Brand     [♡ Matches]  [💬 Conversations (3)]  [👤 Profile]   NavAuth │  ← sticky top
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                         PAGE CONTENT                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Desktop — active Matches

```
│ Brand     [♥ Matches]  [💬 Conversations]  [👤 Profile]        NavAuth │
              ↑ filled icon + semibold + bottom border (2px zinc-900)
```

### Desktop — Conversations with badge

```
│ …  [💬 Conversations  ❸]  … │
                    ↑ pill: bg-emerald-600 text-white text-xs min-w 1.25rem
```

### Mobile < 768px — light

```
┌─────────────────────────────────────┐
│ Brand (optional)           NavAuth  │  ← thin sticky top (account only)
├─────────────────────────────────────┤
│                                     │
│           PAGE CONTENT              │
│           (padding-bottom ~4.5rem)  │
│                                     │
├─────────────────────────────────────┤
│  ♡ Matches │ 💬 Chats ❸ │ 👤 Profile │  ← fixed bottom tab bar
└─────────────────────────────────────┘
```

### Mobile — dark

```
Top + bottom: bg-zinc-950 border-zinc-800
Inactive icon/label: text-zinc-400
Active: text-zinc-100 + filled icon
Badge: emerald-500 (same as today)
```

### States matrix

| State | Icon | Label | Extra |
|-------|------|-------|-------|
| Default | outline | zinc-600/400 | — |
| Hover (desktop) | outline | zinc-900/100 | cursor pointer |
| Active | filled | semibold + indicator | `aria-current="page"` |
| Badge | — | — | pill only if count > 0 |
| Pending nav | — | opacity-60 cursor-wait | keep existing `navPending` |

---

## Component specification (for Agent 1)

### File plan

```
dating-ui/src/components/nav/
  app-nav.tsx              // picks desktop vs mobile by breakpoint
  app-nav-desktop.tsx      // sticky top primary + brand
  app-nav-mobile.tsx       // fixed bottom tabs + safe-area
  nav-item.tsx             // icon + label + badge + active
dating-ui/src/components/authenticated-app-shell.tsx
  // replace DatingMainNav with <AppNav />
  // keep auth gating / MessagingShellProvider / NavAuth top strip on mobile
```

### Props

```ts
type AppNavProps = {
  pathname: string;
  locale: AppLocale;
  copy: AppCopySchema;
  navPending: boolean;
  onNavClick: () => void;
  totalUnread: number;       // from useConversationUnread
  newMatchCount?: number;    // optional; default 0 until API exists
};
```

### Badge rules

- Show only when `count > 0`
- Display `count > 99 ? '99+' : String(count)`
- Conversations: existing `data-testid="nav-conversations-unread"`
- Matches (new): `data-testid="nav-matches-new"` (hidden until count > 0)
- ARIA: use existing `copy.nav.conversationsUnreadLabel`; add `matchesNewLabel` for new-match badge

### Accessibility

- `<nav aria-label="Main">` (desktop) and `<nav aria-label="Primary">` (mobile bottom) — or one label via i18n
- Each link: `aria-current="page"` when active
- Badge has `aria-label` with count (not color-only)
- Focus ring: existing `focus-visible:ring-2`
- Bottom bar: `pb-safe` / `env(safe-area-inset-bottom)` for notched phones
- Main content: add `pb-20` (or equivalent) on mobile so content isn’t hidden behind tabs
- Keyboard: Tab order = brand → primary links → NavAuth (desktop); bottom tabs still in tab order

### Responsive behavior

```ts
// Prefer CSS, not JS, when possible:
// Desktop nav: hidden md:flex (or block)
// Mobile bottom: flex md:hidden
```

### Visual tokens (no new brand colors)

- Active indicator desktop: `border-b-2 border-zinc-900 dark:border-zinc-100`
- Bottom active: filled icon + `text-zinc-900 dark:text-zinc-100`
- Borders: `border-zinc-200 dark:border-zinc-800`
- Backgrounds: `bg-white dark:bg-zinc-950`
- Badge: keep emerald (already in product)

### Icons

Inline SVG (lucide-style or hand-rolled), **not** emoji:

| Item | Outline | Filled (active) |
|------|---------|-----------------|
| Matches | heart outline | heart filled |
| Conversations | chat bubble outline | chat bubble filled |
| Profile | user outline | user filled |

---

## Out of scope (this story / Agent 1)

- Implementing Story 33.4 redirects (only remove Home from nav)
- Unified Profile tabs (Sprint 35)
- Real `newMatchCount` API (wire prop as `0` / optional)
- Sidebar layout
- Hamburger menu
- Changing unread WebSocket behavior

---

## Acceptance criteria (design → implementation)

- [x] Desktop sticky top: Matches, Conversations, Profile + brand + NavAuth
- [x] Mobile fixed bottom: same 3 tabs with icons
- [x] Mobile top strip: NavAuth only (account)
- [x] Active + badge + dark mode match mocks above
- [x] Home and Analysis removed from primary nav
- [x] Content padded above bottom tabs on mobile
- [x] Existing unread badge behavior preserved
- [x] No layout shift when badge appears (min-width on pill)

---

## Agent 1 next command

```
--agent 1 sprint 33 story 1
```

Implement against this doc. Do not reopen layout decisions without discussion.
