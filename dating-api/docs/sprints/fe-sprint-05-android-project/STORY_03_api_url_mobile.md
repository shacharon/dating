# Story 03 — API URL for Mobile

**Sprint:** FE-05  
**Effort:** ~4–6 hours  
**Risk:** 🟢 LOW (focused `api-base` change)  
**Status:** Done  
**GO_LIVE:** Frontend #3  
**Depends on:** Story 2 Done (`feature/fe-sprint-05-story-2`)

**Handoffs:** [preflight](./handoffs/STORY_03_api_url_mobile/agent--1-preflight.md) · [architect](./handoffs/STORY_03_api_url_mobile/agent-0-architect.md) · [dev](./handoffs/STORY_03_api_url_mobile/agent-1-dev.md) · [CR](./handoffs/STORY_03_api_url_mobile/agent-2-cr.md) · [PM](./handoffs/STORY_03_api_url_mobile/agent-3-pm.md)

---

## Objective

Make Capacitor/React Native builds **require** `NEXT_PUBLIC_API_URL` while keeping web same-origin `/api` behavior unchanged.

**Deliverable:** `resolvePublicApiOrigin()` + `MobileApiUrlMissingError`; socket origin aligned on mobile.

---

## Problem (before)

```text
getApiBase() browser + unset env     → ''  → https://localhost/api/... (broken)
getMessagingSocketOrigin() mobile    → https://localhost:3001 (wrong)
Story 2 export                       → no Next /api rewrite
```

---

## Solution

- **`MobileApiUrlMissingError`** when `isMobile()` and env unset
- **`resolvePublicApiOrigin()`** — shared REST + socket origin
- **`getApiBase()`** — mobile browser uses resolver; web → `''`; SSR unchanged
- **`getMessagingSocketOrigin()`** — mobile uses resolver; web keeps hostname:port dev fallback
- **`.env.example`** — Capacitor / `build:capacitor` documentation

---

## Out of scope (Story 3)

- `capacitor.config.ts` / `server.url`
- dating-api CORS code changes (ops doc for prod)
- Viewport polish (Story 4)
- Runtime API URL change without rebuild

---

## Success criteria

- [x] Mobile + unset env → throw from `getApiBase()` / socket origin
- [x] Web + unset env → `getApiBase()` returns `''`
- [x] Explicit env → used by REST and socket
- [x] `api-base.spec.ts` + extended `messaging-socket.spec.ts`
- [x] `.env.example` updated
- [x] Full Vitest green; Agent 2 CR approved

---

## How to run (native dev)

```bash
cd dating-ui
# Android emulator → host API at 10.0.2.2
cross-env NEXT_PUBLIC_API_URL=http://10.0.2.2:3001 npm run build:capacitor
npm run cap:sync:android
npm run cap:open:android
```

Ensure `dating-api` listens on `0.0.0.0:3001`.

---

## Files changed

**New:**
- `src/lib/api-base.spec.ts` — 9 tests

**Modified:**
- `src/lib/api-base.ts` — `MobileApiUrlMissingError`, `resolvePublicApiOrigin()`, mobile gate
- `src/lib/messaging-socket.ts` — mobile socket origin via resolver
- `src/lib/messaging-socket.spec.ts` — mobile throw + explicit URL + web fallback tests
- `.env.example` — Capacitor / `build:capacitor` section

**Unchanged:** `capacitor.config.ts`, `next.config.ts`, `platform.ts`, middleware

---

## Build-time reminder

`NEXT_PUBLIC_API_URL` is **inlined at build** — changing `.env.local` after export does not update an installed APK without rebuild.

---

## Branch

`feature/fe-sprint-05-story-3` from `feature/fe-sprint-05-story-2` (`41c3950`) — ready for PR/merge; stack Story 4 from tip
