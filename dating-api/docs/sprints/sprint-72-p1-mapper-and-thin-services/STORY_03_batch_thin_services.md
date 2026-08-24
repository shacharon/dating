# Story 03 — Batch Thin Services (200–348 LOC)

**Sprint:** 72  
**Effort:** 2–3 days  
**Risk:** ⚡ LOW  
**Status:** Optional

---

## Candidates (pick top pain only)

| Service | ~LOC | Suggested extract |
|---------|------|-------------------|
| `extraction.service.ts` | 348 | Already collaborators — peel telemetry if still mixed |
| `admin-match-quality.service.ts` | 348 | Query vs export |
| `me-profile-analysis.service.ts` | 343 | Submit vs fetch |
| `photo-moderation.service.ts` | 341 | Queue vs webhook |
| `messaging-socket-registry.service.ts` | 328 | Presence vs session map |
| `me-conversation-messages.service.ts` | 305 | Send vs list |

**Rule:** Only split if a file still has ≥2 clear reasons to change. Cap facade ≤200 LOC.

Document **accept list** for anything left intentional.

---

## Success

- [ ] No in-scope service >250 LOC without accept note
- [ ] Tests green

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
