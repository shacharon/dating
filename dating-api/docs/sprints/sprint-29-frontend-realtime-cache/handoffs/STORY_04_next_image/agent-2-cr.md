# Handoff: Agent 2 — CR — Story 4

**Agent:** 2 CR  
**Story:** [STORY_04_next_image.md](../../STORY_04_next_image.md)  
**Sprint:** sprint-29-frontend-realtime-cache  
**Date:** 2026-08-01  
**Status:** complete  
**Verdict:** **PASS**  
**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)

---

## Summary

Reviewed next/image wiring against architect locks. `remotePatterns` covers API (when set) + CDN env hosts; `MatchPhoto` optimizes only CDN allowlisted absolute URLs; relative/API cookie photos stay on native `<img>`; exceptions documented in Dev handoff + `.env.example`. Specs cover relative / API / CDN branches. Skip Agent 4.

---

## Architect lock checklist

| Item | Result |
|------|--------|
| remotePatterns covers API (when set) + CDN env hosts | **Pass** |
| Relative/API cookie photos not sent through optimizer | **Pass** |
| CDN allowlist path optimizes (no blanket unoptimized) | **Pass** |
| Specs cover relative / API / CDN branches | **Pass** |
| Exceptions documented | **Pass** |

---

## Findings

### Fixed in this CR

| Severity | Finding | Fix |
|----------|---------|-----|
| Low | If API host were mislisted in `NEXT_PUBLIC_PHOTO_CDN_HOSTS`, AuthGuard `/api/.../photos/` URLs could be optimized (broken images — no session on optimizer) | `shouldOptimizePhotoSrc` returns false when pathname includes `/api/` and `/photos/`; spec added |

### Accepted / non-blocking

| Severity | Finding | Disposition |
|----------|---------|-------------|
| Info | Empty CDN env → no optimization | Expected until photo CDN configured |
| Info | Scope limited to MatchPhoto | Per architect; nav/admin/conversations not migrated |

### Required fixes for PASS

**None remaining.**

---

## Agent 4

**Skip** (architect + CR agree).

---

## Verification re-run

- Vitest match-photo + image-remote-patterns + MatchPhoto — **15 passed**

---

## Agent 3 note

Safe to **accept** Story 4 as Done. Impl: `57c3d81`; CR harden in follow-up with this handoff. Next: Story 5 Agent 0.
