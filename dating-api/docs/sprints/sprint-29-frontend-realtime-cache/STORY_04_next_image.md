# Story 04 — next/image optimization

**Sprint 29 · Status: Dev complete → Agent 2 CR**  
**Priority:** P2  
**Estimated effort:** 0.5 day  
**Dependencies:** Know CDN / photo URL hosts in use

**Handoff:** [`handoffs/STORY_04_next_image/agent-0-architect.md`](./handoffs/STORY_04_next_image/agent-0-architect.md) · [`agent-1-dev.md`](./handoffs/STORY_04_next_image/agent-1-dev.md)

---

## Objective

Enable real Next.js image optimization for product photos (remotePatterns / loader) and remove blanket `unoptimized` where safe.

## Why

SCALE CR: images shipped unoptimized → larger payloads on match/profile surfaces.

## Scope / tasks

1. Inventory `next/image` + `unoptimized` usage. ✅
2. Architect locks: allowed remote host patterns; local/dev vs prod CDN; fallback if host unknown. ✅
3. Update `next.config` remotePatterns; flip locked call sites.
4. Specs or smoke checklist for broken-image regression.

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| AuthGuard `/api/.../photos/.../file` | Stay on `<img>` / `unoptimized` — optimizer has no session cookie |
| Optimize only | Hosts in `NEXT_PUBLIC_PHOTO_CDN_HOSTS` (comma / `*.` suffix) |
| remotePatterns | API host from `NEXT_PUBLIC_API_URL` (if set) + CDN hosts |
| Scope | `MatchPhoto` + config + `.env.example`; not nav/admin/profile-slot |
| CDN unset | No optimization in local/dev (safe) |

## Acceptance criteria

- [ ] remotePatterns (or locked loader) covers product photo URLs
- [ ] Locked surfaces no longer force `unoptimized` without reason
- [ ] No widespread broken images in local/dev with current storage
- [ ] Document any remaining unoptimized exceptions

## Commit message

```
feat(ui): enable next/image optimization for product photos

Sprint 29 Story 4
```
