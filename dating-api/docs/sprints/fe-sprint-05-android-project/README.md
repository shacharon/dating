# FE Sprint 05 — Android Project Setup

**Status:** In Progress (Stories 1–2 Done)  
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
- [x] APK builds with real app UI (Story 2 export + sync — API until Story 3)
- [x] `output: 'export'` in Next.js config (Story 2 — `CAPACITOR_BUILD=1` dual build)
- [ ] API base URL uses `NEXT_PUBLIC_API_URL` on mobile
- [ ] Viewport meta tag configured

---

## Stories

### Story 1 — Capacitor Init + Android Project ✅ Done
**Doc:** [`STORY_01_capacitor_android.md`](./STORY_01_capacitor_android.md)  
Fix: Capacitor config, placeholder webDir, `android/` project, `cap sync`

### Story 2 — Next.js Export Mode ✅ Done
**Doc:** [`STORY_02_next_export.md`](./STORY_02_next_export.md)  
Fix: `CAPACITOR_BUILD` dual build, static export to `out/`, `cap:sync:android` wired to real UI

### Story 3 — API URL for Mobile (4-6 hours)
Enforce `NEXT_PUBLIC_API_URL` for Capacitor, update `getApiBase()`

### Story 4 — Viewport + Mobile Polish (2 hours)
Add viewport metadata, test responsive layout

---

## SOLID/OOP/KISS Focus

- **KISS:** Simple config changes, no over-engineering
- **Clean Code:** Clear error messages if misconfigured
- **Mobile-First:** Ensure responsive design, touch-friendly interactions

---

Detailed story docs in folder.
