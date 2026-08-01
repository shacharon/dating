# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_next_image.md](../../STORY_04_next_image.md)  
**Sprint:** sprint-29-frontend-realtime-cache  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Configured `images.remotePatterns` (API host + CDN allowlist). `MatchPhoto` optimizes **only** CDN allowlisted absolute URLs; relative/API cookie photo URLs stay on native `<img>` (optimizer has no session). Agent 4 skipped.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| AuthGuard `/api/.../file` not optimized | Pass (`<img>`) |
| Optimize only `NEXT_PUBLIC_PHOTO_CDN_HOSTS` | Pass |
| remotePatterns API + CDN | Pass |
| MatchPhoto `sizes` by variant | Pass |
| Specs relative / API / CDN | Pass |

---

## Exceptions (intentional)

| Src | Why not optimized |
|-----|-------------------|
| Relative `/api/.../photos/.../file` | Session cookie; Next optimizer is server-side without cookie |
| Absolute API host (`NEXT_PUBLIC_API_URL`) | Same AuthGuard bytes |
| Unknown absolute hosts | Not on CDN allowlist |

When `NEXT_PUBLIC_PHOTO_CDN_HOSTS` is unset (local/dev default), **no** product photos are optimized — expected until CDN is configured.

---

## Smoke (manual)

1. Sign in → `/dating/me-matches` list tiles load with session.  
2. Open match detail hero photo.  
3. (Optional) Set CDN env + absolute CDN URL fixture → next/image path.

---

## Changes

| Path | Change |
|------|--------|
| `next.config.ts` | `images.remotePatterns` via helper |
| `lib/image-remote-patterns.ts` (+spec) | Pattern builder |
| `lib/match-photo.ts` (+spec) | `shouldOptimizePhotoSrc` |
| `components/match-photo.tsx` (+spec) | CDN Image vs cookie `<img>` |
| `.env.example` | `NEXT_PUBLIC_PHOTO_CDN_HOSTS` docs |

---

## Verification

- `npx vitest run` match-photo + image-remote-patterns — 14 passed
