# FE Sprint 06 — Android Features

**Status:** In Progress (Stories 1–2 Done)  
**Priority:** 🟡 **P1** — Native mobile capabilities  
**Depends on:** FE-05 Done + Sprint 67 Story 1 (FCM backend) — on feature branches until merged to `main`  
**Repo:** `dating-ui` (frontend)

---

## Goal

Ship native Android capabilities on the Capacitor shell:

1. Push notifications (FCM token registration + tap routing)
2. Native camera for profile photos
3. Offline handling / retry UX

---

## Success Criteria

- [x] FCM device token registered with backend after Capacitor login (Story 1 — code path)
- [x] Notification tap opens correct in-app route (Story 1 — routing)
- [x] Native camera available for photo upload on Android (Story 2 — code path)
- [ ] Offline indicator + sensible query retry behavior

---

## Stories

### Story 1 — Push Notifications Frontend ✅ Done
**Doc:** [`STORY_01_push_notifications.md`](./STORY_01_push_notifications.md)  
Fix: `@capacitor/push-notifications`, register/unregister `/api/v1/me/devices`, tap routing

### Story 2 — Native Camera ✅ Done
**Doc:** [`STORY_02_native_camera.md`](./STORY_02_native_camera.md)  
Fix: `@capacitor/camera`, `pick-profile-photo.ts`, Capacitor upload button + web file input fallback

### Story 3 — Offline Handling (TBD)
Network detection, retry, offline banner

---

## Integration notes

- **Stack branches:** `feature/fe-sprint-06-story-*` from `feature/fe-sprint-05-story-4`
- **API:** run `dating-api` from `feature/sprint-67-story-1` until merged to `main`
- **Firebase:** `android/app/google-services.json` required for real FCM (gitignored; ops-provided)
- **Agent 3.5:** Device push receive + camera/gallery pick smoke after ops Firebase config

Detailed story docs in folder.
