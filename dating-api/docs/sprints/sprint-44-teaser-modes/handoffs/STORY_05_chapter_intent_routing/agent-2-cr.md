# Handoff: Agent 2 — Code Review — Story 5

**Agent:** 2 code-review  
**Story:** [STORY_05_chapter_intent_routing.md](../../STORY_05_chapter_intent_routing.md)  
**Sprint:** sprint-44-teaser-modes  
**Date:** 2026-08-06  
**Status:** complete  
**Verdict:** approved  

---

## Summary

- Reviewed dating-chapter persistence, `resolveTeaserMode`, list/detail teaser wiring, cache invalidate + analytics, onboarding/settings UI, privacy (chapter only on self profile DTO).
- No Critical/Major defects. Strengthened tests: PATCH invalidate/analytics, DTO validation, age/chapter matrix, HE + banned chrome, DatingChapterFields + settings PATCH smoke.
- **Skip Agent 4** — presentation preference only (not eligibility / ranking / match preference dimensions).

---

## Artifacts

| Path | Change |
|------|--------|
| `me-profile.service.spec.ts` | added — chapter PATCH invalidate + analytics; no-op when unchanged |
| `me-profile-writable-fields.dto.spec.ts` | added — datingChapter accept/reject |
| `match-teaser.spec.ts` | extended — invalid chapter → age proxy; age bounds |
| `dating-ui/.../dating-chapter-fields.spec.tsx` | **new** — fields, HE, banned chrome, settings PATCH |
| `me-matches.service.ts` | comment — Story 5 mode note |

---

## Review findings

### Critical
- None.

### Major
- None.

### Minor (accepted)
1. **Live browser** PATCH → list refresh eyeball deferred to Agent 3 (unit coverage for invalidate + mode rebuild present).
2. **Onboarding always sends `datingChapter`** on basic save (including `null`) — correct when state mirrors GET; clears only if user clears via settings.
3. **Create path** does not emit `profile.dating_chapter_set` — only PATCH change (architect lock).

### AC checklist
- [x] User can set dating chapter (onboarding + settings)
- [x] Modeled EN (+ HE) copy used
- [x] Cards switch A/B/C from chapter (`teaser.mode` from server)
- [x] Age fallback only if unset
- [x] Default `first_chapter` when unknown
- [x] Chapter not on `MeMatchItemDto` / candidate payloads (self profile only)
- [x] Chapter change invalidates match-list cache (no re-login)
- [x] No age-only UI that hides chapter picker

---

## Decisions (do not reverse without discussion)

- Keep QA `dating.teaserModePreview` client override.
- Do not enqueue rank rebuild on chapter-only change.
- Hydrate rebuilds teaser when cached `teaser.mode` ≠ resolved mode.

---

## Runtime topology

**N/A** — migration already applied (Agent 1). No sockets.

---

## Tests / verification

- [x] `npx jest --no-coverage src/matches/match-teaser.spec.ts src/me-profile/me-profile.service.spec.ts src/me-profile/dto/me-profile-writable-fields.dto.spec.ts src/me-profile/repositories/user-profile.repository.spec.ts --runInBand` — **pass**
- [x] `npx vitest run src/components/dating-chapter-fields.spec.tsx src/components/profile/profile-settings-tab.spec.tsx` — **pass**
- [x] `prisma migrate deploy`: N/A this step (already applied)
- [x] Browser Network: **deferred** to Agent 3 manual A/B/C + age fallback
- [x] Socket: N/A

---

## E2E verification (agent 4)

**Skip Agent 4** — not eligibility / preference dimensions / ranking.

---

## Open questions / blockers

- None. Agent 3: pick each chapter → confirm A/B/C; age fallback when unset; mark sprint shipping complete.

---

## Next agent

```text
--agent 3 sprint 44 story 5
```

**Notes for next agent:**

1. Manual: set each chapter in settings → refresh matches → Mode A/B/C.
2. Unset chapter (clear) + age ≥45 → Mode C; unknown → A.
3. Mark Story 05 + product doc Sprint 44 shipped.
4. Suggested commit: `feat(profile): dating chapter intent routes teaser modes A/B/C` / Sprint 44 Story 5.
