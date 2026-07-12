# Handoff: Agent 2 — Code review — Story 1

**Agent:** 2 code-review  
**Story:** [STORY_01_reduce_match_preferences_to_core_three.md](../../STORY_01_reduce_match_preferences_to_core_three.md)  
**Sprint:** sprint-15-match-preferences-simplification  
**Date:** 2026-07-11  
**Status:** complete  
**Verdict:** approved (minor fixes + regression tests applied)

---

## Summary

- Reviewed Agent 1 against `agent-0-architect.md` — **aligned**: keep-set only, 7 prefs deleted end-to-end, self-facts untouched, `children_unsure` inert, migration present.
- **No Critical / Major** issues.
- Applied **Minor** fixes + **3 regression tests** (PATCH forbid removed fields, stale HG prefs JSON ignored, UI absence of removed controls).
- Suites: **dating-api 1418/1418**, **dating-ui 371/371**.

---

## Review checklist

| Area | Result |
|------|--------|
| Architect alignment | OK — 4 kept prefs; lifestyle/education/family/similarity gone |
| Removed-pref grep (`dating-api/src`, `dating-ui/src`) | 0 hits |
| Self-facts retained (schema/DTOs/facts JSON keys) | OK |
| HG prefs JSON keys = 4 | OK |
| Dimensions = GENDER/AGE/PROXIMITY | OK |
| `children_unsure` always false | OK |
| Stale HG prefs JSON ignored on parse | OK (now tested) |
| Auth / validation | OK — `forbidNonWhitelisted` rejects removed fields |
| Migration ↔ schema | OK |
| Runtime / socket | N/A |

---

## Issues

### Critical

- None

### Major

- None

### Minor (fixed)

| Issue | Fix |
|-------|-----|
| Profile `matchPreferencesLinkHelp` still mentioned lifestyle filters (EN/ES/HE) | Updated to open-to / age / distance wording |
| File header on `holy-grail-structured-db-json.ts` claimed all unknown keys error; prefs ignore stale keys | Header clarified (facts reject / prefs ignore) |
| Missing regression coverage for PATCH forbid / stale JSON / UI absence | Tests added (below) |

### Minor (accepted / deferred)

| Issue | Notes |
|-------|--------|
| Merge write may preserve stale keys already in HG prefs blob | Safe: parse/mapper do not reintroduce into canonical; cleanup job optional later |
| Snapshot classifier still maps historical `SOFT_PASS` → children_unsure | Dead DB table; live path always false — leave per architect Decision 5 |
| Archive scripts mention similarityPreference | Not in `package.json` / CI |

---

## Tests added / updated

| File | What |
|------|------|
| `dating-api/src/me-profile/dto/me-profile-writable-fields.dto.spec.ts` | Rejects all 7 removed pref fields on patch (`forbidNonWhitelisted`) |
| `dating-api/src/holy-grail-matching/retrieval/prisma-holy-grail-profile-source.repository.spec.ts` | Stale removed keys in HG prefs JSON ignored |
| `dating-ui/src/components/match-preferences-form.spec.tsx` | Asserts no education/lifestyle/family/similarity controls |
| Existing | `eligibility.evaluator.spec.ts` already asserts 3 dims + `children_unsure: false` |

---

## Tests / verification

- [x] Unit/integration: `cd dating-api && npm test` → **1418/1418**
- [x] Unit: `cd dating-ui && npm test` → **371/371**
- [x] `prisma migrate deploy`: already applied by Agent 1 (`20260711120000_drop_user_profile_preference_lifestyle_fields`)
- [x] Browser Network smoke: **N/A** (no realtime/proxy)
- [x] Socket transport: N/A

---

## Open questions / blockers

- None. Follow-up: retire inert `children_unsure` wire (not this story).

---

## Next agent

```text
--agent 3 sprint 15 story 1
```

**Notes for next agent:**

- Engineering gate green; operator smoke: `/settings/preferences` shows only open-to / age / distance; save persists; match list loads.
- Mark story Done after smoke checklist if desired.
