# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_next_image.md](../../STORY_04_next_image.md)  
**Sprint:** sprint-29-frontend-realtime-cache  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Enable `next/image` correctly for product photos: configure `remotePatterns`, stop blanket-blind `unoptimized` where unsafe, keep cookie-auth API bytes on `<img>` / unoptimized. Skip Agent 4 if MatchPhoto unit specs cover relative vs CDN vs API-absolute. No API / storage changes.

---

## Summary

SCALE CR wants `images.remotePatterns` + drop `unoptimized`. Today product photos are **AuthGuard** Nest file routes (`GET /api/v1/me/matches/:id/photos/:photoId/file` and own-profile equivalents). Browser loads them with session cookies (same-origin `/api` proxy when `NEXT_PUBLIC_API_URL` unset). Next’s **image optimizer runs server-side without the user cookie** → optimizing those URLs breaks images (401). Sprint 20 CDN/signed URLs are not live. This story locks a **cookie-safe default** + **CDN-ready** path so we do not ship broken photos.

---

## Inventory (current)

| Surface | Component | Behavior |
|---------|-----------|----------|
| Match list / detail / celebration | [`MatchPhoto`](../../../../../dating-ui/src/components/match-photo.tsx) | Absolute `http(s)` → `next/image` + **`unoptimized`**; relative → raw `<img>` |
| Conversations list/detail | raw `<img>` + `conversationPhotoSrc` | Same-origin or absolute API |
| Nav Google avatar | `nav-auth` `<img>` | External Google — **out of scope** |
| Profile upload slots | `profile-photo-slot` `<img>` | Local/blob + API — **out of scope** |
| Admin photos | admin page `<img>` | **Out of scope** |

[`next.config.ts`](../../../../../dating-ui/next.config.ts): **no** `images` config yet.

Photo URL shape from API: relative paths like `/api/v1/me/matches/{profileId}/photos/{photoId}/file`.

---

## Decisions (do not reverse without discussion)

### 1. Cookie-auth API bytes stay non-optimized (locked)

| Src kind | Render | `unoptimized` |
|----------|--------|----------------|
| Relative (`/api/...`) | Native **`<img>`** (cookies) | n/a |
| Absolute URL whose host is **API** (`NEXT_PUBLIC_API_URL` host) or unknown | Prefer **`<img>`** or `next/image` + **`unoptimized: true`** | Required |
| Absolute URL whose host is on **CDN allowlist** | `next/image` | **`false`** (real optimization) |

**Do not** send AuthGuard photo file URLs through `/_next/image` optimizer. Document this as the intentional exception (AC #4).

Helper (Agent 1 name freely, e.g. `isPhotoCdnUrl` / `shouldOptimizePhotoSrc` in `lib/match-photo.ts`):

- Parse absolute URL hostname.
- Optimize iff hostname matches `NEXT_PUBLIC_PHOTO_CDN_HOSTS` (comma-separated, case-insensitive; support leading `*.` suffix match e.g. `*.cloudfront.net`).
- Empty/unset CDN env → **never** optimize (safe for current local/dev).

### 2. `images.remotePatterns` (locked)

Add to `next.config.ts` `images.remotePatterns` (and keep existing rewrites/Sentry wrapper):

1. If `NEXT_PUBLIC_API_URL` is a valid absolute URL → add its `{ protocol, hostname, port?, pathname: '/api/**' }` so absolute API Image srcs are allowed when used.  
2. For each host in `NEXT_PUBLIC_PHOTO_CDN_HOSTS` → `{ protocol: 'https', hostname }` (and `http` only if host is localhost).  
3. Optional build-time localhost patterns are **not** required when UI uses relative `/api` in the browser.

No custom `loader` this story.

### 3. MatchPhoto call-site behavior (locked)

Update [`match-photo.tsx`](../../../../../dating-ui/src/components/match-photo.tsx):

1. Keep skeleton / error → placeholder behavior.  
2. Branch on optimizable CDN vs not (per §1).  
3. When optimizing: set sensible **`sizes`** by variant:

| Variant | `sizes` (locked) |
|---------|------------------|
| `list` / `header` / `celebration` | `112px` |
| `hero` | `(max-width: 768px) 100vw, 800px` |

4. Keep `priority` / lazy as today.  
5. Width/height stay as today (list 112, hero 800×600) unless Agent 1 needs a tiny tweak for CLS.

### 4. Surfaces in scope (locked)

| In scope | Change |
|----------|--------|
| `MatchPhoto` + `match-photo` helper + specs | §1–3 |
| `next.config.ts` `images.remotePatterns` | §2 |
| `.env.example` | Document `NEXT_PUBLIC_PHOTO_CDN_HOSTS` (optional); note API photos stay cookie/`<img>` |

| Out of scope | Why |
|--------------|-----|
| Conversations raw `<img>` migration to MatchPhoto | Nice-to-have consistency; not required for SCALE AC this story (Agent 1 **may** switch list avatar to MatchPhoto if trivial — not required) |
| nav-auth Google avatar | Third-party; leave `<img>` |
| profile-photo-slot / admin | Different auth/UX |
| S3/CloudFront signed URL API | Sprint 20 apply / later |
| Changing AuthGuard on photo file routes | Security |

### 5. Tests (locked)

| Case | Expect |
|------|--------|
| Relative `/api/...` path | Renders **`<img>`** (not optimized Image) |
| Absolute API-like host (mock) | `<img>` or Image with `unoptimized` |
| Absolute CDN host (set env or inject helper) | `next/image` **without** forcing `unoptimized` |
| null / onError | Placeholder unchanged |

Smoke checklist in handoff (no Agent 4): local me-matches list + detail photo with session cookie still loads.

### 6. Agent 4

- **Skip** if §5 unit specs land.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/next.config.ts` | `images.remotePatterns` |
| `dating-ui/src/lib/match-photo.ts` (+spec if split) | CDN detect helper |
| `dating-ui/src/components/match-photo.tsx` (+spec) | Branch optimize vs cookie path; `sizes` |
| `dating-ui/.env.example` | `NEXT_PUBLIC_PHOTO_CDN_HOSTS` docs |

---

## Out of scope

- Public photo URLs / dropping AuthGuard  
- Full conversations/admin/nav migration  
- Image CDN infra  

---

## Agent 1 instructions

1. Implement §1–4; update MatchPhoto specs per §5.  
2. Do **not** remove `unoptimized` for API/cookie hosts.  
3. Commit; write `agent-1-dev.md` with exception table + smoke note.

Suggested commit message:

```
feat(ui): enable next/image optimization for product photos

Sprint 29 Story 4
```

---

## Agent 2 instructions

- [ ] remotePatterns covers API (when set) + CDN env hosts  
- [ ] Relative/API cookie photos not sent through optimizer  
- [ ] CDN allowlist path optimizes (no blanket unoptimized)  
- [ ] Specs cover relative / API / CDN branches  
- [ ] Exceptions documented  
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; sprint README → Story 5 Agent 0.  
- Write `agent-3-pm.md`.

---

## Open risks

1. Enabling optimizer on AuthGuard URLs → mass broken images — §1 prevents.  
2. Empty CDN env means **no** production optimization until CDN hosts configured — expected until Sprint 20 photo CDN live.  
3. Absolute `NEXT_PUBLIC_API_URL` cross-origin photos still need cookies/`SameSite` — existing concern; prefer same-origin relative in browser.
