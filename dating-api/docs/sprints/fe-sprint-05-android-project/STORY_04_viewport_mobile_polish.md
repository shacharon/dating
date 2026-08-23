# Story 04 — Viewport + Mobile Polish

**Sprint:** FE-05  
**Effort:** ~2 hours  
**Risk:** 🟢 LOW (layout meta + CSS insets)  
**Status:** Done  
**GO_LIVE:** Frontend #4  
**Depends on:** Story 3 Done (`feature/fe-sprint-05-story-3`)

**Handoffs:** [preflight](./handoffs/STORY_04_viewport_mobile_polish/agent--1-preflight.md) · [architect](./handoffs/STORY_04_viewport_mobile_polish/agent-0-architect.md) · [dev](./handoffs/STORY_04_viewport_mobile_polish/agent-1-dev.md) · [CR](./handoffs/STORY_04_viewport_mobile_polish/agent-2-cr.md) · [PM](./handoffs/STORY_04_viewport_mobile_polish/agent-3-pm.md)

---

## Objective

Add proper **mobile viewport metadata** to the Next.js root layout (included in Capacitor static export) and apply **minimal safe-area polish** so notched Android WebViews render correctly.

**Deliverable:** Typed `viewport` export + top/bottom safe-area insets for mobile chrome.

---

## Problem (before)

```text
layout.tsx                    → metadata only; no viewport export
Capacitor out/index.html      → missing width=device-width meta (Story 2 export)
WebView                       → desktop-ish scaling / notch overlap on header
app-nav-mobile bottom nav     → safe-area bottom OK
app-nav-mobile header         → no safe-area top
authenticated-app-shell       → pb-20 only; ignores home-indicator inset
```

---

## Solution

- **`src/lib/app-viewport.ts`** — single source of truth for Next `Viewport` config; re-exported from root layout
- **`export const viewport`** — `width: 'device-width'`, `initialScale: 1`, `viewportFit: 'cover'`; **no zoom lock** (a11y)
- **`app-nav-mobile.tsx`** — `pt-[env(safe-area-inset-top)]` on sticky mobile header
- **`authenticated-app-shell.tsx`** — `MOBILE_NAV_CONTENT_PAD` calc when bottom nav visible
- **`app-viewport.spec.ts`** — Vitest asserts viewport config values

---

## Out of scope (Story 4)

- `themeColor` / Android status bar styling / Capacitor StatusBar plugin
- Full responsive layout audit across all pages
- iOS platform / `@capacitor/ios`
- Changes to `capacitor.config.ts`, `next.config.ts`, export pipeline
- Emulator E2E (Agent 3.5 after Story 4)

---

## Success criteria

- [x] Root layout re-exports typed viewport config
- [x] Viewport allows pinch-zoom (no `maximumScale: 1` / `userScalable: false`)
- [x] `viewportFit: 'cover'` set for safe-area env vars
- [x] Mobile header respects top safe-area inset
- [x] Authenticated content padding accounts for bottom nav + home indicator
- [x] `app-viewport.spec.ts` green
- [x] Full Vitest green; Agent 2 CR approved

---

## How to verify

```bash
cd dating-ui
npm test -- src/lib/app-viewport.spec.ts
npm test
npm run build
npm run build:capacitor
Select-String -Path out/index.html -Pattern 'viewport'
```

**Manual (Agent 3.5):**

- Chrome DevTools → 375×812 — landing + signed-in tabs; no horizontal scroll on shell routes
- Android emulator after `cap:sync:android` — header clears status bar; bottom nav clears home indicator

---

## Files changed

**New:**
- `src/lib/app-viewport.ts`
- `src/lib/app-viewport.spec.ts`

**Modified:**
- `src/app/layout.tsx` — re-export viewport
- `src/components/nav/app-nav-mobile.tsx` — top safe-area on header
- `src/components/authenticated-app-shell.tsx` — bottom content inset calc

**Unchanged:** `capacitor.config.ts`, `next.config.ts`, `globals.css`

---

## Known limitations

- Public landing has no app nav — top safe-area only on authenticated mobile chrome
- `themeColor` / status bar styling deferred
- Physical device QA — Agent 3.5 after sprint close

---

## Branch

`feature/fe-sprint-05-story-4` from `feature/fe-sprint-05-story-3` (`5cc7742`) — ready for PR/merge
