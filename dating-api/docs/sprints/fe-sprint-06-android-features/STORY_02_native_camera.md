# Story 02 — Native Camera for Profile Photos

**Sprint:** FE-06  
**Effort:** ~6–8 hours  
**Risk:** 🟢 LOW–MEDIUM (Capacitor Camera plugin + File conversion)  
**Status:** Done  
**GO_LIVE:** Frontend #5  
**Depends on:** FE-05 Done; FE-06 Story 1 recommended stack base (`feature/fe-sprint-06-story-1`)

**Handoffs:** [preflight](./handoffs/STORY_02_native_camera/agent--1-preflight.md) · [architect](./handoffs/STORY_02_native_camera/agent-0-architect.md) · [dev](./handoffs/STORY_02_native_camera/agent-1-dev.md) · [CR](./handoffs/STORY_02_native_camera/agent-2-cr.md) · [security](./handoffs/STORY_02_native_camera/agent-2.5-security.md) · [PM](./handoffs/STORY_02_native_camera/agent-3-pm.md)

---

## Objective

Replace the WebView `<input type="file">` photo picker with **native camera + gallery** on Capacitor Android, while keeping the **web file input** unchanged.

**Deliverable:** `pick-profile-photo.ts` util + updated `ProfilePhotoSection` upload button; same `uploadMyProfilePhoto` API.

---

## Problem (before)

```text
profile-photo-section.tsx  → hidden <input type="file"> only
Capacitor WebView          → poor camera/gallery UX
me-photos-api              → multipart upload OK (no change needed)
AndroidManifest            → INTERNET only; FileProvider already present
```

---

## Solution

- **`@capacitor/camera@7.0.5`** — Capacitor 7 aligned
- **`pick-profile-photo.ts`** — Capacitor-only `Camera.getPhoto` → `File`; web returns `null` (use file input)
- **`ProfilePhotoSection`** — Capacitor: button triggers native pick; web: existing label + file input
- **Shared upload helper** — `uploadPickedFile(file)` extracted from `onPickFile`
- **i18n** — `cameraPermissionDenied` under `profilePhotos` (en/he/es)
- **`cap sync android`** — Camera plugin registered (3 plugins: camera, preferences, push)

---

## Out of scope (Story 2)

- Backend / moderation API changes
- iOS / `@capacitor/ios`
- Separate camera-only vs gallery-only buttons (use system Prompt)
- Image cropping UI (`allowEditing: false`)
- HEIC conversion pipeline (reject unsupported formats)
- On-device photo compression beyond Capacitor `quality`
- Story 3 offline handling

---

## Success criteria

- [x] `@capacitor/camera` installed; `cap sync android` succeeds
- [x] Capacitor upload button opens native Prompt (camera + gallery)
- [x] Picked photo uploads via existing `uploadMyProfilePhoto`
- [x] Web upload unchanged (file input)
- [x] Permission denied → user-visible error (no crash)
- [x] User cancel → silent (no error)
- [x] `pick-profile-photo.spec.ts` + updated section tests green (24 story-scoped)
- [x] Full Vitest green; Agent 2 CR + Agent 2.5 approved

---

## How to verify

```bash
cd dating-ui
git checkout feature/fe-sprint-06-story-2
npm test -- src/lib/pick-profile-photo.spec.ts src/components/profile-photo-section.spec.tsx
npm test
npm run build
npm run build:capacitor
npm run cap:sync:android
npm run cap:open:android
```

Profile or onboarding → Upload → choose camera or gallery → photo appears after moderation queue.

---

## Files changed

**New:**
- `src/lib/pick-profile-photo.ts` + spec (14 tests incl. security invariants)
- `src/components/profile-photo-section.spec.tsx` — Capacitor branch + static security tests

**Modified:**
- `src/components/profile-photo-section.tsx` — `uploadPickedFile`, Capacitor button vs web label
- `src/lib/i18n/{en,he,es,types}.ts` — `cameraPermissionDenied`
- `package.json` / `package-lock.json` — `@capacitor/camera@^7`
- `android/*` — cap sync (Camera plugin)

**Not changed:** `me-photos-api.ts`, backend, export pipeline.

---

## Known limitations

- Physical device/emulator camera pick QA deferred to Agent 3.5
- HEIC / exotic formats rejected client-side
- No in-plugin crop (`allowEditing: false`)
- Backend / FE-05 not on `main` — branch-stack workflow

---

## Branch

`feature/fe-sprint-06-story-2` from `feature/fe-sprint-06-story-1` (`007cf6e`) — ready for PR/merge; stack Story 3 from tip
