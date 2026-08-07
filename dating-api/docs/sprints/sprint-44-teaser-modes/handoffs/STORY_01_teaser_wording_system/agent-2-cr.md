# Handoff: Agent 2 — Code Review — Story 1

**Agent:** 2 code-review  
**Story:** [STORY_01_teaser_wording_system.md](../../STORY_01_teaser_wording_system.md)  
**Sprint:** sprint-44-teaser-modes  
**Date:** 2026-08-06  
**Status:** complete  
**Verdict:** approved (with fixes)

---

## Summary

- Reviewed teaser builder + list/detail wiring against architect locks and Story 1 AC.
- **Fixed (Major):** materialized remap crashed if cached list items lacked `teaser` — rebuild when missing.
- **Fixed (Major):** kids cross-align no longer treats `already_has_kids` ↔ `wants_kids*` as aligned (no invented alignment).
- Strengthened tests: golden A/B/C already present; added invent-guard, Mode B word cap, `withTeaserScore`, contract + list assertions for `teaser.mode === 'first_chapter'`.
- Confirmed browse UI still uses `matchBrowseOneLiner` (Story 2 owns layout).
- **Skip Agent 4** — display DTO only.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/match-teaser.ts` | fixed — kids want-family set; comments |
| `dating-api/src/matches/match-teaser.spec.ts` | updated — invent guards, B word cap, withTeaserScore |
| `dating-api/src/me-profile/me-matches.service.ts` | fixed — cache-safe teaser rebuild on rank remap |
| `dating-api/src/me-profile/me-matches.v1-contract.spec.ts` | updated — assert list+detail `teaser` |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | updated — list asserts `teaser` |

---

## Review findings

### Critical
- None.

### Major (fixed)
1. **Stale cache without `teaser`:** `withTeaserScore(item.teaser, …)` assumed teaser always present. Pre–Sprint 44 Redis payloads would throw. Now rebuilds via `buildDefaultMatchTeaser` when absent.
2. **Invented kids alignment:** `already_has_kids` + `wants_kids` / `wants_kids_soon` previously mapped to “Kids situation aligned”. Narrowed cross-match to `wants_kids` ∪ `wants_kids_soon` only; `already_has_kids` only aligns on exact same label.

### Minor (accepted / defer)
- Mode A may show `hiking · ask about hiking` when the same interest feeds specific + ask — acceptable for Story 1; Story 2–3 can dedupe in layout.
- `priorityTier` is carried on facts but unused after architect locked universal fallback — keep for Story 5 / future policy.
- Mode C practical stack can truncate mid-phrase at 90 chars — caps enforced; copy polish is Agent 3 eyeball.

### AC checklist
- [x] `MatchTeaserDto` on match list (+ detail) items
- [x] Builder covers all 3 modes with golden tests
- [x] Default mode `first_chapter` until Story 5
- [x] No score/rank algorithm changes
- [x] Jargon banned list enforced in tests
- [x] No invented facts (enrichment mismatch tests)
- [x] Length caps enforced
- [x] HIGH + sparse → non-empty teaser

---

## Decisions (do not reverse without discussion)

- Cache-safe teaser attach on materialized remap (rebuild if missing).
- Kids cross-align excludes `already_has_kids` vs wants-* mismatch.

---

## Runtime topology

**N/A** — no realtime / proxy / cookies / migrations.

---

## Tests / verification

- [x] `npx jest src/matches/match-teaser.spec.ts src/me-profile/me-matches.v1-contract.spec.ts --no-coverage --runInBand` — **pass** (22 tests)
- [x] List service assertion for `teaser` added (`me-matches.service.spec.ts`)
- [x] `prisma migrate deploy`: N/A
- [x] Browser Network smoke: **N/A** (API display DTO; UI types only)
- [x] Socket transport: N/A

---

## E2E verification (agent 4)

**Skip Agent 4** — not eligibility / preference / ranking. Next is Agent 3 (PM eyeball / product doc).

---

## Open questions / blockers

- None blocking Accept. Agent 3 should snapshot real/fixture teasers for A/B/C and eyeball send/open quality.

---

## Next agent

```text
--agent 3 sprint 44 story 1
```

**Notes for next agent:**

1. Snapshot ~10 fixtures → `buildMatchTeaser` for all three modes; human eyeball.
2. Update `MATCH_CARD_TEASER_MODES.md` only if formulas drifted (they match golden EN examples).
3. Do not flip browse UI to `teaser` yet — that is Stories 2–4.
4. Suggested commit message remains: `feat(matches): add mode-aware match teaser builder` / Sprint 44 Story 1.
