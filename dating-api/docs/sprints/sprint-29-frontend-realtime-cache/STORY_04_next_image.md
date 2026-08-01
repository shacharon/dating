# Story 04 — next/image optimization

**Sprint 29 · Status: PLANNED**  
**Priority:** P2  
**Estimated effort:** 0.5 day  
**Dependencies:** Know CDN / photo URL hosts in use

---

## Objective

Enable real Next.js image optimization for product photos (remotePatterns / loader) and remove blanket `unoptimized` where safe.

## Why

SCALE CR: images shipped unoptimized → larger payloads on match/profile surfaces.

## Scope / tasks

1. Inventory `next/image` + `unoptimized` usage.
2. Architect locks: allowed remote host patterns; local/dev vs prod CDN; fallback if host unknown.
3. Update `next.config` remotePatterns; flip locked call sites.
4. Specs or smoke checklist for broken-image regression.

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
