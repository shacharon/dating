# Story 02 — Next.js Export Mode

**Sprint:** FE-05  
**Effort:** ~8–12 hours  
**Risk:** 🟡 MEDIUM (dual build + static export constraints)  
**Status:** Done  
**GO_LIVE:** Frontend #2  
**Depends on:** Story 1 Done (`feature/fe-sprint-05-story-1`)

**Handoffs:** [preflight](./handoffs/STORY_02_next_export/agent--1-preflight.md) · [architect](./handoffs/STORY_02_next_export/agent-0-architect.md) · [dev](./handoffs/STORY_02_next_export/agent-1-dev.md) · [CR](./handoffs/STORY_02_next_export/agent-2-cr.md) · [PM](./handoffs/STORY_02_next_export/agent-3-pm.md)

---

## Objective

Produce a **real Next.js static export** in `out/` for Capacitor sync, while keeping **Docker standalone** web production unchanged.

**Deliverable:** `CAPACITOR_BUILD=1` export pipeline, static-compat layout/metadata, dynamic route shells, `cap:sync:android` wired to export.

---

## Problem (before)

```text
next.config.ts              → output: "standalone" only
cap:sync:android            → placeholder HTML in out/
next build                  → fails (stray next-intl import)
WebView                     → "Story 2 export pending" placeholder
```

---

## Solution

- **`CAPACITOR_BUILD=1`** dual build in `next.config.ts` → `output: 'export'`, no rewrites, `images.unoptimized`
- **`src/lib/capacitor-build.ts`** — build-time env helper
- **Locale/metadata** — `DEFAULT_LOCALE` when Capacitor build; `LocaleDocumentSync` on client
- **Dynamic routes** — server `page.tsx` + `generateStaticParams` stub + existing client UI
- **Remove `force-dynamic`** on public landing + dev auth-test
- **Fix `next-intl`** → `useAppLocale` in onboarding index client
- **`build:capacitor`** + **`post-cap-export.mjs`** (404 SPA fallback) + updated **`cap:sync:android`**

---

## Out of scope (Story 2)

- `getApiBase()` / native API URL (Story 3)
- Viewport meta polish (Story 4)
- Full cold deep-link to arbitrary UUID paths
- iOS / `@capacitor/ios`
- Middleware changes (web-only; native uses `AuthenticatedAppShell`)

---

## Success criteria

- [x] `npm run build` → standalone (Docker path unchanged)
- [x] `npm run build:capacitor` → `out/index.html` with real app UI
- [x] Dynamic route shells exported (stub param `__export__`)
- [x] `npm run cap:sync:android` exit 0
- [x] No `next-intl` dependency / import
- [x] Unit tests for capacitor-build + config gate + export routes
- [x] Agent 2 CR approved

---

## How to run

```bash
cd dating-ui
npm run build:capacitor      # produces out/
npm run cap:sync:android     # export + sync to android/
npm run cap:open:android     # Android Studio
```

Default web prod build (unchanged):

```bash
npm run build
```

---

## Files changed

**New:**
- `src/lib/capacitor-build.ts` + spec
- `next.config.export.spec.ts`
- `scripts/post-cap-export.mjs` + spec
- `src/app/capacitor-export-routes.spec.ts`
- `conversation-detail-page-client.tsx`, `me-match-detail-page-client.tsx`, `match-quality-profile-page-client.tsx`

**Modified:**
- `next.config.ts`, `package.json`, `layout.tsx`, `page-metadata.ts`
- `(public)/page.tsx`, `dev/auth-test/page.tsx`, `onboarding-index-client.tsx`
- 3× dynamic route `page.tsx` (server shell + `generateStaticParams`)
- `[id]/page.spec.tsx` imports → client modules

**Unchanged:** `api-base.ts`, `middleware.ts`, `Dockerfile`, `capacitor.config.ts`

---

## Known limitations

- API calls from WebView fail until Story 3 sets `NEXT_PUBLIC_API_URL`
- Cold deep-link to unknown dynamic IDs may 404 (`404.html` shell mitigates partially)
- Cookie-based locale SSR not available on static export (client sync only)
- Run `build` OR `build:capacitor` separately — each overwrites `.next/`

---

## Branch

`feature/fe-sprint-05-story-2` from `feature/fe-sprint-05-story-1` (`20fbb23`) — ready for PR/merge; stack Story 3 from tip
