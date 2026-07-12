# Handoff: Agent 1 — Senior dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_reduce_match_preferences_to_core_three.md](../../STORY_01_reduce_match_preferences_to_core_three.md)  
**Sprint:** sprint-15-match-preferences-simplification  
**Date:** 2026-07-11  
**Status:** complete  

---

## Summary

- Cut match preferences to **open-to / age range / max distance** across UI, API, Prisma, canonical prefs, HG hard eligibility, ranking similarity overlay, and HG structured prefs JSON.
- **Prisma migration applied:** `20260711120000_drop_user_profile_preference_lifestyle_fields` (7 columns dropped).
- Hard eligibility dimensions now **GENDER / AGE / PROXIMITY** only; `children_unsure` remains on matches wire but is **always false**.
- Self-facts on `UserProfile` untouched.
- Suites green: **dating-ui 370/370**, **dating-api 1416/1416**.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | updated — `UserProfilePreference` keep-only columns |
| `dating-api/prisma/migrations/20260711120000_drop_user_profile_preference_lifestyle_fields/migration.sql` | created + deployed |
| `dating-api/src/me-profile/dto/me-profile-writable-fields.dto.ts` | updated — prefs trimmed |
| `dating-api/src/me-profile/dto/me-profile-response.dto.ts` | updated — prefs trimmed |
| `dating-api/src/me-profile/me-profile.service.ts` | updated |
| `dating-api/src/me-profile/me-profile-engine.mapper.ts` | updated |
| `dating-api/src/canonical/matching-canonical.types.ts` | updated — prefs + overrides trimmed; pref-only enums removed |
| `dating-api/src/holy-grail-matching/holy-grail-dimensions.ts` | updated — 3 dims |
| `dating-api/src/holy-grail-matching/eligibility.evaluator.ts` | updated — lifestyle dims deleted; `children_unsure` always false |
| `dating-api/src/holy-grail-matching/holy-grail-five-signal-ranking.ts` | updated — similarity overlay removed |
| `dating-api/src/holy-grail-matching/holy-grail-structured-contract.ts` | updated — prefs JSON keys → 4 |
| `dating-api/src/holy-grail-matching/holy-grail-structured-write.merge.ts` | updated |
| `dating-api/src/holy-grail-matching/profile-to-canonical.mapper.ts` | updated |
| `dating-api/src/holy-grail-matching/retrieval/holy-grail-structured-db-json.ts` | updated |
| `dating-api/src/holy-grail-matching/retrieval/holy-grail-retrieval-wire.dto.ts` | updated |
| `dating-api/src/holy-grail-matching/similarity-preference-text.extract.ts` | **deleted** (+ specs) |
| `dating-api/src/holy-grail-matching/backfill-holy-grail-structured.ts` | slimmed |
| `dating-api/src/matches/match-pair-hg-snapshot.ts` | updated — `hgChildrenStatus` always `SKIPPED:SKIPPED` |
| `dating-ui/src/components/match-preferences-form.tsx` | updated — 3 sections only |
| `dating-ui/src/lib/match-preferences-form.ts` | updated |
| `dating-ui/src/lib/match-preference-options.ts` | **deleted** |
| `dating-ui/src/lib/me-profile-api.ts` | updated — prefs trimmed |
| `dating-ui/src/lib/i18n/{types,en,es,he}.ts` | updated — lifestyle/family/education/similarity copy removed |
| Specs across me-profile / HG / matches / UI form | trimmed for compile + green |

---

## Decisions followed (architect)

- Full delete of 7 preference dimensions (not feature-flagged).
- Self-facts kept.
- Dual store trimmed (Prisma + HG prefs JSON allow-lists).
- `children_unsure` inert, not removed from matches contract.
- No engine soft-signal replacement.

### Inert / retention notes

| Item | Notes |
|------|--------|
| `HolyGrailEligibilityFlags.children_unsure` | Always `false` after Story 1 |
| `buildPairHgSnapshotPayload` `hgChildrenStatus` | Always `SKIPPED:SKIPPED` |
| Stale HG prefs JSON in DB | Ignored by parsers (unknown keys dropped); no re-entry into canonical prefs |

No inert pref-branch left behind beyond the architect-approved `children_unsure` wire retention.

---

## Migration / how to run

```bash
cd dating-api
npx prisma migrate deploy
npx prisma generate   # if Windows EPERM on query engine DLL, stop API/dev Node processes first
npm test
```

```bash
cd dating-ui
npm test
```

---

## Tests / verification

- [x] Unit/integration: `dating-api` **1416/1416** · `dating-ui` **370/370**
- [x] `prisma migrate deploy`: yes (applied `20260711120000_drop_user_profile_preference_lifestyle_fields`)
- [x] Browser Network smoke: **N/A** (no realtime/proxy/cookie change)
- [x] Socket transport: N/A
- [ ] Operator manual smoke (agent 3): `/settings/preferences` only 3 sections; save/reload; match list loads

**Grep (removed pref names in src):** zero hits in `dating-api/src` and `dating-ui/src`.

---

## Open questions / blockers

- None. Follow-up (not blocking): retire always-false `children_unsure` from matches wire/UI.

---

## Next agent

```text
--agent 2 sprint 15 story 1
```

**Notes for next agent:**

- Review against `agent-0-architect.md`; suites already green — focus on gaps (missing coverage for trimmed surface, any leftover docs/scripts, Windows `prisma generate` EPERM if client stale).
- Do not reintroduce lifestyle prefs or expand into engine discovery.
- Confirm self-facts still present on schema/DTOs.
