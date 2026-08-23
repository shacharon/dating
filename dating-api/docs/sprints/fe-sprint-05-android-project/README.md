# FE Sprint 05 — Android Project Setup

**Status:** ✅ Done (Stories 1–4)  
**Priority:** 🔴 **P0 BLOCKER** — Cannot build Android app without this  
**Depends on:** None (independent)  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Repo:** `dating-ui` (frontend)

---

## Goal

Setup Android project infrastructure so app can build and run:
1. Capacitor init + Android project
2. Next.js export mode (static HTML)
3. API URL configuration for mobile
4. Viewport configuration

---

## Success Criteria

- [x] `android/` directory exists (Story 1 — scaffold)
- [x] APK builds with real app UI (Story 2 export + sync)
- [x] `output: 'export'` in Next.js config (Story 2 — `CAPACITOR_BUILD=1` dual build)
- [x] API base URL uses `NEXT_PUBLIC_API_URL` on mobile (Story 3 — fail-fast + resolver)
- [x] Viewport meta tag configured (Story 4 — `app-viewport.ts` + safe-area polish)

---

## Stories

### Story 1 — Capacitor Init + Android Project ✅ Done
**Doc:** [`STORY_01_capacitor_android.md`](./STORY_01_capacitor_android.md)  
Fix: Capacitor config, placeholder webDir, `android/` project, `cap sync`

### Story 2 — Next.js Export Mode ✅ Done
**Doc:** [`STORY_02_next_export.md`](./STORY_02_next_export.md)  
Fix: `CAPACITOR_BUILD` dual build, static export to `out/`, `cap:sync:android` wired to real UI

### Story 3 — API URL for Mobile ✅ Done
**Doc:** [`STORY_03_api_url_mobile.md`](./STORY_03_api_url_mobile.md)  
Fix: `resolvePublicApiOrigin()`, mobile fail-fast, socket alignment, `.env.example`

### Story 4 — Viewport + Mobile Polish ✅ Done
**Doc:** [`STORY_04_viewport_mobile_polish.md`](./STORY_04_viewport_mobile_polish.md)  
Fix: typed viewport export, safe-area top/bottom insets for mobile chrome

---

## SOLID/OOP/KISS Focus

- **KISS:** Simple config changes, no over-engineering
- **Clean Code:** Clear error messages if misconfigured
- **Mobile-First:** Ensure responsive design, touch-friendly interactions

---

## Post-sprint

- **Agent 3.5:** Emulator smoke — `NEXT_PUBLIC_API_URL=http://10.0.2.2:3001`, `build:capacitor`, `cap:sync:android`, sign-in flow
- **Merge:** `feature/fe-sprint-05-story-4` → `main` (or stacked PRs per story)

Detailed story docs in folder.
